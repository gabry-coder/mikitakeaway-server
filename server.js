const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const app = express();

const FILE_PATH = path.join(__dirname, "orders.json");

app.use(cors());
app.use(express.json());

// Legge gli ordini dal file
function readOrders() {
  try {
    return JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"));
  } catch {
    return [];
  }
}

// Salva gli ordini nel file
function saveOrders(orders) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(orders, null, 2));
}

// Ottieni tutti gli ordini
app.get("/orders", (req, res) => {
  const orders = readOrders();
  res.json(orders);
});

// Aggiungi un ordine
app.post("/orders", (req, res) => {
  const { name, items, total, deviceId } = req.body;

  if (!name || !items || !deviceId) {
    return res.status(400).json({ error: "Dati mancanti" });
  }

  const orders = readOrders();

  // Evita doppio ordine dallo stesso device
  const existing = orders.find((o) => o.deviceId === deviceId);
  if (existing) {
    return res.status(403).json({ error: "Hai già un ordine attivo!" });
  }

  const newOrder = {
    id: Date.now(),
    name,
    items,
    total,
    deviceId,
    createdAt: new Date().toISOString(),
  };

  orders.push(newOrder);
  saveOrders(orders);

  res.json({ success: true, order: newOrder });
});

// Elimina un ordine (es. consegnato)
app.delete("/orders/:id", (req, res) => {
  const orderId = parseInt(req.params.id);
  let orders = readOrders();
  const exists = orders.some((o) => o.id === orderId);
  if (!exists) return res.status(404).json({ error: "Ordine non trovato" });

  orders = orders.filter((o) => o.id !== orderId);
  saveOrders(orders);
  res.json({ success: true });
});

// Porta automatica (Render gestisce)
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Server attivo su porta ${PORT}`));
