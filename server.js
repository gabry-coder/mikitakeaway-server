// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// File per salvare gli ordini
const ORDERS_FILE = 'orders.json';

// Legge ordini da file, o crea array vuoto se non esiste
const readOrders = () => {
  try {
    const data = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

// Salva ordini su file
const saveOrders = (orders) => {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
};

// Endpoint GET: ritorna tutti gli ordini
app.get('/orders', (req, res) => {
  const orders = readOrders();
  res.json(orders);
});

// Endpoint POST: aggiunge un nuovo ordine
app.post('/orders', (req, res) => {
  const orders = readOrders();
  const newOrder = req.body;

  if(!newOrder || !Array.isArray(newOrder.items)) {
    return res.status(400).json({ error: 'Ordine non valido' });
  }

  orders.push({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...newOrder
  });

  saveOrders(orders);
  res.json({ success: true });
});

// Pulizia ordini (opzionale, admin)
app.delete('/orders', (req, res) => {
  saveOrders([]);
  res.json({ success: true, message: 'Tutti gli ordini cancellati' });
});

app.listen(PORT, () => {
  console.log(`Server attivo su http://localhost:${PORT}`);
});
