require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./db");

const app = express();
app.use(cors());

const TMP_DIR = path.join(__dirname, "..", "tmp");
const TMP_REGISTRATIONS_PATH = path.join(TMP_DIR, "registrations.json");
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecretKey ? require("stripe")(stripeSecretKey) : null;

function ensureTmpStorage() {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
  if (!fs.existsSync(TMP_REGISTRATIONS_PATH)) {
    fs.writeFileSync(TMP_REGISTRATIONS_PATH, "[]", "utf8");
  }
}

function loadTmpRegistrations() {
  ensureTmpStorage();
  try {
    const raw = fs.readFileSync(TMP_REGISTRATIONS_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveTmpRegistrations(entries) {
  ensureTmpStorage();
  fs.writeFileSync(TMP_REGISTRATIONS_PATH, JSON.stringify(entries, null, 2), "utf8");
}

app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: "Stripe secret key not configured" });
  }
  if (!stripeWebhookSecret) {
    return res.status(500).json({ error: "Stripe webhook secret not configured" });
  }

  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
  } catch (error) {
    console.error("Stripe webhook error:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("Checkout completed:", session.id);
  }

  return res.json({ received: true });
});

app.use(express.json());
app.use("/server", (_req, res) => res.status(404).end());
app.use("/tmp", (_req, res) => res.status(404).end());
app.use(express.static(path.join(__dirname, "..")));

function loadProducts() {
  try {
    const raw = fs.readFileSync(PRODUCTS_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to load products:", error);
    return [];
  }
}

function buildLineItems(items) {
  const products = loadProducts();
  const productMap = new Map(products.map((product) => [String(product.id), product]));
  const grouped = new Map();

  items.forEach((item) => {
    if (!item || (!item.id && item.id !== 0)) {
      return;
    }
    const id = String(item.id);
    const size = item.size ? String(item.size).toUpperCase() : "";
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const key = `${id}:${size}`;
    const entry = grouped.get(key) || { id, size, quantity: 0 };
    entry.quantity += quantity;
    grouped.set(key, entry);
  });

  const lineItems = [];
  grouped.forEach((entry) => {
    const product = productMap.get(entry.id);
    if (!product) {
      return;
    }
    const name = entry.size ? `${product.name} (${entry.size})` : product.name;
    const unitAmount = Math.round(Number(product.price || 0) * 100);
    if (!unitAmount) {
      return;
    }
    lineItems.push({
      price_data: {
        currency: "gbp",
        unit_amount: unitAmount,
        product_data: {
          name
        }
      },
      quantity: entry.quantity
    });
  });

  return lineItems;
}

// --- helper: auth middleware ---
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId: ... }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// --- SIGNUP ---
app.post("/api/auth/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: "Missing fields" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be 8+ chars" });

  const password_hash = await bcrypt.hash(password, 12);

  try {
    const stmt = db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)");
    const info = stmt.run(email.toLowerCase(), password_hash);
    return res.json({ ok: true, userId: info.lastInsertRowid });
  } catch (e) {
    if (String(e).includes("UNIQUE")) return res.status(409).json({ error: "Email already exists" });
    return res.status(500).json({ error: "Server error" });
  }
});

// --- LOGIN ---
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid login" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid login" });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  return res.json({ ok: true, token });
});

// --- TMP REGISTRATION (testing only) ---
app.post("/api/tmp-registrations", (req, res) => {
  const payload = req.body;
  if (!payload || !payload.email || !payload.fullName) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const entries = loadTmpRegistrations();
  const entry = {
    id: Date.now(),
    created_at: new Date().toISOString(),
    ...payload
  };
  entries.unshift(entry);
  saveTmpRegistrations(entries);
  return res.json({ ok: true, entry });
});

app.get("/api/tmp-registrations", (_req, res) => {
  const entries = loadTmpRegistrations();
  return res.json(entries);
});

// --- STRIPE ---
app.get("/api/stripe-key", (_req, res) => {
  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    return res.status(500).json({ error: "Stripe publishable key not configured" });
  }
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

app.post("/api/create-checkout-session", async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: "Stripe secret key not configured" });
  }

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const lineItems = buildLineItems(items);
  if (!lineItems.length) {
    return res.status(400).json({ error: "No valid items to checkout" });
  }

  const metadata = {};
  const shipping = req.body?.shipping || {};
  if (shipping.name) metadata.name = String(shipping.name);
  if (shipping.address) metadata.address = String(shipping.address);
  if (shipping.city) metadata.city = String(shipping.city);
  if (shipping.postcode) metadata.postcode = String(shipping.postcode);
  if (shipping.country) metadata.country = String(shipping.country);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${BASE_URL}/checkout.html?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/checkout.html?canceled=1`,
      metadata
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error("Stripe session error:", error);
    res.status(500).json({ error: "Unable to create Stripe session" });
  }
});

// --- LIST PARCELS (private) ---
app.get("/api/parcels", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM parcels WHERE user_id = ? ORDER BY id DESC").all(req.user.userId);
  res.json(rows);
});

// --- ADD PARCEL (private) ---
app.post("/api/parcels", requireAuth, (req, res) => {
  const { carrier, tracking_number } = req.body;
  if (!carrier || !tracking_number) return res.status(400).json({ error: "Missing fields" });

  const c = carrier.toLowerCase();
  if (!["royalmail", "dpd"].includes(c)) return res.status(400).json({ error: "Carrier must be royalmail or dpd" });

  const info = db
    .prepare("INSERT INTO parcels (user_id, carrier, tracking_number) VALUES (?, ?, ?)")
    .run(req.user.userId, c, tracking_number.trim());

  res.json({ ok: true, id: info.lastInsertRowid });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
