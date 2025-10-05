// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_KEY = process.env.ADMIN_API_KEY || "changeme"; // imposta su Render

const ORDERS_FILE = path.join(__dirname, "orders.json");
const DISHES_FILE = path.join(__dirname, "dishes.json");

app.use(cors());
app.use(express.json());

/* ---------- Helpers per file JSON ---------- */
const readJson = (filePath) => {
  try {
    if(!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    console.error("readJson error:", err);
    return [];
  }
};

const writeJson = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("writeJson error:", err);
  }
};

/* ---------- Middleware admin check (header x-api-key) ---------- */
const requireAdminKey = (req, res, next) => {
  const key = req.header("x-api-key");
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized (invalid API key)" });
  }
  next();
};

/* ============================
   DISHES (menu) - persistent
   Public: GET /dishes
   Protected: POST /dishes, PATCH /dishes/:id, DELETE /dishes/:id
   ============================ */

/* GET dishes */
app.get("/dishes", (req, res) => {
  const dishes = readJson(DISHES_FILE);
  res.json(dishes);
});

/* POST add dish (protected) */
app.post("/dishes", requireAdminKey, (req, res) => {
  const { name, price, img, ingredients, tags, type } = req.body;
  if (!name) return res.status(400).json({ error: "Missing name" });
  const dishes = readJson(DISHES_FILE);
  const newDish = {
    id: Date.now(),
    name,
    price: Number(price || 0),
    img: img || "",
    ingredients: ingredients || "",
    tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
    type: type || ""
  };
  dishes.push(newDish);
  writeJson(DISHES_FILE, dishes);
  res.json({ success: true, dish: newDish });
});

/* PATCH update dish (protected) */
app.patch("/dishes/:id", requireAdminKey, (req, res) => {
  const id = parseInt(req.params.id);
  let dishes = readJson(DISHES_FILE);
  const idx = dishes.findIndex(d => d.id === id);
  if (idx === -1) return res.status(404).json({ error: "Dish not found" });
  const updated = { ...dishes[idx], ...req.body };
  // sanitize tags if provided
  if (req.body.tags && !Array.isArray(req.body.tags)) updated.tags = [req.body.tags];
  dishes[idx] = updated;
  writeJson(DISHES_FILE, dishes);
  res.json({ success: true, dish: updated });
});

/* DELETE dish (protected) */
app.delete("/dishes/:id", requireAdminKey, (req, res) => {
  const id = parseInt(req.params.id);
  let dishes = readJson(DISHES_FILE);
  const idx = dishes.findIndex(d => d.id === id);
  if (idx === -1) return res.status(404).json({ error: "Dish not found" });
  const removed = dishes.splice(idx, 1)[0];
  writeJson(DISHES_FILE, dishes);
  res.json({ success: true, dish: removed });
});

/* ============================
   ORDERS - persistent
   Public: GET /orders
   Protected: PATCH /orders/:id (update status), DELETE /orders/:id
   POST /orders (public, creates new order, but server enforces single active per device)
   ============================ */

/* GET orders (public) */
app.get("/orders", (req, res) => {
  const orders = readJson(ORDERS_FILE);
  res.json(orders);
});

/* POST new order (public) */
app.post("/orders", (req, res) => {
  const { cart, customerName, customerPhone, deviceId } = req.body;
  if (!cart || !customerName || !customerPhone) {
    return res.status(400).json({ error: "Missing order fields" });
  }

  const orders = readJson(ORDERS_FILE);

  // Prevent duplicate active order by deviceId OR phone
  const hasActive = orders.find(o => o.deviceId === deviceId || o.customerPhone === customerPhone);
  if (hasActive) {
    return res.status(409).json({ error: "Hai già un ordine attivo" });
  }

  const newOrder = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    cart,
    customerName,
    customerPhone,
    deviceId: deviceId || null,
    status: "in preparazione"
  };

  orders.push(newOrder);
  writeJson(ORDERS_FILE, orders);
  res.json({ success: true, order: newOrder });
});

/* PATCH update order status (protected) */
app.patch("/orders/:id", requireAdminKey, (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Missing status" });

  let orders = readJson(ORDERS_FILE);
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: "Order not found" });

  orders[idx].status = status;
  writeJson(ORDERS_FILE, orders);
  res.json({ success: true, order: orders[idx] });
});

/* DELETE order (protected) */
app.delete("/orders/:id", requireAdminKey, (req, res) => {
  const id = parseInt(req.params.id);
  let orders = readJson(ORDERS_FILE);
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: "Order not found" });
  const removed = orders.splice(idx, 1)[0];
  writeJson(ORDERS_FILE, orders);
  res.json({ success: true, order: removed });
});

/* ---------- quick health check ---------- */
app.get("/", (req, res) => res.send("MikiTakeaway server is running"));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
