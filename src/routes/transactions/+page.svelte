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
        --app-border-color: var(--tg-theme-secondary-bg-color, #e5e7eb); /* Slightly adjusted fallback border */

        /* Status colors */
        --status-success-color: #34d399;
        --status-success-text: #ffffff;
        --status-danger-color: #f87171;
        --status-danger-text: #ffffff;
        --status-pending-color: #f59e0b;
        --status-pending-text: #1f2937;
        --status-processing-color: #60a5fa;
        --status-processing-text: #ffffff;
        --status-unknown-color: var(--app-hint-color, #6b7280);
        --status-unknown-text: var(--app-bg-color, #ffffff);
    }

    :global(body) {
        margin: 0;
        padding: 8px; /* Default padding */
        background-color: var(--app-secondary-bg-color);
        color: var(--app-text-color);
        min-height: 100vh;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        font-size: 15px;
        box-sizing: border-box;
        -webkit-overflow-scrolling: touch;
        /* Ensure body itself doesn't cause horizontal scroll */
        overflow-x: hidden;
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
        min-height: calc(100vh - 16px); /* Adjust based on body padding */
        padding-top: 8px; /* Consistent with body padding */
        width: 100%; /* Ensure main takes full width */
    }

    /* Wallet container - Default Max Width */
    .wallet-container {
        width: 100%;
        /* Default max-width for wider screens if desired, TMA usually handles this */
        /* max-width: 600px; <-- Can be adjusted or removed depending on desired large screen behavior */
        /* For TMA, often relying on 100% width is fine */
        padding: 0; /* Remove padding here if body has it */
    }

    h1 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--app-text-color);
        text-align: center;
        margin-bottom: 16px;
    }

    .card {
        width: 100%; /* Card takes full width of its container */
        background: var(--app-bg-color);
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(var(--tg-theme-hint-color, #000000), 0.08);
        padding: 12px; /* Default card padding */
        border: 1px solid var(--app-border-color);
        margin-bottom: 10px; /* Add space below card if needed */
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
        color: var(--status-danger-color);
        font-weight: 500;
    }
    .loading-indicator .spinner,
    .overall-loading .spinner {
        display: inline-block;
        vertical-align: middle;
        margin-left: 8px;
        width: 1em;
        height: 1em;
        border: 2px solid var(--app-hint-color);
        border-top-color: var(--app-link-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    .overall-loading {
        margin-top: 16px;
        border-top: 1px solid var(--app-border-color);
        padding-top: 16px;
    }
    /* --- End Loading --- */

    /* --- Table Styles (Non-Responsive/Scrolling) --- */
    .table-wrapper {
        overflow-x: auto; /* CRUCIAL: Enables horizontal scrolling */
        width: 100%;      /* Ensure wrapper takes full width OF THE CARD */
        margin-top: 16px;
        -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
    }
    table {
        width: 100%;              /* Table takes full width OF THE WRAPPER */
        border-collapse: collapse;
        min-width: 450px;         /* Minimum width before scrollbar appears - ADJUST AS NEEDED */
        font-size: 0.85rem;
    }
    th,
    td {
        padding: 9px 8px;
        text-align: left;
        border-bottom: 1px solid var(--app-border-color);
        vertical-align: middle;
        white-space: nowrap;     /* CRUCIAL: Prevents text wrapping */
    }
    th {
        background-color: var(--app-secondary-bg-color);
        font-weight: 600;
        color: var(--app-hint-color);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        position: sticky;
        top: 0;
        z-index: 1;
    }
    tbody tr:last-child td {
         border-bottom: none;
    }

    /* --- Column Content Styles --- */
    .op-id { font-family: "Courier New", Courier, monospace; font-size: 0.8em; color: var(--app-hint-color); }
    .tx-type { font-weight: 500; color: var(--app-text-color); }
    .tx-amount { text-align: right; font-weight: 500; }
    th:nth-child(3) { text-align: right; } /* Amount Header */
    .tx-status { text-align: center; }
    th:nth-child(4) { text-align: center; } /* Status Header */
    /* --- End Column Styles --- */

    /* --- Status Badge & Spinner --- */
    .status-badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.9em; font-weight: 600; line-height: 1.2; text-transform: capitalize; margin-right: 4px; vertical-align: middle; white-space: nowrap; }
    .status-spinner { display: inline-block; vertical-align: middle; width: 0.9em; height: 0.9em; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; opacity: 0.7; }
    /* Color coding the badges */
    .status-completed .status-badge { background-color: var(--status-success-color); color: var(--status-success-text); }
    .status-pending .status-badge { background-color: var(--status-pending-color); color: var(--status-pending-text); }
    .status-processing .status-badge { background-color: var(--status-processing-color); color: var(--status-processing-text); }
    .status-failed .status-badge { background-color: var(--status-danger-color); color: var(--status-danger-text); }
    .status-unknown .status-badge { background-color: var(--status-unknown-color); color: var(--status-unknown-text); }
    .error-details { font-size: 0.8em; color: var(--status-danger-color); display: block; margin-top: 4px; text-align: center; white-space: normal; word-wrap: break-word; line-height: 1.3; }
    /* --- End Status --- */

    /* --- Nav Section --- */
    .nav-section { text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--app-border-color); }
    .nav-link { color: var(--app-link-color); font-size: 0.9rem; font-weight: 500; text-decoration: none; transition: opacity 0.2s ease; padding: 8px 12px; border-radius: 6px; display: inline-block; }
    .nav-link:hover, .nav-link:active { opacity: 0.7; text-decoration: none; }
    /* --- End Nav --- */

    /* --- Keyframes --- */
    @keyframes spin { to { transform: rotate(360deg); } }

    /* --- Responsive Adjustments for Mini App Width --- */
    /* Apply adjustments below a certain width, e.g., 480px */
    /* This mirrors the logic from Style B for container width */
    @media (max-width: 480px) {
         :global(body) {
             padding: 6px; /* Optional: Slightly reduce body padding */
         }

        .wallet-container {
            /* CRITICAL FIX: Allow the main container to shrink below its default max-width */
            /* No max-width here, let it be 100% of the viewport */
            max-width: 100%;
        }

        .card {
            padding: 10px; /* Optional: Slightly reduce card padding */
            border-radius: 10px; /* Optional: Adjust radius */
        }

        h1 {
            font-size: 1.4rem; /* Optional: Slightly smaller heading */
        }

        /* Optional: Adjust table text size slightly if needed for density */
        /* table { font-size: 0.8rem; } */
        /* th, td { padding: 8px 6px; } */

        /* Keep the table scrolling via .table-wrapper */
        /* No changes needed for table, th, td display properties */
    }

</style>