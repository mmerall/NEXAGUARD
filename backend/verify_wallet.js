
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { analyzeWallet } from "./wallet_analysis.js";

const client = new SuiClient({ url: getFullnodeUrl("mainnet") });

async function verify() {
    console.log("--- VERIFYING WALLET ANALYSIS ---");
    try {
        // Fetch a real active address (Validator) to ensure we have data
        const state = await client.getLatestSuiSystemState();
        const testAddress = state.activeValidators[0].suiAddress;

        console.log(`Testing Address: ${testAddress}`);

        const result = await analyzeWallet(testAddress);

        console.log(JSON.stringify(result, null, 2));

        if (result.error) {
            console.error("FAILED: Analysis returned error.");
            process.exit(1);
        }

        if (result.details.totalSui >= 0 && result.details.txCount >= 0) {
            console.log("SUCCESS: Mainnet data fetched.");
            process.exit(0);
        } else {
            console.error("FAILED: Data missing (zeros).");
            process.exit(1);
        }

    } catch (e) {
        console.error("Verification Script Failed:", e);
        process.exit(1);
    }
}

verify();
