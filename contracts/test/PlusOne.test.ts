import { expect } from "chai"
import { ethers } from "hardhat"
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers"
import { PlusOne, MockUSDC, VRFCoordinatorV2Mock } from "../typechain-types"

// $1 USDC = 1_000_000 (6 decimals)
const ONE_DOLLAR = 1_000_000n

describe("PlusOne", () => {
  // ─────────────────────────────────────────
  // Fixture
  // ─────────────────────────────────────────
  async function deployFixture() {
    const [owner, alice, bob, carol] = await ethers.getSigners()

    // Deploy mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC")
    const usdc = (await MockUSDC.deploy()) as unknown as MockUSDC

    // Deploy VRFCoordinatorV2Mock
    const VRFMock = await ethers.getContractFactory("VRFCoordinatorV2Mock")
    const vrfCoordinator = (await VRFMock.deploy(
      100000n,       // baseFee (0.1 LINK)
      1000000000n    // gasPrice (1 gwei)
    )) as unknown as VRFCoordinatorV2Mock

    // Create and fund VRF subscription
    const createTx = await vrfCoordinator.createSubscription()
    const receipt  = await createTx.wait()
    const subId    = (receipt.events?.[0].args?.[0] as bigint) ?? 1n

    await vrfCoordinator.fundSubscription(subId, ethers.parseEther("10"))

    // Deploy PlusOne
    const PlusOne = await ethers.getContractFactory("PlusOne")
    const plusOne = (await PlusOne.deploy(
      await usdc.getAddress(),
      await vrfCoordinator.getAddress(),
      subId,
      ethers.encodeBytes32String("keyHash"),
      100000n // VRF callback gas limit
    )) as unknown as PlusOne

    // Register PlusOne as VRF consumer
    await vrfCoordinator.addConsumer(subId, await plusOne.getAddress())

    // Mint USDC to test accounts
    await usdc.mint(alice.address, ONE_DOLLAR * 100n)
    await usdc.mint(bob.address, ONE_DOLLAR * 100n)
    await usdc.mint(carol.address, ONE_DOLLAR * 100n)

    return { plusOne, usdc, vrfCoordinator, subId, owner, alice, bob, carol }
  }

  // ─────────────────────────────────────────
  // register
  // ─────────────────────────────────────────
  describe("register()", () => {
    it("allows a user to register with a thought", async () => {
      const { plusOne, alice } = await loadFixture(deployFixture)

      await plusOne.connect(alice).register("如果有 +1，我会开一家小书店")

      const profile = await plusOne.getProfile(alice.address)
      expect(profile.thought).to.equal("如果有 +1，我会开一家小书店")
      expect(profile.count).to.equal(0n)
      expect(profile.registered).to.be.true
    })

    it("emits Registered event", async () => {
      const { plusOne, alice } = await loadFixture(deployFixture)

      await expect(plusOne.connect(alice).register("如果有 +1，我会..."))
        .to.emit(plusOne, "Registered")
        .withArgs(alice.address, "如果有 +1，我会...")
    })

    it("reverts if already registered", async () => {
      const { plusOne, alice } = await loadFixture(deployFixture)

      await plusOne.connect(alice).register("first thought")
      await expect(
        plusOne.connect(alice).register("second thought")
      ).to.be.revertedWithCustomError(plusOne, "AlreadyRegistered")
    })

    it("reverts if thought is empty", async () => {
      const { plusOne, alice } = await loadFixture(deployFixture)

      await expect(
        plusOne.connect(alice).register("")
      ).to.be.revertedWithCustomError(plusOne, "EmptyThought")
    })
  })

  // ─────────────────────────────────────────
  // give
  // ─────────────────────────────────────────
  describe("give()", () => {
    it("transfers exactly $1 USDC and increments count", async () => {
      const { plusOne, usdc, alice, bob } = await loadFixture(deployFixture)

      await plusOne.connect(bob).register("如果有 +1...")
      await usdc.connect(alice).approve(await plusOne.getAddress(), ONE_DOLLAR)

      await plusOne.connect(alice).give(bob.address)

      const profile = await plusOne.getProfile(bob.address)
      expect(profile.count).to.equal(1n)
      expect(profile.balance).to.equal(ONE_DOLLAR)
    })

    it("emits PlusOneGiven event", async () => {
      const { plusOne, usdc, alice, bob } = await loadFixture(deployFixture)

      await plusOne.connect(bob).register("如果有 +1...")
      await usdc.connect(alice).approve(await plusOne.getAddress(), ONE_DOLLAR)

      await expect(plusOne.connect(alice).give(bob.address))
        .to.emit(plusOne, "PlusOneGiven")
        .withArgs(alice.address, bob.address, 1n)
    })

    it("reverts if recipient is not registered", async () => {
      const { plusOne, usdc, alice, bob } = await loadFixture(deployFixture)

      await usdc.connect(alice).approve(await plusOne.getAddress(), ONE_DOLLAR)

      await expect(
        plusOne.connect(alice).give(bob.address)
      ).to.be.revertedWithCustomError(plusOne, "NotRegistered")
    })

    it("reverts if giving to yourself", async () => {
      const { plusOne, usdc, alice } = await loadFixture(deployFixture)

      await plusOne.connect(alice).register("如果有 +1...")
      await usdc.connect(alice).approve(await plusOne.getAddress(), ONE_DOLLAR)

      await expect(
        plusOne.connect(alice).give(alice.address)
      ).to.be.revertedWithCustomError(plusOne, "CannotGiveToSelf")
    })

    it("reverts if USDC allowance is insufficient", async () => {
      const { plusOne, alice, bob } = await loadFixture(deployFixture)

      await plusOne.connect(bob).register("如果有 +1...")
      // no approve

      await expect(
        plusOne.connect(alice).give(bob.address)
      ).to.be.reverted
    })

    it("accumulates multiple +1s correctly", async () => {
      const { plusOne, usdc, alice, bob, carol } = await loadFixture(deployFixture)

      await plusOne.connect(bob).register("如果有 +1...")
      await usdc.connect(alice).approve(await plusOne.getAddress(), ONE_DOLLAR)
      await usdc.connect(carol).approve(await plusOne.getAddress(), ONE_DOLLAR)

      await plusOne.connect(alice).give(bob.address)
      await plusOne.connect(carol).give(bob.address)

      const profile = await plusOne.getProfile(bob.address)
      expect(profile.count).to.equal(2n)
      expect(profile.balance).to.equal(ONE_DOLLAR * 2n)
    })
  })

  // ─────────────────────────────────────────
  // withdraw
  // ─────────────────────────────────────────
  describe("withdraw()", () => {
    it("transfers USDC to user (no fee by default)", async () => {
      const { plusOne, usdc, alice, bob } = await loadFixture(deployFixture)

      await plusOne.connect(bob).register("如果有 +1...")
      await usdc.connect(alice).approve(await plusOne.getAddress(), ONE_DOLLAR)
      await plusOne.connect(alice).give(bob.address)

      const balanceBefore = await usdc.balanceOf(bob.address)
      await plusOne.connect(bob).withdraw()
      const balanceAfter = await usdc.balanceOf(bob.address)

      expect(balanceAfter - balanceBefore).to.equal(ONE_DOLLAR)
    })

    it("deducts platform fee on withdrawal", async () => {
      const { plusOne, usdc, alice, bob, owner } = await loadFixture(deployFixture)

      await plusOne.connect(owner).setWithdrawalFee(100_000n)

      await plusOne.connect(bob).register("如果有 +1...")
      await usdc.connect(alice).approve(await plusOne.getAddress(), ONE_DOLLAR)
      await plusOne.connect(alice).give(bob.address)

      const balanceBefore = await usdc.balanceOf(bob.address)
      await plusOne.connect(bob).withdraw()
      const balanceAfter = await usdc.balanceOf(bob.address)

      expect(balanceAfter - balanceBefore).to.equal(ONE_DOLLAR - 100_000n)
    })

    it("reverts if balance is zero", async () => {
      const { plusOne, alice } = await loadFixture(deployFixture)

      await plusOne.connect(alice).register("如果有 +1...")

      await expect(
        plusOne.connect(alice).withdraw()
      ).to.be.revertedWithCustomError(plusOne, "NothingToWithdraw")
    })

    it("resets balance to zero after withdrawal, keeps count", async () => {
      const { plusOne, usdc, alice, bob } = await loadFixture(deployFixture)

      await plusOne.connect(bob).register("如果有 +1...")
      await usdc.connect(alice).approve(await plusOne.getAddress(), ONE_DOLLAR)
      await plusOne.connect(alice).give(bob.address)

      await plusOne.connect(bob).withdraw()

      const profile = await plusOne.getProfile(bob.address)
      expect(profile.balance).to.equal(0n)
      // count is a permanent record — does NOT reset
      expect(profile.count).to.equal(1n)
    })

    it("accumulated fees can be collected by owner", async () => {
      const { plusOne, usdc, alice, bob, owner } = await loadFixture(deployFixture)

      await plusOne.connect(owner).setWithdrawalFee(100_000n)

      await plusOne.connect(bob).register("如果有 +1...")
      await usdc.connect(alice).approve(await plusOne.getAddress(), ONE_DOLLAR)
      await plusOne.connect(alice).give(bob.address)
      await plusOne.connect(bob).withdraw()

      const ownerBalanceBefore = await usdc.balanceOf(owner.address)
      await plusOne.connect(owner).collectFees()
      const ownerBalanceAfter = await usdc.balanceOf(owner.address)

      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(100_000n)
    })
  })

  // ─────────────────────────────────────────
  // admin
  // ─────────────────────────────────────────
  describe("admin", () => {
    it("only owner can set withdrawal fee", async () => {
      const { plusOne, alice } = await loadFixture(deployFixture)

      await expect(
        plusOne.connect(alice).setWithdrawalFee(100_000n)
      ).to.be.revertedWithCustomError(plusOne, "Unauthorized")
    })

    it("fee cannot exceed $0.50 (500_000 units)", async () => {
      const { plusOne, owner } = await loadFixture(deployFixture)

      await expect(
        plusOne.connect(owner).setWithdrawalFee(600_000n)
      ).to.be.revertedWithCustomError(plusOne, "FeeTooHigh")
    })
  })
})
