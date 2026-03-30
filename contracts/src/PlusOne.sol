// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

/// @title PlusOne — 一块钱宇宙 (+1)
/// @notice Fixed $1 USDC attention protocol on Base.
///         Each transfer = one "+1" = "I see you."
contract PlusOne is ReentrancyGuard, VRFConsumerBaseV2 {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────

    struct Profile {
        string thought;    // "如果有 +1，我会…"
        uint256 count;     // total +1s received (never resets)
        uint256 balance;   // withdrawable USDC balance
        bool registered;
    }

    // ─────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────

    uint256 public constant ONE_DOLLAR = 1_000_000; // USDC has 6 decimals
    uint256 public constant MAX_FEE    = 500_000;   // max $0.50 platform fee

    // ─────────────────────────────────────────
    // State
    // ─────────────────────────────────────────

    address public immutable owner;
    IERC20  public immutable usdc;

    // VRF config (Chainlink VRFv2)
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64  private immutable i_subscriptionId;
    bytes32 private immutable i_keyHash;
    uint32  private immutable i_callbackGasLimit;
    uint16  private constant REQUEST_CONFIRMATIONS = 3;
    uint32  private constant NUM_WORDS = 1;

    // Platform fee per withdrawal (in USDC units, default 0)
    uint256 public withdrawalFee;

    // Accumulated platform fees
    uint256 public collectedFees;

    // User profiles
    mapping(address => Profile) private profiles;

    // All registered addresses (for VRF random selection)
    address[] private registeredUsers;

    // VRF request → new user (for welcome +1)
    mapping(uint256 => address) private vrfRequestToNewUser;

    // ─────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────

    event Registered(address indexed user, string thought);
    event PlusOneGiven(address indexed from, address indexed to, uint256 newCount);
    event Withdrawn(address indexed user, uint256 amount, uint256 fee);
    event FeesCollected(address indexed by, uint256 amount);
    event WithdrawalFeeUpdated(uint256 newFee);

    // ─────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────

    error AlreadyRegistered();
    error NotRegistered();
    error EmptyThought();
    error CannotGiveToSelf();
    error NothingToWithdraw();
    error FeeTooHigh();
    error NoFeesToCollect();
    error Unauthorized();

    // ─────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    // ─────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────

    constructor(
        address _usdc,
        address _vrfCoordinator,
        uint64  _subscriptionId,
        bytes32 _keyHash,
        uint32  _callbackGasLimit
    )
        VRFConsumerBaseV2(_vrfCoordinator)
    {
        owner             = msg.sender;
        usdc              = IERC20(_usdc);
        i_vrfCoordinator  = VRFCoordinatorV2Interface(_vrfCoordinator);
        i_subscriptionId  = _subscriptionId;
        i_keyHash         = _keyHash;
        i_callbackGasLimit = _callbackGasLimit;
    }

    // ─────────────────────────────────────────
    // Core — register
    // ─────────────────────────────────────────

    /// @notice Create your 念头 page. One per address.
    function register(string calldata thought) external {
        if (profiles[msg.sender].registered) revert AlreadyRegistered();
        if (bytes(thought).length == 0)      revert EmptyThought();

        profiles[msg.sender] = Profile({
            thought:    thought,
            count:      0,
            balance:    0,
            registered: true
        });
        registeredUsers.push(msg.sender);

        emit Registered(msg.sender, thought);

        // Trigger VRF welcome +1 if there are other users to pick from
        if (registeredUsers.length > 1) {
            _requestWelcomePlusOne(msg.sender);
        }
    }

    // ─────────────────────────────────────────
    // Core — give
    // ─────────────────────────────────────────

    /// @notice Give exactly $1 USDC to a registered address.
    ///         Caller must have approved this contract for ONE_DOLLAR USDC.
    function give(address recipient) external nonReentrant {
        if (!profiles[recipient].registered) revert NotRegistered();
        if (recipient == msg.sender)         revert CannotGiveToSelf();

        usdc.safeTransferFrom(msg.sender, address(this), ONE_DOLLAR);

        profiles[recipient].count   += 1;
        profiles[recipient].balance += ONE_DOLLAR;

        emit PlusOneGiven(msg.sender, recipient, profiles[recipient].count);
    }

    // ─────────────────────────────────────────
    // Core — withdraw
    // ─────────────────────────────────────────

    /// @notice Withdraw your accumulated USDC. Platform fee is deducted.
    function withdraw() external nonReentrant {
        Profile storage p = profiles[msg.sender];
        if (p.balance == 0) revert NothingToWithdraw();

        uint256 total  = p.balance;
        uint256 fee    = withdrawalFee < total ? withdrawalFee : 0;
        uint256 payout = total - fee;

        p.balance = 0;
        collectedFees += fee;

        usdc.safeTransfer(msg.sender, payout);

        emit Withdrawn(msg.sender, payout, fee);
    }

    // ─────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────

    /// @notice Set platform fee per withdrawal. Max $0.50.
    function setWithdrawalFee(uint256 fee) external onlyOwner {
        if (fee > MAX_FEE) revert FeeTooHigh();
        withdrawalFee = fee;
        emit WithdrawalFeeUpdated(fee);
    }

    /// @notice Collect accumulated platform fees.
    function collectFees() external onlyOwner nonReentrant {
        uint256 amount = collectedFees;
        if (amount == 0) revert NoFeesToCollect();

        collectedFees = 0;
        usdc.safeTransfer(msg.sender, amount);

        emit FeesCollected(msg.sender, amount);
    }

    // ─────────────────────────────────────────
    // VRF — welcome +1
    // ─────────────────────────────────────────

    function _requestWelcomePlusOne(address newUser) internal {
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        vrfRequestToNewUser[requestId] = newUser;
    }

    /// @dev Chainlink VRF callback — pick a random existing user to give the welcome +1
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        address newUser = vrfRequestToNewUser[requestId];
        if (newUser == address(0)) return;

        delete vrfRequestToNewUser[requestId];

        // Pick a random existing user (excluding the new user)
        uint256 userCount = registeredUsers.length;
        uint256 idx = randomWords[0] % (userCount - 1);
        address welcomer = registeredUsers[idx];

        // If we landed on the new user (pushed last), use the next slot
        if (welcomer == newUser) {
            welcomer = registeredUsers[(idx + 1) % userCount];
        }

        // Welcome +1: system-initiated, count-only. No USDC moves from welcomer.
        profiles[newUser].count += 1;

        emit PlusOneGiven(welcomer, newUser, profiles[newUser].count);
    }

    // ─────────────────────────────────────────
    // View
    // ─────────────────────────────────────────

    function getProfile(address user) external view returns (Profile memory) {
        return profiles[user];
    }

    function getUserCount() external view returns (uint256) {
        return registeredUsers.length;
    }
}
