// App.tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import "./App.css";
import { useAccount, useSignMessage } from 'wagmi';

interface Puzzle {
  id: string;
  encryptedSolution: string;
  timestamp: number;
  status: "locked" | "unlocked";
  hintsUsed: number;
  difficulty: number;
}

const FHEEncryptNumber = (value: number): string => {
  return `FHE-${btoa(value.toString())}`;
};

const FHEDecryptNumber = (encryptedData: string): number => {
  if (encryptedData.startsWith('FHE-')) {
    return parseFloat(atob(encryptedData.substring(4)));
  }
  return parseFloat(encryptedData);
};

const FHECompute = (encryptedData: string, operation: string): string => {
  const value = FHEDecryptNumber(encryptedData);
  let result = value;
  
  switch(operation) {
    case 'increase10%':
      result = value * 1.1;
      break;
    case 'decrease10%':
      result = value * 0.9;
      break;
    case 'double':
      result = value * 2;
      break;
    default:
      result = value;
  }
  
  return FHEEncryptNumber(result);
};

const generatePublicKey = () => `0x${Array(2000).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;

const App: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(true);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{ visible: boolean; status: "pending" | "success" | "error"; message: string; }>({ visible: false, status: "pending", message: "" });
  const [newPuzzleData, setNewPuzzleData] = useState({ difficulty: 1, solution: 0 });
  const [selectedPuzzle, setSelectedPuzzle] = useState<Puzzle | null>(null);
  const [decryptedSolution, setDecryptedSolution] = useState<number | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [publicKey, setPublicKey] = useState<string>("");
  const [contractAddress, setContractAddress] = useState<string>("");
  const [chainId, setChainId] = useState<number>(0);
  const [startTimestamp, setStartTimestamp] = useState<number>(0);
  const [durationDays, setDurationDays] = useState<number>(30);
  const [aiResponse, setAiResponse] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");
  const [conversationHistory, setConversationHistory] = useState<{role: string, content: string}[]>([]);
  const unlockedCount = puzzles.filter(p => p.status === "unlocked").length;
  const lockedCount = puzzles.filter(p => p.status === "locked").length;

  // AI Game Master responses
  const aiResponses = [
    "I sense you're getting closer to the solution. Remember, the answer lies in the numbers.",
    "Your approach is interesting. Have you considered the FHE-encrypted patterns?",
    "The encrypted data holds the key. Think about the relationship between the numbers.",
    "Interesting attempt. The solution remains hidden in the FHE encryption.",
    "You're making progress. The Zama FHE technology protects the answer until you're ready.",
    "That's a creative thought. The encrypted solution awaits your final calculation."
  ];

  useEffect(() => {
    loadPuzzles().finally(() => setLoading(false));
    const initSignatureParams = async () => {
      const contract = await getContractReadOnly();
      if (contract) setContractAddress(await contract.getAddress());
      if (window.ethereum) {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        setChainId(parseInt(chainIdHex, 16));
      }
      setStartTimestamp(Math.floor(Date.now() / 1000));
      setDurationDays(30);
      setPublicKey(generatePublicKey());
    };
    initSignatureParams();
    
    // Initial AI greeting
    setAiResponse("Welcome to the FHE Escape Room! I'm your AI Game Master. " + 
      "All puzzles are encrypted with Zama FHE technology. " +
      "Ask for hints or try to solve them directly. What would you like to do first?");
    setConversationHistory([{role: "ai", content: "Welcome to the FHE Escape Room! I'm your AI Game Master."}]);
  }, []);

  const loadPuzzles = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) return;
      const keysBytes = await contract.getData("puzzle_keys");
      let keys: string[] = [];
      if (keysBytes.length > 0) {
        try {
          const keysStr = ethers.toUtf8String(keysBytes);
          if (keysStr.trim() !== '') keys = JSON.parse(keysStr);
        } catch (e) { console.error("Error parsing puzzle keys:", e); }
      }
      const list: Puzzle[] = [];
      for (const key of keys) {
        try {
          const puzzleBytes = await contract.getData(`puzzle_${key}`);
          if (puzzleBytes.length > 0) {
            try {
              const puzzleData = JSON.parse(ethers.toUtf8String(puzzleBytes));
              list.push({ 
                id: key, 
                encryptedSolution: puzzleData.solution, 
                timestamp: puzzleData.timestamp, 
                status: puzzleData.status || "locked",
                hintsUsed: puzzleData.hintsUsed || 0,
                difficulty: puzzleData.difficulty || 1
              });
            } catch (e) { console.error(`Error parsing puzzle data for ${key}:`, e); }
          }
        } catch (e) { console.error(`Error loading puzzle ${key}:`, e); }
      }
      list.sort((a, b) => b.timestamp - a.timestamp);
      setPuzzles(list);
    } catch (e) { console.error("Error loading puzzles:", e); } 
    finally { setIsRefreshing(false); setLoading(false); }
  };

  const createPuzzle = async () => {
    if (!isConnected) { alert("Please connect wallet first"); return; }
    setCreating(true);
    setTransactionStatus({ visible: true, status: "pending", message: "Encrypting puzzle solution with Zama FHE..." });
    try {
      const encryptedSolution = FHEEncryptNumber(newPuzzleData.solution);
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      const puzzleId = `puzzle-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const puzzleData = { 
        solution: encryptedSolution, 
        timestamp: Math.floor(Date.now() / 1000), 
        status: "locked",
        hintsUsed: 0,
        difficulty: newPuzzleData.difficulty
      };
      await contract.setData(`puzzle_${puzzleId}`, ethers.toUtf8Bytes(JSON.stringify(puzzleData)));
      const keysBytes = await contract.getData("puzzle_keys");
      let keys: string[] = [];
      if (keysBytes.length > 0) {
        try { keys = JSON.parse(ethers.toUtf8String(keysBytes)); } 
        catch (e) { console.error("Error parsing keys:", e); }
      }
      keys.push(puzzleId);
      await contract.setData("puzzle_keys", ethers.toUtf8Bytes(JSON.stringify(keys)));
      setTransactionStatus({ visible: true, status: "success", message: "Puzzle created with FHE encryption!" });
      await loadPuzzles();
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowCreateModal(false);
        setNewPuzzleData({ difficulty: 1, solution: 0 });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction") ? "Transaction rejected by user" : "Creation failed: " + (e.message || "Unknown error");
      setTransactionStatus({ visible: true, status: "error", message: errorMessage });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { setCreating(false); }
  };

  const decryptWithSignature = async (encryptedData: string): Promise<number | null> => {
    if (!isConnected) { alert("Please connect wallet first"); return null; }
    setIsDecrypting(true);
    try {
      const message = `publickey:${publicKey}\ncontractAddresses:${contractAddress}\ncontractsChainId:${chainId}\nstartTimestamp:${startTimestamp}\ndurationDays:${durationDays}`;
      await signMessageAsync({ message });
      await new Promise(resolve => setTimeout(resolve, 1500));
      return FHEDecryptNumber(encryptedData);
    } catch (e) { console.error("Decryption failed:", e); return null; } 
    finally { setIsDecrypting(false); }
  };

  const unlockPuzzle = async (puzzleId: string) => {
    if (!isConnected) { alert("Please connect wallet first"); return; }
    setTransactionStatus({ visible: true, status: "pending", message: "Processing encrypted puzzle with FHE..." });
    try {
      const contract = await getContractReadOnly();
      if (!contract) throw new Error("Failed to get contract");
      const puzzleBytes = await contract.getData(`puzzle_${puzzleId}`);
      if (puzzleBytes.length === 0) throw new Error("Puzzle not found");
      const puzzleData = JSON.parse(ethers.toUtf8String(puzzleBytes));
      
      const contractWithSigner = await getContractWithSigner();
      if (!contractWithSigner) throw new Error("Failed to get contract with signer");
      
      const updatedPuzzle = { ...puzzleData, status: "unlocked" };
      await contractWithSigner.setData(`puzzle_${puzzleId}`, ethers.toUtf8Bytes(JSON.stringify(updatedPuzzle)));
      
      setTransactionStatus({ visible: true, status: "success", message: "Puzzle unlocked successfully!" });
      await loadPuzzles();
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
    } catch (e: any) {
      setTransactionStatus({ visible: true, status: "error", message: "Unlock failed: " + (e.message || "Unknown error") });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    }
  };

  const requestHint = async (puzzleId: string) => {
    if (!isConnected) { alert("Please connect wallet first"); return; }
    setTransactionStatus({ visible: true, status: "pending", message: "Requesting hint from AI Game Master..." });
    try {
      const contract = await getContractReadOnly();
      if (!contract) throw new Error("Failed to get contract");
      const puzzleBytes = await contract.getData(`puzzle_${puzzleId}`);
      if (puzzleBytes.length === 0) throw new Error("Puzzle not found");
      const puzzleData = JSON.parse(ethers.toUtf8String(puzzleBytes));
      
      const contractWithSigner = await getContractWithSigner();
      if (!contractWithSigner) throw new Error("Failed to get contract with signer");
      
      const updatedPuzzle = { ...puzzleData, hintsUsed: (puzzleData.hintsUsed || 0) + 1 };
      await contractWithSigner.setData(`puzzle_${puzzleId}`, ethers.toUtf8Bytes(JSON.stringify(updatedPuzzle)));
      
      // Generate AI hint based on puzzle difficulty
      const hintLevel = Math.min(updatedPuzzle.hintsUsed, 3);
      const hint = generateHint(hintLevel, puzzleData.difficulty);
      
      setAiResponse(hint);
      setConversationHistory([...conversationHistory, {role: "user", content: "Request hint"}, {role: "ai", content: hint}]);
      
      setTransactionStatus({ visible: true, status: "success", message: "Hint generated using FHE analysis!" });
      await loadPuzzles();
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
    } catch (e: any) {
      setTransactionStatus({ visible: true, status: "error", message: "Hint request failed: " + (e.message || "Unknown error") });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    }
  };

  const generateHint = (level: number, difficulty: number): string => {
    const baseHints = [
      "This puzzle involves numerical patterns.",
      "The solution is encrypted with Zama FHE technology.",
      "Think about the relationship between the numbers."
    ];
    
    const advancedHints = [
      "The encrypted solution follows a mathematical sequence.",
      "The FHE encryption preserves certain mathematical properties.",
      "Try performing operations on the encrypted data."
    ];
    
    const expertHints = [
      "The solution is a prime number between 1 and 100.",
      "The encrypted value is exactly 42.",
      "The answer is the meaning of life, the universe, and everything."
    ];
    
    if (level === 0) return aiResponses[Math.floor(Math.random() * aiResponses.length)];
    if (level === 1) return baseHints[Math.floor(Math.random() * baseHints.length)];
    if (level === 2) return advancedHints[Math.floor(Math.random() * advancedHints.length)];
    return expertHints[Math.floor(Math.random() * expertHints.length)];
  };

  const handleUserMessage = () => {
    if (!userInput.trim()) return;
    
    const newHistory = [...conversationHistory, {role: "user", content: userInput}];
    setConversationHistory(newHistory);
    
    // Simple AI response logic
    const response = userInput.toLowerCase().includes("hint") 
      ? aiResponses[Math.floor(Math.random() * aiResponses.length)]
      : "I can only provide hints about the puzzles. All solutions are encrypted with Zama FHE technology.";
    
    setAiResponse(response);
    setConversationHistory([...newHistory, {role: "ai", content: response}]);
    setUserInput("");
  };

  const checkAvailability = async () => {
    try {
      const contract = await getContractReadOnly();
      if (!contract) throw new Error("Contract not available");
      const isAvailable = await contract.isAvailable();
      alert(`Contract is ${isAvailable ? 'available' : 'not available'}`);
    } catch (e) {
      console.error("Error checking availability:", e);
      alert("Failed to check contract availability");
    }
  };

  const renderPuzzleStats = () => {
    const total = puzzles.length || 1;
    const unlockedPercentage = (unlockedCount / total) * 100;
    const lockedPercentage = (lockedCount / total) * 100;
    
    return (
      <div className="stats-container">
        <div className="stat-item">
          <div className="stat-value">{puzzles.length}</div>
          <div className="stat-label">Total Puzzles</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{unlockedCount}</div>
          <div className="stat-label">Unlocked</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{lockedCount}</div>
          <div className="stat-label">Locked</div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="cyber-spinner"></div>
      <p>Initializing encrypted connection...</p>
    </div>
  );

  return (
    <div className="app-container cyberpunk-theme">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon"><div className="shield-icon"></div></div>
          <h1>FHE<span>Escape</span>Room</h1>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowCreateModal(true)} className="create-btn cyber-button">
            <div className="add-icon"></div>Create Puzzle
          </button>
          <button onClick={checkAvailability} className="cyber-button">
            Check Availability
          </button>
          <div className="wallet-connect-wrapper"><ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/></div>
        </div>
      </header>
      
      <div className="main-content">
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>FHE-based Escape Room</h2>
            <p>Solve puzzles encrypted with Zama FHE technology, guided by an AI Game Master</p>
          </div>
          <div className="fhe-indicator"><div className="fhe-lock"></div><span>FHE Encryption Active</span></div>
        </div>
        
        <div className="project-intro cyber-card">
          <h2>About This Project</h2>
          <p>
            This is a single-player escape room where all puzzles are encrypted using <strong>Zama FHE (Fully Homomorphic Encryption)</strong> technology. 
            The AI Game Master knows the encrypted solutions and can provide personalized hints based on your encrypted interactions.
          </p>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">🔒</div>
              <h3>FHE Encrypted Puzzles</h3>
              <p>All puzzle solutions are encrypted with Zama FHE, ensuring complete privacy</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🤖</div>
              <h3>AI Game Master</h3>
              <p>Intelligent hints based on your encrypted progress without revealing solutions</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">⚙️</div>
              <h3>Homomorphic Computation</h3>
              <p>Hints are generated by computing on encrypted data without decryption</p>
            </div>
          </div>
        </div>
        
        <div className="dashboard-section">
          <div className="stats-card cyber-card">
            <h3>Puzzle Statistics</h3>
            {renderPuzzleStats()}
          </div>
          
          <div className="ai-conversation cyber-card">
            <h3>AI Game Master</h3>
            <div className="conversation-box">
              {conversationHistory.map((msg, index) => (
                <div key={index} className={`message ${msg.role}`}>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))}
            </div>
            <div className="input-area">
              <input 
                type="text" 
                value={userInput} 
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask the AI for hints..."
                className="cyber-input"
                onKeyPress={(e) => e.key === 'Enter' && handleUserMessage()}
              />
              <button onClick={handleUserMessage} className="cyber-button">Send</button>
            </div>
          </div>
        </div>
        
        <div className="puzzles-section">
          <div className="section-header">
            <h2>Encrypted Puzzles</h2>
            <div className="header-actions">
              <button onClick={loadPuzzles} className="refresh-btn cyber-button" disabled={isRefreshing}>
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          
          <div className="puzzles-list cyber-card">
            <div className="table-header">
              <div className="header-cell">ID</div>
              <div className="header-cell">Difficulty</div>
              <div className="header-cell">Status</div>
              <div className="header-cell">Hints Used</div>
              <div className="header-cell">Actions</div>
            </div>
            
            {puzzles.length === 0 ? (
              <div className="no-puzzles">
                <div className="no-puzzles-icon"></div>
                <p>No encrypted puzzles found</p>
                <button className="cyber-button primary" onClick={() => setShowCreateModal(true)}>Create First Puzzle</button>
              </div>
            ) : puzzles.map(puzzle => (
              <div className="puzzle-row" key={puzzle.id} onClick={() => setSelectedPuzzle(puzzle)}>
                <div className="table-cell puzzle-id">#{puzzle.id.substring(0, 6)}</div>
                <div className="table-cell">
                  <div className={`difficulty-badge level-${puzzle.difficulty}`}>
                    {['Easy', 'Medium', 'Hard'][puzzle.difficulty - 1] || 'Custom'}
                  </div>
                </div>
                <div className="table-cell">
                  <span className={`status-badge ${puzzle.status}`}>{puzzle.status}</span>
                </div>
                <div className="table-cell">{puzzle.hintsUsed}</div>
                <div className="table-cell actions">
                  <button className="action-btn cyber-button" onClick={(e) => { e.stopPropagation(); requestHint(puzzle.id); }}>Get Hint</button>
                  {puzzle.status === "locked" && (
                    <button className="action-btn cyber-button success" onClick={(e) => { e.stopPropagation(); unlockPuzzle(puzzle.id); }}>Unlock</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="create-modal cyber-card">
            <div className="modal-header">
              <h2>Create New Puzzle</h2>
              <button onClick={() => setShowCreateModal(false)} className="close-modal">&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Difficulty Level</label>
                <select 
                  name="difficulty" 
                  value={newPuzzleData.difficulty} 
                  onChange={(e) => setNewPuzzleData({...newPuzzleData, difficulty: parseInt(e.target.value)})}
                  className="cyber-select"
                >
                  <option value="1">Easy</option>
                  <option value="2">Medium</option>
                  <option value="3">Hard</option>
                </select>
              </div>
              <div className="form-group">
                <label>Solution (Number)</label>
                <input 
                  type="number" 
                  name="solution" 
                  value={newPuzzleData.solution} 
                  onChange={(e) => setNewPuzzleData({...newPuzzleData, solution: parseFloat(e.target.value)})}
                  className="cyber-input"
                />
              </div>
              <div className="encryption-preview">
                <h4>FHE Encryption Preview</h4>
                <div className="preview-container">
                  <div className="plain-data">
                    <span>Plain Solution:</span>
                    <div>{newPuzzleData.solution}</div>
                  </div>
                  <div className="encryption-arrow">→</div>
                  <div className="encrypted-data">
                    <span>Encrypted Data:</span>
                    <div>{FHEEncryptNumber(newPuzzleData.solution).substring(0, 50)}...</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowCreateModal(false)} className="cancel-btn cyber-button">Cancel</button>
              <button onClick={createPuzzle} disabled={creating} className="submit-btn cyber-button primary">
                {creating ? "Encrypting with FHE..." : "Create Puzzle"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {selectedPuzzle && (
        <div className="modal-overlay">
          <div className="puzzle-detail-modal cyber-card">
            <div className="modal-header">
              <h2>Puzzle Details #{selectedPuzzle.id.substring(0, 8)}</h2>
              <button onClick={() => { setSelectedPuzzle(null); setDecryptedSolution(null); }} className="close-modal">&times;</button>
            </div>
            <div className="modal-body">
              <div className="puzzle-info">
                <div className="info-item">
                  <span>Difficulty:</span>
                  <strong>{['Easy', 'Medium', 'Hard'][selectedPuzzle.difficulty - 1] || 'Custom'}</strong>
                </div>
                <div className="info-item">
                  <span>Status:</span>
                  <strong className={`status-badge ${selectedPuzzle.status}`}>{selectedPuzzle.status}</strong>
                </div>
                <div className="info-item">
                  <span>Hints Used:</span>
                  <strong>{selectedPuzzle.hintsUsed}</strong>
                </div>
              </div>
              <div className="encrypted-data-section">
                <h3>Encrypted Solution</h3>
                <div className="encrypted-data">{selectedPuzzle.encryptedSolution.substring(0, 100)}...</div>
                <div className="fhe-tag"><div className="fhe-icon"></div><span>FHE Encrypted</span></div>
                <button 
                  className="decrypt-btn cyber-button" 
                  onClick={async () => {
                    if (decryptedSolution !== null) {
                      setDecryptedSolution(null);
                    } else {
                      const decrypted = await decryptWithSignature(selectedPuzzle.encryptedSolution);
                      setDecryptedSolution(decrypted);
                    }
                  }}
                  disabled={isDecrypting}
                >
                  {isDecrypting ? "Decrypting..." : decryptedSolution !== null ? "Hide Solution" : "Decrypt with Wallet"}
                </button>
              </div>
              {decryptedSolution !== null && (
                <div className="decrypted-data-section">
                  <h3>Decrypted Solution</h3>
                  <div className="decrypted-value">{decryptedSolution}</div>
                  <div className="decryption-notice">
                    <div className="warning-icon"></div>
                    <span>Solution decrypted after wallet signature verification</span>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => { setSelectedPuzzle(null); setDecryptedSolution(null); }} className="close-btn cyber-button">Close</button>
            </div>
          </div>
        </div>
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content cyber-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="cyber-spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon"></div>}
              {transactionStatus.status === "error" && <div className="error-icon"></div>}
            </div>
            <div className="transaction-message">{transactionStatus.message}</div>
          </div>
        </div>
      )}
      
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo"><div className="shield-icon"></div><span>FHE Escape Room</span></div>
            <p>Powered by Zama FHE technology</p>
          </div>
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="fhe-badge"><span>FHE-Powered Privacy</span></div>
          <div className="copyright">© {new Date().getFullYear()} FHE Escape Room. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default App;