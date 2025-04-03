<script>
	let activeTab = "mint"; // Default tab

	// Assuming other variables (isConnected, isMetaMaskConnected, etc.) are defined in your script
	import { onMount } from "svelte";
	import { TonConnectUI } from "@tonconnect/ui";
	import * as ethers from "ethers";
	import treasureySwapABI from "../abi/treasureySwapABI.json";
	import { toNano, TonClient } from "@ton/ton";
	import tokensJson from "../tokens/tokens.json";
	import { fetchJettonBalance } from "../helper/getJettonBalance";
	import { postTransaction } from "../hooks/saveTransaction";
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
		PUBLIC_JETTON_TOKEN_ADDRESS,
		PUBLIC_WTON_TOKEN_ADDRESS,
		// @ts-ignore
		PUBLIC_TREASURE_SWAP_ADDRESS,
		PUBLIC_TREASURE_SWAP_PROXY,
		PUBLIC_TON_ADDRESS,
		PUBLIC_BMBTC_TOKEN_ADDRESS,
	} from "$env/static/public";

	import { getTONBalance } from "../helper/getTonBalance";

	import { validateAmount } from "../helper/validateAmount";
	import { getEquivalentBmbtc } from "../helper/equivalentBmBtc";
	import { tonwalletaddressStore } from "../store/walletStore";
	// store.js

	let tonBalance = 0;
	/**
	 * @type {string | undefined}
	 */
	let userTonWalletAddress;

	/**
	 * @type {string}
	 */
	let evmAddressOfJetton;
	/**
	 * @type {TacSdk}
	 */

	let tac_sdk;
	/**
	 * @type {import("tac-sdk").SenderAbstraction}
	 */
	let sender;

	let loadingEquivalent = false;
	/**
	 * @type {number}
	 */
	let userJettonBalance;

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

	let jettonInputAmount = 0;
	let bmBTCInputAmount = 0;
	let status = "";

	let equivalentBmbtc = 0;
	let equivalentWton = 0;

	let progressPercentage = 0;
	/**
	 * @type {string}
	 */
	let tvmTokenAddress;
	/**
	 * @type {number}
	 */
	let userBmbtcBalance = 0;

	// Initialize TonConnect
	onMount(async () => {
		const response = await fetch("/tonconnect-manifest.json");
		const manifestJson = await response.json();
		const url = manifestJson.url;
		console.log("manifest url : ", url);
		tonConnect = new TonConnectUI({
			manifestUrl: `${url}/tonconnect-manifest.json`,
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

		tonConnect.uiOptions = {
			// @ts-ignore
			// twaReturnUrl: "https://t.me/tele_block_ai_bot",
			twaReturnUrl: "https://tac-client.vercel.app/",
			// twaReturnUrl: "http://localhost:5173/",
		};

		//@ts-ignore
		tonConnect.onStatusChange(async (wallet) => {
			isConnected = !!wallet;
			console.log("Wallet connection status:", isConnected);
			userTonWalletAddress = wallet?.account.address;
			console.log("user ton wallet address : ", userTonWalletAddress);
			if (userTonWalletAddress) {
				tonwalletaddressStore.set(userTonWalletAddress);
				let add = $tonwalletaddressStore;
				console.log("ton wallet", add);
			}
			// @ts-ignore
			//log the token balance for connected wallet now

			// Initialize TacSdk
			tac_sdk = await TacSdk.create({
				network: Network.Testnet,
				TONParams: {
					contractOpener: new TonClient({
						endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
						apiKey:
							"3c3d7c4e1fcbaee7adb97e14cd4f0a225244525f60fc40e70d67128dcdc9aee8",
					}),
				},
				delay: 3,
			});

			// @ts-ignore
			sender = await SenderFactory.getSender({ tonConnect });
			console.log("sender :", sender);
			userTonWalletAddress = await sender.getSenderAddress();

			// @ts-ignore
			tonBalance = await getTONBalance(userTonWalletAddress);
			console.log("ton balance : ", tonBalance);
			const balance = await tac_sdk.getUserJettonBalance(
				userTonWalletAddress,
				PUBLIC_JETTON_TOKEN_ADDRESS,
			);

			userJettonBalance = Number(BigInt(balance) / BigInt(10 ** 9));

			// console.log("user ton wallet address : ", userTonWalletAddress);
			// console.log("user ton jetton balance : ", userJettonBalance);
			evmAddressOfJetton = await tac_sdk.getEVMTokenAddress("NONE");

			console.log("evm side address of jetton : ", evmAddressOfJetton);
			console.log("bmbtc token address : ", PUBLIC_BMBTC_TOKEN_ADDRESS);
			tvmTokenAddress = await tac_sdk.getTVMTokenAddress(
				PUBLIC_BMBTC_TOKEN_ADDRESS,
			);
			console.log("tvm token address : ", tvmTokenAddress);
			userBmbtcBalance =
				(await fetchJettonBalance(
					tac_sdk,
					userTonWalletAddress,
					tvmTokenAddress,
				)) ?? 0;
		});
		// @ts-ignore

		// if (typeof window.ethereum !== "undefined") {
		// 	// @ts-ignore
		// 	metaMaskWallet = window.ethereum;
		// 	console.log("MetaMask wallet:", metaMaskWallet);
		// } else {
		// 	console.log("MetaMask not installed");
		// }
	});

	//mint tokens
	const MintTokens = async () => {
		if (!isConnected) {
			status = "Wallet not connected.";
			return;
		}

		try {
			status = "Sending transaction...";


			// Encoding with single parameter
			const to = PUBLIC_TREASURE_SWAP_PROXY;

			console.log("to address : ", to);

			//  const methodName = "mint";
			const abi = ethers.AbiCoder.defaultAbiCoder();

			const wTONamt = jettonInputAmount;

			console.log("wton amount for mint : ", wTONamt);
			const methodName = "mint(bytes,bytes)";
			// console.log('tac header : ' , tacHeader)
			// Encode MintArguments correctly as bytes
			const mintArguments = abi.encode(
				["tuple(address,uint256)"], // MintArguments struct (to, wTONamt)
				[[to, Number(toNano(wTONamt))]],
			);

			// Prepare evmProxyMsg with single encoded parameter
			const evmProxyMsg = {
				evmTargetAddress: PUBLIC_TREASURE_SWAP_PROXY,
				methodName: methodName,
				encodedParameters: mintArguments, // Single encoded parameter containing both header and arguments
			};

			console.log("EVM proxy message:", evmProxyMsg);
			// @ts-ignore
			sender = await SenderFactory.getSender({ tonConnect });
			// Prepare jetton details
			const assets = [
				{
					// address: PUBLIC_JETTON_TOKEN_ADDRESS,
					amount: Number(jettonInputAmount),
				},
			];

			// Send cross-chain transaction
			const transactionLinker = await tac_sdk.sendCrossChainTransaction(
				evmProxyMsg,
				sender,
				assets,
			);
			tac_sdk.closeConnections();
			loadingEquivalent = true;
			// const tracker1 = await startTracking(transactionLinker, Network.Testnet);
			// console.log("tracker 1 log : ", tracker1);
			const network = Network.Testnet;
			const tracker = new OperationTracker(Network.Testnet);

			// const operationId = await tracker.getOperationId(transactionLinker);
			// console.log('Operation ID:', operationId);
			//Start tracking with retry logic

			//Track transaction once operationId is obtained
			const operationId = await getOperationId(transactionLinker);
			// @ts-ignore
			await trackTransaction(operationId);

			// //log tracker

			// trackTransaction(tracker);
			status = `Transaction successful! `;
		} catch (error) {
			// @ts-ignore
			status = `Error during transaction: ${error.message}`;
			console.error("Transaction error:", error);
		}
	};

	//burn tokens
	const BurnTokens = async () => {
		if (!isConnected) {
			status = "Wallet not connected.";
			return;
		}

		if (bmBTCInputAmount < 1) {
			status = "Please enter a valid bmbtc amount.";
			return;
		}

		try {
			status = "Sending transaction...";

			const bmbtcInfo = {
				evmAdress: PUBLIC_BMBTC_TOKEN_ADDRESS,
				name: "BIMA BTC",
				symbol: "BMBTC",
				decimals: tokensJson[0].decimals,
				description: "bmbtc description",
				image: "abc",
			};

			const tokenMintInfoForBMBTC = {
				info: bmbtcInfo,
				mintAmount: bmbtcInfo.decimals,
			};

			// Encoding with single parameter
			const to = PUBLIC_TREASURE_SWAP_PROXY;
			console.log("to address : ", to);
			// @ts-ignore
			const bmbtcAmount = BigInt(
				bmBTCInputAmount * Number(tokenMintInfoForBMBTC.mintAmount),
			);

			const methodName = "burn(bytes,bytes)";
			// const methodName = "burn";
			const abi = ethers.AbiCoder.defaultAbiCoder();

			// Encode MintArguments correctly as bytes
			const burnArguments = abi.encode(
				["tuple(address,uint256)"], // MintArguments struct (to, amount)
				[[to, bmbtcAmount]],
			);

			// console.log('tac header bytes : ', tacHeader);
			console.log("arguments bytes : ", burnArguments);

			// Prepare evmProxyMsg with single encoded parameter
			const evmProxyMsg = {
				evmTargetAddress: PUBLIC_TREASURE_SWAP_PROXY,
				methodName: methodName,
				encodedParameters: burnArguments, // Single encoded parameter containing both header and arguments
			};
			console.log("bmbtc address : ", PUBLIC_BMBTC_TOKEN_ADDRESS);
			console.log("EVM proxy message:", evmProxyMsg);

			// Prepare bmbtc asset details
			const assets = [
				{
					address: tvmTokenAddress,
					amount: Number(bmBTCInputAmount),
				},
			];

			// Send cross-chain transaction
			const transactionLinker = await tac_sdk.sendCrossChainTransaction(
				evmProxyMsg,
				sender,
				assets,
			);
			tac_sdk.closeConnections();
			loadingEquivalent = true;
			// // Track transaction status
			// const tracker = await startTracking(transactionLinker, Network.Testnet);

			// //log tracker
			// console.log("tracker :", tracker);
			// Track transaction once operationId is obtained
			const operationId = await getOperationId(transactionLinker);
			// @ts-ignore
			await trackTransaction(operationId);
			tac_sdk.closeConnections();
			// trackTransaction(tracker);
			status = `Transaction successful! `;
		} catch (error) {
			// @ts-ignore
			status = `Error during transaction: ${error.message}`;
			console.error("Transaction error:", error);
		}
	};
	//get op id

	// @ts-ignore
	async function getOperationId(transactionLinker) {
		status = "Updating Transaction Status";
		const tracker = new OperationTracker(Network.Testnet);
		let operationId = null;
		const maxAttempts = 120; // Maximum retry attempts
		const retryDelay = 3000; // Delay between retries in milliseconds (3 seconds)

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				operationId = await tracker.getOperationId(transactionLinker);
				console.log(
					`[${new Date().toISOString()}] Attempt ${attempt} - Operation ID: ${operationId}`,
				);

				if (operationId) {
					console.log(
						`[${new Date().toISOString()}] Successfully retrieved Operation ID: ${operationId}`,
					);
					//save transaction
					const operationDetails = {
						operationId,
						status: "pending",
						type: activeTab,
						amount: activeTab == "mint" ? equivalentBmbtc : equivalentWton,
						currency: activeTab == "mint" ? "BMBTC" : "TON",
					};
				//	@ts-ignore
					const storeResponse=await postTransaction(userTonWalletAddress,operationDetails);
					console.log('store response : ', storeResponse)
					break; // Exit loop if operationId is retrieved
				} else {
					console.log(
						`[${new Date().toISOString()}] Attempt ${attempt} - Operation ID not yet available`,
					);
				}
			} catch (error) {
				console.error(
					`[${new Date().toISOString()}] Attempt ${attempt} - Error fetching Operation ID:`,
					error,
				);
			}

			if (attempt === maxAttempts) {
				throw new Error(
					"Failed to retrieve Operation ID after maximum attempts",
				);
			}

			console.log(
				`[${new Date().toISOString()}] Waiting ${retryDelay / 1000} seconds before retry...`,
			);
			await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Wait before next attempt
		}
		return operationId;
	}

	// @ts-ignore
	async function handleJettonInputChange(e) {
		loadingEquivalent = true;
		const value = e.target.value;

		try {
			// 	const isValid=await validateAmount(Number(jettonInputAmount));
			// if (!isValid) {
			// 	status = "Please enter a valid Jetton amount.";
			// 	return;
			// }

			// equivalentBmbtc = await getEquivalentBmbtc(value)??0;
			equivalentBmbtc = Number(
				((Number(value) * Number(tokensJson[0].tokenValue)) / 10 ** 6).toFixed(
					2,
				),
			);
			console.log("equivalent bmbtc", equivalentBmbtc);

			loadingEquivalent = false;
		} catch (error) {
			console.log("error while fetching equivalent bmbtc for TON", value);
		}
	}

	// @ts-ignore
	async function handleBmbtcInputChange(e) {
		loadingEquivalent = true;
		const value = e.target.value;

		try {
			// @ts-ignore
			equivalentWton = (
				(Number(value) * 10 ** 6) /
				Number(tokensJson[0].tokenValue)
			).toFixed(2);
			console.log("equivalent wton", equivalentWton);
			loadingEquivalent = false;
			// equivalentWton=await getEquivalentTon(value)
		} catch (error) {
			console.log("error while fetching equivalent bmbtc for TON", value);
		}
	}
	/**
	 * @param {string} operationId
	 */
	// @ts-ignore
	async function trackTransaction(operationId) {
		const tracker = new OperationTracker(Network.Testnet);

		try {
			console.log(`Tracking Operation ID: ${operationId}`);
			let attempts = 0;
			const maxAttempts = 30;
			const delayMs = 5000;

			while (attempts < maxAttempts) {
				const opStatus = await tracker.getOperationStatus(operationId);
				console.log("Each Status:", opStatus.status);

				switch (opStatus.status) {
					case "EVMMerkleMessageCollected":
						// status = "Transaction Status : EVMMerkleMessageCollected";
						progressPercentage = 16.67; // ~1/6 of 100%
						break;
					case "EVMMerkleRootSet":
						// status = "Transaction Status : EVMMerkleRootSet";
						progressPercentage = 33.33; // ~2/6 of 100%
						break;
					case "EVMMerkleMessageExecuted":
						// status = "Transaction Status : EVMMerkleMessageExecuted";
						progressPercentage = 50.0; // ~3/6 of 100%
						break;
					case "TVMMerkleMessageCollected":
						// status = "Transaction Status : TVMMerkleMessageCollected";
						progressPercentage = 66.67; // ~4/6 of 100
						break;
					case "TVMMerkleRootSet":
						// status = "Transaction Status : TVMMerkleRootSet";
						progressPercentage = 83.33; // ~5/6 of 100%
						break;
					case "TVMMerkleMessageExecuted":
						// status = "Transaction Status : successful";
						progressPercentage = 100.0; // 100% complete
						break;

					default:
						// status = `Transaction Status : ${opStatus.status}`;
						progressPercentage = 0; // Unknown status, reset to 0%
						break;
				}

				// Wait and retry if not in a final state
				if (!["TVMMerkleMessageExecuted"].includes(opStatus.status)) {
					await new Promise((resolve) => setTimeout(resolve, delayMs));
					attempts++;
				} else {
					loadingEquivalent = false;
					break;
				}
			}

			if (attempts >= maxAttempts) {
				console.log("Max attempts reached, operation still not finalized.");
			}
		} catch (error) {
			console.error(`[${new Date().toISOString()}] Tracking Error:`, error);
			status = `Tracking Error: : ${error}`;
		}
	}

	// const handleMetaMaskConnect = async () => {
	// 	if (!metaMaskWallet) return;

	// 	try {
	// 		const accounts = await metaMaskWallet.request({
	// 			method: "eth_requestAccounts",
	// 		});
	// 		isMetaMaskConnected = true;
	// 		metaMaskAccount = accounts[0];
	// 		console.log("MetaMask account:", metaMaskAccount);

	// 		// Get the current network
	// 		const networkId = await metaMaskWallet.request({ method: "eth_chainId" });
	// 		//log network id
	// 		console.log("networkId :", networkId);
	// 	} catch (error) {
	// 		console.error("Error connecting to MetaMask:", error);
	// 	}
	// };
