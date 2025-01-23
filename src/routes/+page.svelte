<script>
	import { onMount } from "svelte";
	import { TonConnectUI } from "@tonconnect/ui";
	import { TacSdk, Network, SenderFactory } from "tac-sdk";

	let isConnected = false;
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
		});
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
			let sender = await SenderFactory.getSender({ tonConnect });
			console.log("sender :", sender);

			// Prepare the EVM proxy message
			const evmProxyMsg = {
				evmTargetAddress: "0xe3ECDc63B560B17139844c6b5ed56fb41Bd98be2",
				methodName: "",
				encodedParameters: "0x",
			};

			console.log("EVM proxy message:", evmProxyMsg);
			//log jetton amount
			console.log("Jetton amount:", jettonAmount);
			//log sender

			// Prepare jetton details
			const jetton = [
				{
					address: "EQBvmYl-CFo6B00UI-UP1mkwYCxm0zzad9cbuEpw413OUOAc",
					amount: jettonAmount,
				},
			];

			// Send cross-chain transaction
			// const { sendTransactionResult } =
			await tac_sdk.sendCrossChainTransaction(evmProxyMsg, sender, jetton);

			// status = `Transaction successful: ${JSON.stringify(sendTransactionResult)}`;
			// console.log(sendTransactionResult);
		} catch (error) {
			status = `Error during transaction: ${error.message}`;
			console.error("Transaction error:", error);
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
			<div class="status">Your wallet is successfully connected!</div>
		{/if}
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
</style>
