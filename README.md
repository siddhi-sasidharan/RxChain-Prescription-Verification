# RxChain — Blockchain-Based Prescription Verification

**An educational Blockchain Technology project demonstrating smart contracts, role-based authorization, and prescription verification through a web interface.**

RxChain is a practical demonstration of how **Solidity, Ethereum-compatible wallets, and a React application** can work together to manage a simple prescription workflow. It brings together four participants — **Admin, Doctor, Pharmacy, and Patient** — to illustrate blockchain interactions, integrity checks, and the lifecycle of a digital prescription.

The project is intended for **learning and demonstration**, using synthetic prescriptions and disposable development-wallet accounts.

## Project objectives

- Understand smart contract development and deployment with **Solidity and Hardhat**.
- Demonstrate different **role-authorized operations** for an administrator, doctors, and pharmacies.
- Illustrate **hash-based comparison**, prescription status changes, and expiry validation.
- Connect a **React frontend** to a deployed contract using **ethers.js and MetaMask**.
- Demonstrate prescription lookup with a **QR code containing a prescription ID**.

## Main features

| Role | Demonstrated functionality |
|---|---|
| **Admin** | Register doctor and pharmacy wallet addresses. |
| **Doctor** | Create prescriptions for a patient wallet and cancel prescriptions they issued. |
| **Pharmacy** | Look up prescriptions and fulfill eligible ones after checking the supplied details against a stored hash. |
| **Patient** | View prescriptions associated with the connected patient wallet. |

The application supports **Active, Fulfilled, and Cancelled** prescription states, expiry checks, contract events, and QR-based prescription lookup.

## Technology stack

| Technology | Purpose |
|---|---|
| **Solidity** | Smart contract and role-specific rules |
| **Hardhat** | Local blockchain, compilation, tests and contract deployment |
| **React + Vite** | Application interface |
| **ethers.js v6** | Interacting with the deployed smart contract |
| **MetaMask** | Connecting and selecting a blockchain wallet |
| **qrcode.react / html5-qrcode** | Displaying and scanning QR codes |

## How the project works

1. Deploy the `PrescriptionVerification` smart contract to a local Ethereum-compatible development network.
2. Connect MetaMask with a disposable local test wallet.
3. The administrator registers sample doctors and pharmacies.
4. A registered doctor creates a synthetic prescription for a patient wallet, including example medicine details and a hash.
5. A QR code represents the prescription ID for easier lookup.
6. A registered pharmacy verifies the details and fulfills a prescription that is active and within its validity period.
7. The patient can view prescriptions linked to their connected wallet.

**Note:** The contract's hash comparison checks whether supplied details match the recorded hash. Demo information is used throughout; do not enter real patient records or real-wallet credentials.

## Project structure

```text
contracts/prescription-verification.sol     Solidity smart contract
scripts/deploy.js                          Contract deployment script
test/prescription-verification.test.js      Hardhat contract tests
hardhat.config.js                          Blockchain development configuration
frontend/src/App.jsx                       React user interface
frontend/src/PrescriptionVerification.json  Contract ABI for frontend interaction
frontend/src/contract-address.js           Development contract address
```

## Run the project locally

**Requirements:** Node.js, npm and MetaMask (or another compatible browser wallet). Use a **local test blockchain** and disposable accounts, rather than a real-funds wallet.

In the project root, install packages and run the included tests:

```powershell
npm ci
npx hardhat test
```

Start the local blockchain in **Terminal 1**:

```powershell
npx hardhat node
```

Deploy the smart contract in **Terminal 2**:

```powershell
npx hardhat run scripts/deploy.js --network localhost
```

Configure MetaMask to use the local network (`http://127.0.0.1:8545`, chain ID `31337`) and a disposable test account. Set the deployed contract address in `frontend/src/contract-address.js` if it differs from the existing value. The contract ABI in `frontend/src/PrescriptionVerification.json` should correspond to the deployed contract.

Start the web interface in **Terminal 3**:

```powershell
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite, then connect your test wallet to explore the application.

## Screenshots

Screenshots from the working local demonstration will be added for the **Admin, Doctor, Pharmacy, Patient, and QR-code** workflows. They will illustrate real interactions with the development smart contract using example data.

## Educational purpose

RxChain was developed to make core blockchain concepts easier to understand through a familiar prescription scenario. It demonstrates **contract deployment, wallet interaction, role-controlled state changes, hash-based verification, and blockchain-backed record lookup** in one simple application.