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
    <h1>Global Team Scheduler</h1>
    <button onclick="createMeeting()">Create Meeting</button>

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
    zoom: "",
    finalTime: ""
  };

  saveData(meetings);
  res.json({ id });
});

// MEETING PAGE
app.get("/meeting/:id", (req, res) => {
  const id = req.params.id;

  res.send(`
<html>
<body style="font-family:Arial; text-align:center;">

<style>
button { margin:2px; padding:5px; }
.selected { background:green; color:white; }
</style>

<h2>Meeting ID: ${id}</h2>

<div>Your Timezone: <span id="tz"></span></div>

<button onclick="copyLink()">Copy Link</button>
<div id="link"></div>

<br><br>

<input id="zoom" placeholder="Zoom link">
<button onclick="saveZoom()">Save Zoom</button>
<div id="zoomDisplay"></div>

<br><br>

<input id="name" placeholder="Your name">
<input type="date" id="startDate">
<button onclick="generate()">Generate Schedule</button>

<div id="schedule"></div>

<br>
<button onclick="submit()">Submit Availability</button>

<h3>Final Meeting Time</h3>
<div id="final"></div>

<h3>Best Times</h3>
<div id="results"></div>

<script>
const id = "${id}";
let selected = [];
let dragging = false;

// timezone
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
document.getElementById("tz").innerText = tz;

// copy link
function copyLink() {
  const link = window.location.href;
  navigator.clipboard.writeText(link);
  document.getElementById("link").innerText = link;
}

// zoom
async function saveZoom() {
  const zoom = document.getElementById("zoom").value;

  await fetch("/zoom/" + id, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({zoom})
  });

  load();
}

// generate schedule
function generate() {
  const start = new Date(document.getElementById("startDate").value);
  const div = document.getElementById("schedule");

  div.innerHTML = "";
  selected = [];

  document.onmousedown = () => dragging = true;
  document.onmouseup = () => dragging = false;

  for (let d=0; d<14; d++) {
    let day = new Date(start);
    day.setDate(start.getDate()+d);

    let h = document.createElement("h4");
    h.innerText = day.toDateString();
    div.appendChild(h);

    for (let hr=8; hr<=21; hr++) {
      for (let m of [0,30]) {

        let t = new Date(day.getFullYear(),day.getMonth(),day.getDate(),hr,m);
        let key = t.toISOString();

        let b = document.createElement("button");
        b.innerText = t.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

        b.onmousedown = () => toggle(b,key);
        b.onmouseover = () => { if(dragging) toggle(b,key); };

        div.appendChild(b);
      }
    }
  }
}

function toggle(b,k) {
  if (b.classList.contains("selected")) {
    b.classList.remove("selected");
    selected = selected.filter(x=>x!==k);
  } else {
    b.classList.add("selected");
    selected.push(k);
  }
}

// submit
async function submit() {
  const name = document.getElementById("name").value;

  await fetch("/submit/"+id,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({name,times:selected,tz})
  });

  load();
}

// load everything
async function load() {
  const res = await fetch("/results/"+id);
  const data = await res.json();

  document.getElementById("zoomDisplay").innerText = "Zoom: " + (data.zoom || "");

  // final time
  if (data.finalTime) {
    document.getElementById("final").innerText =
      new Date(data.finalTime).toLocaleString();
  }

  // best times
  const div = document.getElementById("results");
  div.innerHTML = "";

  const h1 = document.createElement("h4");
  h1.innerText = "Everyone available:";
  div.appendChild(h1);

  data.perfect.forEach(t=>{
    let p = document.createElement("p");
    p.innerText = new Date(t[0]).toLocaleString();
    div.appendChild(p);
  });

  const h2 = document.createElement("h4");
  h2.innerText = "Best options:";
  div.appendChild(h2);

  data.best.forEach(t=>{
    let p = document.createElement("p");
    p.innerText = new Date(t[0]).toLocaleString() + " ("+t[1]+")";

    // leader click to set final
    p.onclick = async ()=>{
      await fetch("/final/"+id,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({time:t[0]})
      });
      load();
    };

    div.appendChild(p);
  });
}

load();
</script>

</body>
</html>
  `);
});

// SAVE
app.post("/submit/:id", (req,res)=>{
  const {name,times,tz} = req.body;
  const id = req.params.id;

  meetings[id].responses[name] = {times,tz};
  saveData(meetings);

  res.json({ok:true});
});

// ZOOM
app.post("/zoom/:id",(req,res)=>{
  meetings[req.params.id].zoom = req.body.zoom;
  saveData(meetings);
  res.json({ok:true});
});

// FINAL TIME
app.post("/final/:id",(req,res)=>{
  meetings[req.params.id].finalTime = req.body.time;
  saveData(meetings);
  res.json({ok:true});
});

// RESULTS
app.get("/results/:id",(req,res)=>{
  const meeting = meetings[req.params.id];

  const counts = {};
  const total = Object.keys(meeting.responses).length;

  Object.values(meeting.responses).forEach(r=>{
    r.times.forEach(t=>{
      counts[t]=(counts[t]||0)+1;
    });
  });

  const perfect = Object.entries(counts).filter(([t,c])=>c===total);
  const best = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);

  res.json({
    zoom: meeting.zoom,
    finalTime: meeting.finalTime,
    perfect,
    best
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Running"));
