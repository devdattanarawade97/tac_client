import { ethers } from "ethers";
import {

    PUBLIC_TREASURE_SWAP_ADDRESS,
 

} from "$env/static/public";
import { toNano, TonClient } from "@ton/ton";
import treasureySwapABI from '../abi/treasureySwapABI.json'
export async function getEquivalentBmbtc(value:string) {
    try {
        //@ts-ignore
        if (typeof window.ethereum !== "undefined") {
            //@ts-ignore
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(PUBLIC_TREASURE_SWAP_ADDRESS, treasureySwapABI, provider);

            // Convert input `value` to BigInt (assumed to be in wTON units)
        // Convert TON to its smallest unit (wTON has 9 decimals)
            const wTONamt = parseFloat(value)*10**9;
            
            // Call the contract function
            const balance: bigint = await contract.calculateBmbtcAmount(wTONamt);
            console.log('btc value : ', balance)

            // Convert BigInt to readable format (8 decimals)
            const formattedBalance = Number(ethers.formatUnits(balance.toString(), 8));
            console.log("formatted BMBTC balance:", formattedBalance);
            return Number(formattedBalance);
        } else {
            throw new Error("Ethereum provider not found.");
        }
    } catch (error) {
        console.error("Error fetching equivalent BTC:", error);
        return 0;
    }
}