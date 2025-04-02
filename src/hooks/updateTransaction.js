// --- Client-side code to PUT (update) a transaction's status ---
import { PUBLIC_BACKEND_URI } from '$env/static/public';

/**
 * Sends updated transaction status details to the API.
 * Assumes the backend API endpoint for updating is like PUT /api/transactions/{operationId}
 *

 * @param {string} operationId - The unique ID of the transaction to update.

 * @param {string} newStatus - The new status for the operation (e.g., 'completed', 'failed', 'unknown').


 */
export async function updateTransactionStatus(operationId, newStatus) {
    // Basic validation of input
    if ( !operationId || !newStatus) {
        console.error("Missing required data: userId, operationId, and updateDetails (with newStatus) are needed.");
        return { message: "Missing required data for update." }; // Return an error object
    }

    // Construct the specific API endpoint URL for the transaction
    const apiUrl = `${PUBLIC_BACKEND_URI}/api/transactions?operationid=${operationId}`; // PUT/PATCH endpoint URL targeting specific resource

    let responseData = null;

    // Structure the request body with the fields to be updated
    const requestBody = {
       newStatus
      
    };

    console.log(`Updating transaction status for user:  operationId: ${operationId}...`);
    console.log("Request Body:", requestBody);

    try {
        const response = await fetch(apiUrl, {
            method: 'PUT', // Or 'PATCH' if your backend API uses PATCH for partial updates
            headers: {
                'Content-Type': 'application/json', // Sending JSON data
                'Accept': 'application/json',       // Expecting JSON response
                // Add any necessary Authorization headers here, e.g.:
                // 'Authorization': `Bearer ${your_auth_token}`
            },
            body: JSON.stringify(requestBody) // Convert JS object to JSON string
        });

        // Check if the request was successful (e.g., 200 OK, 204 No Content)
        if (!response.ok) {
            const errorBody = await response.text(); // Try to get error details
            console.error(`HTTP Error: ${response.status} ${response.statusText}`, errorBody);
            // Try parsing error body as JSON if possible, otherwise use text
            try {
                responseData = JSON.parse(errorBody);
            } catch (e) {
                responseData = { message: errorBody || `Request failed with status ${response.status}` };
            }
            throw new Error(`Failed to update transaction status. Status: ${response.status}`);
        }

        // Handle potential 204 No Content response (success, but no body to parse)
        if (response.status === 204) {
            console.log(`Transaction ${operationId} updated successfully (No Content).`);
            responseData = { message: 'Update successful', status: 204 };
        } else {
            // Parse the successful JSON response (might contain the updated transaction or a success message)
            responseData = await response.json();
            console.log("Transaction status updated successfully:");
            console.log(responseData);
        }

    } catch (error) {
        console.error("Error updating transaction status:", error);
        // Ensure responseData contains error info if caught
        if (!responseData) {
            // @ts-ignore
             responseData = { message: error.message || 'Unknown error during update' };
        }
    }

    return responseData; // Return the server's response data (or error object)
}

// --- How you might use it within your Svelte component's trackTransaction function ---

/*
// Inside trackTransaction, when status changes to a final state:
// ...
localTx.status = newStatus;
localTx.errorMsg = newErrorMsg;
saveLocalTransaction(address, localTx); // Update local state first

console.log(`Persisting final status (${newStatus}) to backend for ${tx.id}`);

// Call the update function
updateTransactionStatus(address, tx.id, {
    newStatus: localTx.status,
    errorMessage: localTx.errorMsg
})
.then(result => {
    if (!result || (result.status && result.status >= 400)) { // Basic check if the result indicates an error
         console.warn(`Backend update for ${tx.id} might have failed:`, result?.message);
         // Optional: Add logic here to handle potential backend update failures
         // (e.g., retry later, show a warning in the UI)
    } else {
         console.log(`Backend update for ${tx.id} confirmed.`);
    }
})
.catch(err => {
    // This catch is mostly for network errors not handled inside updateTransactionStatus's try/catch
     console.error(`Unhandled error calling updateTransactionStatus for ${tx.id}:`, err);
});

transactions = [...transactions]; // Trigger Svelte reactivity
break; // Exit loop after handling final state
// ...
*/

// Example of direct call:
// updateTransactionStatus('user456', 'op-abc-123', { newStatus: 'completed' });
// updateTransactionStatus('user789', 'op-def-456', { newStatus: 'failed', errorMessage: 'Network timeout during confirmation' });