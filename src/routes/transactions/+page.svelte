<script>
	// @ts-nocheck // Add this if you cannot import types for OperationTracker/Network
	import { onMount } from "svelte";
	import { tonwalletaddressStore } from "../../store/walletStore"; // Adjust path if needed
	import { getLatestTransactions } from "../../hooks/retrievTransactions"; // Adjust path if needed
	import { goto } from "$app/navigation"; // <--- IMPORT GOTO
	import {
		TacSdk,
		Network,
		SenderFactory,
		startTracking,
		OperationTracker,
		// @ts-ignore
		SimplifiedStatuses,
	} from "tac-sdk";

	// Assuming OperationTracker and Network are available globally or imported
	// Ensure these are correctly referenced or imported based on your project setup
	// e.g., import { OperationTracker, Network } from 'your-sdk-package';
	import { postTransaction } from "../../hooks/saveTransaction";
	import { updateTransactionStatus } from "../../hooks/updateTransaction";
	let loadingEquivalent = true;

	/**
	 * @typedef {Object} Transaction
	 * @property {string} id - The operation ID (or a unique transaction identifier) used for tracking.
	 * @property {string} [operationId] - Optional: If your data source uses 'operationId' instead of 'id', adjust accordingly.
	 * @property {string} type - Type of transaction
	 * @property {string | number} amount - Transaction amount
	 * @property {string} [currency] - Optional: Currency symbol/name
	 * @property {string} status - Current status ('Pending', 'Processing', 'Complete', 'Failed', 'Unknown')
	 * @property {number} progress - Progress percentage (0-100) - Note: This property isn't used in the current template logic but is defined in the typedef.
	 * @property {string} [errorMsg] - Optional error message on failure
	 */

	/** @type {Transaction[]} */
	let transactions = [];
	$:updatedTransactions=transactions;
	let isLoading = true;
	/** @type {Error | null} */
	let error = null;

	// Assuming $tonwalletaddressStore provides the address correctly
	let address;
	tonwalletaddressStore.subscribe((value) => {
		address = value;
		console.log("address ton from store updated: ", address);
	});

	async function trackTransaction(tx) {
		// Use Testnet or Mainnet based on your environment
		const tracker = new OperationTracker(Network.Testnet); // Or Network.Mainnet

		try {
			console.log(`Tracking Operation ID: ${tx.operationId}`); // Use tx.operationId as defined in typedef
			let attempts = 0;
			const maxAttempts = 30; // ~2.5 minutes total wait time
			const delayMs = 5000; // 5 seconds

			// Find the transaction in the local array to update its status directly
			let localTx = transactions.find((t) => t.operationId === tx.operationId);
			if (!localTx) {
				console.error(
					"Cannot track transaction not found in local list:",
					tx.operationId,
				);
				return;
			}

			while (attempts < maxAttempts && localTx.status === "pending") {
				// Only track if pending
				try {
					const opStatus = await tracker.getOperationStatus(tx.operationId); // Use tx.operationId
					console.log(
						`Attempt ${attempts + 1}: Status for ${tx.operationId}:`,
						opStatus.status,
					);

					let newStatus = localTx.status; // Default to current status

					// Map SDK statuses to your application statuses
					switch (opStatus.status) {
						case "TVMMerkleMessageExecuted":
							newStatus = "completed";
							loadingEquivalent = false; // Assuming this global flag indicates overall loading
							localTx.status = newStatus;
							// --- !!! TRIGGER SVELTE REACTIVITY !!! ---
							// Assigning the array back to itself (or a copy) tells Svelte it changed.
							// Using spread [...transactions] is often clearer and promotes immutability.
							
							await updateTransactionStatus(tx.operationId, newStatus);
                            
							break;

						// Consider other potential final states or relevant intermediate states
						case "EVMMerkleMessageCollected":
						case "EVMMerkleRootSet":
						case "EVMMerkleMessageExecuted":
						case "TVMMerkleMessageCollected":
						case "TVMMerkleRootSet":
							// Keep as pending or map to a specific "processing" state if desired
							newStatus = "pending"; // Or 'processing'
							break;

						// Handle potential error states if the SDK provides them
						// case "SomeErrorState":
						//  newStatus = "failed";
						//  localTx.errorMsg = "Transaction failed on chain."; // Add error details if available
						//  break;

						default:
							// Assume still pending if status is unrecognized or intermediate
							newStatus = "pending";
					}

					// Exit loop if transaction reached a final state (completed or failed)
					if (newStatus === "completed" || newStatus === "failed") {
						break;
					}
				} catch (trackError) {
					console.error(
						`[${new Date().toISOString()}] Error fetching status for ${tx.operationId}:`,
						trackError,
					);
					// Optionally set status to failed or keep pending and retry?
					// Decide on error handling strategy (e.g., stop tracking, mark as error)
					// For now, we just log and continue the loop/attempts
				}

				// Wait before the next attempt only if not in a final state
				if (localTx.status === "pending" || localTx.status === "processing") {
					await new Promise((resolve) => setTimeout(resolve, delayMs));
					attempts++;
				}
			} // End while loop

			if (
				attempts >= maxAttempts &&
				(localTx.status === "pending" || localTx.status === "processing")
			) {
				console.log(
					`Max attempts reached for ${tx.operationId}, operation status uncertain.`,
				);
				// Optionally update status to 'unknown' or 'timeout'
				localTx.status = "unknown";

				transactions=await getLatestTransactions(address)
			}
			updatedTransactions=await getLatestTransactions(address)
		} catch (error) {
			console.error(
				`[${new Date().toISOString()}] General Tracking Error for ${tx.operationId}:`,
				error,
			);
			// Potentially update the specific transaction's status to 'failed' in the UI
			let localTx = transactions.find((t) => t.id === tx.operationId);
			if (localTx) {
				localTx.status = "failed";
				localTx.errorMsg = `Tracking Error: ${error.message || error}`;

				transactions = [...transactions]; // Trigger reactivity
			}
		}
	}

	// --- Data Fetching and Initial Tracking ---
	onMount(async () => {
		isLoading = true;
		error = null;
		if (!address) {
			console.warn("Address not available on mount, waiting for store update.");
			// Optional: Add logic to wait for address or trigger fetch once address is available
			// For now, we'll let it proceed, but getLatestTransactions might fail or return empty
			// A better approach might involve watching the store and triggering fetch inside the subscription
			// isLoading = false; // Set loading false if we can't fetch yet
			// return;
		}

		try {
			console.log("Fetching transactions for user address: ", address);
			// Ensure getLatestTransactions returns data structured like the Transaction typedef
			const fetchedTransactions = await getLatestTransactions(address);
			console.log("Fetched transactions: ", fetchedTransactions);

			if(!fetchedTransactions){
				isLoading=false;
				return
			}

			// Initialize status if missing (assuming 'pending' if not provided)
			// Ensure each transaction has a unique 'id' field for tracking and keys
			if (!!fetchedTransactions &&fetchedTransactions.length > 0) {
				transactions = fetchedTransactions.map((tx) => ({
					...tx,
					operationId:
						tx.operationId || tx.operationId || `fallback-${Math.random()}`, // Ensure an ID exists
					status: tx.status || "pending", // Default to 'pending' if status is missing
					// Add other default fields from typedef if necessary
					type: tx.type || "Unknown",
					amount: tx.amount || "N/A",
					currency: tx.currency || "",
					errorMsg: tx.errorMsg || null,
				}));

				isLoading = false; // Show initial list

			// --- Start tracking for pending transactions ---
			const pendingTransactions = transactions.filter(
				(tx) => tx.status === "pending" && tx.operationId,
			);
			console.log(
				`Found ${pendingTransactions.length} pending transactions to track.`,
			);

			// Start tracking concurrently
			pendingTransactions.forEach((tx) => {
				// Don't await here; let them run in the background
				console.log("Starting tracking for tx: ", tx.operationId);
			 trackTransaction(tx); // Pass the full transaction object
			});
			}

			
		} catch (err) {
			console.error("Failed to fetch or process initial transactions:", err);
			error = err instanceof Error ? err : new Error(String(err)); // Ensure error is an Error object
			isLoading = false;
			transactions = []; // Clear transactions on error
		}
	});

	// Format Operation ID for display
	function formatOpId(id) {
		if (!id || typeof id !== "string" || id.length < 8) return id || "N/A";
		// Show first 4 and last 4 characters
		return `${id.substring(0, 4)}...${id.substring(id.length - 4)}`;
	}

	// Reactive statement to check if any transaction is still loading/pending
	$: loadingEquivalent = transactions.some(
		(tx) => tx.status === "pending" || tx.status === "processing",
	);
