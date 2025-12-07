
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { analyzeWallet } from "./wallet_analysis.js";

const client = new SuiClient({ url: getFullnodeUrl("mainnet") });

async function runDiagnosis() {
    console.log("--- STARTING DIAGNOSIS (COMPREHENSVE) ---");
    try {
        console.log("1. Fetching a valid Validator address to test...");
        const state = await client.getLatestSuiSystemState();
        const validatorAddress = state.activeValidators[0].suiAddress;
        console.log(`> Testing with Validator Address: ${validatorAddress}`);

        console.log("2. Running analyzeWallet...");
        const result = await analyzeWallet(validatorAddress);

        console.log("--- RESULT OBJECT ---");
        // Handle circular references if any, though result should be clean JSON
        try {
            console.log(JSON.stringify(result, null, 2));
        } catch (jsonErr) {
            console.log("Result (non-JSON):", result);
        }

        if (result.error) {
            console.error("❌ DIAGNOSIS FAILED WITH ERROR:", result.error);
        } else {
            console.log("--- SUMMARY ---");
            console.log("Transactions:", result.details?.txCount);
            console.log("Created Tokens:", result.details?.createdTokens);
            console.log("Scam Interactions:", result.details?.scamInteractions);
            console.log("Sui Balance:", result.details?.totalSui);
            console.log("Risk Score:", result.riskScore);
            console.log("Risk Level:", result.riskLevel);

            if (result.details?.txCount > 0 || result.details?.totalSui > 0) {
                console.log("✅ SUCCESS: Data fetched successfully from Mainnet.");
            } else {
                console.log("❌ FAILURE: All values are zero. Mainnet connection might be failing.");
            }
        }

    } catch (e) {
        console.error("Diagnosis Script Crash:", e);
    }
}

runDiagnosis();
