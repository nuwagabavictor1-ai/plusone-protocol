// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

/// @title PlusOne — 一块钱计划 (+1)
/// @notice Attention protocol on Base. Each +1 = $1.20 USDC ($1 to dreamer, $0.20 to Merit Pool).
///         Dreams cost $1 to publish (→ Dream Fund). Weekly raffle via Chainlink VRF.
contract PlusOne is ReentrancyGuard, VRFConsumerBaseV2 {
    using SafeERC20 for IERC20;

    // ══════════════════════════════════════════
    //  Types
    // ══════════════════════════════════════════

    struct Dream {
        string thought;
        uint256 timestamp;
    }

    struct UserProfile {
        uint256 totalReceived;  // lifetime +1s received
        uint256 totalGiven;     // lifetime +1s given
        uint256 balance;        // withdrawable USDC (6 decimals)
        uint256 dreamCount;     // number of dreams published
        bool    registered;
    }

    enum RaffleState { Idle, Participation, Drawing, Settled }

    // ══════════════════════════════════════════
    //  Constants
    // ══════════════════════════════════════════

    uint256 public constant ONE_DOLLAR      = 1_000_000;   // USDC 6 decimals
    uint256 public constant GIVE_COST       = 1_200_000;   // $1.20 per +1
    uint256 public constant MERIT_SHARE     = 200_000;     // $0.20 to Merit Pool
    uint256 public constant RECIPIENT_SHARE = 1_000_000;   // $1.00 to recipient
    uint256 public constant DREAM_COST      = 1_000_000;   // $1 per dream
    uint256 public constant MAX_THOUGHT_LEN = 280;         // bytes
    uint256 public constant MAX_FEE_BPS     = 1000;        // 10% max withdrawal fee
    uint256 public constant RAFFLE_WINDOW   = 1 hours;
    uint256 public constant RAFFLE_TIMEOUT  = 24 hours;    // VRF timeout for cancelRaffle
    uint256 public constant TIER_1          = 7;
    uint256 public constant TIER_2          = 77;
    uint256 public constant TIER_3          = 777;

    // ══════════════════════════════════════════
    //  Immutables
    // ══════════════════════════════════════════

    address public immutable owner;
    IERC20  public immutable usdc;

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64  private immutable i_subscriptionId;
    bytes32 private immutable i_keyHash;
    uint32  private immutable i_callbackGasLimit;
    uint16  private constant  REQUEST_CONFIRMATIONS = 3;
    uint32  private constant  NUM_WORDS = 3; // one random word per tier

    // ══════════════════════════════════════════
    //  Core State
    // ══════════════════════════════════════════

    mapping(address => UserProfile) private profiles;
    mapping(address => Dream[])     private dreams;
    address[] private registeredUsers;

    uint256 public meritPool;     // accumulated $0.20 from +1s
    uint256 public dreamFund;     // accumulated $1 from dream publishing
    uint256 public collectedFees; // accumulated withdrawal fees

    uint256 public withdrawalFeeBps; // basis points, max MAX_FEE_BPS

    bool public paused; // emergency pause flag

    // Weekly activity: weekNumber => user => givenCount
    mapping(uint256 => mapping(address => uint256)) private weeklyGiven;

    // ══════════════════════════════════════════
    //  Raffle State
    // ══════════════════════════════════════════

    uint256 public raffleRoundId;
    uint256 public raffleWeekNumber;
    RaffleState public raffleState;
    uint256 public raffleParticipationStart;
    uint256 public raffleMeritPoolSnapshot;
    uint256 private raffleDrawTimestamp; // when drawRaffle was called (for timeout)

    // Tier participant arrays (1-indexed: [0]=tier1, [1]=tier2, [2]=tier3)
    address[][] private tierParticipants; // length 3

    // Per-round mappings (keyed by roundId to avoid expensive clearing)
    mapping(uint256 => mapping(address => bool))    private raffleParticipated;
    mapping(uint256 => mapping(address => bool))    private raffleClaimed;
    mapping(uint256 => mapping(uint8   => address)) private raffleWinners;
    mapping(uint256 => mapping(uint8   => uint256)) private rafflePrizes;

    // Prize distribution in basis points (must sum to 10000)
    uint256 public tier1PrizeBps = 1500; // 15%
    uint256 public tier2PrizeBps = 3500; // 35%
    uint256 public tier3PrizeBps = 5000; // 50%

    // VRF request tracking
    mapping(uint256 => uint256) private vrfRequestToRound;

    // ══════════════════════════════════════════
    //  Events
    // ══════════════════════════════════════════

    event Registered(address indexed user, uint256 dreamIndex, string thought);
    event DreamPublished(address indexed user, uint256 dreamIndex, string thought);
    event PlusOneGiven(
        address indexed from,
        address indexed to,
        uint256 recipientNewCount,
        uint256 meritPoolContribution
    );
    event Withdrawn(address indexed user, uint256 amount, uint256 fee);
    event RaffleStarted(uint256 indexed weekNumber, uint256 meritPoolBalance);
    event RaffleParticipated(address indexed user, uint8 tier, uint256 indexed weekNumber);
    event RaffleDrawn(uint256 indexed weekNumber, uint256 requestId);
    event RaffleWinnerSelected(
        uint256 indexed weekNumber,
        uint8 tier,
        address indexed winner,
        uint256 prize
    );
    event RaffleCancelled(uint256 indexed weekNumber);
    event PrizeClaimed(address indexed user, uint256 amount);
    event DreamFundWithdrawn(address indexed by, uint256 amount, uint256 remaining);
    event FeesCollected(address indexed by, uint256 amount);
    event WithdrawalFeeUpdated(uint256 newFeeBps);
    event RafflePrizeDistributionUpdated(uint256 t1, uint256 t2, uint256 t3);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    // ══════════════════════════════════════════
    //  Errors
    // ══════════════════════════════════════════

    error AlreadyRegistered();
    error NotRegistered();
    error EmptyThought();
    error ThoughtTooLong();
    error CannotGiveToSelf();
    error RecipientNotRegistered();
    error NothingToWithdraw();
    error FeeTooHigh();
    error NoFeesToCollect();
    error Unauthorized();
    error ContractPaused();
    error InvalidTier();
    error RaffleNotInState(RaffleState expected, RaffleState actual);
    error RaffleWindowNotOpen();
    error RaffleWindowNotClosed();
    error AlreadyParticipated();
    error NotQualifiedForTier(uint8 tier, uint256 actual, uint256 required);
    error NotAWinner();
    error AlreadyClaimed();
    error InsufficientDreamFund();
    error InvalidPrizeDistribution();
    error SameWeekRaffle();
    error DreamIndexOutOfBounds();
    error RaffleTimeoutNotReached();

    // ══════════════════════════════════════════
    //  Modifiers
    // ══════════════════════════════════════════

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    // ══════════════════════════════════════════
    //  Constructor
    // ══════════════════════════════════════════

    constructor(
        address _usdc,
        address _vrfCoordinator,
        uint64  _subscriptionId,
        bytes32 _keyHash,
        uint32  _callbackGasLimit
    )
        VRFConsumerBaseV2(_vrfCoordinator)
    {
        owner              = msg.sender;
        usdc               = IERC20(_usdc);
        i_vrfCoordinator   = VRFCoordinatorV2Interface(_vrfCoordinator);
        i_subscriptionId   = _subscriptionId;
        i_keyHash          = _keyHash;
        i_callbackGasLimit = _callbackGasLimit;

        // Initialize tier participant arrays (3 tiers)
        tierParticipants.push(); // tier 1 (index 0)
        tierParticipants.push(); // tier 2 (index 1)
        tierParticipants.push(); // tier 3 (index 2)
    }

    // ══════════════════════════════════════════
    //  Core — register
    // ══════════════════════════════════════════

    /// @notice Register with your first dream. Costs $1 USDC → Dream Fund.
    function register(string calldata thought) external nonReentrant whenNotPaused {
        if (profiles[msg.sender].registered) revert AlreadyRegistered();
        if (bytes(thought).length == 0)      revert EmptyThought();
        if (bytes(thought).length > MAX_THOUGHT_LEN) revert ThoughtTooLong();

        // Charge $1 to Dream Fund
        usdc.safeTransferFrom(msg.sender, address(this), DREAM_COST);
        dreamFund += DREAM_COST;

        profiles[msg.sender] = UserProfile({
            totalReceived: 0,
            totalGiven:    0,
            balance:       0,
            dreamCount:    1,
            registered:    true
        });

        dreams[msg.sender].push(Dream({
            thought:   thought,
            timestamp: block.timestamp
        }));

        registeredUsers.push(msg.sender);

        emit Registered(msg.sender, 0, thought);
    }

    // ══════════════════════════════════════════
    //  Core — publishDream
    // ══════════════════════════════════════════

    /// @notice Publish an additional dream. Costs $1 USDC → Dream Fund.
    function publishDream(string calldata thought) external nonReentrant whenNotPaused {
        if (!profiles[msg.sender].registered) revert NotRegistered();
        if (bytes(thought).length == 0)       revert EmptyThought();
        if (bytes(thought).length > MAX_THOUGHT_LEN) revert ThoughtTooLong();

        usdc.safeTransferFrom(msg.sender, address(this), DREAM_COST);
        dreamFund += DREAM_COST;

        uint256 idx = dreams[msg.sender].length;
        dreams[msg.sender].push(Dream({
            thought:   thought,
            timestamp: block.timestamp
        }));
        profiles[msg.sender].dreamCount += 1;

        emit DreamPublished(msg.sender, idx, thought);
    }

    // ══════════════════════════════════════════
    //  Core — give (+1)
    // ══════════════════════════════════════════

    /// @notice Give +1 to a dreamer. Costs $1.20 USDC ($1 to dreamer, $0.20 to Merit Pool).
    function give(address recipient) external nonReentrant whenNotPaused {
        if (!profiles[recipient].registered) revert RecipientNotRegistered();
        if (recipient == msg.sender)         revert CannotGiveToSelf();

        // Transfer $1.20 from sender
        usdc.safeTransferFrom(msg.sender, address(this), GIVE_COST);

        // Split: $1 to recipient, $0.20 to Merit Pool
        profiles[recipient].balance      += RECIPIENT_SHARE;
        profiles[recipient].totalReceived += 1;
        profiles[msg.sender].totalGiven  += 1;
        meritPool                        += MERIT_SHARE;

        // Track weekly activity for raffle qualification
        uint256 week = _getWeekNumber(block.timestamp);
        weeklyGiven[week][msg.sender] += 1;

        emit PlusOneGiven(msg.sender, recipient, profiles[recipient].totalReceived, MERIT_SHARE);
    }

    // ══════════════════════════════════════════
    //  Core — withdraw
    // ══════════════════════════════════════════

    /// @notice Withdraw accumulated USDC balance. Works even when paused.
    function withdraw() external nonReentrant {
        UserProfile storage p = profiles[msg.sender];
        if (p.balance == 0) revert NothingToWithdraw();

        uint256 total  = p.balance;
        uint256 fee    = (total * withdrawalFeeBps) / 10000;
        uint256 payout = total - fee;

        p.balance = 0;
        collectedFees += fee;

        usdc.safeTransfer(msg.sender, payout);

        emit Withdrawn(msg.sender, payout, fee);
    }

    // ══════════════════════════════════════════
    //  Raffle — lifecycle
    // ══════════════════════════════════════════

    /// @notice Start a new raffle round. Opens a 1-hour participation window.
    function startRaffle() external onlyOwner whenNotPaused {
        // Allow starting from Idle or Settled
        if (raffleState != RaffleState.Idle && raffleState != RaffleState.Settled) {
            revert RaffleNotInState(RaffleState.Idle, raffleState);
        }

        uint256 currentWeek = _getWeekNumber(block.timestamp);
        if (currentWeek == raffleWeekNumber && raffleRoundId > 0) revert SameWeekRaffle();

        // Increment round (effectively resets per-round mappings)
        raffleRoundId += 1;
        raffleWeekNumber = currentWeek;
        raffleState = RaffleState.Participation;
        raffleParticipationStart = block.timestamp;
        raffleMeritPoolSnapshot = meritPool;
        raffleDrawTimestamp = 0;

        // Clear participant arrays
        delete tierParticipants[0];
        delete tierParticipants[1];
        delete tierParticipants[2];

        // Calculate prizes per tier from snapshot
        rafflePrizes[raffleRoundId][1] = (raffleMeritPoolSnapshot * tier1PrizeBps) / 10000;
        rafflePrizes[raffleRoundId][2] = (raffleMeritPoolSnapshot * tier2PrizeBps) / 10000;
        rafflePrizes[raffleRoundId][3] = (raffleMeritPoolSnapshot * tier3PrizeBps) / 10000;

        emit RaffleStarted(currentWeek, meritPool);
    }

    /// @notice Participate in the current raffle. Must qualify for the chosen tier.
    /// @param tier 1, 2, or 3
    function participateRaffle(uint8 tier) external whenNotPaused {
        if (raffleState != RaffleState.Participation) {
            revert RaffleNotInState(RaffleState.Participation, raffleState);
        }
        if (block.timestamp > raffleParticipationStart + RAFFLE_WINDOW) {
            revert RaffleWindowNotOpen();
        }
        if (tier < 1 || tier > 3) revert InvalidTier();
        if (raffleParticipated[raffleRoundId][msg.sender]) revert AlreadyParticipated();

        // Check qualification
        uint256 given = weeklyGiven[raffleWeekNumber][msg.sender];
        uint256 required = _tierThreshold(tier);
        if (given < required) {
            revert NotQualifiedForTier(tier, given, required);
        }

        raffleParticipated[raffleRoundId][msg.sender] = true;
        tierParticipants[tier - 1].push(msg.sender);

        emit RaffleParticipated(msg.sender, tier, raffleWeekNumber);
    }

    /// @notice Draw raffle winners via Chainlink VRF. Call after participation window closes.
    function drawRaffle() external onlyOwner whenNotPaused {
        if (raffleState != RaffleState.Participation) {
            revert RaffleNotInState(RaffleState.Participation, raffleState);
        }
        if (block.timestamp <= raffleParticipationStart + RAFFLE_WINDOW) {
            revert RaffleWindowNotClosed();
        }

        // If no participants in any tier, settle immediately
        if (
            tierParticipants[0].length == 0 &&
            tierParticipants[1].length == 0 &&
            tierParticipants[2].length == 0
        ) {
            raffleState = RaffleState.Settled;
            emit RaffleDrawn(raffleWeekNumber, 0);
            return;
        }

        // Request VRF
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        vrfRequestToRound[requestId] = raffleRoundId;
        raffleState = RaffleState.Drawing;
        raffleDrawTimestamp = block.timestamp;

        emit RaffleDrawn(raffleWeekNumber, requestId);
    }

    /// @notice Cancel a stuck raffle (VRF timeout after 24h in Drawing state).
    function cancelRaffle() external onlyOwner {
        if (raffleState != RaffleState.Drawing) {
            revert RaffleNotInState(RaffleState.Drawing, raffleState);
        }
        if (block.timestamp < raffleDrawTimestamp + RAFFLE_TIMEOUT) {
            revert RaffleTimeoutNotReached();
        }

        // Return to idle, merit pool untouched (snapshot was just a reference)
        raffleState = RaffleState.Idle;
        emit RaffleCancelled(raffleWeekNumber);
    }

    /// @notice Claim your raffle prize.
    function claimPrize() external nonReentrant whenNotPaused {
        if (raffleState != RaffleState.Settled) {
            revert RaffleNotInState(RaffleState.Settled, raffleState);
        }
        if (raffleClaimed[raffleRoundId][msg.sender]) revert AlreadyClaimed();

        // Find which tier the caller won
        uint256 prize = 0;
        for (uint8 t = 1; t <= 3; t++) {
            if (raffleWinners[raffleRoundId][t] == msg.sender) {
                prize = rafflePrizes[raffleRoundId][t];
                break;
            }
        }
        if (prize == 0) revert NotAWinner();

        raffleClaimed[raffleRoundId][msg.sender] = true;

        // Deduct from meritPool and transfer
        meritPool -= prize;
        usdc.safeTransfer(msg.sender, prize);

        emit PrizeClaimed(msg.sender, prize);
    }

    // ══════════════════════════════════════════
    //  VRF callback
    // ══════════════════════════════════════════

    /// @dev Chainlink VRF callback — select one winner per tier.
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 roundId = vrfRequestToRound[requestId];
        if (roundId == 0) return; // unknown request

        delete vrfRequestToRound[requestId];

        // Select winners for each tier
        for (uint8 t = 0; t < 3; t++) {
            address[] storage participants = tierParticipants[t];
            if (participants.length == 0) continue;

            uint256 winnerIdx = randomWords[t] % participants.length;
            address winner = participants[winnerIdx];

            raffleWinners[roundId][t + 1] = winner;

            emit RaffleWinnerSelected(
                raffleWeekNumber,
                t + 1,
                winner,
                rafflePrizes[roundId][t + 1]
            );
        }

        raffleState = RaffleState.Settled;
    }

    // ══════════════════════════════════════════
    //  Admin
    // ══════════════════════════════════════════

    /// @notice Set withdrawal fee in basis points (max 10%).
    function setWithdrawalFee(uint256 feeBps) external onlyOwner {
        if (feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        withdrawalFeeBps = feeBps;
        emit WithdrawalFeeUpdated(feeBps);
    }

    /// @notice Set raffle prize distribution. Must sum to 10000 BPS.
    function setRafflePrizeDistribution(
        uint256 _t1,
        uint256 _t2,
        uint256 _t3
    ) external onlyOwner {
        if (_t1 + _t2 + _t3 != 10000) revert InvalidPrizeDistribution();
        tier1PrizeBps = _t1;
        tier2PrizeBps = _t2;
        tier3PrizeBps = _t3;
        emit RafflePrizeDistributionUpdated(_t1, _t2, _t3);
    }

    /// @notice Collect accumulated withdrawal fees.
    function collectFees() external onlyOwner nonReentrant {
        uint256 amount = collectedFees;
        if (amount == 0) revert NoFeesToCollect();
        collectedFees = 0;
        usdc.safeTransfer(msg.sender, amount);
        emit FeesCollected(msg.sender, amount);
    }

    /// @notice Withdraw from Dream Fund.
    function withdrawDreamFund(uint256 amount) external onlyOwner nonReentrant {
        if (amount > dreamFund) revert InsufficientDreamFund();
        dreamFund -= amount;
        usdc.safeTransfer(msg.sender, amount);
        emit DreamFundWithdrawn(msg.sender, amount, dreamFund);
    }

    /// @notice Emergency pause. Freezes everything except withdraw().
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Resume operations.
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ══════════════════════════════════════════
    //  View functions
    // ══════════════════════════════════════════

    function getProfile(address user) external view returns (UserProfile memory) {
        return profiles[user];
    }

    function getDreams(address user) external view returns (Dream[] memory) {
        return dreams[user];
    }

    function getDream(address user, uint256 index) external view returns (Dream memory) {
        if (index >= dreams[user].length) revert DreamIndexOutOfBounds();
        return dreams[user][index];
    }

    function getUserCount() external view returns (uint256) {
        return registeredUsers.length;
    }

    function getWeekNumber() public view returns (uint256) {
        return _getWeekNumber(block.timestamp);
    }

    function getWeeklyGivenCount(address user, uint256 weekNum) external view returns (uint256) {
        return weeklyGiven[weekNum][user];
    }

    function isQualifiedForTier(address user, uint8 tier) external view returns (bool) {
        if (tier < 1 || tier > 3) return false;
        uint256 currentWeek = _getWeekNumber(block.timestamp);
        return weeklyGiven[currentWeek][user] >= _tierThreshold(tier);
    }

    function getRaffleParticipants(uint8 tier) external view returns (address[] memory) {
        if (tier < 1 || tier > 3) revert InvalidTier();
        return tierParticipants[tier - 1];
    }

    function getRaffleWinner(uint8 tier) external view returns (address) {
        return raffleWinners[raffleRoundId][tier];
    }

    function getRafflePrize(uint8 tier) external view returns (uint256) {
        return rafflePrizes[raffleRoundId][tier];
    }

    // ══════════════════════════════════════════
    //  Internal helpers
    // ══════════════════════════════════════════

    /// @dev Monday-aligned week number from Unix timestamp.
    ///      Unix epoch (Jan 1 1970) was Thursday. +3 days aligns to Monday boundary.
    function _getWeekNumber(uint256 timestamp) internal pure returns (uint256) {
        return (timestamp + 3 days) / 7 days;
    }

    /// @dev Get the +1 threshold for a given tier.
    function _tierThreshold(uint8 tier) internal pure returns (uint256) {
        if (tier == 1) return TIER_1;
        if (tier == 2) return TIER_2;
        if (tier == 3) return TIER_3;
        revert InvalidTier();
    }
}
