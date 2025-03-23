<script>
	let activeTab = "mint"; // Default tab
	import bmbtcABI from "../bmbtc_abi.json";
	// Assuming other variables (isConnected, isMetaMaskConnected, etc.) are defined in your script
	import { onMount } from "svelte";
	import { TonConnectUI } from "@tonconnect/ui";
	import * as ethers from "ethers";
	import addresses from "../addresses.json";
	import treasureySwapABI from "../abi/treasureySwapABI.json";
	import { toNano, TonClient } from "@ton/ton";
	import tokensJson from "../tokens/tokens.json";
    import {fetchJettonBalance} from '../helper/getJettonBalance';
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
		PUBLIC_TON_SIDE_BMBTC_BALANCE,
	} from "$env/static/public";

	import { getTONBalance } from "../helper/getTonBalance";

	import { validateAmount } from "../helper/validateAmount";

	let tonBalance=0;
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
	/**
	 * @type {string}
	 */
	let tvmTokenAddress;
		/**
	 * @type {number}
	 */
	let userBmbtcBalance=0;
	
	// Initialize TonConnect
	onMount(async () => {
		const response = await fetch('/tonconnect-manifest.json');
		const manifestJson = await response.json();
		const url=manifestJson.url
		console.log('manifest url : ', url)
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
			//log the token balance for connected wallet

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
			console.log('bmbtc token address : ',PUBLIC_BMBTC_TOKEN_ADDRESS)
			tvmTokenAddress = await tac_sdk.getTVMTokenAddress(
				PUBLIC_BMBTC_TOKEN_ADDRESS
			);
			console.log("tvm token address : ", tvmTokenAddress);
			userBmbtcBalance=await fetchJettonBalance(tac_sdk , userTonWalletAddress , tvmTokenAddress)??0

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

		if (jettonInputAmount < 1) {
			status = "Please enter a valid Jetton amount.";
			return;
		}

		try {
			status = "Sending transaction...";

			console.log("wton token address : ", PUBLIC_WTON_TOKEN_ADDRESS);
			const jettonInfo = {
				tvmAddress: PUBLIC_JETTON_TOKEN_ADDRESS,
				name: "Jetton BTC",
				symbol: "JBTC",
				decimals: 9,
				description: "TON description",
				image: "abc",
			};
			const tokenMintInfoForJetton = {
				info: jettonInfo,
				mintAmount: 10 ** jettonInfo.decimals,
			};

			// Encoding with single parameter
			const to = PUBLIC_TREASURE_SWAP_PROXY;

			console.log("to address : ", to);

			//  const methodName = "mint";
			const abi = ethers.AbiCoder.defaultAbiCoder();

			const wTONamt = jettonInputAmount;
			//const wTONamt = BigInt(jettonInputAmount*Number(tokenMintInfoForJetton.mintAmount))
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
			loadingEquivalent=true;
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
				decimals: 6,
				description: "bmbtc description",
				image: "abc",
			};

			const tokenMintInfoForBMBTC = {
				info: bmbtcInfo,
				mintAmount: 10 ** 6,
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
            console.log('bmbtc address : ', PUBLIC_BMBTC_TOKEN_ADDRESS)
			console.log("EVM proxy message:", evmProxyMsg);
	

			// Prepare bmbtc asset details
			const assets= [
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
			loadingEquivalent=true;
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
		
			// @ts-ignore
			if (typeof window.ethereum !== "undefined") {
				const validateAmt = await validateAmount(
					false,
					value,
					Number(tokensJson[0].lowerBound),
					Number(tokensJson[0].upperBound),
					tokensJson[0].decimals,
					Number(tokensJson[0].tokenValue),
					// @ts-ignore
					tonBalance,
					userJettonBalance,
				);
				console.log("s : ", validateAmt.status);
				if (validateAmt.status) {
					console.log("input amt is valid");
				}
				// @ts-ignore
				// const provider = new ethers.BrowserProvider(window.ethereum);
				// const contract = new ethers.Contract(
				// 	addresses.BMBTC_Treasury,
				// 	treasureySwapABI,
				// 	provider,
				// );

				// equivalentBmbtc = Number(
				// 	await contract.getTokenValue(jettonInputAmount),
				// );
				equivalentBmbtc=Number(value)*(Number(tokensJson[0].tokenValue)/10**6).toFixed(2);
				console.log("equivalent bmbtc", equivalentBmbtc);
				loadingEquivalent = false;
			} else {
				console.error("MetaMask is not installed!");
			}
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
			if (typeof window.ethereum !== "undefined") {
				// @ts-ignore
				const provider = new ethers.BrowserProvider(window.ethereum);
				const contract = new ethers.Contract(
					addresses.BMBTC_Treasury,
					treasureySwapABI,
					provider,
				);

				equivalentWton = Number(await contract.getTokenValue(bmBTCInputAmount));
				console.log("equivalent bmbtc", equivalentWton);
				loadingEquivalent = false;
			} else {
				console.error("MetaMask is not installed!");
			}
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
						status = "Transaction Status : EVMMerkleMessageCollected";
						break;
					case "EVMMerkleRootSet":
						status = "Transaction Status : EVMMerkleRootSet";
						break;
					case "EVMMerkleMessageExecuted":
						status = "Transaction Status : EVMMerkleMessageExecuted";
						break;
					case "TVMMerkleMessageCollected":
						status = "Transaction Status : TVMMerkleMessageCollected";
						break;
					case "TVMMerkleRootSet":
						status = "Transaction Status : TVMMerkleRootSet";
						break;
					case "TVMMerkleMessageExecuted":
						status = "Transaction Status : successful";
						break;
			
					default:
						status = `Transaction Status : ${opStatus.status}`;
						break;
				}

				// Wait and retry if not in a final state
				if (!["TVMMerkleMessageExecuted"].includes(opStatus.status)) {
					await new Promise((resolve) => setTimeout(resolve, delayMs));
					attempts++;
				} else {
					loadingEquivalent=false
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

	// @ts-ignore
	const getTokenBalance = async (walletAddress, tokenAddress) => {
		let formattedBalance = 0;
		// ERC-20 balanceOf function ABI
		console.log("bmbtc token address : ", tokenAddress);

		console.log("bm btc token abi : ", bmbtcABI);
		try {
			console.log("wallet address : ", walletAddress);
			console.log("token address : ", tokenAddress);
			// Use ethers.js to interact with the contract
			// @ts-ignore

			if (typeof window.ethereum !== "undefined") {
				// @ts-ignore
				const provider = new ethers.BrowserProvider(window.ethereum);
				const contract = new ethers.Contract(tokenAddress, bmbtcABI, provider);

				const balance = Number(await contract.balanceOf(walletAddress));
				const decimals = Number(await contract.decimals());

				// Convert balance based on token decimals
				// @ts-ignore
				console.log("bmbtc balance : ", balance);
				if (balance == 0) {
					formattedBalance = 0;
					return formattedBalance;
				} else {
					formattedBalance = Number(ethers.formatUnits(balance, decimals));
					console.log(`Token ${tokenAddress} Balance:`, balance);
				}
			} else {
				console.error("MetaMask is not installed!");
			}

			return formattedBalance;
		} catch (error) {
			console.error("Error fetching token balance:", error);
		}
	};
</script>

<main>
	<div class="wallet-container">
		<!-- Wallet Connection and Operations -->
		<div class="card">
			<h1>TAC Wallet</h1>
			<!-- Wallet Connections -->
			<div class="wallet-section">
				<div class="wallet-grid">
					<div class="wallet-item">
						<div class="ton-connect-container" id="ton-connect"></div>
						{#if isConnected}
							<span class="status connected">TON Connected</span>
						{/if}
					</div>
					<!-- <div class="wallet-item">
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
					</div> -->
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
						

								<div class="input-wrapper">
									<input
										id="jettonAmount"
										type="number"
										bind:value={jettonInputAmount}
										min="1"
										step="1"
										placeholder="0.0"
										on:input={handleJettonInputChange}
									/>
									
									<span class="token">TON</span>
									
								</div>
								{#if userJettonBalance}
								<div class="balance">
									<div class="bmbtcbalance">
										balance : {Number(tonBalance).toFixed(2)} TON
									</div>
								</div>
							{/if}
								<div class="input-wrapper">
									<div class="input-wrapper">
										<input
											id="jettonAmount"
											type="number"
											bind:value={equivalentBmbtc}
											disabled
										/>
									</div>

									<span class="token">BMBTC</span>
								</div>
								{#if userBmbtcBalance}
								<div class="balance">
									<div class="bmbtcbalance">
										balance : {Number(userBmbtcBalance).toFixed(2)} BMBTC
									</div>
								</div>
							{/if}
							</div>

							{#if loadingEquivalent}
								<button disabled class="action-button mint loading-button">
									<span class="spinner"></span>
									<span class="loading-text">Processing</span>
								</button>
							{:else}
								<button on:click={MintTokens} class="action-button mint">
									Mint BMBTC
								</button>
							{/if}
						{:else}
							<div class="input-group">
						
								<div class="input-wrapper">
									<input
										id="jettonAmount"
										type="number"
										bind:value={bmBTCInputAmount}
										min="1"
										step="1"
										placeholder="0.0"
										on:input={handleBmbtcInputChange}
									/>
									<span class="token">BMBTC</span>
								</div>
								{#if userBmbtcBalance}
								<div class="balance">
									<div class="bmbtcbalance">
										balance : {Number(userBmbtcBalance).toFixed(2)} BMBTC
									</div>
								</div>
							{/if}
								<div class="input-wrapper">
									<input
										id="bmbtcAmount"
										type="number"
										bind:value={equivalentWton}
										min="1"
										step="1"
										placeholder="0.0"
									/>
									<span class="token">TONS</span>
								</div>
								{#if userJettonBalance}
								<div class="balance">
									<div class="bmbtcbalance">
										balance : {Number(tonBalance).toFixed(2)} TON
									</div>
								</div>
							{/if}
							</div>
							{#if loadingEquivalent}
								<button disabled class="action-button mint loading-button">
									<span class="spinner"></span>
									<span class="loading-text">Loading</span>
								</button>
							{:else}
								<button on:click={BurnTokens} class="action-button burn">
									Burn BMBTC
								</button>
							{/if}
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
		padding-bottom: 10px;
	}

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
		max-width: 520px; /* Increased card size */
	}

	h1 {
		font-size: 2rem; /* Slightly larger */
		font-weight: 700;
		color: #34495e;
		text-align: center;
		margin-bottom: 20px;
	}

	.card {
		width: 100%;
		background: #ffffff;
		border-radius: 16px;
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08); /* Enhanced shadow */
		padding: 24px; /* Slightly more padding */
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
		padding: 12px; /* Slightly larger */
		font-size: 1rem; /* Increased font size */
		font-weight: 600;
		color: #fff;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.metamask {
		background: #3b82f6; /* Brighter, modern blue */
	}

	.metamask:hover {
		background: #3b82f6; /* Brighter, modern blue */
	}

	.status {
		display: block;
		font-size: 0.85rem;
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
		font-size: 1rem; /* Increased font size */
		font-weight: 500;
		color: #7f8c8d;
		background: #f5f7fa;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.tab.active {
		background: #3b82f6; /* Brighter, modern blue */
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
		font-size: 0.9rem; /* Slightly increased */
		font-weight: 500;
		color: #34495e;
		margin-bottom: 6px;
	}

	.input-wrapper {
		position: relative;
		margin-top: 30px;
	}

	input[type="number"] {
		width: 100%;
		padding: 12px 60px 12px 14px; /* Increased padding */
		font-size: 1rem; /* Increased */
		color: #2c3e50;
		border: 1px solid #d0d7de;
		border-radius: 6px;
		box-sizing: border-box;
		transition: all 0.2s ease;
	}

	.token {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.85rem;
		font-weight: 600;
		color: #7f8c8d;
		background: #e0e5ec;
		padding: 3px 8px;
		border-radius: 4px;
	}

	.action-button {
		width: 100%;
		padding: 14px; /* Slightly bigger */
		font-size: 1rem; /* Increased */
		font-weight: 600;
		color: #fff;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.mint {
		background: #2ecc71; /* Brighter green */
	}

	.mint:hover {
		background: #27ae60;
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
		padding: 12px; /* Increased padding */
		background: #f5f7fa;
		border: 1px solid #e0e5ec;
		border-radius: 6px;
		font-size: 0.9rem; /* Slightly increased */
		color: #34495e;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.balance {
		color: #27ae60;
		font-size: 1rem; /* Slightly bigger */
		font-weight: bold;
		display: flex;
		flex-direction: row;
		padding: 5px;
		text-align: right;
	}

	.bmbtcbalance {
		margin-left: auto; /* Pushes it to the right */
	}
	.loading-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px; /* Space between spinner and text */
	}

	.spinner {
		width: 16px; /* Slightly smaller for better alignment */
		height: 16px;
		border: 3px solid rgba(0, 0, 0, 0.1);
		border-top-color: #1f05b1;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.loading-text {
		font-size: 1rem;
		font-weight: 600;
		color: #ffffff;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
