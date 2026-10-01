import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import dotenv from "dotenv";
import coinbaseCommerce from "coinbase-commerce-node";
import path from "path";
import Database from "better-sqlite3";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

const { Client, resources } = coinbaseCommerce;

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize SQLite database
const db = new Database("chainpay.db");

// Setup SQLite Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS blocks (
    height INTEGER PRIMARY KEY,
    hash TEXT UNIQUE,
    timestamp TEXT,
    transactions_count INTEGER,
    miner TEXT,
    size TEXT,
    gas_used TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    hash TEXT PRIMARY KEY,
    block_height INTEGER,
    timestamp TEXT,
    sender TEXT,
    receiver TEXT,
    amount TEXT,
    asset TEXT,
    fee TEXT,
    status TEXT,
    type TEXT,
    additional_info TEXT,
    FOREIGN KEY(block_height) REFERENCES blocks(height)
  );

  CREATE TABLE IF NOT EXISTS wallets (
    address TEXT PRIMARY KEY,
    label TEXT,
    balance REAL,
    private_key TEXT
  );

  CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    cost INTEGER,
    votes INTEGER,
    category TEXT
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    plan_id TEXT,
    plan_name TEXT,
    amount REAL,
    interval TEXT,
    status TEXT,
    current_period_end TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS stripe_events (
    id TEXT PRIMARY KEY,
    type TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS contracts (
    address TEXT PRIMARY KEY,
    name TEXT,
    contract_type TEXT,
    source_code TEXT,
    abi TEXT,
    state TEXT,
    created_at TEXT,
    block_height INTEGER,
    tx_hash TEXT,
    creator TEXT
  );

  CREATE TABLE IF NOT EXISTS notification_subscriptions (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    min_threshold_usd REAL NOT NULL,
    enabled INTEGER DEFAULT 1,
    alert_types TEXT,
    digest_frequency TEXT DEFAULT 'instant',
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS dca_schedules (
    id TEXT PRIMARY KEY,
    asset TEXT,
    amount REAL,
    frequency TEXT,
    payment_method TEXT,
    status TEXT,
    next_execution TEXT,
    total_invested REAL,
    total_crypto_bought REAL,
    created_at TEXT
  );
`);

// Prefill default database data if empty
const blockCount = db.prepare("SELECT COUNT(*) as count FROM blocks").get() as { count: number };
if (blockCount.count === 0) {
  const insertBlock = db.prepare(`
    INSERT INTO blocks (height, hash, timestamp, transactions_count, miner, size, gas_used)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  insertBlock.run(
    19283745,
    "0x82d8767b263d5651b292d0195025b26b26b26b26b26b26b26b26b26b26b26b26",
    new Date(Date.now() - 3600000).toISOString(),
    98,
    "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
    "0.8 MB",
    "12,450,123"
  );
  
  insertBlock.run(
    19283746,
    "0x71c7656a152c4540a181c9084914a15a15a15a15a15a15a15a15a15a15a15a15",
    new Date().toISOString(),
    142,
    "0x52bc44d5378309ee2abf1539bf71de1b7d7be3b5",
    "1.2 MB",
    "14,982,374"
  );
}

const txCount = db.prepare("SELECT COUNT(*) as count FROM transactions").get() as { count: number };
if (txCount.count === 0) {
  const insertTx = db.prepare(`
    INSERT INTO transactions (hash, block_height, timestamp, sender, receiver, amount, asset, fee, status, type, additional_info)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTx.run(
    "0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc",
    19283746,
    new Date(Date.now() - 600000).toISOString(),
    "Stripe_Customer_...42",
    "County_Treasury",
    "2.50",
    "USD",
    "0.0001 ETH",
    "Success",
    "buy",
    "Bus Fare Route #14"
  );

  insertTx.run(
    "0x71c765a152c4540a181c9084914a15a15a15a15a15a15a15a15a15a15a15a15e",
    19283746,
    new Date(Date.now() - 300000).toISOString(),
    "0x71c765...d897",
    "0xExchange_Hot_Wallet",
    "0.05",
    "ETH",
    "0.0005 ETH",
    "Success",
    "send",
    "Exchange Transfer"
  );

  insertTx.run(
    "0xdef4561234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    19283746,
    new Date(Date.now() - 120000).toISOString(),
    "Stripe_Customer_...88",
    "County_Treasury",
    "2.50",
    "USD",
    "0.0001 ETH",
    "Success",
    "buy",
    "Bus Fare Route #4"
  );

  insertTx.run(
    "0x789ghipayout1234567890abcdef1234567890abcdef1234567890abcdef1234",
    19283746,
    new Date(Date.now() - 30000).toISOString(),
    "County_Treasury",
    "Contractor_Alpha",
    "450.00",
    "USD",
    "0.002 ETH",
    "Success",
    "send",
    "Contractor Transit Payout"
  );
}

const walletCount = db.prepare("SELECT COUNT(*) as count FROM wallets").get() as { count: number };
if (walletCount.count === 0) {
  const insertWallet = db.prepare(`
    INSERT INTO wallets (address, label, balance, private_key)
    VALUES (?, ?, ?, ?)
  `);

  insertWallet.run(
    "0x0VibeUser99723bc44d5378309ee2abf1539bf71de1b7",
    "My Account (Default Wallet)",
    250.0,
    "9f8072bc2ca1237a3465b82e2abf1539bf71de1b76426db15ab72f883b544e31"
  );

  insertWallet.run(
    "0xCounty_Treasury_Contract",
    "County Transit Treasury",
    10000.0,
    "4e3b1c7d8e2f1a0b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z"
  );

  insertWallet.run(
    "0x0000000000000000000000000000000000000000",
    "Burn Hole Address",
    0.0,
    "0000000000000000000000000000000000000000000000000000000000000000"
  );
}

const proposalCount = db.prepare("SELECT COUNT(*) as count FROM proposals").get() as { count: number };
if (proposalCount.count === 0) {
  const insertProposal = db.prepare(`
    INSERT INTO proposals (title, description, cost, votes, category)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertProposal.run(
    "Upgrade County Bus Route #4 to 100% Electric Vehicles",
    "Transition full fleet on Route #4 to zero-emission electric buses. Funded partially by VIBE governance burning.",
    25,
    142,
    "Transit Upgrade"
  );

  insertProposal.run(
    "Introduce Weekend Night Express Line to Core District",
    "Add shuttle operations from 11:00 PM to 4:00 AM on Fridays and Saturdays to increase safety and active service.",
    15,
    88,
    "Route Extension"
  );

  insertProposal.run(
    "Add Smart Bus Shelters with USB Outlets & Live Screen Updates",
    "Upgrade the top 10 busy shelters in the county with heating, device chargers, and real-time transit tracker displays.",
    10,
    195,
    "Amenities Upgrade"
  );
}

const contractCount = db.prepare("SELECT COUNT(*) as count FROM contracts").get() as { count: number };
if (contractCount.count === 0) {
  const insertContract = db.prepare(`
    INSERT INTO contracts (address, name, contract_type, source_code, abi, state, created_at, block_height, tx_hash, creator)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const escrowAbi = JSON.stringify([
    { name: "depositFare", type: "function", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
    { name: "verifyAndReleaseTrip", type: "function", inputs: [{ name: "passenger", type: "address" }, { name: "fareAmount", type: "uint256" }], outputs: [] },
    { name: "refundPassenger", type: "function", inputs: [{ name: "passenger", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] }
  ]);

  const escrowSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TransitFareEscrow {
    address public immutable owner;
    uint256 public totalEscrowBalance;
    uint256 public activeTrips;

    event FareDeposited(address indexed passenger, uint256 amount);
    event TripReleased(address indexed passenger, uint256 fareAmount);
    event FareRefunded(address indexed passenger, uint256 amount);

    constructor() {
        owner = msg.sender;
        totalEscrowBalance = 1500;
        activeTrips = 12;
    }

    function depositFare(uint256 amount) external {
        totalEscrowBalance += amount;
        activeTrips += 1;
        emit FareDeposited(msg.sender, amount);
    }

    function verifyAndReleaseTrip(address passenger, uint256 fareAmount) external {
        require(totalEscrowBalance >= fareAmount, "Insufficient escrow");
        totalEscrowBalance -= fareAmount;
        if (activeTrips > 0) activeTrips -= 1;
        emit TripReleased(passenger, fareAmount);
    }

    function refundPassenger(address passenger, uint256 amount) external {
        require(totalEscrowBalance >= amount, "Insufficient escrow");
        totalEscrowBalance -= amount;
        emit FareRefunded(passenger, amount);
    }
}`;

  insertContract.run(
    "0x4a821e9014138e92f72a91a921d78201",
    "Transit Fare Escrow",
    "Escrow & Settlement",
    escrowSource,
    escrowAbi,
    JSON.stringify({ totalEscrowBalance: 1500, activeTrips: 12, owner: "0x0VibeUser99723bc44d5378309ee2abf1539bf71de1b7" }),
    new Date(Date.now() - 86400000).toISOString(),
    19283745,
    "0x82d8767b263d5651b292d0195025b26b26b26b26b26b26b26b26b26b26b26b26",
    "0x0VibeUser99723bc44d5378309ee2abf1539bf71de1b7"
  );

  const stakingAbi = JSON.stringify([
    { name: "stake", type: "function", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
    { name: "unstake", type: "function", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
    { name: "claimYield", type: "function", inputs: [{ name: "amount", type: "uint256" }], outputs: [] }
  ]);

  const stakingSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MunicipalStakingVault {
    uint256 public totalStakedVibe;
    uint256 public totalYieldDistributed;
    uint256 public constant APY_PERCENT = 12;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event YieldClaimed(address indexed user, uint256 yieldAmount);

    constructor() {
        totalStakedVibe = 4500;
        totalYieldDistributed = 180;
    }

    function stake(uint256 amount) external {
        totalStakedVibe += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        require(totalStakedVibe >= amount, "Exceeds pool stake");
        totalStakedVibe -= amount;
        emit Unstaked(msg.sender, amount);
    }

    function claimYield(uint256 amount) external {
        totalYieldDistributed += amount;
        emit YieldClaimed(msg.sender, amount);
    }
}`;

  insertContract.run(
    "0x8b1932f912c94a20b127394d01f98452",
    "Municipal Transit Staking Vault",
    "Staking Yield Pool",
    stakingSource,
    stakingAbi,
    JSON.stringify({ totalStakedVibe: 4500, totalYieldDistributed: 180, APY: "12%" }),
    new Date(Date.now() - 43200000).toISOString(),
    19283746,
    "0x71c7656a152c4540a181c9084914a15a15a15a15a15a15a15a15a15a15a15a15",
    "0xCounty_Treasury_Contract"
  );

  const multisigAbi = JSON.stringify([
    { name: "proposePayout", type: "function", inputs: [{ name: "recipient", type: "address" }, { name: "amount", type: "uint256" }, { name: "reason", type: "string" }], outputs: [] },
    { name: "signApproval", type: "function", inputs: [{ name: "payoutId", type: "uint256" }], outputs: [] },
    { name: "executePayout", type: "function", inputs: [{ name: "payoutId", type: "uint256" }, { name: "recipient", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] }
  ]);

  const multisigSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TreasuryMultisig {
    uint256 public requiredSignatures = 2;
    uint256 public treasuryBalance = 50000;
    uint256 public pendingPayouts = 1;

    event PayoutProposed(address indexed recipient, uint256 amount, string reason);
    event SignatureAdded(uint256 indexed payoutId, address indexed signer);
    event PayoutExecuted(uint256 indexed payoutId, address indexed recipient, uint256 amount);

    constructor() {
        requiredSignatures = 2;
        treasuryBalance = 50000;
        pendingPayouts = 1;
    }

    function proposePayout(address recipient, uint256 amount, string calldata reason) external {
        pendingPayouts += 1;
        emit PayoutProposed(recipient, amount, reason);
    }

    function signApproval(uint256 payoutId) external {
        emit SignatureAdded(payoutId, msg.sender);
    }

    function executePayout(uint256 payoutId, address recipient, uint256 amount) external {
        require(treasuryBalance >= amount, "Insufficient treasury balance");
        treasuryBalance -= amount;
        if (pendingPayouts > 0) pendingPayouts -= 1;
        emit PayoutExecuted(payoutId, recipient, amount);
    }
}`;

  insertContract.run(
    "0x3e71049210c492104821049210492104",
    "County Treasury Multisig",
    "Multisig Governance",
    multisigSource,
    multisigAbi,
    JSON.stringify({ requiredSignatures: 2, treasuryBalance: 50000, pendingPayouts: 1 }),
    new Date(Date.now() - 10000000).toISOString(),
    19283746,
    "0x789ghipayout1234567890abcdef1234567890abcdef1234567890abcdef1234",
    "0xCounty_Treasury_Contract"
  );
}

const dcaCount = db.prepare("SELECT COUNT(*) as count FROM dca_schedules").get() as { count: number };
if (dcaCount.count === 0) {
  const insertDca = db.prepare(`
    INSERT INTO dca_schedules (id, asset, amount, frequency, payment_method, status, next_execution, total_invested, total_crypto_bought, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertDca.run(
    "dca_btc_weekly",
    "BTC",
    50.00,
    "Weekly",
    "Stripe Card (•••• 4242)",
    "active",
    new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    600.00,
    0.00921,
    new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  );

  insertDca.run(
    "dca_vibe_daily",
    "VIBE",
    25.00,
    "Daily",
    "Stripe Card (•••• 4242)",
    "active",
    new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    350.00,
    3500.00,
    new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()
  );

  insertDca.run(
    "dca_eth_monthly",
    "ETH",
    100.00,
    "Monthly",
    "Stripe Direct Debit",
    "active",
    new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString(),
    1200.00,
    0.421,
    new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()
  );
}

async function startServer() {
  const app = express();

  // Enable CORS headers for iframe environment
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Lazy Stripe initialization
  let stripeClient: Stripe | null = null;
  function getStripe() {
    if (!stripeClient) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        console.warn("STRIPE_SECRET_KEY is missing. Stripe features will be disabled.");
        return null;
      }
      stripeClient = new Stripe(key);
    }
    return stripeClient;
  }

  // Helper to process Stripe payment rewards & SQLite transaction logging
  function processStripePaymentReward(amountUSD: number, senderName: string, detailInfo: string) {
    try {
      const bonusTokens = Math.floor(amountUSD * 10);
      const userWallet = db.prepare("SELECT * FROM wallets WHERE address LIKE '0x0VibeUser%'").get() as any;
      if (userWallet && bonusTokens > 0) {
        db.prepare("UPDATE wallets SET balance = balance + ? WHERE address = ?").run(bonusTokens, userWallet.address);
        
        const latestHeightRow = db.prepare("SELECT MAX(height) as max_height FROM blocks").get() as { max_height: number };
        const nextHeight = (latestHeightRow?.max_height || 19283746) + 1;
        const nextHash = "0x" + crypto.createHash('sha256').update(nextHeight.toString() + Date.now().toString()).digest('hex');

        db.prepare(`
          INSERT INTO blocks (height, hash, timestamp, transactions_count, miner, size, gas_used)
          VALUES (?, ?, ?, 1, ?, '0.5 KB', '39,120')
        `).run(nextHeight, nextHash, new Date().toISOString(), userWallet.address);

        const txHash = "0x" + crypto.createHash('sha256').update(nextHash + "stripe_payment").digest('hex');
        db.prepare(`
          INSERT INTO transactions (hash, block_height, timestamp, sender, receiver, amount, asset, fee, status, type, additional_info)
          VALUES (?, ?, ?, ?, ?, ?, 'USD', '0.00 USD', 'Success', 'buy', ?)
        `).run(txHash, nextHeight, new Date().toISOString(), senderName, userWallet.address, amountUSD.toFixed(2), detailInfo);
      }
    } catch (err) {
      console.error("Failed to process Stripe reward transaction:", err);
    }
  }

  // Stripe Webhook Endpoint (Raw Body Parser MUST execute before express.json)
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const stripe = getStripe();
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    if (webhookSecret && stripe && sig) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
      } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      // Fallback mode if testing locally or without secret signature configured
      try {
        const bodyString = typeof req.body === 'string' ? req.body : req.body.toString('utf8');
        event = JSON.parse(bodyString);
      } catch (err) {
        return res.status(400).send("Invalid webhook payload format");
      }
    }

    // Deduplicate event by event ID
    if (event.id) {
      const existingEvent = db.prepare("SELECT id FROM stripe_events WHERE id = ?").get(event.id);
      if (existingEvent) {
        return res.json({ received: true, note: "Event already processed" });
      }
      db.prepare("INSERT INTO stripe_events (id, type, created_at) VALUES (?, ?, ?)").run(event.id, event.type, new Date().toISOString());
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const metadata = session.metadata || {};
          const mode = session.mode;
          const customerId = typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id || "cus_demo_user";
          const amountTotal = (session.amount_total || 0) / 100;

          if (mode === "subscription") {
            const planName = metadata.planName || "Recurring Transit Pass";
            const interval = metadata.interval || "month";
            const subId = typeof session.subscription === 'string' ? session.subscription : `sub_${Date.now()}`;

            db.prepare(`
              INSERT OR REPLACE INTO subscriptions (id, customer_id, plan_id, plan_name, amount, interval, status, current_period_end, created_at)
              VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
            `).run(
              subId,
              customerId,
              session.id,
              planName,
              amountTotal,
              interval,
              new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
              new Date().toISOString()
            );

            processStripePaymentReward(amountTotal, "Stripe_Webhook_Subscriber", `Activated Subscription: ${planName}`);
          } else {
            const planName = metadata.planName || "One-Time Payment";
            processStripePaymentReward(amountTotal, "Stripe_Webhook_Paid", `Checkout Payment Completed: ${planName}`);
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as any;
          const amountPaid = (invoice.amount_paid || 0) / 100;
          const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as any)?.id || "cus_demo_user";

          if (invoice.subscription) {
            const subId = typeof invoice.subscription === 'string' ? invoice.subscription : (invoice.subscription as any)?.id;
            db.prepare(`
              UPDATE subscriptions 
              SET status = 'active', current_period_end = ? 
              WHERE id = ? OR customer_id = ?
            `).run(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(), subId, customerId);

            processStripePaymentReward(amountPaid, "Stripe_Subscription_Renewal", `Subscription invoice renewal ($${amountPaid.toFixed(2)})`);
          }
          break;
        }

        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          db.prepare(`
            UPDATE subscriptions SET status = ? WHERE id = ?
          `).run(subscription.status, subscription.id);
          break;
        }

        default:
          console.log(`Received Stripe Webhook Event: ${event.type}`);
      }
    } catch (handlerErr: any) {
      console.error("Error executing Stripe webhook handler:", handlerErr);
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // Lazy Coinbase initialization
  let coinbaseClient: typeof Client | null = null;
  function getCoinbase() {
    const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
    if (!apiKey) {
      console.warn("COINBASE_COMMERCE_API_KEY is missing. Coinbase features will be disabled.");
      return null;
    }
    return Client.init(apiKey);
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Server-Side Gemini AI Client (MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API)
  let genAIClient: GoogleGenAI | null = null;
  function getGenAI() {
    if (!genAIClient) {
      genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return genAIClient;
  }

  // Gemini AI Proxy Routes
  app.post("/api/ai/market-insight", async (req, res) => {
    try {
      const { marketData } = req.body;
      const ai = getGenAI();
      const prompt = `As a Senior Crypto Analyst, analyze this market data: ${JSON.stringify(marketData)}. 
Provide a concise, 2-sentence insight about the current market sentiment and what a user should watch for. 
Keep it professional and data-driven.`;

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
      });

      res.json({ insight: response.text || "Market liquidity remains robust with low slippage across core assets." });
    } catch (error: any) {
      console.warn("Server-side Gemini fallback for market-insight:", error.message || error);
      res.json({
        insight: "On-chain transparency score is optimal at 99.9% with stable gas fees and steady liquidity volume.",
        fallback: true
      });
    }
  });

  app.post("/api/ai/explain-transaction", async (req, res) => {
    try {
      const { txData } = req.body;
      const ai = getGenAI();
      const prompt = `Explain this blockchain transaction or query to a user: ${JSON.stringify(txData)}. 
Focus on the flow of funds and the 'Transparency Ledger' context. Max 3 sentences.`;

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
      });

      res.json({ explanation: response.text || "Verified transaction recorded on the immutable ledger." });
    } catch (error: any) {
      console.warn("Server-side Gemini fallback for explain-transaction:", error.message || error);
      res.json({
        explanation: "Verified transaction recorded on the immutable blockchain ledger with cryptographically signed block receipt.",
        fallback: true
      });
    }
  });

  // Notification Subscriptions & Cloud Function Alert Simulator Routes
  app.get("/api/notifications/subscription/:userId", (req, res) => {
    try {
      const row = db.prepare("SELECT * FROM notification_subscriptions WHERE user_id = ?").get(req.params.userId) as any;
      if (!row) {
        return res.json({ subscription: null });
      }
      res.json({
        subscription: {
          userId: row.user_id,
          email: row.email,
          minThresholdUsd: row.min_threshold_usd,
          enabled: Boolean(row.enabled),
          alertTypes: row.alert_types ? JSON.parse(row.alert_types) : ["large_transfers", "whales"],
          digestFrequency: row.digest_frequency,
          updatedAt: row.updated_at
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/notifications/subscription", (req, res) => {
    try {
      const { userId, email, minThresholdUsd, enabled, alertTypes, digestFrequency } = req.body;
      if (!email || !userId) {
        return res.status(400).json({ error: "userId and email are required" });
      }

      const alertTypesJson = JSON.stringify(alertTypes || ["large_transfers", "whales"]);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO notification_subscriptions (user_id, email, min_threshold_usd, enabled, alert_types, digest_frequency, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          email = excluded.email,
          min_threshold_usd = excluded.min_threshold_usd,
          enabled = excluded.enabled,
          alert_types = excluded.alert_types,
          digest_frequency = excluded.digest_frequency,
          updated_at = excluded.updated_at
      `).run(
        userId,
        email,
        parseFloat(minThresholdUsd) || 1000,
        enabled ? 1 : 0,
        alertTypesJson,
        digestFrequency || 'instant',
        now
      );

      res.json({
        status: "success",
        subscription: {
          userId,
          email,
          minThresholdUsd: parseFloat(minThresholdUsd) || 1000,
          enabled: Boolean(enabled),
          alertTypes: alertTypes || ["large_transfers", "whales"],
          digestFrequency: digestFrequency || 'instant',
          updatedAt: now
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/notifications/test-dispatch", (req, res) => {
    try {
      const { email, minThresholdUsd, alertTypes, digestFrequency } = req.body;
      const targetEmail = email || "user@example.com";
      const threshold = parseFloat(minThresholdUsd) || 1000;
      const simulatedAmount = threshold * 2.5;
      const txHash = "0x" + crypto.createHash("sha256").update(Date.now().toString()).digest("hex");
      const sender = "0xWhaleTrader88274aBc91F0";
      const receiver = "0xChainPayEscrowTreasury";

      const emailSubject = `🚨 [Whale Alert] Large Transaction: $${simulatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} on ChainPay`;

      res.json({
        status: "success",
        cloudFunction: "onLargeTransactionAlert",
        runtime: "Node.js 20 (2nd Gen Firebase Cloud Functions)",
        region: "us-east1",
        eventTrigger: "firestore.document('transactions/{txHash}').onCreate",
        recipient: targetEmail,
        threshold: threshold,
        deliveryStatus: "queued_for_dispatch",
        simulatedTransaction: {
          hash: txHash,
          amountUSD: simulatedAmount,
          asset: "USD",
          sender,
          receiver,
          type: "whale_transfer",
          timestamp: new Date().toISOString()
        },
        emailContent: {
          subject: emailSubject,
          sender: "ChainPay Cloud Alert Engine <alerts@chainpay.network>",
          recipient: targetEmail,
          summary: `Simulated Cloud Function verified transaction #${txHash.substring(0, 10)}... of $${simulatedAmount.toLocaleString()} USD exceeding your alert threshold of $${threshold.toLocaleString()} USD.`,
          previewText: `A whale transaction of $${simulatedAmount.toLocaleString()} USD was just verified on block #19283750.`
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/create-coinbase-charge", async (req, res) => {
    const client = getCoinbase();
    if (!client) {
      return res.status(500).json({ error: "Coinbase is not configured" });
    }

    const { amount, currency = "USD", cryptoType = "ETH" } = req.body;

    try {
      const chargeData = {
        name: `Purchase ${cryptoType}`,
        description: `Buying ${cryptoType} via ChainPay Gateway`,
        local_price: {
          amount: amount.toString(),
          currency: currency,
        },
        pricing_type: "fixed_price" as const,
        metadata: {
          crypto_type: cryptoType,
        },
        redirect_url: `${process.env.APP_URL || "http://localhost:3000"}/?success=true`,
        cancel_url: `${process.env.APP_URL || "http://localhost:3000"}/?canceled=true`,
      };

      const charge = await resources.Charge.create(chargeData);
      
      // Award loyalty VIBE tokens on creation!
      try {
        const bonusTokens = Math.floor(parseFloat(amount) * 10);
        if (bonusTokens > 0) {
          const userWallet = db.prepare("SELECT * FROM wallets WHERE address LIKE '0x0VibeUser%'").get() as any;
          db.prepare("UPDATE wallets SET balance = balance + ? WHERE address = ?").run(bonusTokens, userWallet.address);
          
          const latestHeightRow = db.prepare("SELECT MAX(height) as max_height FROM blocks").get() as { max_height: number };
          const nextHeight = (latestHeightRow?.max_height || 19283746) + 1;
          const nextHash = "0x" + crypto.createHash('sha256').update(nextHeight.toString() + Date.now().toString()).digest('hex');
          
          db.prepare(`
            INSERT INTO blocks (height, hash, timestamp, transactions_count, miner, size, gas_used)
            VALUES (?, ?, ?, 1, ?, '0.5 KB', '39,120')
          `).run(nextHeight, nextHash, new Date().toISOString(), userWallet.address);

          const txHash = "0x" + crypto.createHash('sha256').update(nextHash + "coinbase_reward").digest('hex');
          db.prepare(`
            INSERT INTO transactions (hash, block_height, timestamp, sender, receiver, amount, asset, fee, status, type, additional_info)
            VALUES (?, ?, ?, 'Coinbase_Loyalty_Minter', ?, ?, 'VIBE', '0.0 VIBE', 'Success', 'mint', 'Coinbase Deposit Reward')
          `).run(txHash, nextHeight, new Date().toISOString(), userWallet.address, bonusTokens.toString());
        }
      } catch (coinbaseErr) {
        console.error("Failed to credit Coinbase loyalty tokens to wallet:", coinbaseErr);
      }

      res.json({ url: charge.hosted_url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe Config Status API
  app.get("/api/stripe/config", (req, res) => {
    res.json({
      configured: !!process.env.STRIPE_SECRET_KEY,
      webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
    });
  });

  // Create Stripe Checkout Session (One-Time Payment OR Subscription)
  app.post("/api/create-checkout-session", async (req, res) => {
    const stripe = getStripe();
    const { 
      amount, 
      currency = "usd", 
      cryptoType = "ETH", 
      mode = "payment", // 'payment' or 'subscription'
      planName,
      interval = "month" // 'month', 'week', 'year'
    } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Invalid payment amount" });
    }

    if (!stripe) {
      return res.status(500).json({ 
        error: "STRIPE_SECRET_KEY is not configured in environment variables.", 
        requiresConfig: true 
      });
    }

    try {
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const displayName = planName || (mode === "subscription" ? "Recurring Transit Pass" : `Purchase ${cryptoType}`);
      const description = mode === "subscription" 
        ? `ChainPay Recurring Subscription (${interval.toUpperCase()})` 
        : `Buying ${cryptoType || 'Assets'} via ChainPay Gateway`;

      let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

      if (mode === "subscription") {
        lineItems = [
          {
            price_data: {
              currency,
              product_data: {
                name: displayName,
                description: description,
              },
              unit_amount: Math.round(parsedAmount * 100),
              recurring: {
                interval: interval as Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring.Interval,
              },
            },
            quantity: 1,
          },
        ];
      } else {
        lineItems = [
          {
            price_data: {
              currency,
              product_data: {
                name: displayName,
                description: description,
              },
              unit_amount: Math.round(parsedAmount * 100),
            },
            quantity: 1,
          },
        ];
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: mode as "payment" | "subscription",
        metadata: {
          mode,
          planName: displayName,
          amount: parsedAmount.toString(),
          interval,
          cryptoType
        },
        success_url: `${appUrl}/?success=true&session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(displayName)}`,
        cancel_url: `${appUrl}/?canceled=true`,
      });

      // Award loyalty VIBE tokens & record initiation
      processStripePaymentReward(parsedAmount, "Stripe_Checkout_Initiator", `Initiated ${mode}: ${displayName}`);

      res.json({ url: session.url, session_id: session.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create Stripe Customer Portal Session for managing subscriptions
  app.post("/api/create-portal-session", async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    try {
      const { customerId } = req.body;
      let targetCustomer = customerId;

      if (!targetCustomer) {
        const latestSub = db.prepare("SELECT customer_id FROM subscriptions WHERE customer_id IS NOT NULL ORDER BY created_at DESC LIMIT 1").get() as any;
        targetCustomer = latestSub?.customer_id;
      }

      if (!targetCustomer) {
        return res.status(400).json({ error: "No active Stripe customer found. Please subscribe to a pass first." });
      }

      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: targetCustomer,
        return_url: `${appUrl}/`,
      });

      res.json({ url: portalSession.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get active subscriptions list
  app.get("/api/subscriptions/active", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM subscriptions ORDER BY created_at DESC").all();
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dynamic Blockchain Stats API
  app.get("/api/blockchain/stats", (req, res) => {
    try {
      const latestBlockRow = db.prepare("SELECT MAX(height) as max_height FROM blocks").get() as { max_height: number };
      const latestHeight = latestBlockRow?.max_height || 19283746;
      
      const txCountRow = db.prepare("SELECT COUNT(*) as count FROM transactions").get() as { count: number };
      
      const vibeVolumeRow = db.prepare("SELECT SUM(CAST(amount AS REAL)) as total FROM transactions WHERE asset = 'VIBE' AND type = 'mint'").get() as { total: number };
      const burnedVibeRow = db.prepare("SELECT SUM(CAST(amount AS REAL)) as total FROM transactions WHERE asset = 'VIBE' AND type = 'burn'").get() as { total: number };

      const totalMinted = vibeVolumeRow?.total || 0;
      const totalBurned = burnedVibeRow?.total || 0;
      
      res.json({
        eth_price: 2850.42,
        gas_price: "12 gwei",
        latest_block: latestHeight,
        network_status: "Healthy",
        total_verified_volume: `$${(1240500 + totalMinted * 0.1).toFixed(2)}`,
        transparency_score: "99.9%",
        total_vibe_minted: totalMinted,
        total_vibe_burned: totalBurned,
        total_vibe_circulation: totalMinted - totalBurned,
        transactions_count: txCountRow?.count || 4
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dynamic Ledger API
  app.get("/api/blockchain/ledger", (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT hash as id, sender as 'from', receiver as 'to', amount, asset, type, hash, status, block_height, timestamp, fee, additional_info 
        FROM transactions 
        ORDER BY timestamp DESC
        LIMIT 50
      `).all() as any[];

      const formatted = rows.map((row: any) => ({
        id: row.id,
        from: row.from,
        to: row.to,
        amount: `${row.amount} ${row.asset}`,
        type: row.type === 'buy' ? 'Bus Fare' : row.type === 'mint' ? 'VIBE Mint' : row.type === 'burn' ? 'VIBE Burn' : row.type === 'contract_deploy' ? 'Contract Deploy' : row.type === 'contract_call' ? 'Contract Call' : 'Transfer',
        hash: row.hash.substring(0, 18) + "...",
        rawHash: row.hash,
        blockHeight: row.block_height,
        status: row.status === 'Success' ? 'verified' : 'pending',
        timestamp: row.timestamp,
        fee: row.fee,
        additionalInfo: row.additional_info
      }));

      res.json(formatted);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dynamic Blocks API
  app.get("/api/blockchain/blocks", (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT height, hash, timestamp, transactions_count, miner, size, gas_used
        FROM blocks
        ORDER BY height DESC
        LIMIT 25
      `).all() as any[];
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Simulate an on-chain event / real-time transit transaction & block
  app.post("/api/blockchain/simulate", (req, res) => {
    try {
      const sampleEvents = [
        { type: "buy", sender: "Metro_NFC_Validator_#12", receiver: "County_Treasury", amount: "2.75", asset: "USD", fee: "0.0001 ETH", info: "Tap-and-Go Subway Fare on Line 3" },
        { type: "buy", sender: "Stripe_Card_...9182", receiver: "County_Treasury", amount: "5.50", asset: "USD", fee: "0.0001 ETH", info: "Dual Bus Pass Route #42 Express" },
        { type: "mint", sender: "Transit_Loyalty_Oracle", receiver: "0x0VibeUser99723bc44d5378309ee2abf1539bf71de1b7", amount: "25", asset: "VIBE", fee: "0.0 VIBE", info: "Off-Peak Commuter Carbon Offset Bonus" },
        { type: "burn", sender: "0x0VibeUser99723bc44d5378309ee2abf1539bf71de1b7", receiver: "0x0000000000000000000000000000000000000000", amount: "15", asset: "VIBE", fee: "0.0 VIBE", info: "Smart Shelter Wi-Fi & Charge Voucher" },
        { type: "transfer", sender: "0xCounty_Treasury_Contract", receiver: "Solar_Shelter_Node_#7", amount: "40", asset: "VIBE", fee: "0.02 VIBE", info: "Municipal IoT Node Micro-Settlement" }
      ];

      const selected = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];

      const latestHeightRow = db.prepare("SELECT MAX(height) as max_height FROM blocks").get() as { max_height: number };
      const nextHeight = (latestHeightRow?.max_height || 19283746) + 1;
      const nextHash = "0x" + crypto.createHash('sha256').update(nextHeight.toString() + Date.now().toString()).digest('hex');

      const userWallet = db.prepare("SELECT * FROM wallets WHERE address LIKE '0x0VibeUser%'").get() as any;
      const miner = userWallet?.address || "0xCounty_Treasury_Contract";

      db.prepare(`
        INSERT INTO blocks (height, hash, timestamp, transactions_count, miner, size, gas_used)
        VALUES (?, ?, ?, 1, ?, '0.7 KB', '48,900')
      `).run(nextHeight, nextHash, new Date().toISOString(), miner);

      const txHash = "0x" + crypto.createHash('sha256').update(nextHash + Date.now().toString()).digest('hex');
      db.prepare(`
        INSERT INTO transactions (hash, block_height, timestamp, sender, receiver, amount, asset, fee, status, type, additional_info)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Success', ?, ?)
      `).run(txHash, nextHeight, new Date().toISOString(), selected.sender, selected.receiver, selected.amount, selected.asset, selected.fee, selected.type, selected.info);

      res.json({
        status: "success",
        block_height: nextHeight,
        block_hash: nextHash,
        tx_hash: txHash,
        transaction: {
          hash: txHash,
          amount: `${selected.amount} ${selected.asset}`,
          type: selected.type,
          sender: selected.sender,
          receiver: selected.receiver,
          info: selected.info
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Ledger CSV Export API
  app.get("/api/blockchain/ledger/csv", (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT hash, block_height, timestamp, sender, receiver, amount, asset, fee, status, type 
        FROM transactions 
        ORDER BY timestamp DESC
      `).all() as any[];

      const headers = ["Hash", "Block Height", "Timestamp", "Sender", "Receiver", "Amount", "Asset", "Fee", "Status", "Type"];
      
      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return "";
        const stringVal = String(val);
        if (stringVal.includes(",") || stringVal.includes('"') || stringVal.includes("\n") || stringVal.includes("\r")) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      };

      const csvLines = [
        headers.join(","),
        ...rows.map(row => [
          escapeCSV(row.hash),
          escapeCSV(row.block_height),
          escapeCSV(row.timestamp),
          escapeCSV(row.sender),
          escapeCSV(row.receiver),
          escapeCSV(row.amount),
          escapeCSV(row.asset),
          escapeCSV(row.fee),
          escapeCSV(row.status),
          escapeCSV(row.type)
        ].join(","))
      ];

      const csvContent = csvLines.join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=transparency_ledger.csv");
      res.status(200).send(csvContent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dynamic Blockchain Explorer Search API
  app.get("/api/blockchain/search/:query", (req, res) => {
    const { query } = req.params;
    try {
      // Check if height
      const isHeight = /^\d+$/.test(query);
      if (isHeight) {
        const heightVal = parseInt(query, 10);
        const block = db.prepare("SELECT * FROM blocks WHERE height = ?").get(heightVal) as any;
        if (block) {
          return res.json({
            type: 'block',
            id: block.height.toString(),
            height: block.height,
            hash: block.hash,
            timestamp: block.timestamp,
            transactions: block.transactions_count,
            miner: block.miner,
            size: block.size,
            gasUsed: block.gas_used
          });
        }
      }

      // Check transaction hash or sender/receiver match
      const tx = db.prepare(`
        SELECT * FROM transactions 
        WHERE hash = ? OR hash LIKE ? OR sender LIKE ? OR receiver LIKE ?
      `).get(query, `%${query}%`, `%${query}%`, `%${query}%`) as any;

      if (tx) {
        return res.json({
          type: 'transaction',
          id: tx.hash.substring(0, 12),
          hash: tx.hash,
          blockHeight: tx.block_height,
          timestamp: tx.timestamp,
          sender: tx.sender,
          receiver: tx.receiver,
          amount: `${tx.amount} ${tx.asset}`,
          fee: tx.fee,
          status: tx.status
        });
      }

      // Check block hash
      const blockByHash = db.prepare("SELECT * FROM blocks WHERE hash = ? OR hash LIKE ?").get(query, `%${query}%`) as any;
      if (blockByHash) {
        return res.json({
          type: 'block',
          id: blockByHash.height.toString(),
          height: blockByHash.height,
          hash: blockByHash.hash,
          timestamp: blockByHash.timestamp,
          transactions: blockByHash.transactions_count,
          miner: blockByHash.miner,
          size: blockByHash.size,
          gasUsed: blockByHash.gas_used
        });
      }

      res.status(404).json({ error: 'Not found' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Token Wallet details
  app.get("/api/token/wallet", (req, res) => {
    try {
      const userWallet = db.prepare("SELECT * FROM wallets WHERE address LIKE '0x0VibeUser%'").get() as any;
      const systemWallet = db.prepare("SELECT * FROM wallets WHERE address = '0xCounty_Treasury_Contract'").get() as any;
      res.json({
        address: userWallet.address,
        balance: userWallet.balance,
        label: userWallet.label,
        private_key: userWallet.private_key,
        county_treasury: systemWallet.balance
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Token Mint / Faucet claim
  app.post("/api/token/mint", (req, res) => {
    try {
      const { amount, reason = "Faucet Claim" } = req.body;
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Invalid amount to mint" });
      }

      const userWallet = db.prepare("SELECT * FROM wallets WHERE address LIKE '0x0VibeUser%'").get() as any;
      const newBalance = userWallet.balance + parsedAmount;
      db.prepare("UPDATE wallets SET balance = ? WHERE address = ?").run(newBalance, userWallet.address);

      const latestHeightRow = db.prepare("SELECT MAX(height) as max_height FROM blocks").get() as { max_height: number };
      const nextHeight = (latestHeightRow?.max_height || 19283746) + 1;
      const nextHash = "0x" + crypto.createHash('sha256').update(nextHeight.toString() + Date.now().toString()).digest('hex');

      db.prepare(`
        INSERT INTO blocks (height, hash, timestamp, transactions_count, miner, size, gas_used)
        VALUES (?, ?, ?, 1, ?, '0.5 KB', '45,210')
      `).run(nextHeight, nextHash, new Date().toISOString(), userWallet.address);

      const txHash = "0x" + crypto.createHash('sha256').update(nextHash + "mint").digest('hex');
      db.prepare(`
        INSERT INTO transactions (hash, block_height, timestamp, sender, receiver, amount, asset, fee, status, type, additional_info)
        VALUES (?, ?, ?, 'System_Minter_Rewards', ?, ?, 'VIBE', '0.0 VIBE', 'Success', 'mint', ?)
      `).run(txHash, nextHeight, new Date().toISOString(), userWallet.address, parsedAmount.toString(), `Reward: ${reason}`);

      res.json({
        status: "success",
        balance: newBalance,
        tx_hash: txHash,
        block_height: nextHeight
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Token Burn implementation
  app.post("/api/token/burn", (req, res) => {
    try {
      const { amount, utility } = req.body;
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Invalid amount to burn" });
      }

      const userWallet = db.prepare("SELECT * FROM wallets WHERE address LIKE '0x0VibeUser%'").get() as any;
      if (userWallet.balance < parsedAmount) {
        return res.status(400).json({ error: "Insufficient VIBE balance" });
      }

      const newBalance = userWallet.balance - parsedAmount;
      db.prepare("UPDATE wallets SET balance = ? WHERE address = ?").run(newBalance, userWallet.address);

      const latestHeightRow = db.prepare("SELECT MAX(height) as max_height FROM blocks").get() as { max_height: number };
      const nextHeight = (latestHeightRow?.max_height || 19283746) + 1;
      const nextHash = "0x" + crypto.createHash('sha256').update(nextHeight.toString() + Date.now().toString()).digest('hex');

      db.prepare(`
        INSERT INTO blocks (height, hash, timestamp, transactions_count, miner, size, gas_used)
        VALUES (?, ?, ?, 1, ?, '0.6 KB', '58,400')
      `).run(nextHeight, nextHash, new Date().toISOString(), userWallet.address);

      const txHash = "0x" + crypto.createHash('sha256').update(nextHash + "burn").digest('hex');
      db.prepare(`
        INSERT INTO transactions (hash, block_height, timestamp, sender, receiver, amount, asset, fee, status, type, additional_info)
        VALUES (?, ?, ?, ?, '0x0000000000000000000000000000000000000000', ?, 'VIBE', '0.0 VIBE', 'Success', 'burn', ?)
      `).run(txHash, nextHeight, new Date().toISOString(), userWallet.address, parsedAmount.toString(), `Burn for: ${utility}`);

      res.json({
        status: "success",
        balance: newBalance,
        tx_hash: txHash,
        block_height: nextHeight
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Token P2P Transfer implementation
  app.post("/api/token/transfer", (req, res) => {
    try {
      const { to, amount } = req.body;
      const parsedAmount = parseFloat(amount);
      if (!to || isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Invalid recipient or amount" });
      }

      const userWallet = db.prepare("SELECT * FROM wallets WHERE address LIKE '0x0VibeUser%'").get() as any;
      if (userWallet.balance < parsedAmount) {
        return res.status(400).json({ error: "Insufficient VIBE balance" });
      }

      const newBalanceUser = userWallet.balance - parsedAmount;
      db.prepare("UPDATE wallets SET balance = ? WHERE address = ?").run(newBalanceUser, userWallet.address);

      const recipient = db.prepare("SELECT * FROM wallets WHERE address = ?").get(to) as any;
      if (recipient) {
        db.prepare("UPDATE wallets SET balance = balance + ? WHERE address = ?").run(parsedAmount, to);
      }

      const latestHeightRow = db.prepare("SELECT MAX(height) as max_height FROM blocks").get() as { max_height: number };
      const nextHeight = (latestHeightRow?.max_height || 19283746) + 1;
      const nextHash = "0x" + crypto.createHash('sha256').update(nextHeight.toString() + Date.now().toString()).digest('hex');

      db.prepare(`
        INSERT INTO blocks (height, hash, timestamp, transactions_count, miner, size, gas_used)
        VALUES (?, ?, ?, 1, ?, '0.4 KB', '32,100')
      `).run(nextHeight, nextHash, new Date().toISOString(), userWallet.address);

      const txHash = "0x" + crypto.createHash('sha256').update(nextHash + "transfer").digest('hex');
      db.prepare(`
        INSERT INTO transactions (hash, block_height, timestamp, sender, receiver, amount, asset, fee, status, type, additional_info)
        VALUES (?, ?, ?, ?, ?, ?, 'VIBE', '0.1 VIBE', 'Success', 'transfer', 'Wallet Transfer')
      `).run(txHash, nextHeight, new Date().toISOString(), userWallet.address, to, parsedAmount.toString());

      res.json({
        status: "success",
        balance: newBalanceUser,
        tx_hash: txHash,
        block_height: nextHeight
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- DCA SCHEDULER API ROUTES ---

  // Get all DCA schedules
  app.get("/api/dca/schedules", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM dca_schedules ORDER BY created_at DESC").all();
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new DCA schedule
  app.post("/api/dca/schedules", (req, res) => {
    try {
      const { asset, amount, frequency, payment_method } = req.body;
      const parsedAmount = parseFloat(amount);
      if (!asset || isNaN(parsedAmount) || parsedAmount <= 0 || !frequency) {
        return res.status(400).json({ error: "Invalid asset, amount, or frequency" });
      }

      const id = "dca_" + crypto.randomBytes(6).toString("hex");
      const createdAt = new Date().toISOString();
      
      // Calculate next execution date based on frequency
      let nextDays = 1;
      if (frequency === "Weekly") nextDays = 7;
      else if (frequency === "Bi-Weekly") nextDays = 14;
      else if (frequency === "Monthly") nextDays = 30;

      const nextExecution = new Date(Date.now() + nextDays * 24 * 3600 * 1000).toISOString();
      const pm = payment_method || "Stripe Card (•••• 4242)";

      db.prepare(`
        INSERT INTO dca_schedules (id, asset, amount, frequency, payment_method, status, next_execution, total_invested, total_crypto_bought, created_at)
        VALUES (?, ?, ?, ?, ?, 'active', ?, 0, 0, ?)
      `).run(id, asset, parsedAmount, frequency, pm, nextExecution, createdAt);

      // Award bonus loyalty VIBE for setting up automated DCA!
      processStripePaymentReward(parsedAmount, "DCA_Plan_Created", `Created ${frequency} DCA for ${asset}`);

      const newRow = db.prepare("SELECT * FROM dca_schedules WHERE id = ?").get(id);
      res.json(newRow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle DCA schedule status (active <-> paused)
  app.patch("/api/dca/schedules/:id/toggle", (req, res) => {
    try {
      const { id } = req.params;
      const row = db.prepare("SELECT * FROM dca_schedules WHERE id = ?").get(id) as any;
      if (!row) {
        return res.status(404).json({ error: "DCA schedule not found" });
      }

      const newStatus = row.status === "active" ? "paused" : "active";
      db.prepare("UPDATE dca_schedules SET status = ? WHERE id = ?").run(newStatus, id);

      const updatedRow = db.prepare("SELECT * FROM dca_schedules WHERE id = ?").get(id);
      res.json(updatedRow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Execute DCA purchase immediately
  app.post("/api/dca/schedules/:id/execute", (req, res) => {
    try {
      const { id } = req.params;
      const row = db.prepare("SELECT * FROM dca_schedules WHERE id = ?").get(id) as any;
      if (!row) {
        return res.status(404).json({ error: "DCA schedule not found" });
      }

      // Calculate crypto bought estimation
      let price = 1;
      if (row.asset === "ETH") price = 2850;
      else if (row.asset === "BTC") price = 65000;
      else if (row.asset === "SOL") price = 145;
      else if (row.asset === "VIBE") price = 0.10;

      const cryptoAmount = row.amount / price;
      const newTotalInvested = row.total_invested + row.amount;
      const newTotalCrypto = row.total_crypto_bought + cryptoAmount;

      // Update next execution
      let nextDays = 1;
      if (row.frequency === "Weekly") nextDays = 7;
      else if (row.frequency === "Bi-Weekly") nextDays = 14;
      else if (row.frequency === "Monthly") nextDays = 30;

      const nextExecution = new Date(Date.now() + nextDays * 24 * 3600 * 1000).toISOString();

      db.prepare(`
        UPDATE dca_schedules 
        SET total_invested = ?, total_crypto_bought = ?, next_execution = ?
        WHERE id = ?
      `).run(newTotalInvested, newTotalCrypto, nextExecution, id);

      // Record transaction
      const latestHeightRow = db.prepare("SELECT MAX(height) as max_height FROM blocks").get() as { max_height: number };
      const nextHeight = (latestHeightRow?.max_height || 19283746) + 1;
      const nextHash = "0x" + crypto.createHash('sha256').update(nextHeight.toString() + Date.now().toString()).digest('hex');

      const userWallet = db.prepare("SELECT * FROM wallets WHERE address LIKE '0x0VibeUser%'").get() as any;

      db.prepare(`
        INSERT INTO blocks (height, hash, timestamp, transactions_count, miner, size, gas_used)
        VALUES (?, ?, ?, 1, ?, '0.5 KB', '24,800')
      `).run(nextHeight, nextHash, new Date().toISOString(), userWallet.address);

      const txHash = "0x" + crypto.createHash('sha256').update(nextHash + "dca_exec").digest('hex');
      db.prepare(`
        INSERT INTO transactions (hash, block_height, timestamp, sender, receiver, amount, asset, fee, status, type, additional_info)
        VALUES (?, ?, ?, ?, ?, ?, ?, '0.0001 ETH', 'Success', 'buy', ?)
      `).run(
        txHash, 
        nextHeight, 
        new Date().toISOString(), 
        row.payment_method || 'Stripe Card (•••• 4242)', 
        userWallet.address, 
        cryptoAmount.toFixed(4), 
        row.asset, 
        `Automated DCA Recurring Purchase ($${row.amount})`
      );

      // Reward bonus VIBE
      processStripePaymentReward(row.amount, "DCA_Execution_Reward", `Automated DCA Executed for ${row.asset}`);

      const updatedRow = db.prepare("SELECT * FROM dca_schedules WHERE id = ?").get(id);
      res.json({
        schedule: updatedRow,
        tx_hash: txHash,
        amount_spent: row.amount,
        crypto_acquired: cryptoAmount
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete DCA Schedule
  app.delete("/api/dca/schedules/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM dca_schedules WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get proposals
  app.get("/api/token/proposals", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM proposals").all();
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vote on proposal
  app.post("/api/token/vote", (req, res) => {
    try {
      const { proposalId, cost } = req.body;
      const userWallet = db.prepare("SELECT * FROM wallets WHERE address LIKE '0x0VibeUser%'").get() as any;
      
      if (userWallet.balance < cost) {
        return res.status(400).json({ error: "Insufficient VIBE tokens to vote" });
      }

      const newBalance = userWallet.balance - cost;
      db.prepare("UPDATE wallets SET balance = ? WHERE address = ?").run(newBalance, userWallet.address);

      db.prepare("UPDATE proposals SET votes = votes + 1 WHERE id = ?").run(proposalId);
      const proposal = db.prepare("SELECT * FROM proposals WHERE id = ?").get(proposalId) as any;

      const latestHeightRow = db.prepare("SELECT MAX(height) as max_height FROM blocks").get() as { max_height: number };
      const nextHeight = (latestHeightRow?.max_height || 19283746) + 1;
      const nextHash = "0x" + crypto.createHash('sha256').update(nextHeight.toString() + Date.now().toString()).digest('hex');

      db.prepare(`
        INSERT INTO blocks (height, hash, timestamp, transactions_count, miner, size, gas_used)
        VALUES (?, ?, ?, 1, ?, '0.5 KB', '41,300')
      `).run(nextHeight, nextHash, new Date().toISOString(), userWallet.address);

      const txHash = "0x" + crypto.createHash('sha256').update(nextHash + "vote").digest('hex');
      db.prepare(`
        INSERT INTO transactions (hash, block_height, timestamp, sender, receiver, amount, asset, fee, status, type, additional_info)
        VALUES (?, ?, ?, ?, '0x0000000000000000000000000000000000000000', ?, 'VIBE', '0.0 VIBE', 'Success', 'burn', ?)
      `).run(txHash, nextHeight, new Date().toISOString(), userWallet.address, cost.toString(), `Vote for Proposal: ${proposal.title}`);

      res.json({
        status: "success",
        balance: newBalance,
        votes: proposal.votes,
        proposal_title: proposal.title
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Smart Contracts APIs
  // List all contracts
  app.get("/api/contracts", (req, res) => {
    try {
      const rows = db.prepare("SELECT address, name, contract_type, abi, state, created_at, block_height, tx_hash, creator FROM contracts ORDER BY created_at DESC").all();
      const parsedRows = rows.map((r: any) => ({
        ...r,
        abi: JSON.parse(r.abi || "[]"),
        state: JSON.parse(r.state || "{}")
      }));
      res.json(parsedRows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific contract detail with source code
  app.get("/api/contracts/:address", (req, res) => {
    try {
      const { address } = req.params;
      const contract = db.prepare("SELECT * FROM contracts WHERE address = ?").get(address) as any;
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json({
        ...contract,
        abi: JSON.parse(contract.abi || "[]"),
        state: JSON.parse(contract.state || "{}")
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Deploy new Smart Contract
  app.post("/api/contracts/deploy", (req, res) => {
    try {
      const { name, contract_type, source_code, abi, initialState = {} } = req.body;
      if (!name || !source_code) {
        return res.status(400).json({ error: "Name and source code are required for deployment" });
      }

      const userWallet = db.prepare("SELECT * FROM wallets WHERE address LIKE '0x0VibeUser%'").get() as any;
      const contractAddress = "0x" + crypto.createHash('sha256').update(name + Date.now().toString()).digest('hex').substring(0, 32);

      const latestHeightRow = db.prepare("SELECT MAX(height) as max_height FROM blocks").get() as { max_height: number };
      const nextHeight = (latestHeightRow?.max_height || 19283746) + 1;
      const nextHash = "0x" + crypto.createHash('sha256').update(nextHeight.toString() + Date.now().toString()).digest('hex');

      db.prepare(`
        INSERT INTO blocks (height, hash, timestamp, transactions_count, miner, size, gas_used)
        VALUES (?, ?, ?, 1, ?, '1.8 KB', '185,420')
      `).run(nextHeight, nextHash, new Date().toISOString(), userWallet.address);

      const txHash = "0x" + crypto.createHash('sha256').update(nextHash + "deploy").digest('hex');

      // Auto parse ABI if simple ABI wasn't provided
      let finalAbi = abi;
      if (!finalAbi || !Array.isArray(finalAbi) || finalAbi.length === 0) {
        // extract function names from Solidity code
        const funcMatches = source_code.match(/function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g) || [];
        finalAbi = funcMatches.map((fStr: string) => {
          const match = fStr.match(/function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
          const funcName = match ? match[1] : "customMethod";
          const paramStr = match ? match[2] : "";
          const inputs = paramStr ? paramStr.split(",").map(p => {
            const parts = p.trim().split(/\s+/);
            return { name: parts[parts.length - 1] || "param", type: parts[0] || "string" };
          }) : [];
          return { name: funcName, type: "function", inputs, outputs: [] };
        });
      }

      db.prepare(`
        INSERT INTO contracts (address, name, contract_type, source_code, abi, state, created_at, block_height, tx_hash, creator)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        contractAddress,
        name,
        contract_type || "Custom Smart Contract",
        source_code,
        JSON.stringify(finalAbi),
        JSON.stringify(initialState),
        new Date().toISOString(),
        nextHeight,
        txHash,
        userWallet.address
      );

      db.prepare(`
        INSERT INTO transactions (hash, block_height, timestamp, sender, receiver, amount, asset, fee, status, type, additional_info)
        VALUES (?, ?, ?, ?, ?, '0.0', 'VIBE', '0.05 VIBE', 'Success', 'contract_deploy', ?)
      `).run(txHash, nextHeight, new Date().toISOString(), userWallet.address, contractAddress, `Contract Deployed: ${name}`);

      res.json({
        status: "success",
        contract_address: contractAddress,
        block_height: nextHeight,
        tx_hash: txHash,
        message: `Smart Contract '${name}' successfully compiled and deployed to block #${nextHeight}.`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Execute a Smart Contract Function
  app.post("/api/contracts/execute", (req, res) => {
    try {
      const { contractAddress, functionName, args = {} } = req.body;
      if (!contractAddress || !functionName) {
        return res.status(400).json({ error: "contractAddress and functionName are required" });
      }

      const contract = db.prepare("SELECT * FROM contracts WHERE address = ?").get(contractAddress) as any;
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      const userWallet = db.prepare("SELECT * FROM wallets WHERE address LIKE '0x0VibeUser%'").get() as any;
      let currentState = JSON.parse(contract.state || "{}");
      let executionResult = "";
      let amountTransferred = 0;

      // Smart State Transition logic based on called function
      if (functionName === "depositFare" || functionName === "stake") {
        const val = parseFloat(args.amount || "10");
        if (userWallet.balance < val) {
          return res.status(400).json({ error: `Insufficient VIBE balance to execute ${functionName}` });
        }
        // Deduct from wallet, credit contract state
        db.prepare("UPDATE wallets SET balance = balance - ? WHERE address = ?").run(val, userWallet.address);
        if (currentState.totalEscrowBalance !== undefined) {
          currentState.totalEscrowBalance += val;
          currentState.activeTrips = (currentState.activeTrips || 0) + 1;
        }
        if (currentState.totalStakedVibe !== undefined) {
          currentState.totalStakedVibe += val;
          currentState.userStaked = (currentState.userStaked || 0) + val;
        }
        executionResult = `Deposited ${val} VIBE into ${contract.name}. State updated.`;
        amountTransferred = val;
      } else if (functionName === "verifyAndReleaseTrip" || functionName === "refundPassenger" || functionName === "unstake") {
        const val = parseFloat(args.fareAmount || args.amount || "10");
        db.prepare("UPDATE wallets SET balance = balance + ? WHERE address = ?").run(val, userWallet.address);
        if (currentState.totalEscrowBalance !== undefined) {
          currentState.totalEscrowBalance = Math.max(0, currentState.totalEscrowBalance - val);
          if (currentState.activeTrips > 0) currentState.activeTrips -= 1;
        }
        if (currentState.totalStakedVibe !== undefined) {
          currentState.totalStakedVibe = Math.max(0, currentState.totalStakedVibe - val);
          currentState.userStaked = Math.max(0, (currentState.userStaked || 0) - val);
        }
        executionResult = `Released/Refunded ${val} VIBE to passenger/staker. State updated.`;
        amountTransferred = val;
      } else if (functionName === "proposePayout") {
        currentState.pendingPayouts = (currentState.pendingPayouts || 0) + 1;
        executionResult = `New treasury payout proposed for ${args.recipient || "0xRecipient"} for amount ${args.amount || 100} VIBE. Reason: ${args.reason || "County Infrastructure"}.`;
      } else if (functionName === "signApproval") {
        currentState.currentSignatures = (currentState.currentSignatures || 1) + 1;
        executionResult = `Approval signature logged by ${userWallet.address}. Total approvals: ${currentState.currentSignatures}/${currentState.requiredSignatures || 2}.`;
      } else if (functionName === "claimYield") {
        const yieldAmt = parseFloat(args.amount || "15");
        db.prepare("UPDATE wallets SET balance = balance + ? WHERE address = ?").run(yieldAmt, userWallet.address);
        currentState.totalYieldDistributed = (currentState.totalYieldDistributed || 0) + yieldAmt;
        executionResult = `Claimed ${yieldAmt} VIBE yield from Staking Vault.`;
        amountTransferred = yieldAmt;
      } else {
        // Generic custom contract method execution
        currentState.lastExecutedMethod = functionName;
        currentState.lastExecutionTimestamp = new Date().toISOString();
        if (args.amount) {
          const amt = parseFloat(args.amount);
          if (!isNaN(amt)) currentState.totalBalance = (currentState.totalBalance || 0) + amt;
        }
        executionResult = `Executed function ${functionName}(${JSON.stringify(args)}). State variable updated.`;
      }

      // Save updated state back to database
      db.prepare("UPDATE contracts SET state = ? WHERE address = ?").run(JSON.stringify(currentState), contractAddress);

      // Record block & transaction
      const latestHeightRow = db.prepare("SELECT MAX(height) as max_height FROM blocks").get() as { max_height: number };
      const nextHeight = (latestHeightRow?.max_height || 19283746) + 1;
      const nextHash = "0x" + crypto.createHash('sha256').update(nextHeight.toString() + Date.now().toString()).digest('hex');

      db.prepare(`
        INSERT INTO blocks (height, hash, timestamp, transactions_count, miner, size, gas_used)
        VALUES (?, ?, ?, 1, ?, '0.6 KB', '68,200')
      `).run(nextHeight, nextHash, new Date().toISOString(), userWallet.address);

      const txHash = "0x" + crypto.createHash('sha256').update(nextHash + "call").digest('hex');
      db.prepare(`
        INSERT INTO transactions (hash, block_height, timestamp, sender, receiver, amount, asset, fee, status, type, additional_info)
        VALUES (?, ?, ?, ?, ?, ?, 'VIBE', '0.01 VIBE', 'Success', 'contract_call', ?)
      `).run(
        txHash,
        nextHeight,
        new Date().toISOString(),
        userWallet.address,
        contractAddress,
        amountTransferred.toString(),
        `SmartContract Call: ${contract.name}.${functionName}()`
      );

      const updatedWallet = db.prepare("SELECT balance FROM wallets WHERE address = ?").get(userWallet.address) as any;

      res.json({
        status: "success",
        executionResult,
        updatedState: currentState,
        userBalance: updatedWallet.balance,
        block_height: nextHeight,
        tx_hash: txHash,
        gas_used: "68,200"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
