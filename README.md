Here’s an updated version of your script with improved formatting, additional details, and modern practices:

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

## Usage
### Wallet Connection
- The wallet connection button is rendered within the `#ton-connect` container.
- Users can connect their wallet and the app will fetch the connection status.

### Sending Transactions
1. Enter a valid Jetton token amount.
2. Click the **Send Transaction** button.
3. The app will send a cross-chain transaction and display the status.

### Transaction Tracking
- The app logs the transaction status and handles error messages for debugging.

## Project Structure
```
├── src
│   ├── App.svelte        # Main application logic
│   ├── components
│   ├── assets
│   ├── styles
│   ├── env               # Environment variables
│   ├── main.js           # Application entry point
│
├── public
│   ├── tonconnect-manifest.json  # TON Connect configuration
│
├── .env                   # Environment variables
├── package.json           # Dependencies and scripts
├── README.md              # Documentation
```

## Dependencies
- [Svelte](https://svelte.dev/)
- [TON Connect UI](https://github.com/ton-connect/sdk)
- [Tac SDK](https://github.com/tact-lang/tact)
- [Vite](https://vitejs.dev/) (for development)

## License
This project is licensed under the MIT License.

## Contact
For any issues, please open an issue on the [GitHub repository](https://github.com/your-repo/tac-wallet/issues).



Enjoy building your Svelte app! 🚀