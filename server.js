const express = require('express');
const fs = require('fs');
const { v4: uuid } = require('uuid');

const app = express();
app.use(express.json());

const DATA_FILE = "data.json";

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let meetings = loadData();

// HOME
app.get("/", (req, res) => {
  res.send(`
    <html>
      <body style="text-align:center; font-family:Arial; padding:40px;">
        <h1>Team Scheduler</h1>
        <button onclick="createMeeting()">Create New Meeting</button>

        <script>
          async function createMeeting() {
            const res = await fetch("/create");
            const data = await res.json();
            window.location.href = "/meeting/" + data.id;
          }
        </script>
      </body>
    </html>
  `);
});

// CREATE
app.get("/create", (req, res) => {
  const id = uuid().slice(0,6);

  meetings[id] = {
    responses: {},
    zoom: ""
  };

  saveData(meetings);
  res.json({ id });
});

// MEETING PAGE
app.get("/meeting/:id", (req, res) => {
  const id = req.params.id;

  res.send(`
<html>
<body style="text-align:center; font-family:Arial; padding:20px;">

<style>
button {
  margin: 3px;
  padding: 6px;
}
.selected {
  background: green;
  color: white;
}
</style>

<h2>Meeting ID: ${id}</h2>

<button onclick="copyLink()">Copy Meeting Link</button>
<div id="linkDisplay"></div>

<br><br>

<input id="zoom" placeholder="Paste Zoom link" />
<button onclick="saveZoom()">Save Zoom</button>

<br><br>

<input id="name" placeholder="Your name" />
<br><br>

<input type="date" id="startDate" />
<br><br>

<button onclick="generateSchedule()">Generate Schedule</button>

<div id="schedule"></div>

<br>
<button onclick="submitAvailability()">Submit Availability</button>

<h3>Best Times</h3>
<div id="results"></div>

<script>
const meetingId = "${id}";
let selected = [];

function copyLink() {
  const link = window.location.origin + "/meeting/" + meetingId;
  navigator.clipboard.writeText(link);
  document.getElementById("linkDisplay").innerText = link;
}

async function saveZoom() {
  const zoom = document.getElementById("zoom").value;

  await fetch("/zoom/" + meetingId, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({zoom})
  });

  alert("Zoom saved");
}

function generateSchedule() {
  const startDate = new Date(document.getElementById("startDate").value);
  const scheduleDiv = document.getElementById("schedule");

  scheduleDiv.innerHTML = "";
  selected = [];

  for (let i = 0; i < 14; i++) {
    let day = new Date(startDate);
    day.setDate(startDate.getDate() + i);

    let header = document.createElement("h4");
    header.innerText = day.toDateString();
    scheduleDiv.appendChild(header);

    for (let hour = 8; hour <= 21; hour++) {
      for (let min of [0,30]) {

        let time = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          hour,
          min
        );

        let key = time.toISOString();

        let btn = document.createElement("button");
        btn.type = "button";

        btn.innerText = time.toLocaleTimeString([], {
          hour:'2-digit',
          minute:'2-digit'
        });

        btn.onclick = function() {
          if (btn.classList.contains("selected")) {
            btn.classList.remove("selected");
            selected = selected.filter(t => t !== key);
          } else {
            btn.classList.add("selected");
            selected.push(key);
          }
        };

        scheduleDiv.appendChild(btn);
      }
    }
  }
}

async function submitAvailability() {
  const name = document.getElementById("name").value;

  await fetch("/submit/" + meetingId, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({name, times: selected})
  });

  loadResults();
}

async function loadResults() {
  const res = await fetch("/results/" + meetingId);
  const data = await res.json();

  const div = document.getElementById("results");
  div.innerHTML = "";

  data.forEach(item => {
    const d = new Date(item[0]);
    const count = item[1];

    const p = document.createElement("p");
    p.innerText = d.toLocaleString() + " (" + count + " people)";
    div.appendChild(p);
  });
}

loadResults();
</script>

</body>
</html>
  `);
});

// SAVE AVAILABILITY
app.post("/submit/:id", (req, res) => {
  const id = req.params.id;
  const { name, times } = req.body;

  if (!meetings[id]) meetings[id] = { responses: {} };

  meetings[id].responses[name] = times;
  saveData(meetings);

  res.json({ ok: true });
});

// SAVE ZOOM
app.post("/zoom/:id", (req, res) => {
  const id = req.params.id;
  const { zoom } = req.body;

  if (!meetings[id]) meetings[id] = {};
  meetings[id].zoom = zoom;

  saveData(meetings);
  res.json({ ok: true });
});

// RESULTS
app.get("/results/:id", (req, res) => {
  const id = req.params.id;
  const meeting = meetings[id] || { responses: {} };

  const counts = {};

  Object.values(meeting.responses).forEach(times => {
    times.forEach(t => {
      counts[t] = (counts[t] || 0) + 1;
    });
  });

  const sorted = Object.entries(counts)
    .sort((a,b) => b[1]-a[1])
    .slice(0,3);

  res.json(sorted);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
