const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/test', (req, res) => {
  res.send("API WORKING");
});

let appointments = [];

app.get('/appointments', (req, res) => {
  res.json(appointments);
});

app.post('/appointments', (req, res) => {
  const { name } = req.body;
  const item = { id: Date.now(), name };
  appointments.push(item);
  res.json(item);
});

app.delete('/appointments/:id', (req, res) => {
  const id = Number(req.params.id);
  appointments = appointments.filter(a => a.id !== id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
