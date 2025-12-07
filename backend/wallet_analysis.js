import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";

const SUI_NETWORK = "mainnet";
const client = new SuiClient({ url: process.env.SUI_NODE_URL || getFullnodeUrl(SUI_NETWORK) });

export async function analyzeWallet(address) {
    if (!address) {
        throw new Error("Address required");
    }

    console.log(`🔍 Scanning Wallet: ${address}`);

    try {
        // 1. Fetch Transactions (Last 50 to get a better sample)
        console.log(`Debug: Querying transactions for ${address}...`);
        const txs = await client.queryTransactionBlocks({
            filter: { FromAddress: address },
            limit: 50,
            options: {
                showEffects: true,
                showInput: true,
                showBalanceChanges: true,
                showObjectChanges: true,
            },
        });
        console.log(`Debug: Found ${txs.data?.length} transactions.`);

        const transactionsCount = txs.data.length;

        // 2. Analyze for Created Tokens & Scam Interactions
        let createdTokens = 0;
        let scamInteractions = 0;

        // Simple heuristic for "Scam Interactions": 
        // In a real app, you'd check against a known bad address list.
        // Here, we'll flag interactions with very suspicious simplified patterns or known blacklists if we had them.
        // For now, valid placeholder logic:

        txs.data.forEach((tx) => {
            // Check for package publish
            if (tx.effects?.created?.some((obj) => obj.owner === "Immutable")) {
                createdTokens++;
            }

            // Placeholder: If interacting with a "suspicious" contract 
            // (real imp would check a blocklist array)
            // if (isScamAddress(tx)) scamInteractions++;
        });

        // 3. Fetch SUI Balance
        const balanceObj = await client.getBalance({
            owner: address,
            coinType: "0x2::sui::SUI",
        });

        // Balance is returned in MIST (10^9)
        const rawBalance = BigInt(balanceObj.totalBalance);
        const suiBalance = Number(rawBalance) / 1e9;

        // 4. Calculate Risk Score
        // Parametric Risk Logic
        let riskScore = 0;
        const details = [];

        // Factor 1: Transaction History (Too few transactions might mean a burner wallet)
        if (transactionsCount < 5) {
            riskScore += 20;
            details.push("Low transaction history (potential burner)");
        }

        // Factor 2: Scam Interactions
        if (scamInteractions > 0) {
            riskScore += 50; // High penalty
            details.push(`Detected ${scamInteractions} interactions with suspicious contracts`);
        }

        // Factor 3: Created Tokens (Creating many tokens can be suspicious for a normal user, but normal for a dev)
        // We'll treat mass token creation as "High Activity" but potentially risky if combined with other factors.
        if (createdTokens > 10) {
            riskScore += 10;
            details.push("High volume of token creation");
        }

        // Factor 4: Balance
        if (suiBalance < 1) {
            // Low balance isn't a security risk per se, but common in spam bots
            // keeping it neutral for now, or slight increase
            riskScore += 5;
        }

        // Cap Risk Score
        riskScore = Math.min(100, Math.max(0, riskScore));

        // Determine Risk Level
        let riskLevel = "LOW";
        if (riskScore > 75) riskLevel = "CRITICAL";
        else if (riskScore > 40) riskLevel = "MEDIUM";

        // Generate Explanation
        let description = "This wallet appears to be a standard user wallet with normal activity patterns.";
        if (riskLevel === "CRITICAL") {
            description = "CRITICAL: This wallet exhibits high-risk behaviors, including suspicious interactions or patterns associated with scam activity.";
        } else if (riskLevel === "MEDIUM") {
            description = "WARNING: This wallet has some flags (e.g., low activity, potential spam behavior) that warrant caution.";
        }

        return {
            address,
            riskLevel,
            riskScore,
            description,
            details: {
                transactions: transactionsCount,
                createdTokens,
                scamInteractions,
                suiBalance: suiBalance.toFixed(2), // Format for display
            },
            aiInsight: details.join(". ")
        };

    } catch (e) {
        console.error("Wallet analysis failed:", e);
        throw new Error(`Analysis failed: ${e.message}`);
    }
}
