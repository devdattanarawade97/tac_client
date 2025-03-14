<script>
	import { onMount } from "svelte";
	import { TonConnectUI } from "@tonconnect/ui";
	import { ethers } from "ethers";
	import {
		TacSdk,
		Network,
		SenderFactory,
		startTracking,
		OperationTracker,
		SimplifiedStatuses,
	} from "tac-sdk";
	import {
		PUBLIC_MY_EVM_ADDRESS,
		PUBLIC_JETTON_TOKEN_ADDRESS,
		PUBLIC_WTON_TOKEN_ADDRESS,
		PUBLIC_TREASURE_SWAP_ADDRESS,
		PUBLIC_TREASURE_SWAP_PROXY,
		PUBLIC_TON_ADDRESS,
	} from "$env/static/public";

	import abijson from "../abi.json";
	console.log("json : ", abijson);
	
	//log all env
	console.log("PUBLIC_MY_EVM_ADDRESS:", PUBLIC_MY_EVM_ADDRESS);
	console.log("PUBLIC_JETTON_TOKEN_ADDRESS:", PUBLIC_JETTON_TOKEN_ADDRESS);
	console.log("PUBLIC_WTON_TOKEN_ADDRESS :", PUBLIC_WTON_TOKEN_ADDRESS);
	let isMetaMaskConnected = false;
	/**
	 * @type {{ request: (arg0: { method: string; params?: never[]; }) => any; } | null}
	 */
	let metaMaskWallet = null;
	/**
	 * @type {null}
	 */
	let metaMaskAccount = null;
	let okXMetamaskWalletAddress="0x5286bf578ef4bf407c76e0e068ff17b9069e2a22";
	/**
	 * @type {string | null}
	 */
	let metaMaskNetwork = null;
	let isConnected = false;
	/**
	 * @type {TonConnectUI | null}
	 */
	let tonConnect = null;

	let jettonAmount = 1;
	let status = "";

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

		tonConnect.onStatusChange((wallet) => {
			isConnected = !!wallet;
			console.log("Wallet connection status:", isConnected);
			//log the token balance for connected wallet
		});

		// Initialize MetaMask
		// @ts-ignore
		if (typeof window.ethereum !== "undefined") {
			// @ts-ignore
			metaMaskWallet = window.ethereum;
			console.log("MetaMask wallet:", metaMaskWallet);
		} else {
			console.log("MetaMask not installed");
		}
	});

	const handleSendTransaction = async () => {
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

			// Initialize TacSdk
			let tac_sdk = await TacSdk.create({
				network: Network.Testnet,
				delay: 3,
			});
			console.log("tac_sdk :", tac_sdk);

			// Create sender using TonConnect
			console.log("tonConnect :", tonConnect);
			// @ts-ignore
			let sender = await SenderFactory.getSender({ tonConnect });
			console.log("sender :", sender);

			//log public my evm address and metaMaskAccount
			console.log("metaMaskAccount :", okXMetamaskWalletAddress);
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

			const tokenMintInfoForJetton = {
				info: jettonInfo,
				mintAmount: 10n ** 9n,
			};

			// Encoding with single parameter
			const to = okXMetamaskWalletAddress;
			console.log('to address : ', to)
			const wTONamt = tokenMintInfoForWTON.mintAmount;
			const methodName = "mint(bytes,bytes)";

			const abi = ethers.AbiCoder.defaultAbiCoder();

			// Encode everything into a single parameter
			// Including both tacHeader and arguments as a tuple
			// Encode TAC header separately
					const tacHeader = abi.encode(
			["tuple(uint64,address)"], // TacHeaderV1 (queryId and tvmCaller)
			[[0n, to]]
		);

		// Encode MintArguments correctly as bytes
		const mintArguments = abi.encode(
			["tuple(address,uint256)"], // MintArguments struct (to, wTONamt)
			[[to, wTONamt]]
		);

		console.log('tac header bytes : ', tacHeader);
		console.log('arguments bytes : ', mintArguments);

		// Correctly encode parameters
		const encodedParameters = abi.encode(
			["tuple(bytes, bytes)"],
			[
				[tacHeader, // TacHeaderV1 (queryId, tvmCaller)
				mintArguments// MintArguments (to, wTONamt)
				]
			]
		);
      
		// const encodedParameters=ethers.AbiCoder.defaultAbiCoder().encode(
        //   ["tuple(address,uint256)"],
        //   [[to,wTONamt]]
        // )
		console.log('encodedParameters: ', encodedParameters);

       
			// Prepare evmProxyMsg with single encoded parameter
			const evmProxyMsg = {
				evmTargetAddress: PUBLIC_TREASURE_SWAP_PROXY,
				methodName: methodName,
				encodedParameters,  // Single encoded parameter containing both header and arguments
			};

			console.log("Encoded Parameters:", encodedParameters);
			console.log("EVM proxy message:", evmProxyMsg);



			// Prepare jetton details
			const assets = [{
				address: PUBLIC_JETTON_TOKEN_ADDRESS,
				amount: jettonAmount,
			}];

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
		} catch (error) {
			console.error("Error connecting to MetaMask:", error);
		}
	};
