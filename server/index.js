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
app.use(express.json());

const TMP_DIR = path.join(__dirname, "..", "tmp");
const TMP_REGISTRATIONS_PATH = path.join(TMP_DIR, "registrations.json");

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
