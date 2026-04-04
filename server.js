const express = require('express');
const fs = require('fs');
const { v4: uuid } = require('uuid');

const app = express();
const leader =
            window.location.origin + "/meeting/" + d.id + "?leader=" + d.leaderCode;

          const team =
            window.location.origin + "/meeting/" + d.id;

          document.getElementById("links").innerHTML = \`
            <p><b>Leader Link:</b><br>\${leader}</p>
            <p><b>Team Link:</b><br>\${team}</p>
          \`;
        }
        </script>

      </body>
    </html>
  `);
});

app.use(express.json());

const DATA_FILE = "data.json";

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE)); }
  catch { return {}; }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let meetings = loadData();

// CREATE MEETING
app.get("/create", (req, res) => {
  const id = uuid().slice(0,6);
  const leaderCode = uuid().slice(0,6);

  meetings[id] = {
    id,
    leaderCode,
    zoom: "",
    final: "",
    availability: {}
  };

  saveData(meetings);

  res.json({ id, leaderCode });
});

// SAVE AVAILABILITY
app.post("/availability/:id", (req, res) => {
  const { name, slots } = req.body;

  if (!meetings[req.params.id].availability[name]) {
    meetings[req.params.id].availability[name] = [];
  }

  meetings[req.params.id].availability[name] = slots;

  saveData(meetings);
  res.json({ ok: true });
});

// SAVE ZOOM
app.post("/zoom/:id", (req, res) => {
  meetings[req.params.id].zoom = req.body.zoom;
  saveData(meetings);
  res.json({ ok: true });
});

// FINALIZE
app.post("/final/:id", (req, res) => {
  meetings[req.params.id].final = req.body.time;
  saveData(meetings);
  res.json({ ok: true });
});

// GET DATA
app.get("/data/:id", (req, res) => {
  res.json(meetings[req.params.id]);
});

// PAGE
app.get("/meeting/:id", (req, res) => {
  res.send(`
<html>
<body style="font-family:Arial;text-align:center">

<h2>Team Scheduler</h2>

<input id="name" placeholder="Your Name"><br><br>

<div id="calendar"></div><br>

<button onclick="submit()">Submit Availability</button>

<br><br>

<div id="leader"></div>

<br>

<div id="final"></div>
<div id="zoom"></div>

<script>

const id = location.pathname.split("/")[2];
const isLeader = location.search.includes("leader");

let selected = [];

function build(){
  let html = "";
  for(let h=8; h<=21; h++){
    for(let m=0; m<60; m+=30){
      const t = h + ":" + (m===0?"00":m);
      html += \`<button onclick="toggle(this,'\${t}')">\${t}</button>\`;
    }
    html += "<br>";
  }
  document.getElementById("calendar").innerHTML = html;
}

function toggle(btn,time){
  if(btn.classList.contains("on")){
    btn.classList.remove("on");
    selected = selected.filter(t=>t!==time);
  } else {
    btn.classList.add("on");
    selected.push(time);
  }
}

async function submit(){
  const name = document.getElementById("name").value;

  await fetch("/availability/"+id,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,slots:selected})
  });

  alert("Saved");
}

async function load(){
  const d = await fetch("/data/"+id).then(r=>r.json());

  if(d.zoom){
    document.getElementById("zoom").innerHTML =
      '<a href="'+d.zoom+'" target="_blank">Join Zoom</a>';
  }

  if(d.final){
    document.getElementById("final").innerHTML =
      "Final Time: " + d.final;
  }

  if(isLeader){
    document.getElementById("leader").innerHTML = \`
      <br>
      <input id="zoomInput" placeholder="Zoom link">
      <button onclick="saveZoom()">Save Zoom</button>
      <button onclick="generate()">Generate Best Time</button>
    \`;
  }
}

async function saveZoom(){
  const zoom = document.getElementById("zoomInput").value;

  await fetch("/zoom/"+id,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({zoom})
  });

  load();
}

async function generate(){
  const d = await fetch("/data/"+id).then(r=>r.json());

  const count = {};

  Object.values(d.availability).forEach(arr=>{
    arr.forEach(t=>{
      count[t]=(count[t]||0)+1;
    });
  });

  const best = Object.keys(count).sort((a,b)=>count[b]-count[a])[0];

  await fetch("/final/"+id,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({time:best})
  });

  load();
}

build();
load();

</script>

</body>
</html>
`);
});

app.listen(10000, () => console.log("Server running"));
