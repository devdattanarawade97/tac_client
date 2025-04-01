// --- Client-side code to GET latest transactions ---
import { PUBLIC_BACKEND_URI } from '$env/static/public';
/**
 * Retrieves the latest (up to 10) transactions for a specific user from the API.
 * @param {string} userId - The Telegram User ID to fetch transactions for.
 * @returns {Promise<Array<object>|null>} A promise that resolves to an array of transaction objects, or null if an error occurs or user not found.
 */
export async function getLatestTransactions(userId) {
    // 1. Input Validation
    if (!userId || typeof userId !== 'string' || userId.trim() === "") {
        console.error("Invalid or missing User ID provided.");
        return null; // Return null for invalid input
    }
     
    
    // 2. Define API URL (including userId in the path)
    const apiUrl = `${PUBLIC_BACKEND_URI}/api/transactions/${userId}`;
    let responseData = null; // To store the parsed response array

    console.log(`Workspaceing latest transactions for user: ${userId}...`);

    try {
        // 3. Perform the fetch request (GET)
        const response = await fetch(apiUrl, {
            method: 'GET', // Explicitly GET
            headers: {
                'Accept': 'application/json' // We expect JSON back
                // No 'Content-Type' or 'body' needed for GET
            }
        });

        // 4. Process the response
        // Try parsing JSON first to potentially get error details
        let bodyContent;
        try {
            bodyContent = await response.json();
        } catch (parseError) {
             // If parsing fails (e.g. empty body on 404, or non-json error page)
             // Get text body instead for error reporting
            // @ts-ignore
            bodyContent = { message: await response.text() || `JSON parse error: ${parseError.message}` };
            console.warn("Could not parse server response as JSON.");
        }


        // Check if the HTTP status code indicates success (200 OK)
        if (!response.ok) {
            // Handle specific case: 404 Not Found
            if (response.status === 404) {
                console.log(`User not found: ${userId}`);
                // Depending on desired behavior, return null or empty array for "not found"
                return null; // Returning null here
            }
            // Handle other HTTP errors
            console.error(`HTTP Error: ${response.status} ${response.statusText}`);
            console.error("Server response:", bodyContent); // Log the parsed/text response
            throw new Error(bodyContent.message || `Request failed with status ${response.status}`);
        }

        // 5. Handle Success - response.ok is true, bodyContent should be the array
        responseData = bodyContent; // Assign the successfully parsed array
        console.log("Transactions fetched successfully:");
        console.log(responseData);

    } catch (error) {
        // 6. Handle Errors (Network errors or errors thrown from response check)
        // @ts-ignore
        console.error("Error fetching transactions:", error.message);
        // responseData remains null (its initial value)
        // No need to assign error message to responseData here unless the function contract changes
        return null; // Explicitly return null on error
    }

    // 7. Return the data (array of transactions or null if error/not found)
    return responseData;
}

// --- Example Usage (similar to how postTransaction might be used) ---
/*
const userIdToFetch = 'user123abc';

getLatestTransactions(userIdToFetch)
    .then(transactions => {
        if (transactions) {
            console.log(`--- Successfully fetched ${transactions.length} transactions ---`);
            // Process the transactions array
            transactions.forEach(tx => console.log(`  - ID: ${tx.operationId}, Status: ${tx.status}, Type: ${tx.type}`));
        } else {
            console.log(`--- Failed to fetch transactions or user not found ---`);
        }
    });
*/