</script>

<main>
	<h1>TAC Wallet</h1>

	<!-- Wallet Connection Section -->
	<div class="connect-wallet">
		<!-- TonConnect button will be rendered here -->
		<div id="ton-connect" class="ton-connect-container"></div>

		{#if isConnected}
			<div class="status">Your Ton wallet is successfully connected!</div>
		{/if}

		<!-- MetaMask Section -->

		<button on:click={handleMetaMaskConnect} class="metamask-button">
			{#if isMetaMaskConnected}
				Disconnect MetaMask
			{:else}
				Connect MetaMask
			{/if}
		</button>

		{#if isMetaMaskConnected}
			<div class="status">
				Connected to MetaMask:
				<span class="account">{metaMaskAccount}</span>
				on
				<span class="network">{metaMaskNetwork}</span>
			</div>
		{/if}
		<!-- MetaMask button -->
	</div>

	<!-- Transaction Section -->
	{#if isConnected}
		<div class="container">
			<div class="input-group">
				<label for="jettonAmount">Jetton Amount:</label>
				<input
					id="jettonAmount"
					type="number"
					bind:value={jettonAmount}
					min="1"
					placeholder="Enter amount"
				/>
			</div>
			<button on:click={handleSendTransaction} class="send-button"
				>Send Transaction</button
			>
			<pre>{status}</pre>
		</div>
	{/if}
</main>

<style>
	:global(body) {
		font-family: "Inter", sans-serif;
		margin: 0;
		padding: 0;
		background-color: #f5f7fa;
		color: #333;
	}

	main {
		max-width: 800px;
		margin: 0 auto;
		padding: 40px 20px;
		text-align: center;
	}

	h1 {
		font-size: 32px;
		margin-bottom: 30px;
		color: #1a1a1a;
	}

	.connect-wallet {
		margin: 30px 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px; /* Adds spacing between elements */
	}

	/* Container for the TonConnect button */
	.ton-connect-container {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 60px; /* Ensure the container has enough height */
	}

	/* Style the TonConnect button */
	:global(#ton-connect) {
		display: inline-block;
		width: 100%; /* Ensure the button takes full width of its container */
		max-width: 200px; /* Limit the button width for better appearance */
	}

	.status {
		margin-top: 10px;
		font-size: 14px;
		color: #28a745;
	}

	.container {
		max-width: 400px;
		margin: 0 auto;
		padding: 25px;
		border: 1px solid #e0e0e0;
		border-radius: 12px;
		background-color: #fff;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.input-group {
		margin-bottom: 20px;
		text-align: left;
	}

	label {
		display: block;
		font-size: 14px;
		font-weight: 500;
		margin-bottom: 8px;
		color: #555;
	}

	input[type="number"] {
		width: 100%;
		padding: 12px;
		font-size: 14px;
		border: 1px solid #ccc;
		border-radius: 8px;
		box-sizing: border-box;
		transition: border-color 0.3s ease;
	}

	input[type="number"]:focus {
		border-color: #007bff;
		outline: none;
	}

	.send-button {
		width: 100%;
		margin-top: 10px;
		padding: 12px 24px;
		font-size: 16px;
		font-weight: 600;
		color: #fff;
		background-color: #28a745;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition:
			background-color 0.3s ease,
			transform 0.2s ease;
	}

	.send-button:hover {
		background-color: #218838;
		transform: translateY(-2px);
	}

	pre {
		margin-top: 20px;
		padding: 15px;
		background-color: #f9f9f9;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		font-size: 14px;
		text-align: left;
		white-space: pre-wrap;
		word-wrap: break-word;
	}
	.metamask-button {
		width: 50%;
		margin-top: 10px;
		padding: 12px 24px;
		font-size: 16px;
		font-weight: 600;
		color: #fff;
		background-color: #007bff;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: background-color 0.3s ease;
	}

	.metamask-button:hover {
		background-color: #0056b3;
		transform: translateY(-2px);
	}
</style>
