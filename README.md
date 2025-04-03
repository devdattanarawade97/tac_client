
---

# **Project Documentation: BIMA Token Swap Application**

**Version:** 1.0
**Date:** Thursday, April 3, 2025

## 1. Project Overview

This document describes the BIMA Token Swap application, a web-based tool likely designed to operate as a Telegram Mini App (TMA). Its core purpose is to facilitate cross-chain token swaps between The Open Network (TON) and an EVM-compatible chain, specifically focusing on minting BMBTC tokens using TON and burning BMBTC tokens to receive TON.

The application leverages the `tac-sdk` (likely TeleportDAO's Asset Channel SDK) for cross-chain communication and transaction execution. It uses TonConnectUI for seamless wallet integration within the TON ecosystem and Svelte/SvelteKit for the frontend framework.

**Key Technologies:**

* **Frontend:** Svelte, SvelteKit
* **Blockchain Interaction (TON):** @tonconnect/ui, @ton/ton (TonClient, toNano)
* **Blockchain Interaction (EVM/Cross-Chain):** tac-sdk, ethers.js
* **Styling:** CSS (with CSS Variables), Telegram Mini App theme variables
* **Language:** JavaScript (ES Modules)

## 2. Features

* **TON Wallet Connection:** Integrates with TON wallets (Tonkeeper, TON Wallet, Tonhub) via TonConnectUI.
* **Token Minting:** Allows users to spend TON tokens to mint equivalent BMBTC tokens via a cross-chain transaction.
* **Token Burning:** Allows users to burn BMBTC tokens to receive equivalent TON tokens via a cross-chain transaction.
* **Balance Display:** Shows the user's current TON and BMBTC balances.
* **Equivalent Amount Calculation:** Calculates and displays the expected output amount before initiating a swap.
* **Real-time Transaction Tracking:** Monitors the status of ongoing cross-chain operations using `tac-sdk` and updates the UI with progress.
* **Transaction History:** Displays a list of the user's past mint/burn transactions with their final status.
* **Telegram Mini App Styling:** Utilizes TMA theme variables for a native look and feel within Telegram (especially on the history page).

## 3. Setup & Installation

This guide assumes the project is structured as a standard SvelteKit application.

### 3.1. Prerequisites

* Node.js (LTS version recommended)
* A package manager (npm, yarn, or pnpm)

### 3.2. Installation Steps

1.  **Clone Repository (if applicable):**
    ```bash
    git clone <repository_url>
    cd <project_directory>
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    # or yarn install or pnpm install
    ```
3.  **Environment Variables:**
    Create a `.env` file in the root of the project and populate it with the necessary environment variables. These are crucial for connecting to the correct contracts, tokens, and backend services.
    * `PUBLIC_JETTON_TOKEN_ADDRESS`: The address of the TON Jetton used (likely WTON wrapper).
    * `PUBLIC_WTON_TOKEN_ADDRESS`: (Potentially redundant if same as above, verify usage).
    * `PUBLIC_TREASURE_SWAP_ADDRESS`: The main address of the swap/treasury contract on the EVM side.
    * `PUBLIC_TREASURE_SWAP_PROXY`: The proxy address used for interacting with the swap contract (via TAC SDK).
    * `PUBLIC_TON_ADDRESS`: (Purpose unclear from context, might be a specific contract or standard TON address).
    * `PUBLIC_BMBTC_TOKEN_ADDRESS`: The EVM address of the BMBTC token contract.
    * `PUBLIC_BACKEND_URI`: The base URL for the backend API used to store and retrieve transaction history.

    **Example `.env` file:**
    ```dotenv
    PUBLIC_JETTON_TOKEN_ADDRESS=EQ...
    PUBLIC_WTON_TOKEN_ADDRESS=EQ...
    PUBLIC_TREASURE_SWAP_ADDRESS=0x...
    PUBLIC_TREASURE_SWAP_PROXY=0x...
    PUBLIC_TON_ADDRESS=EQ...
    PUBLIC_BMBTC_TOKEN_ADDRESS=0x...
    PUBLIC_BACKEND_URI=https://your-backend-api.com
    ```
4.  **TonConnect Manifest:**
    Ensure the `static/tonconnect-manifest.json` file is present and correctly configured. The `url` field within this manifest *must* point to the publicly accessible URL where the application is hosted for TonConnectUI to function correctly, especially with mobile wallets. The `onMount` function in the main wallet component dynamically fetches this file to set the `manifestUrl` for `TonConnectUI`.

### 3.3. Running the Application

* **Development Mode:**
    ```bash
    npm run dev
    ```
    This will start the SvelteKit development server, typically accessible at `http://localhost:5173`.
* **Production Build:**
    ```bash
    npm run build
    ```
    This command compiles the application for production deployment. The output can then be served using an adapter (e.g., `adapter-node`, `adapter-static`, `adapter-vercel`).

## 4. Project Structure

Based on the provided files and common SvelteKit conventions:

```
.
├── static/
│   └── tonconnect-manifest.json   # Configuration for TonConnectUI
├── src/
│   ├── abi/
│   │   └── treasureySwapABI.json  # ABI for the EVM swap contract
│   ├── helper/
│   │   ├── getJettonBalance.js    # (Inferred) Fetches specific Jetton balance
│   │   ├── getTonBalance.js       # (Inferred) Fetches native TON balance
│   │   ├── validateAmount.js      # (Inferred) Validates input amounts
│   │   └── equivalentBmBtc.js   # (Inferred) Calculates BMBTC equivalent
│   ├── hooks/
│   │   ├── getLatestTransactions.js # Fetches transaction history from backend
│   │   ├── postTransaction.js       # Sends new transaction data to backend
│   │   └── updateTransactionStatus.js # Updates transaction status on backend
│   ├── routes/
│   │   ├── +page.svelte             # Main wallet/swap interface component
│   │   └── transactions/
│   │       └── +page.svelte         # Transaction history component
│   ├── store/
│   │   └── walletStore.js         # Defines tonwalletaddressStore (Svelte store)
│   └── tokens/
│       └── tokens.json            # Configuration for tokens (decimals, value?)
│   ├── app.html                     # Main HTML template
│   └── hooks.server.js              # (Optional) SvelteKit server hooks
├── .env                           # Environment variables (Needs creation)
├── package.json
└── svelte.config.js
```

*(Note: Filenames/paths for helpers and stores are inferred based on import paths in the components).*

## 5. Core Components

### 5.1. Wallet Component (`src/routes/+page.svelte`)

* **Purpose:** Serves as the primary user interface for wallet connection, token balance display, and initiating Mint/Burn operations.
* **Key Logic:**
    * Initializes `TonConnectUI` on mount, configuring wallets and manifest URL.
    * Subscribes to wallet connection status changes (`tonConnect.onStatusChange`).
    * Upon connection:
        * Initializes `TacSdk` for cross-chain operations.
        * Gets the `sender` object from `SenderFactory`.
        * Fetches user's TON, Jetton (WTON), and BMBTC balances.
        * Stores the connected TON address in `tonwalletaddressStore`.
        * Resolves EVM/TVM addresses using `tac_sdk`.
    * Handles tab switching between "Mint" and "Burn" views.
    * Calculates equivalent token amounts (`equivalentBmbtc`, `equivalentWton`) based on user input using data from `tokens.json`.
    * Provides `MintTokens` function:
        * Validates input.
        * Encodes parameters using `ethers.AbiCoder`.
        * Calls `tac_sdk.sendCrossChainTransaction` with appropriate EVM message and assets (TON).
        * Calls `postTransaction` hook to save the pending operation to the backend.
        * Initiates operation tracking (`getOperationId`, `trackTransaction`) and updates UI progress.
    * Provides `BurnTokens` function:
        * Validates input.
        * Encodes parameters.
        * Calls `tac_sdk.sendCrossChainTransaction` with appropriate EVM message and assets (BMBTC).
        * Calls `postTransaction` hook.
        * Initiates tracking and updates UI.
* **UI Elements:** TonConnect button container (`#ton-connect`), Mint/Burn tabs, input fields for TON/BMBTC amounts, balance displays, calculated receive amounts, Mint/Burn action buttons, status/progress bar display.

### 5.2. Transaction History Component (`src/routes/transactions/+page.svelte`)

* **Purpose:** Displays a list of the user's past transactions and monitors the status of any pending ones fetched from the backend.
* **Key Logic:**
    * Retrieves the user's TON address from `tonwalletaddressStore`.
    * On mount (`onMount`): Fetches the transaction list using the `getLatestTransactions` hook.
    * Handles loading (`isLoading`) and error (`error`) states during the fetch.
    * If transactions are fetched successfully:
        * Filters for transactions with `status === 'pending'`.
        * Initiates concurrent background tracking for each pending transaction using the `trackTransaction` function.
    * `trackTransaction(tx)` function:
        * Uses `OperationTracker` from `tac-sdk` to poll `tracker.getOperationStatus(tx.operationId)`.
        * Runs in a loop with delay (`setTimeout`) and retry limit (`maxAttempts`).
        * Maps SDK statuses (`EVMMerkleMessageCollected`, `TVMMerkleMessageExecuted`, etc.) to application statuses (`pending`, `completed`, `failed`, `unknown`).
        * Updates the status of the transaction directly in the `transactions` array (triggering Svelte reactivity via `$:` or assignment).
        * Calls the `updateTransactionStatus` hook to persist the final status (`completed`, `failed`, `unknown`) to the backend.
* **UI Elements:** Loading indicator, error message display, "No transactions" message, a table displaying Op ID, Type, Amount, and Status (with dynamic badges and spinners). Includes a "Back to Wallet" navigation link.

## 6. Key Modules & Helpers

### 6.1. API Hooks (`src/hooks/`)

These functions encapsulate communication with the backend API.

* **`getLatestTransactions(userId)`:** Retrieves transaction history. See Section 7.1.
* **`postTransaction(userId, operationDetails)`:** Creates a new transaction record. See Section 7.2.
* **`updateTransactionStatus(operationId, newStatus)`:** Updates the status of an existing transaction. See Section 7.3.

### 6.2. Wallet Store (`src/store/walletStore.js`)

* **`tonwalletaddressStore`:** A Svelte writable store holding the connected user's TON wallet address. Components subscribe to this store to get the current address. It's populated by the main Wallet Component upon successful connection via TonConnectUI.

### 6.3. Helper Functions (`src/helper/`)

*(Based on imports; actual implementation details not provided)*

* **`getJettonBalance`:** Likely fetches the balance of a specific Jetton token for a given TON address.
* **`getTonBalance`:** Fetches the native TON balance for a given TON address.
* **`validateAmount`:** Performs validation checks on user-entered token amounts.
* **`getEquivalentBmbtc` / `getEquivalentTon`:** Calculates the expected output amount for a swap based on the input amount and likely an exchange rate or value defined in `tokens.json`.

### 6.4. Configuration (`src/tokens/tokens.json`)

* Contains configuration data for tokens, presumably including decimals and potentially a `tokenValue` used for calculating swap equivalents between TON and BMBTC.

### 6.5. ABI (`src/abi/treasureySwapABI.json`)

* The Application Binary Interface (ABI) definition for the EVM smart contract (`PUBLIC_TREASURE_SWAP_PROXY`). This JSON file describes the contract's functions (like `mint(bytes,bytes)`, `burn(bytes,bytes)`) and structures, enabling `ethers.js` (used internally by `tac-sdk` or directly) to encode function calls correctly.

## 7. API Documentation (Backend Interaction)

The frontend application interacts with a backend service defined by the `PUBLIC_BACKEND_URI` environment variable. The following endpoints are used based on the provided hook functions:

### 7.1. Get Transactions

* **Description:** Retrieves the latest transactions associated with a specific user ID.
* **Endpoint:** `/api/transactions`
* **Method:** `GET`
* **Query Parameters:**
    * `userid` (string, required): The identifier for the user (likely the TON wallet address).
* **Success Response (200 OK):**
    * `Content-Type: application/json`
    * **Body:** `Array<TransactionObject>`
        * *TransactionObject Structure (example):*
            ```json
            [
              {
                "operationId": "op-abc-123",
                "status": "completed",
                "type": "mint",
                "amount": 0.05,
                "currency": "BMBTC",
                "timestamp": "2025-04-03T14:30:00Z"
              },
              // ... other transactions
            ]
            ```
* **Error Responses:**
    * `404 Not Found`: User not found or no transactions exist.
    * `400 Bad Request`: Invalid or missing `userid`.
    * `500 Internal Server Error`: Backend error.

### 7.2. Post (Create) Transaction

* **Description:** Creates a new transaction record, typically when a mint or burn operation is initiated.
* **Endpoint:** `/api/transactions`
* **Method:** `POST`
* **Request Body:**
    * `Content-Type: application/json`
    * **Body Structure:**
        ```json
        {
          "userId": "string", // User's identifier (TON address)
          "operation": {
            "operationId": "string", // Unique ID from TacSdk/Frontend
            "status": "string",    // Initial status (e.g., 'pending')
            "type": "string",      // 'mint' or 'burn'
            "amount": "number|string", // Amount involved (e.g., 0.05)
            "currency": "string"   // Currency of the amount (e.g., 'BMBTC' or 'TON')
          }
        }
        ```
* **Success Response (201 Created or 200 OK):**
    * `Content-Type: application/json`
    * **Body:** `TransactionObject` (The newly created transaction record as stored in the backend).
* **Error Responses:**
    * `400 Bad Request`: Invalid or missing data in the request body.
    * `500 Internal Server Error`: Backend error.

### 7.3. Put (Update) Transaction Status

* **Description:** Updates the status of an existing transaction identified by its `operationId`.
* **Endpoint:** `/api/transactions`
* **Method:** `PUT`
* **Query Parameters:**
    * `operationid` (string, required): The unique ID of the transaction to update.
* **Request Body:**
    * `Content-Type: application/json`
    * **Body Structure:**
        ```json
        {
          "newStatus": "string" // The new status (e.g., 'completed', 'failed', 'unknown')
        }
        ```
* **Success Response:**
    * `200 OK`:
        * `Content-Type: application/json`
        * **Body:** `TransactionObject` (The updated transaction record) or a success message object.
    * `204 No Content`: Update was successful, but no response body is returned.
* **Error Responses:**
    * `404 Not Found`: No transaction found with the given `operationid`.
    * `400 Bad Request`: Invalid or missing data in the request body or query parameter.
    * `500 Internal Server Error`: Backend error.

## 8. Libraries & Technologies Summary

* **Svelte/SvelteKit:** Frontend framework for building reactive user interfaces.
* **@tonconnect/ui:** Library for connecting TON wallets easily.
* **tac-sdk:** SDK for facilitating cross-chain operations (sending transactions, tracking status).
* **ethers.js:** Library for interacting with EVM blockchains (used for ABI encoding).
* **@ton/ton:** Core TON library (includes `TonClient` for interacting with TON blockchain, `toNano` for unit conversion).
* **JavaScript (ES Modules):** The primary programming language.
* **CSS:** Used for styling, leveraging CSS variables and modern layout techniques (Flexbox).

## 9. Workflow / Logic Flow

### 9.1. Connection & Initialization

1.  User opens the application/TMA.
2.  Wallet Component mounts, initializes `TonConnectUI`.
3.  User clicks the "Connect Wallet" button (rendered by TonConnectUI).
4.  User selects a wallet (e.g., Tonkeeper) and approves the connection.
5.  `tonConnect.onStatusChange` callback fires with wallet info.
6.  Wallet address is stored in `tonwalletaddressStore`.
7.  `TacSdk` is initialized.
8.  User balances (TON, WTON, BMBTC) are fetched and displayed.

### 9.2. Mint Flow (TON -> BMBTC)

1.  User selects the "Mint" tab.
2.  User enters the amount of TON they wish to spend in the input field.
3.  `handleJettonInputChange` calculates the `equivalentBmbtc` to be received and updates the UI.
4.  User clicks the "Mint BMBTC" button.
5.  `MintTokens` function is called:
    a.  Input validation occurs.
    b.  `ethers.AbiCoder` encodes the `mint(bytes,bytes)` call parameters.
    c.  `tac_sdk.sendCrossChainTransaction` is called, sending the TON asset and the encoded EVM message. This returns a `transactionLinker`.
    d.  The `postTransaction` hook is called immediately to save the operation with 'pending' status to the backend API.
    e.  `getOperationId` starts polling the `transactionLinker` to get the unique cross-chain `operationId`.
    f.  Once `operationId` is obtained, `trackTransaction` (in the history component, triggered after navigation or on mount) starts polling `OperationTracker.getOperationStatus`.
    g.  The UI progress bar in the Wallet Component updates based on tracking status (e.g., percentage based on intermediate SDK statuses).
    h.  When tracking detects a final status (`TVMMerkleMessageExecuted` for success, or an error), `updateTransactionStatus` is called to update the backend record.
    i.  UI reflects the final success or failure message.

### 9.3. Burn Flow (BMBTC -> TON)

1.  User selects the "Burn" tab.
2.  User enters the amount of BMBTC they wish to burn.
3.  `handleBmbtcInputChange` calculates the `equivalentWton` to be received and updates the UI.
4.  User clicks the "Burn BMBTC" button.
5.  `BurnTokens` function is called:
    a.  Input validation occurs.
    b.  `ethers.AbiCoder` encodes the `burn(bytes,bytes)` call parameters.
    c.  `tac_sdk.sendCrossChainTransaction` is called, sending the BMBTC asset (using its TVM address) and the encoded EVM message. Returns `transactionLinker`.
    d.  `postTransaction` hook saves the 'pending' operation.
    e.  `getOperationId` polls for the `operationId`.
    f.  `trackTransaction` polls for status updates.
    g.  UI progress bar updates.
    h.  `updateTransactionStatus` updates the backend on final status.
    i.  UI reflects completion.

### 9.4. Viewing History

1.  User clicks the "View Transaction History" link in the Wallet Component.
2.  Navigation occurs to the `/transactions` route.
3.  Transaction History Component mounts.
4.  `onMount` fetches the user address from the store.
5.  `getLatestTransactions` hook fetches data from the backend API.
6.  The transaction table is displayed.
7.  `onMount` identifies any pending transactions and calls `trackTransaction` for each one to start background polling/updating.
8.  The status column in the table updates reactively as `trackTransaction` updates the local `transactions` array and persists final states via `updateTransactionStatus`.

## 10. Styling & Theming

* The application uses a custom color palette defined via CSS variables (`--primary-color`, `--success-color`, etc.) in the main Wallet Component's styles.
* Layout is primarily managed using Flexbox.
* Scoped Svelte styles ensure component-specific styling.
* The Transaction History component specifically utilizes Telegram Mini App (TMA) theme variables (`--tg-theme-bg-color`, `--tg-theme-text-color`, etc.) with fallbacks, allowing it to adapt its appearance to the user's Telegram theme settings for a more integrated experience.
* Status badges and loading spinners provide visual cues for transaction states.
* CSS includes responsive adjustments for smaller screens (max-width: 480px).

---

---

# Svelte Project Setup with `sv`

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

---


## **Creating a Project**

If you're seeing this, you've probably already created a project. Congrats! If not, follow these steps:

```bash
# Create a new project in the current directory
npx sv create

# Create a new project in a specific directory (e.g., `my-app`)
npx sv create my-app
```

After creating the project, navigate to the project directory:

```bash
cd my-app
```

---

## **Installing Dependencies**

Before running the project, install the required dependencies:

```bash
npm install

# Alternatively, use `pnpm` or `yarn`
pnpm install
# or
yarn install
```

---

## **Developing**

Start the development server to work on your project:

```bash
npm run dev

# Start the server and open the app in a new browser tab
npm run dev -- --open
```

The development server supports hot module replacement (HMR), so your changes will reflect instantly in the browser.

---

## **Building for Production**

To create an optimized production build of your app:

```bash
npm run build
```

This will generate static files in the `build` directory (or a similar output folder, depending on your configuration).

---

## **Previewing the Production Build**

After building your app, you can preview it locally using:

```bash
npm run preview
```

This serves the production build locally, allowing you to test it before deployment.

---

## **Deploying Your App**

To deploy your Svelte app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment (e.g., Node.js, Vercel, Netlify, etc.).

For example, to deploy to Vercel:

1. Install the Vercel adapter:
   ```bash
   npm install @sveltejs/adapter-vercel
   ```

2. Update your `svelte.config.js` to use the adapter:
   ```javascript
   import adapter from '@sveltejs/adapter-vercel';
   import { vitePreprocess } from '@sveltejs/kit/vite';

   export default {
     kit: {
       adapter: adapter()
     },
     preprocess: vitePreprocess()
   };
   ```

3. Deploy to Vercel:
   ```bash
   vercel
   ```

---

## **Additional Scripts**

Here are some other useful scripts you might find in your `package.json`:

- **Linting**: Check for code style issues.
  ```bash
  npm run lint
  ```

- **Formatting**: Automatically format your code.
  ```bash
  npm run format
  ```

- **Testing**: Run unit or end-to-end tests.
  ```bash
  npm run test
  ```

---

## **Need Help?**

- Check out the [Svelte documentation](https://svelte.dev/docs).
- Join the [Svelte Discord community](https://svelte.dev/chat) for support.
- Explore the [Svelte GitHub repository](https://github.com/sveltejs/svelte) for updates and issues.

---

# TAC Wallet

## Overview
TAC Wallet is a Svelte-based decentralized application (dApp) that integrates with the TON blockchain. It allows users to connect their TON wallets, specify a Jetton token amount, and send cross-chain transactions to an EVM-compatible address.

## Features
- Connect with TON-compatible wallets (TON Wallet, Tonkeeper, Tonhub)
- Fetch wallet connection status
- Specify Jetton token amount
- Send cross-chain transactions
- Track transaction status

## Prerequisites
- Node.js (>=16.x)
- npm or yarn
- A TON-compatible wallet (e.g., TON Wallet, Tonkeeper, Tonhub)
- TAC SDK and TON Connect dependencies

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/your-repo/tac-wallet.git
   cd tac-wallet
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Configure environment variables:
   - Create a `.env` file in the project root.
   - Add the following:
     ```sh
     PUBLIC_MY_EVM_ADDRESS=<your-evm-address>
     PUBLIC_JETTON_TOKEN_ADDRESS=<your-jetton-token-address>
     ```
4. Start the development server:
   ```sh
   npm run dev
   ```
