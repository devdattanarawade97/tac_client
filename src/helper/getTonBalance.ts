import {TonClient} from '@ton/ton';
import {fromNano} from "@ton/ton";
import {Address} from "@ton/core";


import {Network, TacSdk} from "tac-sdk";

export const getTONBalance = async (userAddress: Address) => {
    const client = new TonClient({
      endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC?api_key=3c3d7c4e1fcbaee7adb97e14cd4f0a225244525f60fc40e70d67128dcdc9aee8",
    })
  
    try {
      const balance = await client.getBalance(userAddress);
      return Number(fromNano(balance)).toFixed(4);
    } catch (e) {
      console.log("Failed to getTONBalance: " + e);
      return 0;
    }
  };