</script>

<main>
	<div class="wallet-container">
		<div class="card transactions-card">
			<h1>Transaction History</h1>

			{#if isLoading}
				<div class="loading-indicator">
					Loading transactions... <span class="spinner"></span>
				</div>
			{:else if error}
				<div class="error-message">
					Error loading transactions: {error?.message || "Unknown error"}
				</div>
			{:else if transactions.length === 0}
				<p class="no-transactions">No transactions found.</p>
			{:else}
				<div class="table-wrapper">
					<table>
						<thead>
							<tr>
								<th>Op ID</th>
								<th>Type</th>
								<th>Amount</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{#each updatedTransactions as tx (tx.operationId)}
							<tr>
								<td data-label="Op ID" class="op-id"
									>{formatOpId(tx.operationId)}</td
								>
								<td data-label="Type" class="tx-type">{tx.type}</td>
								<td data-label="Amount" class="tx-amount"
									>{tx.amount} {tx.currency}</td
								>
								<td data-label="Status" class="tx-status status-{tx.status}">
									<div class="status-badge">{tx.status}</div>
									{#if tx.status === "pending" || tx.status === "processing"}
										<span class="status-spinner"></span>
									{/if}
									{#if tx.status === "failed" && tx.errorMsg}
										<span class="error-details" title={tx.errorMsg}
											>{tx.errorMsg}</span
										>
									{/if}
								</td>
							</tr>
						{/each}
						</tbody>
					</table>
				</div>
			{/if}

			{#if !isLoading && loadingEquivalent && transactions.length > 0}
				<div class="overall-loading">
					Checking transaction status... <span class="spinner"></span>
				</div>
			{/if}

			<div class="nav-section">
				<a
					href="/"
					class="nav-link"
					on:click|preventDefault={async () => {
						await goto("/");
						window.location.reload();
					}}
				>
					Back to Wallet
				</a>
			</div>
		</div>
	</div>
</main>

<!-- <style>
	/* --- TMA Compatibility Base Styles --- */
	:root {
		/* Map semantic names to Telegram Theme variables with fallbacks */
		--app-bg-color: var(--tg-theme-bg-color, #ffffff);
		--app-secondary-bg-color: var(--tg-theme-secondary-bg-color, #f3f4f6);
		--app-text-color: var(--tg-theme-text-color, #000000);
		--app-hint-color: var(--tg-theme-hint-color, #6b7280);
		--app-link-color: var(--tg-theme-link-color, #007aff);
		--app-button-color: var(--tg-theme-button-color, #007aff);
		--app-button-text-color: var(--tg-theme-button-text-color, #ffffff);
		--app-border-color: var(
			--tg-theme-secondary-bg-color,
			#d1d5db
		); /* Use secondary bg as border */

		/* Status colors (using common web defaults as fallbacks) */
		--status-success-color: var(
			--tg-theme-button-color,
			#34d399
		); /* Often green/accent */
		--status-success-text: var(--tg-theme-button-text-color, #ffffff);
		--status-danger-color: #f87171; /* Red - Telegram doesn't have a standard 'danger' variable */
		--status-danger-text: #ffffff;
		--status-pending-color: #f59e0b; /* Amber/Orange */
		--status-pending-text: #1f2937; /* Dark text for readability on amber */
		--status-processing-color: var(
			--tg-theme-link-color,
			#4a90e2
		); /* Blue/Link color */
		--status-processing-text: #ffffff;
	}

	:global(body) {
		/* Use Telegram's font, remove explicit font-family */
		margin: 0;
		padding: 10px; /* Reduced padding for TMA */
		background-color: var(
			--app-secondary-bg-color
		); /* Use secondary for body background */
		color: var(--app-text-color);
		min-height: 100vh;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		font-size: 16px;
		box-sizing: border-box;
		/* Ensure touch scrolling works smoothly */
		-webkit-overflow-scrolling: touch;
	}

	* {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	main {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		min-height: calc(100vh - 20px); /* Account for body padding */
		padding-top: 10px; /* Reduced top padding */
	}

	.wallet-container {
		width: 100%;
		max-width: 480px; /* Slightly narrower for better mobile feel */
	}

	h1 {
		font-size: 1.6rem; /* Slightly smaller */
		font-weight: 600; /* Slightly less bold */
		color: var(--app-text-color);
		text-align: center;
		margin-bottom: 20px; /* Reduced margin */
	}

	.card {
		width: 100%;
		background: var(--app-bg-color);
		border-radius: 12px; /* Consistent rounded corners */
		/* Softer shadow, using hint color for subtlety */
		box-shadow: 0 4px 12px rgba(var(--tg-theme-hint-color, #000000), 0.1);
		padding: 16px; /* Slightly reduced padding */
		border: 1px solid var(--app-border-color);
	}
	/* --- End Base Styles --- */

	/* --- Loading/Error/Empty States --- */
	.loading-indicator,
	.error-message,
	.no-transactions,
	.overall-loading {
		text-align: center;
		padding: 25px 10px;
		font-size: 0.95rem;
		color: var(--app-hint-color);
	}
	.error-message {
		color: var(--status-danger-color); /* Use danger color */
		font-weight: 500;
	}
	.loading-indicator .spinner,
	.overall-loading .spinner {
		display: inline-block;
		vertical-align: middle;
		margin-left: 8px;
		width: 16px;
		height: 16px;
		border: 2px solid var(--app-hint-color);
		border-top-color: var(--app-link-color); /* Use link color for spinner */
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	.overall-loading {
		margin-top: 16px;
		border-top: 1px solid var(--app-border-color);
		padding-top: 16px;
	}
	/* --- End Loading --- */

	/* --- Table Styles --- */
	.table-wrapper {
		overflow-x: auto; /* Allow horizontal scroll on table if needed */
		margin: 0 -16px; /* Extend wrapper slightly if card has padding */
		padding: 0 16px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 16px;
		font-size: 0.9rem;
		/* table-layout: fixed; */ /* REMOVED - Allow flexible columns */
		min-width: 300px; /* Minimum width before scroll appears */
	}
	th,
	td {
		padding: 10px 8px; /* Reduced padding */
		text-align: left;
		border-bottom: 1px solid var(--app-border-color);
		vertical-align: middle;
		white-space: nowrap; /* Keep nowrap for default table view */
	}
	th {
		background-color: var(
			--app-secondary-bg-color
		); /* Use secondary bg for header */
		font-weight: 600;
		color: var(--app-hint-color);
		font-size: 0.8rem; /* Smaller header text */
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	tr:last-child td {
		border-bottom: none;
	}

	/* --- Column Content Styles --- */
	/* REMOVED fixed width percentages */

	.op-id {
		font-family: "Courier New", Courier, monospace; /* Keep monospace for IDs */
		font-size: 0.8rem;
		color: var(--app-hint-color);
	}
	.tx-type {
		font-weight: 500;
		color: var(--app-text-color);
	}
	.tx-amount {
		text-align: right;
		font-weight: 500;
		padding-right: 10px;
	}
	th:nth-child(3) {
		/* Amount Header */
		text-align: right;
		padding-right: 10px;
	}
	.tx-status {
		text-align: center;
		white-space: normal; /* Allow status text to wrap if needed */
	}
	th:nth-child(4) {
		/* Status Header */
		text-align: center;
	}
	/* --- End Column Styles --- */

	/* --- Status Badge & Spinner --- */
	.status-badge {
		display: inline-block;
		padding: 3px 8px;
		border-radius: 12px; /* Pill shape */
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.2;
		text-transform: capitalize;
		margin-right: 4px; /* Space for spinner */
		vertical-align: middle;
	}
	.status-spinner {
		display: inline-block;
		vertical-align: middle;
		width: 12px;
		height: 12px;
		border: 2px solid currentColor; /* Use text color of parent */
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		opacity: 0.7;
	}

	/* Color coding the badges */
	.status-completed .status-badge {
		background-color: var(--status-success-color);
		color: var(--status-success-text);
	}
	.status-pending .status-badge,
	.status-processing .status-badge {
		/* Group pending/processing visually */
		background-color: var(--status-pending-color);
		color: var(--status-pending-text);
	}
	/* Optional: Different color for processing if desired */
	/* .status-processing .status-badge {
       background-color: var(--status-processing-color);
       color: var(--status-processing-text);
   } */
	.status-failed .status-badge {
		background-color: var(--status-danger-color);
		color: var(--status-danger-text);
	}
	.status-unknown .status-badge {
		/* Add style for unknown */
		background-color: var(--app-hint-color);
		color: var(--app-bg-color);
	}

	.error-details {
		font-size: 0.75rem; /* Smaller error text */
		color: var(--status-danger-color);
		display: block;
		margin-top: 4px;
		max-width: 150px;
		margin-left: auto;
		margin-right: auto;
		line-height: 1.3;
		text-align: center;
		white-space: normal;
		word-wrap: break-word;
	}

	/* --- Nav Section --- */
	.nav-section {
		text-align: center;
		margin-top: 20px;
		padding-top: 16px;
		border-top: 1px solid var(--app-border-color);
	}
	.nav-link {
		color: var(--app-link-color);
		font-size: 0.9rem;
		font-weight: 500; /* Use 500 for links */
		text-decoration: none;
		transition: opacity 0.2s ease;
		padding: 8px 12px;
		border-radius: 6px;
		display: inline-block;
	}
	.nav-link:hover {
		/* Hover might not be relevant on touch devices, use active? */
		/* color: var(--app-link-color); */
		opacity: 0.8; /* Slight fade on press/hover */
		text-decoration: none;
	}
	.nav-link:active {
		opacity: 0.6;
	}

	/* --- Keyframes --- */
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* --- Responsive Stacking for Narrow Screens (TMA context) --- */
	@media (max-width: 550px) {
		/* Adjusted breakpoint slightly */
		:global(body) {
			padding: 8px; /* Further reduce padding on small screens */
		}
		.card {
			padding: 12px;
			border-radius: 10px;
		}
		h1 {
			font-size: 1.4rem;
			margin-bottom: 16px;
		}

		.table-wrapper {
			overflow-x: hidden; /* Hide horizontal scroll in stacked view */
			margin: 0;
			padding: 0;
		}
		table {
			min-width: 0;
			font-size: 0.9rem;
			table-layout: auto;
			margin-top: 12px;
		}
		th,
		td {
			white-space: normal;
			padding: 8px 6px;
		} /* Allow wrapping, reduce padding */
		thead {
			display: none;
		} /* Hide table header */

		tr {
			display: block;
			margin-bottom: 10px;
			border: 1px solid var(--app-border-color);
			border-radius: 8px;
			overflow: hidden;
			background: var(--app-bg-color);
			/* Keep a very subtle shadow */
			box-shadow: 0 2px 4px rgba(var(--tg-theme-hint-color, #000000), 0.05);
		}
		td {
			display: flex; /* Use flex for alignment */
			align-items: center; /* Vertically center */
			justify-content: flex-end; /* Align value to the right */
			text-align: right;
			border-bottom: 1px dashed var(--app-border-color); /* Lighter separator */
			position: relative;
			padding: 10px 10px 10px 40%; /* Space for label */
			min-height: 40px;
		}
		td:last-child {
			border-bottom: none;
		}

		td::before {
			content: attr(data-label); /* Show label */
			position: absolute;
			left: 10px;
			top: 50%;
			transform: translateY(-50%);
			width: 35%; /* Adjust width for label */
			padding-right: 10px;
			font-weight: 600;
			text-align: left;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			color: var(--app-hint-color);
			font-size: 0.8rem;
		}

		.nav-link {
			font-size: 0.85rem;
		}

		/* Adjust specific cell alignments for stacked view */
		.op-id {
			font-size: 0.75rem;
			justify-content: flex-end;
		}
		.tx-amount {
			justify-content: flex-end;
		}

		/* Stacked status alignment */
		td[data-label="Status"] {
			/* Flex alignment should work fine here now with badge/spinner */
			justify-content: flex-end; /* Align badge/spinner right */
			/* If error needs to stack below badge: */
			/* flex-wrap: wrap; */ /* Allows error to wrap below */
		}

		td[data-label="Status"] .error-details {
			/* Ensure error message is aligned correctly in flex context */
			flex-basis: 100%; /* Make error take full width below badge */
			text-align: right;
			margin: 4px 0 0 0;
			max-width: none;
			font-size: 0.7rem;
		}
		.nav-section {
			margin-top: 16px;
			padding-top: 12px;
		}
	}
</style> -->

<style>
    /* --- TMA Compatibility Base Styles --- */
    :root {
        /* Map semantic names to Telegram Theme variables with fallbacks */
        --app-bg-color: var(--tg-theme-bg-color, #ffffff);
        --app-secondary-bg-color: var(--tg-theme-secondary-bg-color, #f3f4f6);
        --app-text-color: var(--tg-theme-text-color, #000000);
        --app-hint-color: var(--tg-theme-hint-color, #6b7280);
        --app-link-color: var(--tg-theme-link-color, #007aff);
        --app-button-color: var(--tg-theme-button-color, #007aff);
        --app-button-text-color: var(--tg-theme-button-text-color, #ffffff);
        --app-border-color: var(--tg-theme-secondary-bg-color, #d1d5db); /* Use secondary bg as border */

        /* Status colors (using common web defaults as fallbacks) */
        --status-success-color: #34d399; /* Green */
        --status-success-text: #ffffff;
        --status-danger-color: #f87171; /* Red */
        --status-danger-text: #ffffff;
        --status-pending-color: #f59e0b; /* Amber/Orange */
        --status-pending-text: #1f2937; /* Dark text for readability on amber */
        --status-processing-color: #60a5fa; /* Blue */
        --status-processing-text: #ffffff;
        --status-unknown-color: var(--app-hint-color, #6b7280); /* Grey/Hint */
        --status-unknown-text: var(--app-bg-color, #ffffff);
    }

    :global(body) {
        /* Use Telegram's font, remove explicit font-family */
        margin: 0;
        padding: 8px; /* Reduced padding for TMA */
        background-color: var(--app-secondary-bg-color); /* Use secondary for body background */
        color: var(--app-text-color);
        min-height: 100vh;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        font-size: 15px; /* Slightly smaller base font for TMA */
        box-sizing: border-box;
        /* Ensure touch scrolling works smoothly */
        -webkit-overflow-scrolling: touch;
    }

    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    main {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        min-height: calc(100vh - 16px); /* Account for body padding */
        padding-top: 8px; /* Reduced top padding */
    }

    .wallet-container {
        width: 100%;
        max-width: 600px; /* Allow slightly wider on larger TMAs if needed */
    }

    h1 {
        font-size: 1.5rem; /* Slightly smaller */
        font-weight: 600;
        color: var(--app-text-color);
        text-align: center;
        margin-bottom: 16px; /* Reduced margin */
    }

    .card {
        width: 100%;
        background: var(--app-bg-color);
        border-radius: 12px; /* Consistent rounded corners */
        /* Softer shadow, using hint color for subtlety */
        box-shadow: 0 2px 8px rgba(var(--tg-theme-hint-color, #000000), 0.08);
        padding: 12px; /* Slightly reduced padding */
        border: 1px solid var(--app-border-color);
    }
    /* --- End Base Styles --- */

    /* --- Loading/Error/Empty States --- */
    .loading-indicator,
    .error-message,
    .no-transactions,
    .overall-loading {
        text-align: center;
        padding: 20px 10px;
        font-size: 0.9rem;
        color: var(--app-hint-color);
    }
    .error-message {
        color: var(--status-danger-color); /* Use danger color */
        font-weight: 500;
    }
    .loading-indicator .spinner,
    .overall-loading .spinner {
        display: inline-block;
        vertical-align: middle;
        margin-left: 8px;
        width: 1em; /* Size relative to font */
        height: 1em;
        border: 2px solid var(--app-hint-color);
        border-top-color: var(--app-link-color); /* Use link color for spinner */
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    .overall-loading {
        margin-top: 16px;
        border-top: 1px solid var(--app-border-color);
        padding-top: 16px;
    }
    /* --- End Loading --- */

    /* --- Table Styles --- */
    .table-wrapper {
        overflow-x: auto; /* Allow horizontal scroll on table if needed */
        /* Negative margins removed, rely on card padding */
        margin-top: 16px;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        /* table-layout: auto; /* Default, allows flexible columns */
        min-width: 320px; /* Minimum width before scroll appears on wider screens */
        font-size: 0.85rem; /* Smaller table font */
    }
    th,
    td {
        padding: 8px 6px; /* Reduced padding */
        text-align: left;
        border-bottom: 1px solid var(--app-border-color);
        vertical-align: middle;
        white-space: nowrap; /* Default: prevent wrapping, rely on scroll */
    }
    th {
        background-color: var(--app-secondary-bg-color); /* Use secondary bg for header */
        font-weight: 600;
        color: var(--app-hint-color);
        font-size: 0.75rem; /* Smaller header text */
        text-transform: uppercase;
        letter-spacing: 0.5px;
        position: sticky; /* Optional: make header sticky when scrolling vertically */
        top: 0; /* Required for sticky */
        z-index: 1; /* Keep header above content */
    }
    tr:last-child td {
        border-bottom: none;
    }

    /* --- Column Content Styles (Default View) --- */
    /* No fixed widths */

    .op-id {
        font-family: "Courier New", Courier, monospace;
        font-size: 0.8em; /* Relative to parent TD font size */
        color: var(--app-hint-color);
    }
    .tx-type {
        font-weight: 500;
        color: var(--app-text-color);
    }
    .tx-amount {
        text-align: right;
        font-weight: 500;
    }
    th:nth-child(3) { /* Amount Header */
        text-align: right;
    }
    .tx-status {
        text-align: center;
    }
    th:nth-child(4) { /* Status Header */
        text-align: center;
    }
    /* --- End Column Styles --- */

    /* --- Status Badge & Spinner --- */
    .status-badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 12px; /* Pill shape */
        font-size: 0.9em; /* Relative to parent TD font size */
        font-weight: 600;
        line-height: 1.2;
        text-transform: capitalize;
        margin-right: 4px; /* Space for spinner */
        vertical-align: middle;
        white-space: nowrap; /* Keep badge text on one line */
    }
    .status-spinner {
        display: inline-block;
        vertical-align: middle;
        width: 0.9em; /* Relative size */
        height: 0.9em;
        border: 2px solid currentColor; /* Use text color of parent */
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        opacity: 0.7;
    }

    /* Color coding the badges */
    .status-completed .status-badge { background-color: var(--status-success-color); color: var(--status-success-text); }
    .status-pending .status-badge { background-color: var(--status-pending-color); color: var(--status-pending-text); }
    .status-processing .status-badge { background-color: var(--status-processing-color); color: var(--status-processing-text); }
    .status-failed .status-badge { background-color: var(--status-danger-color); color: var(--status-danger-text); }
    .status-unknown .status-badge { background-color: var(--status-unknown-color); color: var(--status-unknown-text); }

    .error-details {
        font-size: 0.8em; /* Smaller error text */
        color: var(--status-danger-color);
        display: block; /* Takes its own line */
        margin-top: 4px;
        text-align: center; /* Center error text within the status cell */
        white-space: normal; /* Allow error message to wrap */
        word-wrap: break-word;
        line-height: 1.3;
        /* Max width can be added if needed, but often better to let it flow */
    }

    /* --- Nav Section --- */
    .nav-section {
        text-align: center;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid var(--app-border-color);
    }
    .nav-link {
        color: var(--app-link-color);
        font-size: 0.9rem;
        font-weight: 500;
        text-decoration: none;
        transition: opacity 0.2s ease;
        padding: 8px 12px;
        border-radius: 6px;
        display: inline-block;
    }
    .nav-link:hover, .nav-link:active {
        opacity: 0.7; /* Fade on press/hover */
        text-decoration: none;
    }

    /* --- Keyframes --- */
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    /* --- Responsive Stacking for Narrow Screens (TMA context) --- */
    @media (max-width: 550px) {
        :global(body) {
            padding: 6px; /* Further reduce padding */
        }
        .card {
            padding: 10px;
            border-radius: 10px;
        }
        h1 {
            font-size: 1.3rem;
            margin-bottom: 12px;
        }

        .table-wrapper {
            overflow-x: hidden; /* Hide horizontal scroll */
            margin-top: 12px;
        }
        table {
            min-width: 0; /* No min-width needed */
            font-size: 0.85rem; /* Consistent font size */
        }
        thead {
            display: none; /* Hide table header */
        }
        tr {
            display: block; /* Stack rows */
            margin-bottom: 8px; /* Space between cards */
            border: 1px solid var(--app-border-color);
            border-radius: 8px;
            overflow: hidden; /* Clip content */
            background: var(--app-bg-color);
            box-shadow: 0 1px 3px rgba(var(--tg-theme-hint-color, #000000), 0.06);
        }
        td {
            display: flex; /* Use flex for label/value alignment */
            align-items: center;
            justify-content: flex-end; /* Align value to the right */
            text-align: right; /* Ensure text within aligns right */
            border-bottom: 1px dashed var(--app-border-color); /* Lighter separator */
            position: relative; /* For positioning the label */
            padding: 8px 8px 8px 40%; /* Top, Right, Bottom, Left (space for label) */
            min-height: 36px; /* Slightly smaller min-height */
            white-space: normal; /* IMPORTANT: Allow content wrapping */
        }
        tr td:last-child {
            border-bottom: none; /* No border on last cell of card */
        }

        td::before {
            content: attr(data-label); /* Get label text */
            position: absolute;
            left: 8px; /* Padding from left edge */
            top: 50%;
            transform: translateY(-50%);
            width: 35%; /* Adjust width for label area */
            padding-right: 8px; /* Space between label and value */
            font-weight: 600;
            text-align: left;
            white-space: nowrap; /* Prevent label itself from wrapping */
            overflow: hidden;
            text-overflow: ellipsis;
            color: var(--app-hint-color);
            font-size: 0.9em; /* Slightly smaller label */
        }

        /* Adjust specific cell alignments/content if needed in stacked view */
        .op-id {
            font-size: 0.9em; /* Keep readable */
            justify-content: flex-end;
        }
        .tx-amount {
             justify-content: flex-end;
             /* Could add word-break: break-all; if very long numbers occur */
        }

        /* Stacked status alignment */
        td[data-label="Status"] {
            /* Flex behavior should handle badge/spinner alignment */
            /* If error needs to reliably stack below, add flex-wrap */
             flex-wrap: wrap; /* Allow wrapping if error message is present */
             justify-content: flex-end;
             padding-top: 10px; /* Slightly more top/bottom padding if wrapping */
             padding-bottom: 10px;
        }

         /* Ensure badge/spinner container stays aligned right */
        td[data-label="Status"] > div:first-of-type { /* Target the status-badge div */
             flex-shrink: 0; /* Prevent badge from shrinking */
        }

        td[data-label="Status"] .error-details {
            flex-basis: 100%; /* Make error take full width below badge/spinner */
            text-align: right;
            margin: 4px 0 0 0; /* Margin top, clear others */
            font-size: 0.8em; /* Smaller error text */
        }

        .nav-section {
             margin-top: 16px;
             padding-top: 12px;
        }
        .nav-link {
            font-size: 0.85rem;
        }
    }
</style>
