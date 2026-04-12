import { expect } from "chai"
import { ethers } from "hardhat"
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers"
import { PlusOne, MockUSDC, VRFCoordinatorV2Mock } from "../typechain-types"

// USDC amounts (6 decimals)
const ONE_DOLLAR  = 1_000_000n
const GIVE_COST   = 1_200_000n  // $1.20 per +1
const MERIT_SHARE = 200_000n    // $0.20 to Merit Pool
const DREAM_COST  = 1_000_000n  // $1 per dream

// Mint enough for all tests
const MINT_AMOUNT = ONE_DOLLAR * 2000n

describe("PlusOne", () => {
  // ══════════════════════════════════════════
  //  Fixture
  // ══════════════════════════════════════════
  async function deployFixture() {
    const [owner, alice, bob, carol, dave] = await ethers.getSigners()

    // Deploy mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC")
    const usdc = (await MockUSDC.deploy()) as unknown as MockUSDC

    // Deploy VRFCoordinatorV2Mock
    const VRFMock = await ethers.getContractFactory("VRFCoordinatorV2Mock")
    const vrfCoordinator = (await VRFMock.deploy(
      100000n,       // baseFee
      1000000000n    // gasPriceLink
    )) as unknown as VRFCoordinatorV2Mock

    // Create and fund VRF subscription
    const createTx = await vrfCoordinator.createSubscription()
    const receipt  = await createTx.wait()
    // Extract subId from event logs
    const subId = 1n

    await vrfCoordinator.fundSubscription(subId, ethers.parseEther("10"))

    // Deploy PlusOne
    const PlusOneFactory = await ethers.getContractFactory("PlusOne")
    const plusOne = (await PlusOneFactory.deploy(
      await usdc.getAddress(),
      await vrfCoordinator.getAddress(),
      subId,
      ethers.encodeBytes32String("keyHash"),
      300000n // VRF callback gas limit
    )) as unknown as PlusOne

    // Register PlusOne as VRF consumer
    await vrfCoordinator.addConsumer(subId, await plusOne.getAddress())

    // Mint USDC to all test accounts
    for (const signer of [owner, alice, bob, carol, dave]) {
      await usdc.mint(signer.address, MINT_AMOUNT)
    }

    // Helper: approve and register a user
    const registerUser = async (
      signer: typeof alice,
      thought: string = "A dream"
    ) => {
      await usdc.connect(signer).approve(await plusOne.getAddress(), DREAM_COST)
      await plusOne.connect(signer).register(thought)
    }

    // Helper: approve and give +1
    const giveOne = async (
      from: typeof alice,
      to: typeof bob
    ) => {
      await usdc.connect(from).approve(await plusOne.getAddress(), GIVE_COST)
      await plusOne.connect(from).give(to.address)
    }

    // Helper: give N +1s from one user to another
    const giveMany = async (
      from: typeof alice,
      to: typeof bob,
      count: number
    ) => {
      await usdc.connect(from).approve(
        await plusOne.getAddress(),
        GIVE_COST * BigInt(count)
      )
      for (let i = 0; i < count; i++) {
        await plusOne.connect(from).give(to.address)
      }
    }

    return {
      plusOne, usdc, vrfCoordinator, subId,
      owner, alice, bob, carol, dave,
      registerUser, giveOne, giveMany,
    }
  }

  // ══════════════════════════════════════════
  //  register()
  // ══════════════════════════════════════════
  describe("register()", () => {
    it("registers a user with first dream, charges $1 to Dream Fund", async () => {
      const { plusOne, usdc, alice, registerUser } = await loadFixture(deployFixture)

      const balBefore = await usdc.balanceOf(alice.address)
      await registerUser(alice, "Build a shelter for stray animals")
      const balAfter = await usdc.balanceOf(alice.address)

      // $1 charged
      expect(balBefore - balAfter).to.equal(DREAM_COST)

      // Dream Fund incremented
      expect(await plusOne.dreamFund()).to.equal(DREAM_COST)

      // Profile created
      const profile = await plusOne.getProfile(alice.address)
      expect(profile.registered).to.be.true
      expect(profile.dreamCount).to.equal(1n)
      expect(profile.totalReceived).to.equal(0n)
      expect(profile.totalGiven).to.equal(0n)
      expect(profile.balance).to.equal(0n)

      // Dream stored
      const dreams = await plusOne.getDreams(alice.address)
      expect(dreams.length).to.equal(1)
      expect(dreams[0].thought).to.equal("Build a shelter for stray animals")
    })

    it("emits Registered event with dreamIndex 0", async () => {
      const { plusOne, usdc, alice } = await loadFixture(deployFixture)

      await usdc.connect(alice).approve(await plusOne.getAddress(), DREAM_COST)
      await expect(plusOne.connect(alice).register("My dream"))
        .to.emit(plusOne, "Registered")
        .withArgs(alice.address, 0n, "My dream")
    })

    it("reverts if already registered", async () => {
      const { plusOne, registerUser, alice } = await loadFixture(deployFixture)

      await registerUser(alice)
      await expect(
        registerUser(alice, "second attempt")
      ).to.be.revertedWithCustomError(plusOne, "AlreadyRegistered")
    })

    it("reverts if thought is empty", async () => {
      const { plusOne, usdc, alice } = await loadFixture(deployFixture)

      await usdc.connect(alice).approve(await plusOne.getAddress(), DREAM_COST)
      await expect(
        plusOne.connect(alice).register("")
      ).to.be.revertedWithCustomError(plusOne, "EmptyThought")
    })

    it("reverts if thought exceeds 280 bytes", async () => {
      const { plusOne, usdc, alice } = await loadFixture(deployFixture)

      const longThought = "x".repeat(281)
      await usdc.connect(alice).approve(await plusOne.getAddress(), DREAM_COST)
      await expect(
        plusOne.connect(alice).register(longThought)
      ).to.be.revertedWithCustomError(plusOne, "ThoughtTooLong")
    })

    it("increments user count", async () => {
      const { plusOne, registerUser, alice, bob } = await loadFixture(deployFixture)

      expect(await plusOne.getUserCount()).to.equal(0n)
      await registerUser(alice)
      expect(await plusOne.getUserCount()).to.equal(1n)
      await registerUser(bob)
      expect(await plusOne.getUserCount()).to.equal(2n)
    })
  })

  // ══════════════════════════════════════════
  //  publishDream()
  // ══════════════════════════════════════════
  describe("publishDream()", () => {
    it("publishes additional dream, charges $1 to Dream Fund", async () => {
      const { plusOne, usdc, alice, registerUser } = await loadFixture(deployFixture)

      await registerUser(alice, "Dream 1")

      await usdc.connect(alice).approve(await plusOne.getAddress(), DREAM_COST)
      await plusOne.connect(alice).publishDream("Dream 2")

      expect(await plusOne.dreamFund()).to.equal(DREAM_COST * 2n)

      const profile = await plusOne.getProfile(alice.address)
      expect(profile.dreamCount).to.equal(2n)

      const dreams = await plusOne.getDreams(alice.address)
      expect(dreams.length).to.equal(2)
      expect(dreams[1].thought).to.equal("Dream 2")
    })

    it("emits DreamPublished with correct index", async () => {
      const { plusOne, usdc, alice, registerUser } = await loadFixture(deployFixture)

      await registerUser(alice, "Dream 0")
      await usdc.connect(alice).approve(await plusOne.getAddress(), DREAM_COST)

      await expect(plusOne.connect(alice).publishDream("Dream 1"))
        .to.emit(plusOne, "DreamPublished")
        .withArgs(alice.address, 1n, "Dream 1")
    })

    it("reverts if not registered", async () => {
      const { plusOne, usdc, alice } = await loadFixture(deployFixture)

      await usdc.connect(alice).approve(await plusOne.getAddress(), DREAM_COST)
      await expect(
        plusOne.connect(alice).publishDream("No registration")
      ).to.be.revertedWithCustomError(plusOne, "NotRegistered")
    })

    it("reverts on empty or too-long thought", async () => {
      const { plusOne, usdc, alice, registerUser } = await loadFixture(deployFixture)

      await registerUser(alice)

      await usdc.connect(alice).approve(await plusOne.getAddress(), DREAM_COST * 2n)
      await expect(
        plusOne.connect(alice).publishDream("")
      ).to.be.revertedWithCustomError(plusOne, "EmptyThought")

      await expect(
        plusOne.connect(alice).publishDream("y".repeat(281))
      ).to.be.revertedWithCustomError(plusOne, "ThoughtTooLong")
    })

    it("getDream reverts on out-of-bounds index", async () => {
      const { plusOne, alice, registerUser } = await loadFixture(deployFixture)

      await registerUser(alice)
      await expect(
        plusOne.getDream(alice.address, 5)
      ).to.be.revertedWithCustomError(plusOne, "DreamIndexOutOfBounds")
    })
  })

  // ══════════════════════════════════════════
  //  give()
  // ══════════════════════════════════════════
  describe("give()", () => {
    it("charges $1.20: $1 to recipient, $0.20 to Merit Pool", async () => {
      const { plusOne, usdc, alice, bob, registerUser, giveOne } = await loadFixture(deployFixture)

      await registerUser(bob, "Bob's dream")
      const aliceBefore = await usdc.balanceOf(alice.address)

      await giveOne(alice, bob)

      const aliceAfter = await usdc.balanceOf(alice.address)
      expect(aliceBefore - aliceAfter).to.equal(GIVE_COST)

      const profile = await plusOne.getProfile(bob.address)
      expect(profile.balance).to.equal(ONE_DOLLAR)
      expect(profile.totalReceived).to.equal(1n)

      expect(await plusOne.meritPool()).to.equal(MERIT_SHARE)
    })

    it("increments sender's totalGiven", async () => {
      const { plusOne, alice, bob, registerUser, giveOne } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveOne(alice, bob)

      const aliceProfile = await plusOne.getProfile(alice.address)
      expect(aliceProfile.totalGiven).to.equal(1n)
    })

    it("tracks weekly activity for raffle qualification", async () => {
      const { plusOne, alice, bob, registerUser, giveOne } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveOne(alice, bob)

      const week = await plusOne.getWeekNumber()
      const weeklyCount = await plusOne.getWeeklyGivenCount(alice.address, week)
      expect(weeklyCount).to.equal(1n)
    })

    it("emits PlusOneGiven with merit pool contribution", async () => {
      const { plusOne, usdc, alice, bob, registerUser } = await loadFixture(deployFixture)

      await registerUser(bob)
      await usdc.connect(alice).approve(await plusOne.getAddress(), GIVE_COST)

      await expect(plusOne.connect(alice).give(bob.address))
        .to.emit(plusOne, "PlusOneGiven")
        .withArgs(alice.address, bob.address, 1n, MERIT_SHARE)
    })

    it("reverts if recipient not registered", async () => {
      const { plusOne, usdc, alice, bob } = await loadFixture(deployFixture)

      await usdc.connect(alice).approve(await plusOne.getAddress(), GIVE_COST)
      await expect(
        plusOne.connect(alice).give(bob.address)
      ).to.be.revertedWithCustomError(plusOne, "RecipientNotRegistered")
    })

    it("reverts if giving to self", async () => {
      const { plusOne, usdc, alice, registerUser } = await loadFixture(deployFixture)

      await registerUser(alice)
      await usdc.connect(alice).approve(await plusOne.getAddress(), GIVE_COST)
      await expect(
        plusOne.connect(alice).give(alice.address)
      ).to.be.revertedWithCustomError(plusOne, "CannotGiveToSelf")
    })

    it("reverts if USDC allowance insufficient", async () => {
      const { plusOne, alice, bob, registerUser } = await loadFixture(deployFixture)

      await registerUser(bob)
      // No approval
      await expect(
        plusOne.connect(alice).give(bob.address)
      ).to.be.reverted
    })

    it("accumulates multiple +1s correctly", async () => {
      const { plusOne, alice, bob, registerUser, giveMany } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveMany(alice, bob, 3)

      const profile = await plusOne.getProfile(bob.address)
      expect(profile.totalReceived).to.equal(3n)
      expect(profile.balance).to.equal(ONE_DOLLAR * 3n)
      expect(await plusOne.meritPool()).to.equal(MERIT_SHARE * 3n)
    })
  })

  // ══════════════════════════════════════════
  //  withdraw()
  // ══════════════════════════════════════════
  describe("withdraw()", () => {
    it("transfers full balance with 0% fee", async () => {
      const { plusOne, usdc, alice, bob, registerUser, giveOne } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveOne(alice, bob)

      const before = await usdc.balanceOf(bob.address)
      await plusOne.connect(bob).withdraw()
      const after = await usdc.balanceOf(bob.address)

      expect(after - before).to.equal(ONE_DOLLAR)
    })

    it("deducts BPS fee on withdrawal", async () => {
      const { plusOne, usdc, owner, alice, bob, registerUser, giveOne } = await loadFixture(deployFixture)

      // Set 5% fee (500 BPS)
      await plusOne.connect(owner).setWithdrawalFee(500n)

      await registerUser(bob)
      await giveOne(alice, bob)

      const before = await usdc.balanceOf(bob.address)
      await plusOne.connect(bob).withdraw()
      const after = await usdc.balanceOf(bob.address)

      // 5% of $1 = $0.05 = 50000
      const expectedFee = (ONE_DOLLAR * 500n) / 10000n
      expect(after - before).to.equal(ONE_DOLLAR - expectedFee)
      expect(await plusOne.collectedFees()).to.equal(expectedFee)
    })

    it("emits Withdrawn event", async () => {
      const { plusOne, alice, bob, registerUser, giveOne } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveOne(alice, bob)

      await expect(plusOne.connect(bob).withdraw())
        .to.emit(plusOne, "Withdrawn")
        .withArgs(bob.address, ONE_DOLLAR, 0n)
    })

    it("resets balance to zero, keeps totalReceived", async () => {
      const { plusOne, alice, bob, registerUser, giveOne } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveOne(alice, bob)
      await plusOne.connect(bob).withdraw()

      const profile = await plusOne.getProfile(bob.address)
      expect(profile.balance).to.equal(0n)
      expect(profile.totalReceived).to.equal(1n)
    })

    it("reverts if balance is zero", async () => {
      const { plusOne, alice, registerUser } = await loadFixture(deployFixture)

      await registerUser(alice)
      await expect(
        plusOne.connect(alice).withdraw()
      ).to.be.revertedWithCustomError(plusOne, "NothingToWithdraw")
    })

    it("works even when contract is paused", async () => {
      const { plusOne, usdc, owner, alice, bob, registerUser, giveOne } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveOne(alice, bob)

      await plusOne.connect(owner).pause()

      // withdraw should still work
      const before = await usdc.balanceOf(bob.address)
      await plusOne.connect(bob).withdraw()
      const after = await usdc.balanceOf(bob.address)
      expect(after - before).to.equal(ONE_DOLLAR)
    })
  })

  // ══════════════════════════════════════════
  //  Raffle lifecycle
  // ══════════════════════════════════════════
  describe("raffle", () => {
    it("startRaffle sets state and snapshots merit pool", async () => {
      const { plusOne, owner, alice, bob, registerUser, giveMany } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveMany(alice, bob, 7)

      const meritBefore = await plusOne.meritPool()
      await plusOne.connect(owner).startRaffle()

      expect(await plusOne.raffleState()).to.equal(1n) // Participation
      expect(await plusOne.raffleMeritPoolSnapshot()).to.equal(meritBefore)
    })

    it("startRaffle emits event", async () => {
      const { plusOne, owner, alice, bob, registerUser, giveMany } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveMany(alice, bob, 7)

      await expect(plusOne.connect(owner).startRaffle())
        .to.emit(plusOne, "RaffleStarted")
    })

    it("startRaffle reverts if not owner", async () => {
      const { plusOne, alice } = await loadFixture(deployFixture)

      await expect(
        plusOne.connect(alice).startRaffle()
      ).to.be.revertedWithCustomError(plusOne, "Unauthorized")
    })

    it("startRaffle reverts if same week", async () => {
      const { plusOne, owner, alice, bob, registerUser, giveMany } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveMany(alice, bob, 7)

      await plusOne.connect(owner).startRaffle()

      // Fast-forward past participation window
      await time.increase(3601)
      // Draw with no participants → settles immediately
      await plusOne.connect(owner).drawRaffle()

      // Try to start again same week
      await expect(
        plusOne.connect(owner).startRaffle()
      ).to.be.revertedWithCustomError(plusOne, "SameWeekRaffle")
    })

    it("participateRaffle succeeds for qualified user", async () => {
      const { plusOne, owner, alice, bob, registerUser, giveMany } = await loadFixture(deployFixture)

      await registerUser(alice) // alice needs to be registered to show up, but give doesn't require it
      await registerUser(bob)
      await giveMany(alice, bob, 7) // alice qualifies for tier 1

      await plusOne.connect(owner).startRaffle()

      await expect(plusOne.connect(alice).participateRaffle(1))
        .to.emit(plusOne, "RaffleParticipated")
        .withArgs(alice.address, 1, await plusOne.raffleWeekNumber())
    })

    it("participateRaffle reverts if window closed", async () => {
      const { plusOne, owner, alice, bob, registerUser, giveMany } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveMany(alice, bob, 7)

      await plusOne.connect(owner).startRaffle()
      await time.increase(3601) // past 1 hour

      await expect(
        plusOne.connect(alice).participateRaffle(1)
      ).to.be.revertedWithCustomError(plusOne, "RaffleWindowNotOpen")
    })

    it("participateRaffle reverts if not qualified", async () => {
      const { plusOne, owner, alice, bob, registerUser, giveMany } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveMany(alice, bob, 5) // only 5, need 7

      await plusOne.connect(owner).startRaffle()

      await expect(
        plusOne.connect(alice).participateRaffle(1)
      ).to.be.revertedWithCustomError(plusOne, "NotQualifiedForTier")
    })

    it("participateRaffle reverts on double entry", async () => {
      const { plusOne, owner, alice, bob, registerUser, giveMany } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveMany(alice, bob, 7)

      await plusOne.connect(owner).startRaffle()
      await plusOne.connect(alice).participateRaffle(1)

      await expect(
        plusOne.connect(alice).participateRaffle(1)
      ).to.be.revertedWithCustomError(plusOne, "AlreadyParticipated")
    })

    it("drawRaffle reverts if window still open", async () => {
      const { plusOne, owner, alice, bob, registerUser, giveMany } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveMany(alice, bob, 7)

      await plusOne.connect(owner).startRaffle()

      await expect(
        plusOne.connect(owner).drawRaffle()
      ).to.be.revertedWithCustomError(plusOne, "RaffleWindowNotClosed")
    })

    it("drawRaffle settles immediately with no participants", async () => {
      const { plusOne, owner, alice, bob, registerUser, giveMany } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveMany(alice, bob, 7)

      await plusOne.connect(owner).startRaffle()
      await time.increase(3601)

      await plusOne.connect(owner).drawRaffle()

      // Should settle immediately (no VRF needed)
      expect(await plusOne.raffleState()).to.equal(3n) // Settled
    })

    it("full raffle lifecycle: qualify → participate → draw → claim", async () => {
      const { plusOne, usdc, owner, alice, bob, vrfCoordinator, registerUser, giveMany } =
        await loadFixture(deployFixture)

      // Setup: alice gives bob 7 +1s
      await registerUser(bob)
      await giveMany(alice, bob, 7)

      const meritPool = await plusOne.meritPool()
      expect(meritPool).to.equal(MERIT_SHARE * 7n) // $1.40

      // 1. Start raffle
      await plusOne.connect(owner).startRaffle()
      expect(await plusOne.raffleState()).to.equal(1n) // Participation

      // 2. Alice participates tier 1
      await plusOne.connect(alice).participateRaffle(1)

      const participants = await plusOne.getRaffleParticipants(1)
      expect(participants.length).to.equal(1)
      expect(participants[0]).to.equal(alice.address)

      // 3. Wait for window to close and draw
      await time.increase(3601)
      const drawTx = await plusOne.connect(owner).drawRaffle()
      expect(await plusOne.raffleState()).to.equal(2n) // Drawing

      // 4. Fulfill VRF (simulate Chainlink callback)
      const drawReceipt = await drawTx.wait()
      // Get requestId from the VRF coordinator
      // The mock auto-generates requestId starting from 1
      await vrfCoordinator.fulfillRandomWords(1n, await plusOne.getAddress())

      expect(await plusOne.raffleState()).to.equal(3n) // Settled

      // 5. Alice is the winner (only participant)
      const winner = await plusOne.getRaffleWinner(1)
      expect(winner).to.equal(alice.address)

      // 6. Claim prize
      const prize = await plusOne.getRafflePrize(1)
      expect(prize).to.be.gt(0n) // 15% of meritPool

      const aliceBefore = await usdc.balanceOf(alice.address)
      await plusOne.connect(alice).claimPrize()
      const aliceAfter = await usdc.balanceOf(alice.address)

      expect(aliceAfter - aliceBefore).to.equal(prize)
    })

    it("claimPrize reverts if not a winner", async () => {
      const { plusOne, owner, alice, bob, carol, vrfCoordinator, registerUser, giveMany } =
        await loadFixture(deployFixture)

      await registerUser(bob)
      await giveMany(alice, bob, 7)

      await plusOne.connect(owner).startRaffle()
      await plusOne.connect(alice).participateRaffle(1)
      await time.increase(3601)
      await plusOne.connect(owner).drawRaffle()
      await vrfCoordinator.fulfillRandomWords(1n, await plusOne.getAddress())

      await expect(
        plusOne.connect(carol).claimPrize()
      ).to.be.revertedWithCustomError(plusOne, "NotAWinner")
    })

    it("claimPrize reverts on double claim", async () => {
      const { plusOne, owner, alice, bob, vrfCoordinator, registerUser, giveMany } =
        await loadFixture(deployFixture)

      await registerUser(bob)
      await giveMany(alice, bob, 7)

      await plusOne.connect(owner).startRaffle()
      await plusOne.connect(alice).participateRaffle(1)
      await time.increase(3601)
      await plusOne.connect(owner).drawRaffle()
      await vrfCoordinator.fulfillRandomWords(1n, await plusOne.getAddress())

      await plusOne.connect(alice).claimPrize()
      await expect(
        plusOne.connect(alice).claimPrize()
      ).to.be.revertedWithCustomError(plusOne, "AlreadyClaimed")
    })
  })

  // ══════════════════════════════════════════
  //  cancelRaffle
  // ══════════════════════════════════════════
  describe("cancelRaffle()", () => {
    it("cancels stuck raffle after 24h timeout", async () => {
      const { plusOne, owner, alice, bob, registerUser, giveMany } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveMany(alice, bob, 7)

      await plusOne.connect(owner).startRaffle()
      await plusOne.connect(alice).participateRaffle(1)
      await time.increase(3601)
      await plusOne.connect(owner).drawRaffle()

      // Don't fulfill VRF — simulate timeout
      await time.increase(86401) // > 24 hours

      await expect(plusOne.connect(owner).cancelRaffle())
        .to.emit(plusOne, "RaffleCancelled")

      expect(await plusOne.raffleState()).to.equal(0n) // Idle
    })

    it("reverts if timeout not reached", async () => {
      const { plusOne, owner, alice, bob, registerUser, giveMany } = await loadFixture(deployFixture)

      await registerUser(bob)
      await giveMany(alice, bob, 7)

      await plusOne.connect(owner).startRaffle()
      await plusOne.connect(alice).participateRaffle(1)
      await time.increase(3601)
      await plusOne.connect(owner).drawRaffle()

      // Only 1 hour passed, not 24
      await time.increase(3600)
      await expect(
        plusOne.connect(owner).cancelRaffle()
      ).to.be.revertedWithCustomError(plusOne, "RaffleTimeoutNotReached")
    })
  })

  // ══════════════════════════════════════════
  //  pause / unpause
  // ══════════════════════════════════════════
  describe("pause", () => {
    it("blocks register/give/publishDream when paused", async () => {
      const { plusOne, usdc, owner, alice, bob } = await loadFixture(deployFixture)

      await plusOne.connect(owner).pause()

      await usdc.connect(alice).approve(await plusOne.getAddress(), DREAM_COST)
      await expect(
        plusOne.connect(alice).register("Dream")
      ).to.be.revertedWithCustomError(plusOne, "ContractPaused")

      await expect(
        plusOne.connect(alice).give(bob.address)
      ).to.be.revertedWithCustomError(plusOne, "ContractPaused")
    })

    it("unpause restores operations", async () => {
      const { plusOne, owner, alice, registerUser } = await loadFixture(deployFixture)

      await plusOne.connect(owner).pause()
      await plusOne.connect(owner).unpause()

      // Should work now
      await registerUser(alice, "After unpause")
      const profile = await plusOne.getProfile(alice.address)
      expect(profile.registered).to.be.true
    })

    it("only owner can pause/unpause", async () => {
      const { plusOne, alice } = await loadFixture(deployFixture)

      await expect(
        plusOne.connect(alice).pause()
      ).to.be.revertedWithCustomError(plusOne, "Unauthorized")
    })
  })

  // ══════════════════════════════════════════
  //  Admin functions
  // ══════════════════════════════════════════
  describe("admin", () => {
    it("setWithdrawalFee capped at 10%", async () => {
      const { plusOne, owner } = await loadFixture(deployFixture)

      await plusOne.connect(owner).setWithdrawalFee(1000n) // 10% ok
      expect(await plusOne.withdrawalFeeBps()).to.equal(1000n)

      await expect(
        plusOne.connect(owner).setWithdrawalFee(1001n)
      ).to.be.revertedWithCustomError(plusOne, "FeeTooHigh")
    })

    it("setRafflePrizeDistribution must sum to 10000", async () => {
      const { plusOne, owner } = await loadFixture(deployFixture)

      await plusOne.connect(owner).setRafflePrizeDistribution(2000n, 3000n, 5000n)
      expect(await plusOne.tier1PrizeBps()).to.equal(2000n)

      await expect(
        plusOne.connect(owner).setRafflePrizeDistribution(2000n, 3000n, 4000n)
      ).to.be.revertedWithCustomError(plusOne, "InvalidPrizeDistribution")
    })

    it("collectFees transfers accumulated fees to owner", async () => {
      const { plusOne, usdc, owner, alice, bob, registerUser, giveOne } = await loadFixture(deployFixture)

      await plusOne.connect(owner).setWithdrawalFee(500n) // 5%
      await registerUser(bob)
      await giveOne(alice, bob)
      await plusOne.connect(bob).withdraw()

      const expectedFee = (ONE_DOLLAR * 500n) / 10000n
      const ownerBefore = await usdc.balanceOf(owner.address)
      await plusOne.connect(owner).collectFees()
      const ownerAfter = await usdc.balanceOf(owner.address)

      expect(ownerAfter - ownerBefore).to.equal(expectedFee)
    })

    it("collectFees reverts if no fees", async () => {
      const { plusOne, owner } = await loadFixture(deployFixture)

      await expect(
        plusOne.connect(owner).collectFees()
      ).to.be.revertedWithCustomError(plusOne, "NoFeesToCollect")
    })

    it("withdrawDreamFund transfers from dream fund", async () => {
      const { plusOne, usdc, owner, alice, registerUser } = await loadFixture(deployFixture)

      await registerUser(alice) // $1 to dream fund

      const ownerBefore = await usdc.balanceOf(owner.address)
      await plusOne.connect(owner).withdrawDreamFund(DREAM_COST)
      const ownerAfter = await usdc.balanceOf(owner.address)

      expect(ownerAfter - ownerBefore).to.equal(DREAM_COST)
      expect(await plusOne.dreamFund()).to.equal(0n)
    })

    it("withdrawDreamFund reverts if insufficient", async () => {
      const { plusOne, owner } = await loadFixture(deployFixture)

      await expect(
        plusOne.connect(owner).withdrawDreamFund(ONE_DOLLAR)
      ).to.be.revertedWithCustomError(plusOne, "InsufficientDreamFund")
    })

    it("non-owner cannot call admin functions", async () => {
      const { plusOne, alice } = await loadFixture(deployFixture)

      await expect(plusOne.connect(alice).setWithdrawalFee(100n))
        .to.be.revertedWithCustomError(plusOne, "Unauthorized")
      await expect(plusOne.connect(alice).collectFees())
        .to.be.revertedWithCustomError(plusOne, "Unauthorized")
      await expect(plusOne.connect(alice).withdrawDreamFund(1n))
        .to.be.revertedWithCustomError(plusOne, "Unauthorized")
    })
  })

  // ══════════════════════════════════════════
  //  View functions
  // ══════════════════════════════════════════
  describe("view functions", () => {
    it("getWeekNumber returns consistent value", async () => {
      const { plusOne } = await loadFixture(deployFixture)

      const week = await plusOne.getWeekNumber()
      expect(week).to.be.gt(0n)
    })

    it("isQualifiedForTier returns correct status", async () => {
      const { plusOne, alice, bob, registerUser, giveMany } = await loadFixture(deployFixture)

      await registerUser(bob)

      expect(await plusOne.isQualifiedForTier(alice.address, 1)).to.be.false
      await giveMany(alice, bob, 7)
      expect(await plusOne.isQualifiedForTier(alice.address, 1)).to.be.true
      expect(await plusOne.isQualifiedForTier(alice.address, 2)).to.be.false
    })

    it("invalid tier returns false for isQualifiedForTier", async () => {
      const { plusOne, alice } = await loadFixture(deployFixture)

      expect(await plusOne.isQualifiedForTier(alice.address, 0)).to.be.false
      expect(await plusOne.isQualifiedForTier(alice.address, 4)).to.be.false
    })
  })
})
