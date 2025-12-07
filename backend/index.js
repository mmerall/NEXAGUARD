// index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { analyzeWallet } from "./wallet_analysis.js";
import { analyzeToken } from "./token_analysis.js";

const app = express();
app.use(express.json());
app.use(cors());

// ---------- SUI CLIENT ----------
const SUI_NETWORK = "mainnet"; // Ensure we are on Mainnet for real data
const CLIENT = new SuiClient({
  url: process.env.SUI_NODE_URL || getFullnodeUrl(SUI_NETWORK),
});

const PACKAGE_ID = process.env.NEXA_PACKAGE_ID || null;

// ---------- HISTORICAL DATA (In-Memory) ----------
const recentHistory = [];

function pushHistory(type, address, riskScore) {
  recentHistory.unshift({
    type, // "wallet" | "token"
    address,
    riskScore,
    timestamp: Date.now(),
  });
  if (recentHistory.length > 20) {
    recentHistory.pop();
  }
}

// ---------- ROUTES ----------

app.get("/", (_, res) => {
  res.send("Nexa Guard Backend Active 🛡️ (Mainnet)");
});

// Wallet Analysis Endpoint
app.post("/api/analyze-wallet", async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: "Address required" });
    }

    // Call the refactored module
    const analysisResult = await analyzeWallet(address);

    // Save to history
    pushHistory("wallet", address, analysisResult.riskScore);

    res.json({ ok: true, analysis: analysisResult });
  } catch (e) {
    console.error("Wallet analysis error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Token Analysis Endpoint
app.post("/api/analyze-token", async (req, res) => {
  try {
    const { address: coinType } = req.body;
    if (!coinType) {
      return res.status(400).json({ error: "Coin type required" });
    }

    // Call the refactored module
    const analysisResult = await analyzeToken(coinType);

    // Save to history
    pushHistory("token", coinType, analysisResult.riskScore);

    res.json({ ok: true, analysis: analysisResult });
  } catch (e) {
    console.error("Token analysis error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Recent History Endpoint
app.get("/api/history", (req, res) => {
  res.json({ ok: true, history: recentHistory });
});

// ---------- SERVER START ----------
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
});
