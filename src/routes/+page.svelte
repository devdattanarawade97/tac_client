<script>
	let activeTab = "mint"; // Default tab
	import bmbtcABI from "../bmbtc_abi.json";
	// Assuming other variables (isConnected, isMetaMaskConnected, etc.) are defined in your script
	import { onMount } from "svelte";
	import { TonConnectUI } from "@tonconnect/ui";
	import * as ethers from "ethers";
	import {
		TacSdk,
		Network,
		SenderFactory,
		startTracking,
		OperationTracker,
		// @ts-ignore
		SimplifiedStatuses,
	} from "tac-sdk";
	import {
		PUBLIC_MY_EVM_ADDRESS,
		PUBLIC_JETTON_TOKEN_ADDRESS,
		PUBLIC_WTON_TOKEN_ADDRESS,
		// @ts-ignore
		PUBLIC_TREASURE_SWAP_ADDRESS,
		PUBLIC_TREASURE_SWAP_PROXY,
		PUBLIC_TON_ADDRESS,
	} from "$env/static/public";

	//log all env
	console.log("PUBLIC_MY_EVM_ADDRESS:", PUBLIC_MY_EVM_ADDRESS);
	console.log("PUBLIC_JETTON_TOKEN_ADDRESS:", PUBLIC_JETTON_TOKEN_ADDRESS);
	console.log("PUBLIC_WTON_TOKEN_ADDRESS :", PUBLIC_WTON_TOKEN_ADDRESS);
	/**
	 * @type {TacSdk}
	 */
	let tac_sdk ;
	/**
	 * @type {import("tac-sdk").SenderAbstraction}
	 */
	let sender;
	/**
	 * @type {bigint}
	 */
	let userJettonBalance;
	let userTonWalletAddress;
	let isMetaMaskConnected = false;
	/**
	 * @type {{ request: (arg0: { method: string; params?: never[]; }) => any; } | null}
	 */
	let metaMaskWallet = null;
	/**
	 * @type {null}
	 */
	let metaMaskAccount = null;

	/**
	 * @type {string | null}
	 */
	// @ts-ignore
	let metaMaskNetwork = null;
	let isConnected = false;
	/**
	 * @type {TonConnectUI | null}
	 */
	let tonConnect = null;

	let jettonAmount = 1;
	let bmBTCAmount = 1;
	let status = "";
	let bmbtcBalance = 0;

	// Initialize TonConnect
	onMount(async () => {
		tonConnect = new TonConnectUI({
			manifestUrl: `http://localhost:5173/tonconnect-manifest.json`,
			buttonRootId: "ton-connect",
			walletsListConfiguration: {
				includeWallets: [
					{
						appName: "tonwallet",
						name: "TON Wallet",
						imageUrl: "https://wallet.ton.org/assets/ui/qr-logo.png",
						aboutUrl:
							"https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd",
						universalLink: "https://wallet.ton.org/ton-connect",
						jsBridgeKey: "tonwallet",
						bridgeUrl: "https://testnet.tonapi.io/bridge",
						platforms: ["chrome", "android"],
					},
					{
						appName: "tonkeeper",
						name: "Tonkeeper",
						tondns: "tonkeeper.ton",
						jsBridgeKey: "tonkeeper",
						imageUrl: "https://tonkeeper.com/assets/tonconnect-icon.png",
						aboutUrl: "https://tonkeeper.com",
						universalLink: "https://app.tonkeeper.com/ton-connect",
						bridgeUrl: "https://bridge.tonapi.io/bridge",
						platforms: [
							"ios",
							"android",
							"chrome",
							"firefox",
							"safari",
							"windows",
							"macos",
							"linux",
						],
					},
					{
						appName: "tonhub",
						name: "Tonhub",
						imageUrl: "https://tonhub.com/tonconnect_logo.png",
						aboutUrl: "https://tonhub.com",
						universalLink: "https://tonhub.com/ton-connect",
						jsBridgeKey: "tonhub",
						platforms: ["ios", "android"],
						bridgeUrl: "https://connect.tonhubapi.com/tonconnect",
					},
				],
			},
		});

		tonConnect.onStatusChange(async (wallet) => {
			isConnected = !!wallet;
			console.log("Wallet connection status:", isConnected);
			//log the token balance for connected wallet

		
			// Initialize TacSdk
			tac_sdk = await TacSdk.create({
				network: Network.Testnet,
				delay: 3,
			});

			// @ts-ignore
			sender = await SenderFactory.getSender({ tonConnect });
			console.log("sender :", sender);
			userTonWalletAddress = await sender.getSenderAddress();
			userJettonBalance=await tac_sdk.getUserJettonBalance(userTonWalletAddress, PUBLIC_JETTON_TOKEN_ADDRESS)
			console.log('user ton wallet address : ', userTonWalletAddress);
			console.log('user ton jetton balance : ', userJettonBalance);
			
		});

	
		// @ts-ignore
		if (typeof window.ethereum !== "undefined") {
			// @ts-ignore
			metaMaskWallet = window.ethereum;
			console.log("MetaMask wallet:", metaMaskWallet);
		} else {
			console.log("MetaMask not installed");
		}
	});

	//mint tokens
	const MintTokens = async () => {
		if (!isConnected) {
			status = "Wallet not connected.";
			return;
		}

		if (jettonAmount < 1) {
			status = "Please enter a valid Jetton amount.";
			return;
		}

		try {
			status = "Sending transaction...";


			//log public my evm address and metaMaskAccount
			// // Prepare the EVM proxy message
			// const evmProxyMsg = {
			// 	evmTargetAddress: PUBLIC_PROXY_ADDRESS,
			// 	methodName: "",
			// 	encodedParameters: "0x",
			// };
			// Create EVM payload
			// Define TON and Jetton token info (unchanged)
			const wTonInfo = {
				tvmAddress: PUBLIC_WTON_TOKEN_ADDRESS,
				name: "Wrapped TON",
				symbol: "WTON",
				decimals: 9n,
				description: "WTON description",
				image: "abc",
			};

			const tokenMintInfoForWTON = {
				info: wTonInfo,
				mintAmount: 10n ** 9n,
			};

			const jettonInfo = {
				tvmAddress: PUBLIC_JETTON_TOKEN_ADDRESS,
				name: "JettonBTC",
				symbol: "JBTC",
				decimals: 9n,
				description: "TON description",
				image: "https://ton.com/image.png",
			};

			// @ts-ignore
			const tokenMintInfoForJetton = {
				info: jettonInfo,
				mintAmount: 10n ** 9n,
			};

			// Encoding with single parameter
			const to = metaMaskAccount;
			console.log("to address : ", to);
			const wTONamt = tokenMintInfoForWTON.mintAmount;
			const methodName = "mint(bytes,bytes)";
			// const methodName = "mint";
			const abi = ethers.AbiCoder.defaultAbiCoder();

			console.log("ton wallet address : ", PUBLIC_TON_ADDRESS);
			// Encode everything into a single parameter
			// Including both tacHeader and arguments as a tuple
			// Encode TAC header separately
			// const tacHeader = abi.encode(
			// ["tuple(uint64,address)"], // TacHeaderV1 (queryId and tvmCaller)
			// [[0n, to]]
			//  );

			// Encode MintArguments correctly as bytes
			const mintArguments = abi.encode(
				["tuple(address,uint256)"], // MintArguments struct (to, wTONamt)
				[[to, wTONamt]],
			);

			// console.log('tac header bytes : ', tacHeader);
			console.log("arguments bytes : ", mintArguments);

			const encodedParameters = mintArguments;

			console.log("encodedParameters: ", encodedParameters);

			// Prepare evmProxyMsg with single encoded parameter
			const evmProxyMsg = {
				evmTargetAddress: PUBLIC_TREASURE_SWAP_PROXY,
				methodName: methodName,
				encodedParameters, // Single encoded parameter containing both header and arguments
			};

			console.log("Encoded Parameters:", encodedParameters);
			console.log("EVM proxy message:", evmProxyMsg);

			// Prepare jetton details
			const assets = [
				{
					address: PUBLIC_JETTON_TOKEN_ADDRESS,
					amount: jettonAmount,
				},
			];

			// Send cross-chain transaction
			const transactionLinker = await tac_sdk.sendCrossChainTransaction(
				evmProxyMsg,
				sender,
				assets,
			);
			// const network=Network.Testnet
			// const tracker = new OperationTracker(network);

			// const operationId = await tracker.getOperationId(transactionLinker);
			// console.log('Operation ID:', operationId);
			//  const opstatus=await tracker.getOperationStatus(operationId)
			//  console.log('status : ' , opstatus);
			//  const simplifiedStatus = await tracker.getSimplifiedOperationStatus(transactionLinker);
			// 	console.log('Simplified Status:', simplifiedStatus);

			// // Track transaction status
			const tracker = await startTracking(transactionLinker, Network.Testnet);

			// //log tracker
			console.log("tracker :", tracker);

			tac_sdk.closeConnections();
			// trackTransaction(tracker);
			status = `Transaction successful! `;
		} catch (error) {
			// @ts-ignore
			status = `Error during transaction: ${error.message}`;
			console.error("Transaction error:", error);
		}
	};

	const BurnTokens = async () => {
		if (!isConnected) {
			status = "Wallet not connected.";
			return;
		}

		if (bmBTCAmount < 1) {
			status = "Please enter a valid bmbtc amount.";
			return;
		}

		try {
			status = "Sending transaction...";


			const wTonInfo = {
				tvmAddress: PUBLIC_WTON_TOKEN_ADDRESS,
				name: "Wrapped TON",
				symbol: "WTON",
				decimals: 9n,
				description: "WTON description",
				image: "abc",
			};

			const tokenMintInfoForWTON = {
				info: wTonInfo,
				mintAmount: 10n ** 9n,
			};

			// Encoding with single parameter
			const to = PUBLIC_TON_ADDRESS;
			console.log("to address : ", to);
			// @ts-ignore
			const wTONamt = tokenMintInfoForWTON.mintAmount;
			const methodName = "burn(bytes,bytes)";
			// const methodName = "burn";
			const abi = ethers.AbiCoder.defaultAbiCoder();

			console.log("ton wallet address : ", PUBLIC_TON_ADDRESS);

			// Encode MintArguments correctly as bytes
			const mintArguments = abi.encode(
				["tuple(address,uint256)"], // MintArguments struct (to, wTONamt)
				[[to, bmBTCAmount]],
			);

			// console.log('tac header bytes : ', tacHeader);
			console.log("arguments bytes : ", mintArguments);

			const encodedParameters = mintArguments;

			console.log("encodedParameters: ", encodedParameters);

			// Prepare evmProxyMsg with single encoded parameter
			const evmProxyMsg = {
				evmTargetAddress: PUBLIC_TREASURE_SWAP_PROXY,
				methodName: methodName,
				encodedParameters, // Single encoded parameter containing both header and arguments
			};

			console.log("Encoded Parameters:", encodedParameters);
			console.log("EVM proxy message:", evmProxyMsg);

			// Prepare jetton details
			const assets = [
				{
					address: PUBLIC_JETTON_TOKEN_ADDRESS,
					amount: jettonAmount,
				},
			];

			// Send cross-chain transaction
			const transactionLinker = await tac_sdk.sendCrossChainTransaction(
				evmProxyMsg,
				sender,
				assets,
			);
			// const network=Network.Testnet
			// const tracker = new OperationTracker(network);

			// const operationId = await tracker.getOperationId(transactionLinker);
			// console.log('Operation ID:', operationId);
			//  const opstatus=await tracker.getOperationStatus(operationId)
			//  console.log('status : ' , opstatus);
			//  const simplifiedStatus = await tracker.getSimplifiedOperationStatus(transactionLinker);
			// 	console.log('Simplified Status:', simplifiedStatus);

			// // Track transaction status
			const tracker = await startTracking(transactionLinker, Network.Testnet);

			// //log tracker
			console.log("tracker :", tracker);

			tac_sdk.closeConnections();
			// trackTransaction(tracker);
			status = `Transaction successful! `;
		} catch (error) {
			// @ts-ignore
			status = `Error during transaction: ${error.message}`;
			console.error("Transaction error:", error);
		}
	};

	/**
	 * @param {string} operationId
	 */
	// @ts-ignore
	async function trackTransaction(operationId) {
		const tracker = new OperationTracker(Network.Testnet);

		try {
			// Detailed tracking
			// const operationId = await tracker.getOperationId(transactionLinker);
			if (operationId) {
				const status = await tracker.getOperationStatus(operationId);
				console.log("Detailed status:", status);
			} else {
				console.log("Waiting for validators to receive messages...");
				// Implement retry logic here
			}
		} catch (error) {
			console.error("Error during tracking:", error);
		}
	}

	const handleMetaMaskConnect = async () => {
		if (!metaMaskWallet) return;

		try {
			const accounts = await metaMaskWallet.request({
				method: "eth_requestAccounts",
			});
			isMetaMaskConnected = true;
			metaMaskAccount = accounts[0];
			console.log("MetaMask account:", metaMaskAccount);

			// Get the current network
			const networkId = await metaMaskWallet.request({ method: "eth_chainId" });
			//log network id
			console.log("networkId :", networkId);
			bmbtcBalance = await getTokenBalance(
				metaMaskAccount,
				"0xE7731e1D0925e1a16459d893156598d18415178a",
			);
		} catch (error) {
			console.error("Error connecting to MetaMask:", error);
		}
	};

	// @ts-ignore
	const getTokenBalance = async (walletAddress, tokenAddress) => {
		if (!metaMaskWallet) return;

		// ERC-20 balanceOf function ABI
		const tokenABI = bmbtcABI;
		console.log("bm btc token abi : ", tokenABI);
		try {
			console.log("wallet address : ", walletAddress);
			console.log("token address : ", tokenAddress);
			// Use ethers.js to interact with the contract
			// @ts-ignore
			const provider = new ethers.providers.Web3Provider(window.ethereum);
			const contract = new ethers.Contract(tokenAddress, tokenABI, provider);

			const balance = await contract.balanceOf(walletAddress);
			const decimals = await contract.decimals();

			// Convert balance based on token decimals
			// @ts-ignore
			const formattedBalance = ethers.utils.formatUnits(balance, decimals);
			console.log(`Token (${tokenAddress}) Balance:`, formattedBalance);
			return formattedBalance;
		} catch (error) {
			console.error("Error fetching token balance:", error);
		}
	};
