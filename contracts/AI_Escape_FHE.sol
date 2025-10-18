pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract AIEscapeFHE is SepoliaConfig {
    using FHE for euint32;
    using FHE for ebool;

    address public owner;
    mapping(address => bool) public isProvider;
    mapping(address => uint256) public lastSubmissionTime;
    mapping(address => uint256) public lastDecryptionRequestTime;
    uint256 public cooldownSeconds = 30;
    bool public paused = false;
    uint256 public currentBatchId = 0;
    bool public batchOpen = false;

    struct DecryptionContext {
        uint256 batchId;
        bytes32 stateHash;
        bool processed;
    }
    mapping(uint256 => DecryptionContext) public decryptionContexts;

    // Encrypted state for the game
    // For simplicity, we'll use a few euint32s to represent game state elements.
    // In a real game, this would be more complex.
    euint32 internal encryptedPlayerProgress;
    euint32 internal encryptedPuzzleState1;
    euint32 internal encryptedPuzzleState2;
    ebool internal encryptedHintEligibility;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ProviderAdded(address indexed provider);
    event ProviderRemoved(address indexed provider);
    event CooldownSet(uint256 oldCooldown, uint256 newCooldown);
    event Paused(address account);
    event Unpaused(address account);
    event BatchOpened(uint256 batchId);
    event BatchClosed(uint256 batchId);
    event PlayerActionSubmitted(address indexed player, uint256 batchId, bytes32 indexed actionHash);
    event DecryptionRequested(uint256 indexed requestId, uint256 batchId, bytes32 stateHash);
    event DecryptionCompleted(uint256 indexed requestId, uint256 batchId, uint256 playerProgress, uint256 puzzleState1, uint256 puzzleState2, bool hintEligibility);

    error NotOwner();
    error NotProvider();
    error PausedError();
    error CooldownActive();
    error BatchClosedError();
    error ReplayAttempt();
    error StateMismatch();
    error InvalidBatchState();
    error InvalidCooldown();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyProvider() {
        if (!isProvider[msg.sender]) revert NotProvider();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert PausedError();
        _;
    }

    modifier checkCooldown(address _user) {
        if (block.timestamp < lastSubmissionTime[_user] + cooldownSeconds) {
            revert CooldownActive();
        }
        _;
    }

    constructor() {
        owner = msg.sender;
        isProvider[owner] = true;
        emit ProviderAdded(owner);
        emit OwnershipTransferred(address(0), owner);
    }

    function transferOwnership(address newOwner) public onlyOwner {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function addProvider(address provider) public onlyOwner {
        if (!isProvider[provider]) {
            isProvider[provider] = true;
            emit ProviderAdded(provider);
        }
    }

    function removeProvider(address provider) public onlyOwner {
        if (isProvider[provider]) {
            isProvider[provider] = false;
            emit ProviderRemoved(provider);
        }
    }

    function setCooldown(uint256 newCooldownSeconds) public onlyOwner {
        if (newCooldownSeconds == 0) revert InvalidCooldown();
        uint256 oldCooldown = cooldownSeconds;
        cooldownSeconds = newCooldownSeconds;
        emit CooldownSet(oldCooldown, newCooldownSeconds);
    }

    function pause() public onlyOwner whenNotPaused {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() public onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function openBatch() public onlyOwner whenNotPaused {
        if (batchOpen) revert InvalidBatchState();
        currentBatchId++;
        batchOpen = true;
        emit BatchOpened(currentBatchId);
    }

    function closeBatch() public onlyOwner whenNotPaused {
        if (!batchOpen) revert InvalidBatchState();
        batchOpen = false;
        emit BatchClosed(currentBatchId);
    }

    function _initIfNeeded() internal {
        if (!encryptedPlayerProgress.isInitialized()) {
            encryptedPlayerProgress = FHE.asEuint32(0);
        }
        if (!encryptedPuzzleState1.isInitialized()) {
            encryptedPuzzleState1 = FHE.asEuint32(0);
        }
        if (!encryptedPuzzleState2.isInitialized()) {
            encryptedPuzzleState2 = FHE.asEuint32(0);
        }
        if (!encryptedHintEligibility.isInitialized()) {
            encryptedHintEligibility = FHE.asEbool(false);
        }
    }

    function _requireInitialized() internal view {
        if (!encryptedPlayerProgress.isInitialized() ||
            !encryptedPuzzleState1.isInitialized() ||
            !encryptedPuzzleState2.isInitialized() ||
            !encryptedHintEligibility.isInitialized()) {
            revert("Contract state not initialized. Call a state-updating function first.");
        }
    }

    function _hashCiphertexts(
        euint32 _encryptedPlayerProgress,
        euint32 _encryptedPuzzleState1,
        euint32 _encryptedPuzzleState2,
        ebool _encryptedHintEligibility
    ) internal pure returns (bytes32) {
        bytes32[4] memory cts = [
            _encryptedPlayerProgress.toBytes32(),
            _encryptedPuzzleState1.toBytes32(),
            _encryptedPuzzleState2.toBytes32(),
            _encryptedHintEligibility.toBytes32()
        ];
        return keccak256(abi.encode(cts, address(this)));
    }

    function submitPlayerAction(
        euint32 encryptedActionType, // e.g., 1 for "examine object", 2 for "use item"
        euint32 encryptedActionTarget // e.g., 101 for "blue key", 205 for "strange painting"
    ) external onlyProvider whenNotPaused checkCooldown(msg.sender) {
        if (!batchOpen) revert BatchClosedError();

        _initIfNeeded();

        // Simulate AI processing based on action and current state
        // This is a placeholder for more complex FHE logic
        euint32 _encryptedPlayerProgress = encryptedPlayerProgress;
        euint32 _encryptedPuzzleState1 = encryptedPuzzleState1;
        euint32 _encryptedPuzzleState2 = encryptedPuzzleState2;
        ebool _encryptedHintEligibility = encryptedHintEligibility;

        // Example FHE operations:
        // 1. Update player progress based on action type and target
        euint32 progressUpdate = encryptedActionType.add(encryptedActionTarget);
        _encryptedPlayerProgress = _encryptedPlayerProgress.add(progressUpdate);

        // 2. Update puzzle states (simplified example)
        ebool isAction1 = encryptedActionType.eq(FHE.asEuint32(1));
        euint32 puzzleUpdate1 = FHE.select(FHE.asEuint32(10), FHE.asEuint32(0), isAction1);
        _encryptedPuzzleState1 = _encryptedPuzzleState1.add(puzzleUpdate1);

        // 3. Determine hint eligibility (e.g., if progress > 50)
        ebool progressGt50 = _encryptedPlayerProgress.ge(FHE.asEuint32(50));
        _encryptedHintEligibility = progressGt50;

        // Update state
        encryptedPlayerProgress = _encryptedPlayerProgress;
        encryptedPuzzleState1 = _encryptedPuzzleState1;
        encryptedPuzzleState2 = _encryptedPuzzleState2; // Not updated in this example
        encryptedHintEligibility = _encryptedHintEligibility;

        lastSubmissionTime[msg.sender] = block.timestamp;
        bytes32 actionHash = keccak256(abi.encodePacked(encryptedActionType.toBytes32(), encryptedActionTarget.toBytes32()));
        emit PlayerActionSubmitted(msg.sender, currentBatchId, actionHash);
    }

    function requestGameStatusDecryption() external onlyProvider whenNotPaused checkCooldown(msg.sender) {
        if (!batchOpen) revert BatchClosedError();
        _requireInitialized();

        euint32 _encryptedPlayerProgress = encryptedPlayerProgress;
        euint32 _encryptedPuzzleState1 = encryptedPuzzleState1;
        euint32 _encryptedPuzzleState2 = encryptedPuzzleState2;
        ebool _encryptedHintEligibility = encryptedHintEligibility;

        bytes32[4] memory cts = [
            _encryptedPlayerProgress.toBytes32(),
            _encryptedPuzzleState1.toBytes32(),
            _encryptedPuzzleState2.toBytes32(),
            _encryptedHintEligibility.toBytes32()
        ];

        bytes32 stateHash = _hashCiphertexts(
            _encryptedPlayerProgress,
            _encryptedPuzzleState1,
            _encryptedPuzzleState2,
            _encryptedHintEligibility
        );

        uint256 requestId = FHE.requestDecryption(cts, this.myCallback.selector);
        decryptionContexts[requestId] = DecryptionContext({
            batchId: currentBatchId,
            stateHash: stateHash,
            processed: false
        });

        lastDecryptionRequestTime[msg.sender] = block.timestamp;
        emit DecryptionRequested(requestId, currentBatchId, stateHash);
    }

    function myCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        if (decryptionContexts[requestId].processed) {
            revert ReplayAttempt();
        }
        // Security: Replay protection ensures a decryption result is processed only once.

        _requireInitialized();
        euint32 _encryptedPlayerProgress = encryptedPlayerProgress;
        euint32 _encryptedPuzzleState1 = encryptedPuzzleState1;
        euint32 _encryptedPuzzleState2 = encryptedPuzzleState2;
        ebool _encryptedHintEligibility = encryptedHintEligibility;

        bytes32 currentStateHash = _hashCiphertexts(
            _encryptedPlayerProgress,
            _encryptedPuzzleState1,
            _encryptedPuzzleState2,
            _encryptedHintEligibility
        );

        // Security: State verification ensures that the contract's encrypted state
        // has not changed since the decryption was requested. This prevents
        // scenarios where an attacker might try to get a decryption for an old state.
        if (currentStateHash != decryptionContexts[requestId].stateHash) {
            revert StateMismatch();
        }

        FHE.checkSignatures(requestId, cleartexts, proof);

        uint256 playerProgress = abi.decode(cleartexts[0:32], (uint256));
        uint256 puzzleState1 = abi.decode(cleartexts[32:64], (uint256));
        uint256 puzzleState2 = abi.decode(cleartexts[64:96], (uint256));
        bool hintEligibility = abi.decode(cleartexts[96:128], (bool));

        decryptionContexts[requestId].processed = true;
        emit DecryptionCompleted(requestId, decryptionContexts[requestId].batchId, playerProgress, puzzleState1, puzzleState2, hintEligibility);
    }
}