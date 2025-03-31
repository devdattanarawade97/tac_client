<script>
  // @ts-nocheck // Add this if you cannot import types for OperationTracker/Network
  import { onMount } from 'svelte';
  import { tonwalletaddressStore } from '../../store/walletStore'; // Adjust path if needed
  import { getLatestTransactions } from '../../hooks/retrievTransactions'; // Adjust path if needed
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
  let loadingEquivalent =true
  /**
   * @typedef {Object} Transaction
   * @property {string} id - The operation ID (or a unique transaction identifier) used for tracking.
   * @property {string} [operationId] - Optional: If your data source uses 'operationId' instead of 'id', adjust accordingly.
   * @property {string} type - Type of transaction
   * @property {string | number} amount - Transaction amount
   * @property {string} [currency] - Optional: Currency symbol/name
   * @property {string} status - Current status ('Pending', 'Processing', 'Complete', 'Failed', 'Unknown')
   * @property {number} progress - Progress percentage (0-100)
   * @property {string} [errorMsg] - Optional error message on failure
   */

  /** @type {Transaction[]} */
  let transactions = [];
  let isLoading = true;
  /** @type {Error | null} */
  let error = null;
  let progressPercentage=0;
  // Assuming $tonwalletaddressStore provides the address correctly
  let address = $tonwalletaddressStore;
  let transactionList=[];
  console.log('address ton from store: ', address);

  async function trackTransaction(tx) {
		const tracker = new OperationTracker(Network.Testnet);

		try {
			console.log(`Tracking Operation ID: ${tx.operationId}`);
			let attempts = 0;
			const maxAttempts = 30;
			const delayMs = 5000;

			while (attempts < maxAttempts) {
				const opStatus = await tracker.getOperationStatus(tx.operationId);
				console.log("Each Status:", opStatus.status);

				switch (opStatus.status) {
          case "TVMMerkleMessageExecuted":
						// status = "Transaction Status : successful";
            transactions.map(eachtx=>
         {
          if(eachtx.operationId==tx.operationId){
            eachtx.status="completed";
          }
         }
      
         )
						break;

					case "EVMMerkleMessageCollected":
				
					case "EVMMerkleRootSet":
				
					case "EVMMerkleMessageExecuted":
					
					case "TVMMerkleMessageCollected":
			
					case "TVMMerkleRootSet":
	
		
					default:
          transactions.map(eachtx=>
         {
          if(eachtx.operationId==tx.operationId){
            eachtx.status="in progress";
          }

          
         }
      
         )
				}
        console.log('new tx : ', transactions)
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


  // --- Data Fetching and Initial Tracking ---
  onMount(async () => {
    isLoading = true;
    error = null;
    try {
      // Fetch initial transaction data - Replace with your actual implementation
      console.log('Fetching transactions for user address: ', address);
      const fetchedTransactions = await getLatestTransactions(address);
       console.log('Fetched transactions: ', fetchedTransactions);

      // Initialize status and progress if missing from the fetched data
      // Use map to create a new array, ensuring reactivity from the start
      transactions = fetchedTransactions.map(tx => ({
        // Spread existing tx data first
        ...tx,
        // Ensure required fields have defaults
        id: tx.id || tx.operationId, // Prefer 'id', fallback to 'operationId' if that's what your API returns
        status: tx.status || 'Pending', // Default to Pending
      
      }));

      isLoading = false; // Show initial list now that it's populated

      // --- Start tracking for relevant transactions ---
      // Filter for transactions that need tracking (have an ID and are pending/processing)
      const transactionsToTrack = transactions.filter(
          tx => tx
      );
       console.log(`Found ${transactionsToTrack.length} transactions to track.`);
       
       console.log('transactions track : ', transactionsToTrack)
      // Start tracking for each concurrently without blocking onMount
      transactionsToTrack.forEach(tx => {
          // Don't await here; let them run in the background
          console.log('tx is : ', tx)
          trackTransaction(tx).catch(err => {
              // Optional: Catch errors specifically from the start of trackTransaction itself
              console.error(`[${tx.id}] Failed to initiate tracking:`, err);
              // Update the status to Failed here too if initiation fails
              const txIndex = transactions.findIndex(t => t.id === tx.id);
               if (txIndex !== -1) {
                  transactions[txIndex].status = 'Failed';
                  transactions[txIndex].errorMsg = 'Failed to start tracking.';
                  transactions = [...transactions]; // Trigger reactivity
               }
          });
      });

    } catch (err) {
      console.error("Failed to fetch or process initial transactions:", err);
      error = err; // Store error object/message
      isLoading = false; // Stop loading indicator even if fetch fails
      transactions = []; // Clear transactions on fetch error
    }
  });

  // --- End Progress Helper ---

  // --- Helper to shorten Operation ID (Keep as is from original, adjusted length) ---
  /**
   * @param {string | undefined | null} id
   */
  function formatOpId(id) {
    if (!id || id.length < 8) return id || 'N/A'; // Handle null/short IDs, show N/A if null/undefined
    // Show slightly more characters for better identification
    return `${id.substring(0, 4)}...${id.substring(id.length - 4)}`;
  }

  // NOTE: The placeholder/mock retrieveTransactions function is removed as you're using getLatestTransactions

</script>

<main>
  <div class="wallet-container">
    <div class="card transactions-card">
      <h1>Transaction History</h1>

      {#if isLoading}
        <div class="loading-indicator">Loading transactions... <span class="spinner"></span></div>
      {:else if error}
        <div class="error-message">Error loading transactions: {error?.message || error}</div>
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
              {#each transactions as tx (tx.operationId || Math.random())}
           
                <tr>
                  <td data-label="Op ID" class="op-id">{formatOpId(tx.id)}</td>
                  <td data-label="Type" class="tx-type">{tx.type || 'N/A'}</td>
                  <td data-label="Amount">{tx.amount || 'N/A'} {tx.currency || ''}</td>
                  <td data-label="Status">
                    <div class="" >{tx.status}
                    </div>
                    {#if tx.status === 'Failed' && tx.errorMsg}
                       <span class="error-details" title={tx.errorMsg}>{tx.errorMsg}</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <div class="nav-section">
        <a href="/" class="nav-link">Back to Wallet</a>
      </div>
    </div>
  </div>
</main>

<style>
  /* --- All your original CSS styles go here --- */
  /* --- Color Palette & Base Styles --- */
  :root {
    --primary-color: #4A90E2; /* Vibrant Blue */
    --primary-darker: #357ABD; /* Darker Blue for hover */
    --secondary-color: #50E3C2; /* Turquoise/Mint - Accent */
    --success-color: #34D399; /* Emerald Green */
    --success-darker: #10B981; /* Darker Green */
    --danger-color: #F87171; /* Softer Red */
    --danger-darker: #EF4444; /* Darker Red */
    --pending-color: #F59E0B; /* Amber 500 for Pending */
    --pending-text-color: #1F2937; /* Dark text for pending bg */

    --text-dark: #1F2937; /* Dark Gray */
    --text-medium: #6B7280; /* Medium Gray */
    --text-light: #F9FAFB; /* Near White */
    --text-link: var(--primary-color);

    --bg-body-start: #E0F2FE; /* Light Blue */
    --bg-body-end: #BFDBFE; /* Medium Light Blue */
    --bg-card: #FFFFFF;
    --bg-input: #F3F4F6; /* Light Gray - Use for table head */
    --bg-progress: #E5E7EB; /* Use for progress bar background */

    --border-color: #D1D5DB; /* Gray */
    --border-focus-color: var(--primary-color);

    --shadow-color: rgba(0, 0, 0, 0.1);
  }

  /* Base styles for body (Keeping explicit font-family) */
  :global(body) {
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 20px; /* Base padding */
    background: linear-gradient(135deg, var(--bg-body-start) 0%, var(--bg-body-end) 100%);
    color: var(--text-dark);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-size: 16px; /* Base font size */
    box-sizing: border-box;
  }

  /* Reset for consistency (Keep as is) */
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* Main content alignment (Keep as is) */
  main {
    display: flex;
    justify-content: center;
    align-items: flex-start; /* Align card to top */
    min-height: calc(100vh - 40px); /* Account for body padding */
    padding-top: 20px; /* Add some space at the top */
  }

  /* Wallet container (Keep as is) */
  .wallet-container {
    width: 100%;
    max-width: 500px; /* Adjusted slightly larger for table */
  }

  /* Heading styles (Keep as is - already matches target default) */
  h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-dark);
    text-align: center;
    margin-bottom: 24px;
  }

  /* Card styles (Keep as is) */
  .card {
    width: 100%;
    background: var(--bg-card);
    border-radius: 16px; /* Softer corners */
    box-shadow: 0 8px 32px var(--shadow-color); /* Softer shadow */
    padding: 24px;
    border: 1px solid var(--border-color);
  }
  /* --- End Base Styles --- */


  /* --- Loading/Error/Empty States (Keep as is) --- */
  .loading-indicator, .error-message, .no-transactions {
    text-align: center;
    padding: 30px 10px;
    font-size: 1rem;
    color: var(--text-medium); /* Use medium text color */
  }
  .error-message {
      color: var(--danger-darker); /* Use darker danger color for errors */
   }
  .loading-indicator .spinner {
    display: inline-block;
    vertical-align: middle;
    margin-left: 8px;
    width: 18px; /* Match target spinner size */
    height: 18px;
    border: 3px solid rgba(0, 0, 0, 0.15); /* Slightly darker border */
    border-top-color: var(--primary-color); /* Use primary color */
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  /* --- End Loading --- */


  /* --- Table Styles (Keep as is) --- */
  .table-wrapper {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    font-size: 0.9rem;
    table-layout: fixed;
    min-width: 400px;
  }
  th, td {
    padding: 12px 10px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
    vertical-align: middle;
    white-space: nowrap;
  }
  th {
    background-color: var(--bg-input);
    font-weight: 600;
    color: var(--text-medium);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  tr:last-child td {
      border-bottom: none;
   }

  /* --- Column Styles (Keep as is) --- */
  th:nth-child(1), td:nth-child(1) { width: 25%; } /* Op ID */
  th:nth-child(2), td:nth-child(2) { width: 15%; } /* Type */
  th:nth-child(3), td:nth-child(3) { width: 25%; } /* Amount */
  th:nth-child(4), td:nth-child(4) { width: 35%; } /* Status */

  .op-id {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.8rem;
    color: var(--text-medium);
    word-break: break-all; /* Allow breaking if needed */
    white-space: normal; /* Allow wrapping */
  }
  .tx-type {
      font-weight: 500;
      color: var(--text-dark);
   }
  td[data-label="Amount"] {
      text-align: right;
      padding-right: 12px;
      font-weight: 500;
   }
  th:nth-child(3) {
      text-align: right;
      padding-right: 12px;
   }
  td[data-label="Status"] {
      text-align: center;
   }
  th:nth-child(4) {
      text-align: center;
   }
  /* --- End Column Styles --- */

  .error-details {
      font-size: 0.8rem;
      color: var(--danger-darker);
      display: block;
      margin-top: 6px;
      max-width: 150px; /* Limit width in table view */
      margin-left: auto; margin-right: auto;
      line-height: 1.3;
      text-align: center;
      white-space: normal; /* Allow wrapping */
      word-wrap: break-word;
  }
  /* --- End Progress Bar --- */


  /* --- Nav Section --- */
   .nav-section {
       text-align: center;
       margin-top: 24px;
       padding-top: 16px;
       border-top: 1px solid var(--border-color);
   }
   .nav-link {
       color: var(--text-link);
       font-size: 0.9rem;
       /* --- MODIFICATION: Adjusted font-weight --- */
       font-weight: 400; /* Changed from 500 */
       text-decoration: none;
       transition: color 0.2s ease;
       padding: 8px 12px;
       border-radius: 6px;
       display: inline-block;
   }
   .nav-link:hover {
       color: var(--primary-darker);
       text-decoration: none;
       /* --- MODIFICATION: Removed background-color --- */
       /* background-color: rgba(74, 144, 226, 0.1); */ /* Removed */
   }

   /* --- Keyframes (Keep spin animation) --- */
   @keyframes spin {
      to { transform: rotate(360deg); }
   }


  /* --- Responsive Stacking --- */
  @media (max-width: 500px) {
    :global(body) {
       padding: 15px;
    }
    .wallet-container {
       max-width: 100%;
    }
     .card {
       padding: 15px;
       border-radius: 12px;
     }
     h1 {
         /* --- MODIFICATION: Adjusted font-size --- */
         font-size: 1.6rem; /* Changed from 1.5rem */
         margin-bottom: 20px;
     }

    .table-wrapper { overflow-x: visible; margin:0; padding: 0;}
    table { min-width: 0; font-size: 0.85rem; table-layout: auto; margin-top: 15px;}
    th, td { white-space: normal; padding: 10px 8px;}
    thead { display: none; }

    tr {
       display: block;
       margin-bottom: 12px;
       border: 1px solid var(--border-color);
       border-radius: 8px;
       overflow: hidden;
       background: var(--bg-card);
       box-shadow: 0 2px 4px rgba(0,0,0, 0.05);
    }
    td {
       display: block;
       text-align: right;
       border-bottom: 1px dashed #eee;
       position: relative;
       padding: 10px 10px 10px 45%;
       min-height: 38px;
       /* Align items for stacked view */
       display: flex;
       align-items: center;
       justify-content: flex-end;
    }
    td:last-child { border-bottom: none; }

    td::before {
       content: attr(data-label);
       position: absolute;
       left: 10px;
       top: 50%;
       transform: translateY(-50%);
       width: 40%;
       padding-right: 10px;
       font-weight: 600;
       text-align: left;
       white-space: nowrap;
       overflow: hidden;
       text-overflow: ellipsis;
       color: var(--text-medium);
       font-size: 0.8rem;
    }

    /* --- MODIFICATION: Added rule for nav-link small screen size --- */
    .nav-link {
        font-size: 0.85rem;
    }

    /* Adjust specific cell alignments if needed (Keep as is) */
    .op-id { text-align: right; font-size: 0.75rem; justify-content: flex-end; } /* Ensure value aligns right */
    td[data-label="Amount"] { text-align: right; justify-content: flex-end; }

    /* Stacked progress bar alignment */
    td[data-label="Status"] {
        /* Override flex alignment for this cell if error needs to stack */
        display: block; /* Back to block to allow error below */
        text-align: right;
        padding-top: 12px;
        padding-bottom: 12px;
    }

     td[data-label="Status"] .error-details {
       display: block; /* Ensure error message is block */
       text-align: right; /* Align with the progress bar */
       margin: 6px 0 0 0;
       max-width: none; /* Allow full width */
       font-size: 0.75rem;
     }
     .nav-section {
        margin-top: 20px;
        padding-top: 12px;
     }
  }
</style>