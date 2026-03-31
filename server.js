const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'data.json');

// Load data from file
function loadData() {
  try {
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save data to file
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// get appointments
app.get('/appointments', (req, res) => {
  const appointments = loadData();
  res.json(appointments);
});

// add appointment
app.post('/appointments', (req, res) => {
  const { name, datetime } = req.body;

  const appointments = loadData();

  const item = {
    id: Date.now(),
    name,
    datetime
  };

  appointments.push(item);
  saveData(appointments);

  res.json(item);
});

// delete appointment
app.delete('/appointments/:id', (req, res) => {
  const id = Number(req.params.id);

  let appointments = loadData();
  appointments = appointments.filter(a => a.id !== id);

  saveData(appointments);

  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