</script>

<main>
	<div class="wallet-container">
		<h1>TAC Wallet</h1>

		<!-- Wallet Connection and Operations -->
		<div class="card">
			<!-- Wallet Connections -->
			<div class="wallet-section">
				<div class="wallet-grid">
					<div class="wallet-item">
						<div class="ton-connect-container" id="ton-connect"></div>
						{#if isConnected}
							<span class="status connected">TON Connected</span>
							{#if userJettonBalance}
                              <span class="balance">{Number(userJettonBalance).toFixed(2)} Jettons</span>
							{/if}
						{/if}
					</div>
					<div class="wallet-item">
						<button
							on:click={handleMetaMaskConnect}
							class="connect-button metamask"
						>
							{#if isMetaMaskConnected}
								Disconnect Metamask
							{:else}
								Connect MetaMask
							{/if}
						</button>
						{#if isMetaMaskConnected}
							<span class="status connected">
								{metaMaskAccount ? `${metaMaskAccount}` : "N/A"}
							</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Switchable Operations -->
			{#if isConnected || isMetaMaskConnected}
				<div class="operations-section">
					<div class="tab-bar">
						<button
							class="tab"
							class:active={activeTab === "mint"}
							on:click={() => (activeTab = "mint")}
						>
							Mint
						</button>
						<button
							class="tab"
							class:active={activeTab === "burn"}
							on:click={() => (activeTab = "burn")}
						>
							Burn
						</button>
					</div>

					<div class="tab-content">
						{#if activeTab === "mint"}
							<div class="input-group">
								<label for="jettonAmount">Jetton Amount</label>
								<div class="input-wrapper">
									<input
										id="jettonAmount"
										type="number"
										bind:value={jettonAmount}
										min="1"
										step="1"
										placeholder="0.0"
									/>
									<span class="token">JETTON</span>
								</div>
							</div>
							<button on:click={MintTokens} class="action-button mint"
								>Mint BMBTC</button
							>
						{:else}
							<div class="input-group">
								<label for="bmbtcAmount">BMBTC Amount</label>
								<div class="input-wrapper">
									<input
										id="bmbtcAmount"
										type="number"
										bind:value={bmBTCAmount}
										min="1"
										step="1"
										placeholder="0.0"
									/>
									<span class="token">BMBTC</span>
								</div>
							</div>
							<button on:click={BurnTokens} class="action-button burn"
								>Burn BMBTC</button
							>
						{/if}
						{#if status}
							<pre class="status-display">{status}</pre>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</main>

<style>
	:global(body) {
		font-family: "Inter", sans-serif;
		margin: 0;
		padding: 20px;
		background: linear-gradient(135deg, #f0f2f5 0%, #e0e5ec 100%);
		color: #2c3e50;
		min-height: 100vh;
	}

	main {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.wallet-container {
		width: 100%;
		max-width: 480px;
	}

	h1 {
		font-size: 1.8rem;
		font-weight: 700;
		color: #34495e;
		text-align: center;
		margin-bottom: 20px;
	}

	.card {
		background: #ffffff;
		border-radius: 16px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
		padding: 20px;
		border: 1px solid #e0e5ec;
	}

	/* Wallet Section */
	.wallet-section {
		margin-bottom: 20px;
	}

	.wallet-grid {
		display: flex;
		justify-content: space-between;
		gap: 15px;
		
	}

	.wallet-item {
	
		flex: 1;
		text-align: center;
		
	
	}

	.ton-connect-container {
		min-height: 40px;
		margin-bottom: 8px;
	}

	:global(#ton-connect) {
		width: 100%;
		max-width: 160px;
	}

	.connect-button {
		width: 100%;
		padding: 10px;
		font-size: 0.9rem;
		font-weight: 600;
		color: #fff;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.metamask {
		background: #3498db;
	}

	.metamask:hover {
		background: #2980b9;
		transform: translateY(-1px);
	}

	.status {
		display: block;
		font-size: 0.8rem;
		margin-top: 6px;
	}

	.status.connected {
		color: #27ae60;
	}

	/* Operations Section */
	.operations-section {
		padding-top: 15px;
		border-top: 1px solid #e0e5ec;
	}

	.tab-bar {
		display: flex;
		gap: 10px;
		margin-bottom: 15px;
	}

	.tab {
		flex: 1;
		padding: 8px;
		font-size: 0.9rem;
		font-weight: 500;
		color: #7f8c8d;
		background: #f5f7fa;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.tab.active {
		background: #3498db;
		color: #fff;
	}

	.tab:hover:not(.active) {
		background: #e0e5ec;
	}

	.tab-content {
		transition: all 0.3s ease;
	}

	.input-group {
		margin-bottom: 15px;
	}

	label {
		display: block;
		font-size: 0.85rem;
		font-weight: 500;
		color: #34495e;
		margin-bottom: 6px;
	}

	.input-wrapper {
		position: relative;
	}

	input[type="number"] {
		width: 100%;
		padding: 10px 60px 10px 12px;
		font-size: 0.9rem;
		color: #2c3e50;
		border: 1px solid #d0d7de;
		border-radius: 6px;
		box-sizing: border-box;
		transition: all 0.2s ease;
	}

	input[type="number"]:focus {
		border-color: #3498db;
		box-shadow: 0 0 5px rgba(52, 152, 219, 0.3);
		outline: none;
	}

	.token {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.8rem;
		font-weight: 600;
		color: #7f8c8d;
		background: #e0e5ec;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.action-button {
		width: 100%;
		padding: 12px;
		font-size: 0.9rem;
		font-weight: 600;
		color: #fff;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.mint {
		background: #27ae60;
	}

	.mint:hover {
		background: #219653;
		transform: translateY(-1px);
	}

	.burn {
		background: #e74c3c;
	}

	.burn:hover {
		background: #c0392b;
		transform: translateY(-1px);
	}

	.status-display {
		margin-top: 15px;
		padding: 10px;
		background: #f5f7fa;
		border: 1px solid #e0e5ec;
		border-radius: 6px;
		font-size: 0.8rem;
		color: #34495e;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.balance{
		color: #27ae60;
		font-size: small;
		font-weight: bold;
	}
</style>
