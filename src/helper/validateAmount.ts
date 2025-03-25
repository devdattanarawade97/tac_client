import { ethers } from "ethers";
import {

    PUBLIC_TREASURE_SWAP_ADDRESS,
 

} from "$env/static/public";
import { toNano, TonClient } from "@ton/ton";
import treasureySwapABI from '../abi/treasureySwapABI.json'
export const validateAmount =async (tokenValue: number) => {
  try {
    //@ts-ignore
    if (typeof window.ethereum !== "undefined") {
        //@ts-ignore
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(PUBLIC_TREASURE_SWAP_ADDRESS, treasureySwapABI, provider);

        // Call the contract function
        const isValid: boolean = await contract.isValidTokenAmount(tokenValue);
        console.log('is valid token amount : ', isValid)

       return isValid
    } else {
        throw new Error("Ethereum provider not found.");
    }
} catch (error) {
    console.error("Error fetching equivalent BTC:", error);
    return false;
}
  }
  