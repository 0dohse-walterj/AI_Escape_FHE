# FHE-based Escape the Room with an AI Game Master

Dive into an immersive puzzle experience where your mind is the ultimate key! This project is a single-player "Escape the Room" game, ingeniously powered by **Zama's Fully Homomorphic Encryption (FHE) technology**. With an AI Game Master guiding you through mysterious challenges, every hint is tailored to your encrypted actions, ensuring you enjoy a unique and secure adventure.

## Understanding the Challenge

In conventional puzzle games, players often face predictable patterns and hints that can lead to a lack of engagement. Traditional systems also risk player fairness, revealing too much or too little information based on their performance. This project aims to address these pain points by creating a dynamic and personalized puzzle-solving experience where AI adapts and responds based on the player’s actions while keeping everything confidential.

## How FHE Provides the Solution

Leveraging the power of FHE, our game enables the AI to generate hints and adapt the difficulty level without ever revealing sensitive information about the player's behavior or choices. With Zama's open-source libraries—specifically the **Concrete** library—developers can seamlessly implement encryption, ensuring that all inputs and outputs remain secure. By computing directly on encrypted data, the AI can offer personalized assistance, making each user's journey through the puzzles both challenging and fair.

## Core Features

- **Encrypted Puzzle Solutions:** Each puzzle relies on FHE for encrypted problem-solving, ensuring confidentiality.
- **Dynamic AI Hints:** The AI Master provides hints that are intelligently derived from player behavior, respecting the privacy of their actions.
- **Fairness Guarantee:** By using homomorphic encryption, the game safeguards against "hint cheating," ensuring all players have an equal chance to succeed.
- **Single-Player Focus:** A unique solo exploration experience where you can engage with the AI and environment without distractions.
- **Adaptive Difficulty:** The AI adjusts the puzzle's difficulty in real-time based on your performance and decision-making.

## Technology Stack

- **Zama's Concrete FHE Library:** The primary component for implementing secure, confidential computing.
- **Node.js:** A JavaScript runtime for developing the game logic and server-side components.
- **Hardhat:** A development environment for blockchain applications to streamline testing and deployment.
- **Solidity:** The programming language for writing smart contracts in Ethereum.

## Directory Structure

```plaintext
/AI_Escape_FHE
│
├── contracts
│   └── AI_Escape_FHE.sol
├── src
│   ├── gameLogic.js
│   ├── aiMaster.js
│   └── puzzles.js
├── tests
│   ├── gameLogic.test.js
│   └── aiMaster.test.js
├── package.json
└── README.md
```

## Installation Instructions

Before running the game, make sure you have the following dependencies installed:

1. **Node.js** - Ensure you have Node.js installed on your machine. If not, download it from the Node.js official site.
2. **Hardhat** or **Foundry** - Depending on your preference for Ethereum development.

After you have installed these dependencies, follow these steps to set up the project:

1. Navigate to the project folder: `cd AI_Escape_FHE`
2. Run the following command to install the required dependencies, including the Zama FHE libraries:
   ```bash
   npm install
   ```

## Build and Run the Game

Once the installation is complete, you can compile the smart contracts and run the game as follows:

1. **Compile the Contracts:**
   ```bash
   npx hardhat compile
   ```
   
2. **Run the Game:**
   After compiling, you can start the game with the following command:
   ```bash
   node src/gameLogic.js
   ```

3. **Test the AI Responses and Logic:**
   If you wish to test the AI's decision-making and puzzle generation, you can execute:
   ```bash
   npx hardhat test
   ```

## Example Code Snippet

Here’s a small code snippet demonstrating how the AI provides hints based on encrypted player actions:

```javascript
const { encrypt, decrypt } = require('zama-fhe-sdk');

function generateHint(encryptedPlayerAction) {
    const decryptedAction = decrypt(encryptedPlayerAction);
    let hint;

    // AI logic to provide hints based on decrypted player action
    if (decryptedAction === 'solvedPuzzle') {
        hint = "Great job! Look around for hidden clues!";
    } else {
        hint = "Try examining the mysterious painting on the wall.";
    }

    return encrypt(hint);
}
```

## Acknowledgements

### Powered by Zama

We would like to extend our gratitude to the Zama team for their pioneering work in Fully Homomorphic Encryption and for providing the open-source tools that empower us to create innovative and secure blockchain applications. Your dedication to privacy and security paves the way for the next generation of interactive experiences!

Discover the future of gaming with **FHE-based Escape the Room**—where puzzles are encrypted, hints are intelligent, and every player’s experience is uniquely their own!
