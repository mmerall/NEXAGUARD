import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";

const SUI_NETWORK = "mainnet";
const client = new SuiClient({ url: process.env.SUI_NODE_URL || getFullnodeUrl(SUI_NETWORK) });

/**
 * Analyzes a specific Move Package for capabilities (Mint, Freeze, etc.)
 */
export async function analyzePackage(packageId, moduleName = null) {
    const result = {
        risks: {
            canMint: false,
            canFreeze: false,
            isUpgradeable: false,
            details: []
        },
        score: 0
    };

    try {
        // 1. Module Analysis for Risks
        try {
            const modules = await client.getNormalizedMoveModulesByPackage({ package: packageId });

            // If moduleName is specific, check only that; otherwise check ALL modules (for wallet analysis)
            const modulesToCheck = moduleName ? { [moduleName]: modules[moduleName] } : modules;

            for (const modName in modulesToCheck) {
                const mod = modulesToCheck[modName];
                if (!mod) continue;

                for (const funcName in mod.exposedFunctions) {
                    const lowerName = funcName.toLowerCase();
                    // Heuristic: Function names often contain "mint", "burn", "freeze"
                    if (lowerName.includes("mint")) {
                        result.risks.canMint = true;
                        if (moduleName) result.risks.details.push(`${modName}::${funcName} (Mint possible)`);
                    }
                    if (lowerName.includes("freeze") || lowerName.includes("block")) {
                        result.risks.canFreeze = true;
                        if (moduleName) result.risks.details.push(`${modName}::${funcName} (Freeze possible)`);
                    }
                }
            }
        } catch (e) {
            console.warn(`[PackageAnalysis] Module analysis failed for ${packageId}: ${e.message}`);
        }

        // 2. Upgrade Capability Check
        try {
            const pkgObj = await client.getObject({ id: packageId, options: { showOwner: true } });
            if (pkgObj.data?.owner && typeof pkgObj.data.owner === 'object' && 'Immutable' in pkgObj.data.owner) {
                result.risks.isUpgradeable = false;
            } else {
                result.risks.isUpgradeable = true;
            }
        } catch (e) {
            console.warn(`[PackageAnalysis] Owner check failed for ${packageId}: ${e.message}`);
            result.risks.isUpgradeable = true; // Assume unsafe if check fails
        }

        // 3. Score Calculation (Internal Package Score)
        if (result.risks.canMint) result.score += 40;
        if (result.risks.canFreeze) result.score += 30;
        if (result.risks.isUpgradeable) result.score += 20;

        return result;

    } catch (e) {
        console.error(`[PackageAnalysis] Failed:`, e);
        return result;
    }
}

/**
 * Main Token Analysis Function
 */
export async function analyzeToken(tokenAddress) {
    if (!tokenAddress) throw new Error("Token address required");

    // Handle "Package::Module::Symbol" format
    const parts = tokenAddress.split("::");
    if (parts.length !== 3) {
        throw new Error("Invalid coin type format. Expected format: Package::Module::Symbol");
    }

    const [packageId, moduleName, symbol] = parts;

    let result = {
        coinType: tokenAddress,
        symbol: symbol,
        name: symbol, // Default to symbol if metadata fails
        decimals: 0,
        totalSupply: "Unknown",
        risks: {
            mintAuthority: "None",
            freezeAuthority: "None",
            isUpgradeable: false
        },
        riskScore: 0,
        riskLevel: "LOW",
        description: "",
        aiInsight: ""
    };

    console.log(`[TokenAnalysis] Starting analysis for ${tokenAddress}`);

    try {
        // 1. Fetch Metadata
        try {
            const metadata = await client.getCoinMetadata({ coinType: tokenAddress });
            if (metadata) {
                result.name = metadata.name || symbol;
                result.symbol = metadata.symbol || symbol;
                result.decimals = metadata.decimals || 0;
            }
        } catch (e) { console.warn("Metadata fetch failed"); }

        // 2. Fetch Total Supply
        try {
            const supply = await client.getTotalSupply({ coinType: tokenAddress });
            if (supply) {
                // Supply is in raw units, formatting depends on decimals
                // We'll keep it as a string for safety or approximate
                const val = BigInt(supply.value);
                // Rough formatter
                const adjusted = Number(val) / Math.pow(10, result.decimals);
                result.totalSupply = adjusted.toLocaleString('en-US', { maximumFractionDigits: 0 });
            }
        } catch (e) { console.warn("Supply fetch failed"); }

        // 3. Deep Package Analysis (Mint/Freeze/Upgrade)
        const pkgAnalysis = await analyzePackage(packageId, moduleName);

        // Map boolean risks to "Authority" status strings for frontend
        result.risks.mintAuthority = pkgAnalysis.risks.canMint ? "Enabled" : "Disabled";
        result.risks.freezeAuthority = pkgAnalysis.risks.canFreeze ? "Enabled" : "Disabled";
        result.risks.isUpgradeable = pkgAnalysis.risks.isUpgradeable;

        // 4. Calculate Final Risk Score
        // Base score from package analysis
        result.riskScore = pkgAnalysis.score;

        // Additional heuristics
        if (result.totalSupply === "Unknown" || result.totalSupply === "0") {
            // Sometimes supply 0 means it's a new coin or issue fetching
            // Low supply isn't necessarily a risk, but infinite mint is.
        }

        // Cap Score
        result.riskScore = Math.min(100, result.riskScore);

        // Determine Level
        if (result.riskScore > 70) result.riskLevel = "CRITICAL";
        else if (result.riskScore > 30) result.riskLevel = "MEDIUM";
        else result.riskLevel = "LOW";

        // Generate Description
        const riskFactors = [];
        if (pkgAnalysis.risks.canMint) riskFactors.push("Mint Authority (inflation risk)");
        if (pkgAnalysis.risks.canFreeze) riskFactors.push("Freeze Authority (censorship risk)");
        if (pkgAnalysis.risks.isUpgradeable) riskFactors.push("Upgradeable Contract (code change risk)");

        if (result.riskLevel === "CRITICAL") {
            result.description = `CRITICAL RISK: This token has dangerous capabilities enabled: ${riskFactors.join(", ")}. The owner has significant control over the token's lifecycle.`;
        } else if (result.riskLevel === "MEDIUM") {
            result.description = `WARNING: This token has some centralized control features: ${riskFactors.join(", ")}. Proceed with caution.`;
        } else {
            result.description = "SAFE: This token appears to have a fixed supply and immutable contract logic, reducing centralized risk.";
        }

        result.aiInsight = result.description; // Fallback if no AI model

        return result;

    } catch (criticalError) {
        console.error(`[TokenAnalysis] Critical Failure: ${criticalError.message}`);
        throw new Error(`Analysis failed: ${criticalError.message}`);
    }
}

// --- LOCAL AI INSIGHT GENERATION (Helper) ---
// Kept for compatibility if needed, but logic is moved inside for simpler flow
function generateLocalInsight(data) {
    return data.description;
}
