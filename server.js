const express = require('express');
const fs = require('fs');
const { v4: uuid } = require('uuid');

const app = express();
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

// HOME
app.get("/", (req, res) => {
  res.send(`
  <html>
  <body style="text-align:center;font-family:Arial;padding:40px;">
    <h1>Team Scheduler</h1>
    <button onclick="createMeeting()">Create Meeting</button>

    <script>
    async function createMeeting(){
      const r = await fetch('/create');
      const d = await r.json();

      alert("Leader Code: " + d.leaderCode);

      window.location.href = '/meeting/' + d.id + "?leader=" + d.leaderCode;
    }
    </script>
  </body>
  </html>
  `);
});

// CREATE
app.get("/create",(req,res)=>{
  const id = uuid().slice(0,6);
  const leaderCode = Math.random().toString(36).substring(2,6);

  meetings[id] = {
    responses:{},
    zoom:"",
    finalTime:"",
    leaderCode
  };

  saveData(meetings);

  res.json({id, leaderCode});
});

// MEETING PAGE
app.get("/meeting/:id",(req,res)=>{
const id = req.params.id;

res.send(`
<html>
<body style="font-family:Arial;text-align:center;">

<h2>Team Scheduler</h2>

<div>Your timezone: <span id="tz"></span></div>

<br>

<button onclick="copyLink()">Copy Link</button>
<button onclick="shareLink()">Share</button>

<div id="link"></div>
<div id="share"></div>

<br><br>

<input id="zoom" placeholder="Zoom link">
<button id="zoomBtn" onclick="saveZoom()">Save Zoom</button>

<div id="zoomDisplay"></div>

<br><br>

<input id="name" placeholder="Your name">
<input type="date" id="startDate">

<br><br>

<button onclick="generate()">Generate Schedule</button>

<div id="schedule"></div>

<br>

<button onclick="submit()">Submit Availability</button>

<h2 style="color:green;">FINAL MEETING</h2>
<div id="final"></div>

<button id="calBtn" style="display:none;">Add to Calendar</button>

<h3>Top 3 Best Times (Everyone Available)</h3>
<div id="results"></div>

<script>
const id = "${id}";
let selected = [];
let dragging = false;
let locked = false;

// leader detection
const params = new URLSearchParams(window.location.search);
const leaderCode = params.get("leader");
let isLeader = false;

document.getElementById("tz").innerText =
  Intl.DateTimeFormat().resolvedOptions().timeZone;

// COPY LINK
function copyLink(){
  const l = window.location.href;
  navigator.clipboard.writeText(l);
  document.getElementById("link").innerText = l;
}

// SHARE
function shareLink(){
  const l = window.location.href;
  const msg = "Please add availability:\\n" + l;
  document.getElementById("share").innerText = msg;
}

// SAVE ZOOM
async function saveZoom(){
  if(!isLeader) return;

  const z = document.getElementById("zoom").value;

  await fetch("/zoom/"+id,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({zoom:z})
  });

  load();
}

// GENERATE CALENDAR
function generate(){
  if(locked){
    alert("Schedule locked");
    return;
  }

  const start = new Date(document.getElementById("startDate").value);
  const div = document.getElementById("schedule");

  div.innerHTML = "";
  selected = [];

  document.onmousedown = () => dragging = true;
  document.onmouseup = () => dragging = false;

  for(let d=0; d<14; d++){
    let day = new Date(start);
    day.setDate(start.getDate()+d);

    let h = document.createElement("h4");
    h.innerText = day.toDateString();
    div.appendChild(h);

    for(let hr=8; hr<=21; hr++){
      for(let m of [0,30]){
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

// TOGGLE
function toggle(b,k){
  if(locked) return;

  if(b.classList.contains("selected")){
    b.classList.remove("selected");
    selected = selected.filter(x=>x!==k);
  } else {
    b.classList.add("selected");
    selected.push(k);
  }
}

// SUBMIT
async function submit(){
  const name = document.getElementById("name").value.trim();

  if(!name){
    alert("Enter your name");
    return;
  }

  if(selected.length === 0){
    alert("Select at least one time");
    return;
  }

  await fetch("/submit/"+id,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name, times:selected})
  });

  alert("Submitted!");
  load();
}

// LOAD DATA
async function load(){
  const r = await fetch("/results/"+id);
  const d = await r.json();

  if(d.leaderCode === leaderCode){
    isLeader = true;
  }

  if(d.finalTime){
    locked = true;
  }

  // hide zoom for non leader
  if(!isLeader){
    document.getElementById("zoomBtn").style.display = "none";
  }

  // zoom display
  if(d.zoom){
    document.getElementById("zoomDisplay").innerHTML =
      '<br><a href="'+d.zoom+'" target="_blank">👉 Join Zoom</a>';
  }

  // final meeting
  if(d.finalTime){
    const dt = new Date(d.finalTime);

    document.getElementById("final").innerHTML =
      "<h3>FINAL TIME</h3>" + dt.toLocaleString();

    const btn = document.getElementById("calBtn");
    btn.style.display = "inline-block";

    btn.onclick = ()=>{
      const end = new Date(dt.getTime()+3600000);

      const url = "https://calendar.google.com/calendar/render?action=TEMPLATE"
      +"&text=Meeting"
      +"&dates="
      +dt.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z/"
      +end.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";

      window.open(url);
    };
  }

  // results
  const div = document.getElementById("results");
  div.innerHTML = "";

  if(d.perfect.length === 0){
    div.innerHTML = "No full match yet";
    return;
  }

  d.perfect.forEach(t=>{
    let p = document.createElement("p");

    p.style.border = "1px solid #ccc";
    p.style.padding = "10px";

    p.innerText = new Date(t.time).toLocaleString();

    if(isLeader && !locked){
      p.style.cursor = "pointer";

      p.onclick = async ()=>{
        await fetch("/final/"+id,{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({time:t.time})
        });
        load();
      };
    }

    div.appendChild(p);
  });
}

load();
</script>

</body>
</html>
`);
});

// SUBMIT
app.post("/submit/:id",(req,res)=>{
  const {name,times} = req.body;
  meetings[req.params.id].responses[name] = times;
  saveData(meetings);
  res.json({ok:true});
});

// ZOOM
app.post("/zoom/:id",(req,res)=>{
  meetings[req.params.id].zoom = req.body.zoom;
  saveData(meetings);
  res.json({ok:true});
});

// FINAL
app.post("/final/:id",(req,res)=>{
  meetings[req.params.id].finalTime = req.body.time;
  saveData(meetings);
  res.json({ok:true});
});

// RESULTS
app.get("/results/:id",(req,res)=>{
  const m = meetings[req.params.id];

  const map = {};
  const total = Object.keys(m.responses).length;

  Object.entries(m.responses).forEach(([name,times])=>{
    times.forEach(t=>{
      if(!map[t]) map[t] = 0;
      map[t]++;
    });
  });

  const perfect = Object.entries(map)
    .filter(([t,c]) => c === total && total > 0)
    .map(([t]) => ({time:t}))
    .sort((a,b)=> new Date(a.time)-new Date(b.time))
    .slice(0,3);

  res.json({
    zoom: m.zoom,
    finalTime: m.finalTime,
    leaderCode: m.leaderCode,
    perfect
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Running"));