</script>

<main>
	<div class="wallet-container">
		<div class="card">
			<h1>BIMA Wallet</h1>
			<div class="wallet-section">
				<div class="wallet-grid">
					<div class="wallet-item">
						<div class="ton-connect-container" id="ton-connect"></div>
					</div>
				</div>
			</div>

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
								<label for="tonAmountMint">Amount to spend:</label>
								<div class="input-wrapper">
									<input
										id="tonAmountMint"
										type="number"
										bind:value={jettonInputAmount}
										min="0"
										step="any"
										placeholder="0.0"
										on:input={handleJettonInputChange}
									/>
									<span class="token">TON</span>
								</div>
								{#if tonBalance != null}
									<div class="balance">
										<span>Balance: {Number(tonBalance).toFixed(4)} TON</span>
									</div>
								{/if}
							</div>

							<div class="input-group">
								<label for="bmbtcAmountMint">Amount to receive:</label>
								<div class="input-wrapper">
									<input
										id="bmbtcAmountMint"
										type="number"
										bind:value={equivalentBmbtc}
										placeholder="0.0"
										disabled
									/>
									<span class="token">BMBTC</span>
								</div>
								{#if userBmbtcBalance != null}
									<div class="balance">
										<span
											>Balance: {Number(userBmbtcBalance).toFixed(8)} BMBTC</span
										>
									</div>
								{/if}
							</div>

							{#if loadingEquivalent}
								<button disabled class="action-button mint loading-button">
									<span class="spinner"></span>
									<span class="loading-text">Processing...</span>
								</button>
							{:else}
								<button
									on:click={MintTokens}
									class="action-button mint"
									disabled={!jettonInputAmount || jettonInputAmount <= 0}
								>
									Mint BMBTC
								</button>
							{/if}
						{:else}
							<div class="input-group">
								<label for="bmbtcAmountBurn">Amount to burn:</label>
								<div class="input-wrapper">
									<input
										id="bmbtcAmountBurn"
										type="number"
										bind:value={bmBTCInputAmount}
										min="0"
										step="any"
										placeholder="0.0"
										on:input={handleBmbtcInputChange}
									/>
									<span class="token">BMBTC</span>
								</div>
								{#if userBmbtcBalance != null}
									<div class="balance">
										<span
											>Balance: {Number(userBmbtcBalance).toFixed(8)} BMBTC</span
										>
									</div>
								{/if}
							</div>

							<div class="input-group">
								<label for="tonAmountBurn">Amount to receive:</label>
								<div class="input-wrapper">
									<input
										id="tonAmountBurn"
										type="number"
										bind:value={equivalentWton}
										placeholder="0.0"
										disabled
									/>
									<span class="token">TON</span>
								</div>
								{#if tonBalance != null}
									<div class="balance">
										<span>Balance: {Number(tonBalance).toFixed(4)} TON</span>
									</div>
								{/if}
							</div>

							{#if loadingEquivalent}
								<button disabled class="action-button burn loading-button">
									<span class="spinner"></span>
									<span class="loading-text">Processing...</span>
								</button>
							{:else}
								<button
									on:click={BurnTokens}
									class="action-button burn"
									disabled={!bmBTCInputAmount || bmBTCInputAmount <= 0}
								>
									Burn BMBTC
								</button>
							{/if}
						{/if}

						{#if progressPercentage != null && loadingEquivalent}
							<div class="status-display">
								<div class="progress-container">
									<div
										class="progress-bar"
										style="width: {progressPercentage}%;"
									></div>
									<span class="progress-text"
										>{progressPercentage.toFixed(0)}%</span
									>
								</div>
								<p class="status-text">{status}</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		{#if isConnected}
		<div class="nav-section">
			<a href="/transactions" class="nav-link">View Transaction History</a>
		</div>
		{/if}
		</div>
	</div>
</main>

<style>
	/* --- Color Palette --- */
	:root {

		--primary-color: #4a90e2; /* Vibrant Blue */
		--primary-darker: #357abd; /* Darker Blue for hover */
		--secondary-color: #50e3c2; /* Turquoise/Mint - Accent */
		--success-color: #34d399; /* Emerald Green */
		--success-darker: #10b981; /* Darker Green */
		--danger-color: #f87171; /* Softer Red */
		--danger-darker: #ef4444; /* Darker Red */

		--text-dark: #1f2937; /* Dark Gray */
		--text-medium: #6b7280; /* Medium Gray */
		--text-light: #f9fafb; /* Near White */
		--text-link: var(--primary-color);

		--bg-body-start: #e0f2fe; /* Light Blue */
		--bg-body-end: #bfdbfe; /* Medium Light Blue */
		--bg-card: #ffffff;
		--bg-input: #f3f4f6; /* Light Gray */
		--bg-disabled: #e5e7eb; /* Slightly darker gray for disabled */
		--bg-tab-inactive: var(--bg-input);
		--bg-progress: var(--bg-input);

		--border-color: #d1d5db; /* Gray */
		--border-focus-color: var(--primary-color);

		--shadow-color: rgba(0, 0, 0, 0.1);
	}

	/* Reset for consistency */
	* {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	/* Main content alignment */
	main {
		display: flex;
		justify-content: center;
		align-items: flex-start; /* Align card to top */
        
		/* min-height removed, handled by body min-height and padding */
		/* padding-top removed, handled by body padding */
	}

	/* Wallet container */
	.wallet-container {
		width: 100%;
		max-width: 480px; /* Slightly narrower for better mobile feel */
	}

	/* Heading styles */
	h1 {
		font-size: 1.75rem; /* Adjusted size */
		font-weight: 700;
		color: var(--text-dark);
		text-align: center;
		margin-bottom: 24px; /* More space below heading */
	}

	/* Card styles */
	.card {
		width: 100%;
		background: var(--bg-card);
		border-radius: 16px; /* Softer corners */
		box-shadow: 0 8px 32px var(--shadow-color); /* Softer shadow */
		padding: 24px;
		border: 1px solid var(--border-color);
	}

	/* Wallet Section */
	.wallet-section {
	
		margin-bottom: 24px;
		display: flex;
	}

	.wallet-grid {
		display: flex; /* Keep this to arrange items INSIDE the grid */
        align-items: center;

		/* FIXED: Use margin-left: auto to push the grid itself to the right */
		margin-left: auto;
		margin-right: 0; /* Optional: ensure no unintended right margin */

		/* float: right; */ /* REMOVED: Do not use float with flex on the same element */
	}

	.wallet-item {
		display: flex;
		width: 100%; /* Make items take full width */
		float: right;
	}

	.ton-connect-container {
		width: 100%; /* Ensure container takes full width */
	}

	/* Navigation Link */
	.nav-section {
		text-align: left;
		margin-top: 20px; /* You might want this back */
	}
	.nav-link {
		color: var(--text-link);
		font-size: 0.9rem;
		font-weight: 400;
		text-decoration: none;
		font-family: inherit; /* Inherits from body or parent */
		cursor: pointer;
		transition: color 0.2s ease-in-out; /* Smooth color transition */
		display: inline-block; /* Helps prevent potential minor layout shifts */
		padding: 2px 0; /* Add minimal vertical padding if needed for visual spacing */
	}

	.nav-link:hover {
		color: var(--primary-darker); /* Darker color on hover */
		/* REMOVED font-size: 0.9rem; - It will now correctly inherit 0.9rem or 0.85rem based on screen size */
	}

	/* Operations Section */
	.operations-section {
		padding-top: 20px;
		margin-top: 20px;
		border-top: 1px solid var(--border-color);
	}

	.tab-bar {
		display: flex;
		gap: 10px;
		margin-bottom: 20px;
	}

	.tab {
		flex: 1; /* Equal width tabs */
		padding: 10px 12px; /* Comfortable padding */
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-medium);
		background: var(--bg-tab-inactive);
		border: 1px solid var(--border-color); /* Subtle border */
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: center; /* Ensure text is centered */
	}

	.tab.active {
		background: var(--primary-color);
		color: var(--text-light);
		border-color: var(--primary-color);
	}

	.tab:hover:not(.active) {
		background: #e5e7eb; /* Slightly darker inactive hover */
		color: var(--text-dark);
	}

	.tab-content {
		transition: all 0.3s ease; /* Smooth transition if content changes */
	}

	.input-group {
		margin-bottom: 20px; /* Space between input groups */
	}

	label {
		display: block;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-medium);
		margin-bottom: 8px; /* Space between label and input */
	}

	.input-wrapper {
		position: relative;
	}

	input[type="number"] {
		width: 100%;
		padding: 14px 75px 14px 16px; /* Adjusted padding: top/bottom, right (for token), left */
		font-size: 1rem;
		color: var(--text-dark);
		background-color: var(--bg-card); /* Changed from bg-input for contrast */
		border: 1px solid var(--border-color);
		border-radius: 10px; /* Consistent radius */
		box-sizing: border-box;
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
		appearance: textfield; /* Better number input appearance */
		-webkit-appearance: textfield;
		-moz-appearance: textfield;
		font-family: inherit; /* Ensure consistent font */
	}
	input[type="number"]:focus {
		outline: none;
		border-color: var(--border-focus-color);
		box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.3); /* Subtle focus ring */
	}
	input[type="number"]:disabled {
		background-color: var(--bg-disabled);
		cursor: not-allowed;
		color: var(--text-medium);
	}

	.token {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.8rem; /* Smaller token label */
		font-weight: 600;
		color: var(--text-medium);
		background: var(--bg-input);
		padding: 5px 10px; /* Padding around token */
		border-radius: 6px;
		border: 1px solid var(--border-color); /* Match input border */
		user-select: none; /* Prevent selection */
	}

	/* Action Buttons (Mint/Burn) */
	.action-button {
		width: 100%;
		padding: 16px; /* Larger padding for primary action */
		font-size: 1.05rem; /* Slightly larger font */
		font-weight: 600;
		color: var(--text-light);
		border: none;
		border-radius: 10px; /* Consistent radius */
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			transform 0.1s ease;
		margin-top: 10px; /* Space above the button */
		font-family: inherit; /* Ensure consistent font */
	}
	.action-button:hover:not(:disabled) {
		transform: translateY(-1px);
	}
	.action-button:active:not(:disabled) {
		transform: translateY(0px);
	}
	.action-button:disabled {
		background-color: var(--bg-disabled);
		color: var(--text-medium);
		cursor: not-allowed;
	}

	.action-button.mint {
		background: var(--success-color);
	}
	.action-button.mint:hover:not(:disabled) {
		background: var(--success-darker);
	}

	.action-button.burn {
		background: var(--danger-color);
	}
	.action-button.burn:hover:not(:disabled) {
		background: var(--danger-darker);
	}

	/* Balance Display */
	.balance {
		font-size: 0.85rem; /* Smaller balance text */
		font-weight: 500;
		color: var(--text-medium);
		text-align: right;
		margin-top: 8px; /* Space above balance */
		padding-right: 4px; /* Align slightly with input padding */
	}

	/* Loading State */
	.loading-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px; /* Space between spinner and text */
	}
	.spinner {
		width: 18px; /* Slightly larger spinner */
		height: 18px;
		border: 3px solid rgba(255, 255, 255, 0.3); /* Lighter border on dark buttons */
		border-top-color: var(--text-light); /* White spinner top */
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	.loading-text {
		font-size: 1.05rem; /* Match action button size */
		font-weight: 600;
		color: var(--text-light);
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Status Display & Progress Bar */
	.status-display {
		margin-top: 24px; /* More space above status */
		padding: 16px;
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: 10px;
		font-size: 0.9rem;
		color: var(--text-dark);
	}
	.progress-container {
		width: 100%;
		height: 24px; /* Taller progress bar */
		background: var(--bg-progress);
		border-radius: 6px;
		position: relative;
		overflow: hidden; /* Ensure bar stays within bounds */
		border: 1px solid var(--border-color); /* Add border */
	}
	.progress-bar {
		height: 100%;
		background: var(--primary-color); /* Use primary color for progress */
		border-radius: 6px 0 0 6px; /* Only round left corners if not full */
		transition: width 0.4s ease-in-out;
	}
	.progress-bar[style*="width: 100%"] {
		border-radius: 6px; /* Full radius when complete */
	}
	.progress-text {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 0.85rem;
		color: var(--text-light); /* White text */
		font-weight: 600;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2); /* Make text more readable */
		white-space: nowrap; /* Prevent text wrapping */
	}
	.status-text {
		margin-top: 12px;
		font-size: 0.9rem;
		color: var(--text-medium);
		text-align: center;
	}

	/* Media query for smaller screens (Refined) */
	@media (max-width: 480px) {
		body {
			padding: 15px; /* Slightly less padding on mobile */
		}

		.wallet-container {
			max-width: 100%; /* Use full width */
		}
		h1 {
			font-size: 1.6rem; /* Adjust heading */
			margin-bottom: 20px;
		}
		.card {
			padding: 20px; /* Adjust card padding */
			border-radius: 12px;
		}

		/* Adjust nav link font size for smaller screens */
		.nav-link {
			font-size: 0.85rem;
		}

		input[type="number"] {
			padding: 12px 70px 12px 14px; /* Adjust padding */
			font-size: 0.95rem;
		}
		.action-button {
			font-size: 1rem;
			padding: 14px;
		}

		.tab {
			padding: 8px 10px;
			font-size: 0.9rem; /* Slightly smaller tab text */
		}

		.token {
			right: 8px;
			padding: 4px 8px;
			font-size: 0.75rem;
		}

		.progress-text {
			font-size: 0.8rem;
		}
	}
</style>
