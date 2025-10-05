import express from "express";
import fs from "fs";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const ORDERS_FILE = "./orders.json";
const MENU_FILE = "./menu.json";
const ADMIN_PIN = "123456"; // cambia questo con un tuo PIN segreto

// --- Inizializza i file se non esistono ---
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]");
if (!fs.existsSync(MENU_FILE)) fs.writeFileSync(MENU_FILE, "[]");

// --- Utility per leggere e scrivere JSON in modo sicuro ---
const readJSON = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJSON = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ------------------- ORDINI -------------------

// Invia nuovo ordine
app.post("/api/order", (req, res) => {
  const order = req.body;
  if (!order || !order.phone || !order.items) {
    return res.status(400).json({ error: "Dati ordine mancanti." });
  }

  const orders = readJSON(ORDERS_FILE);
  // controlla se l'utente ha già un ordine attivo
  const existing = orders.find(
    (o) => o.phone === order.phone && o.status !== "delivered"
  );
  if (existing)
    return res
      .status(403)
      .json({ error: "Hai già un ordine attivo in corso." });

  order.id = Date.now();
  order.status = "in_preparazione";
  orders.push(order);
  writeJSON(ORDERS_FILE, orders);
  res.json({ success: true });
});

// Ottieni tutti gli ordini (solo admin)
app.post("/api/admin/orders", (req, res) => {
  const { pin } = req.body;
  if (pin !== ADMIN_PIN) return res.status(403).json({ error: "Accesso negato" });
  const orders = readJSON(ORDERS_FILE);
  res.json(orders);
});

// Aggiorna stato ordine (solo admin)
app.post("/api/admin/update", (req, res) => {
  const { pin, id, status } = req.body;
  if (pin !== ADMIN_PIN) return res.status(403).json({ error: "Accesso negato" });

  const orders = readJSON(ORDERS_FILE);
  const order = orders.find((o) => o.id === id);
  if (!order) return res.status(404).json({ error: "Ordine non trovato" });

  order.status = status;
  writeJSON(ORDERS_FILE, orders);
  res.json({ success: true });
});

// Elimina ordine (solo admin)
app.post("/api/admin/delete", (req, res) => {
  const { pin, id } = req.body;
  if (pin !== ADMIN_PIN) return res.status(403).json({ error: "Accesso negato" });

  let orders = readJSON(ORDERS_FILE);
  orders = orders.filter((o) => o.id !== id);
  writeJSON(ORDERS_FILE, orders);
  res.json({ success: true });
});

// ------------------- MENU -------------------

// Ottieni il menu
app.get("/api/menu", (req, res) => {
  const menu = readJSON(MENU_FILE);
  res.json(menu);
});

// Aggiungi o modifica un piatto (solo admin)
app.post("/api/admin/menu", (req, res) => {
  const { pin, item } = req.body;
  if (pin !== ADMIN_PIN) return res.status(403).json({ error: "Accesso negato" });

  const menu = readJSON(MENU_FILE);
  const existing = menu.find((m) => m.id === item.id);

  if (existing) {
    Object.assign(existing, item);
  } else {
    item.id = Date.now();
    menu.push(item);
  }

  writeJSON(MENU_FILE, menu);
  res.json({ success: true });
});

// Elimina piatto (solo admin)
app.post("/api/admin/menu/delete", (req, res) => {
  const { pin, id } = req.body;
  if (pin !== ADMIN_PIN) return res.status(403).json({ error: "Accesso negato" });

  let menu = readJSON(MENU_FILE);
  menu = menu.filter((m) => m.id !== id);
  writeJSON(MENU_FILE, menu);
  res.json({ success: true });
});

// ------------------------------------------------

app.get("/", (req, res) => {
  res.send("✅ MikiTakeaway server attivo e sicuro!");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server in ascolto su porta ${PORT}`));
