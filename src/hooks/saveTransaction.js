// --- Client-side code to POST a new transaction ---
import { PUBLIC_BACKEND_URI } from '$env/static/public';
/**
 * Sends transaction details to the API.
 * @param {string} userId - The Telegram User ID.
 * @param {object} operationDetails - An object with operationId, status, and type.
 * @param {string} operationDetails.operationId - The unique ID for the operation.
 * @param {string} operationDetails.status - The status of the operation (e.g., 'pending', 'completed').
 * @param {string} operationDetails.type - The type of operation (e.g., 'deposit', 'withdrawal').
 *  @param {string} operationDetails.amount - The type of operation (e.g., 'deposit', 'withdrawal').
 *   @param {string} operationDetails.currency - The type of operation (e.g., 'deposit', 'withdrawal').
 * @returns {Promise<object|null>} A promise that resolves to the response data from the server (the added transaction), or null if an error occurs.
 */
export async function postTransaction(userId, operationDetails) {
    // Basic validation of input
    if (!userId || !operationDetails || !operationDetails.operationId || !operationDetails.status || !operationDetails.type||!operationDetails.amount||!operationDetails.currency) {
      console.error("Missing required data: userId and operationDetails (with operationId, status, type) are needed.");
      return null;
    }
  
    const apiUrl = `${PUBLIC_BACKEND_URI}/transactions`; // POST endpoint URL
    let responseData = null;
  
    // Structure the request body according to the API spec
    const requestBody = {
        userId,
      operation: {
        operationId: operationDetails.operationId,
        status: operationDetails.status,
          type: operationDetails.type,
        amount: operationDetails.amount,
        currency:operationDetails.currency
      }
    };
  
    console.log(`Posting transaction for user: ${userId}...`);
    console.log("Request Body:", requestBody);
  
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Crucial: Sending JSON data
          'Accept': 'application/json'      // Optional: Expecting JSON response
        },
        body: JSON.stringify(requestBody) // Convert JS object to JSON string
      });
  
      // Check if the request was successful (e.g., 201 Created)
      if (!response.ok) {
        const errorBody = await response.text(); // Try to get error details
        console.error(`HTTP Error: ${response.status} ${response.statusText}`, errorBody);
        // Try parsing error body as JSON if possible, otherwise use text
        try {
             responseData = JSON.parse(errorBody);
        } catch(e){
             responseData = { message: errorBody || `Request failed with status ${response.status}`};
        }
        throw new Error(`Failed to post transaction. Status: ${response.status}`);
      }
  
      // Parse the successful JSON response (should contain the added transaction)
      responseData = await response.json();
  
      console.log("Transaction posted successfully:");
      console.log(responseData);
  
    } catch (error) {
      console.error("Error posting transaction:", error);
      // responseData remains null or might contain error details from the block above
       if (!responseData) { // Ensure responseData is at least an error object if caught early
          // @ts-ignore
          responseData = { message: error.message };
       }
    }
  
    return responseData; // Return the server's response data (or null/error object)
  }
  

  
  // Example of another transaction
  // postTransaction('user123', { operationId: 'op-xyz-9', status: 'pending', type: 'deposit' });