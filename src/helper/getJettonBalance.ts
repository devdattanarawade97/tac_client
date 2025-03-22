import { TonClient, Address, JettonWallet } from "@ton/ton";
import tokensJson from "../tokens/tokens.json";
// Initialize TON client
const client = new TonClient({
  endpoint: "https://toncenter.com/api/v2/jsonRPC",
  apiKey: "YOUR_TONCENTER_API_KEY" // Optional, but recommended for higher rate limits
});

export async function fetchJettonBalance( tacSdk:any,userTonWalletAddress:string, tvmMasterAddress:string) {
    try {
 

      const userJettonBalance = await tacSdk.getUserJettonBalance(userTonWalletAddress.toString(), tvmMasterAddress);
       
      const balanceBigInt = BigInt(userJettonBalance);
      // Calculate 10^decimals as a BigInt
      const denominator = BigInt(10) ** BigInt(tokensJson[0].decimals);
      // Perform division with BigInt and convert to a human-readable number
      const balance = Number(balanceBigInt) / Number(denominator);
      return balance

    } catch (error) {
      console.error("Error fetching Jetton wallet data:", error);
    }
}

// Example usage:
// fetchJettonWalletData("EQ...user_wallet_address", "EQ...jetton_wallet_address");