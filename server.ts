import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import dotenv from "dotenv";
import { Client, resources } from "coinbase-commerce-node";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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
    res.json({ url: charge.hosted_url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/create-checkout-session", async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(500).json({ error: "Stripe is not configured" });
  }

  const { amount, currency = "usd", cryptoType = "ETH" } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Purchase ${cryptoType}`,
              description: `Buying ${cryptoType} via ChainPay Gateway`,
            },
            unit_amount: amount * 100, // amount in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.APP_URL || "http://localhost:3000"}/?success=true`,
      cancel_url: `${process.env.APP_URL || "http://localhost:3000"}/?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mock Blockchain Data API
app.get("/api/blockchain/stats", (req, res) => {
  res.json({
    eth_price: 2850.42,
    gas_price: "12 gwei",
    latest_block: 19283746,
    network_status: "Healthy",
    total_verified_volume: "$1,240,500",
    transparency_score: "99.9%"
  });
});

// Transparency Ledger API
app.get("/api/blockchain/ledger", (req, res) => {
  res.json([
    { id: 'L1', from: 'Stripe_Customer_...42', to: 'County_Treasury', amount: '$2.50', type: 'Bus Fare', hash: '0xabc...123', status: 'verified' },
    { id: 'L2', from: 'Stripe_Customer_...88', to: 'County_Treasury', amount: '$2.50', type: 'Bus Fare', hash: '0xdef...456', status: 'verified' },
    { id: 'L3', from: 'County_Treasury', to: 'Contractor_Alpha', amount: '$450.00', type: 'Payout', hash: '0x789...ghi', status: 'verified' },
  ]);
});

// Blockchain Explorer Search API
app.get("/api/blockchain/search/:query", (req, res) => {
  const { query } = req.params;
  
  // Mock data for blocks and transactions
  const mockBlocks: any[] = [
    {
      type: 'block',
      id: '19283746',
      height: 19283746,
      hash: '0x71c7656a152c4540a181c9084914a15a15a15a15a15a15a15a15a15a15a15a15',
      timestamp: '2026-02-22T04:20:00Z',
      transactions: 142,
      miner: '0x52bc44d5378309ee2abf1539bf71de1b7d7be3b5',
      size: '1.2 MB',
      gasUsed: '14,982,374',
    },
    {
      type: 'block',
      id: '19283745',
      height: 19283745,
      hash: '0x82d8767b263d5651b292d0195025b26b26b26b26b26b26b26b26b26b26b26b26',
      timestamp: '2026-02-22T04:19:48Z',
      transactions: 98,
      miner: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
      size: '0.8 MB',
      gasUsed: '12,450,123',
    }
  ];

  const mockTransactions: any[] = [
    {
      type: 'transaction',
      id: '0xabc123',
      hash: '0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
      blockHeight: 19283746,
      timestamp: '2026-02-22T04:20:12Z',
      sender: '0xStripe_Customer_...42',
      receiver: '0xCounty_Treasury',
      amount: '2.50 USD',
      fee: '0.0001 ETH',
      status: 'Success',
    },
    {
      type: 'transaction',
      id: '0x71c765',
      hash: '0x71c7656a152c4540a181c9084914a15a15a15a15a15a15a15a15a15a15a15a15',
      blockHeight: 19283746,
      timestamp: '2026-02-22T04:18:00Z',
      sender: '0x71c765...d897',
      receiver: '0xExchange_Hot_Wallet',
      amount: '0.05 ETH',
      fee: '0.0005 ETH',
      status: 'Success',
    }
  ];

  // Search logic
  const result = mockBlocks.find(b => b.id === query || b.hash === query) || 
                 mockTransactions.find(t => t.id === query || t.hash === query || t.id.includes(query));

  if (result) {
    res.json(result);
  } else {
    res.status(404).json({ error: 'Not found' });
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
  app.use(express.static("dist"));
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
