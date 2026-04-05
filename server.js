const express = require('express');
const fs = require('fs');
const { v4: uuid } = require('uuid');

const app = express();
app.use(express.json());

const FILE = "data.json";

function load(){ try{return JSON.parse(fs.readFileSync(FILE));}catch{return{}} }
function save(d){ fs.writeFileSync(FILE, JSON.stringify(d,null,2)); }

let meetings = load();


// ================= HOMEPAGE =================
app.get("/", (req,res)=>{
res.send(`
<html>
<body style="font-family:Arial;text-align:center;padding:40px">

<h1>Team Scheduler</h1>

<button onclick="create()">Create Meeting</button>

<div id="links"></div>

<script>

async function create(){
  const r = await fetch('/create');
  const d = await r.json();

  const leader = location.origin + "/meeting/"+d.id+"?leader="+d.leaderCode;
  const team = location.origin + "/meeting/"+d.id;

  document.getElementById("links").innerHTML =
    "<p><b>Leader Link:</b><br>"+leader+
    "<br><button onclick=\\"copyText('"+leader+"')\\">Copy Leader Link</button></p>" +

    "<p><b>Team Link:</b><br>"+team+
    "<br><button onclick=\\"copyText('"+team+"')\\">Copy Team Link</button></p>";
}

function copyText(text){
  navigator.clipboard.writeText(text);
}

</script>

</body>
</html>
`);
});
✅ HOW TO KNOW PART 1 IS COMPLETE

Scroll to bottom of what you pasted.

You MUST see this exact ending:

</script>

</body>
</html>
`);
});
🚨 DO NOT CONTINUE UNTIL:

✔ No red errors
✔ That exact ending is visible
✔ No cut-off text

👉 NEXT STEP

Once you confirm PART 1 is in correctly:

👉// ================= CREATE =================
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

  save(meetings);
  res.json({ id, leaderCode });
});


// ================= SAVE AVAILABILITY =================
app.post("/availability/:id", (req, res) => {
  const { name, slots } = req.body;

  meetings[req.params.id].availability[name] = slots;

  save(meetings);
  res.json({ ok:true });
});


// ================= SAVE ZOOM =================
app.post("/zoom/:id", (req, res) => {
  meetings[req.params.id].zoom = req.body.zoom;
  save(meetings);
  res.json({ ok:true });
});


// ================= FINAL TIME =================
app.post("/final/:id", (req, res) => {
  meetings[req.params.id].final = req.body.time;
  save(meetings);
  res.json({ ok:true });
});


// ================= GET DATA =================
app.get("/data/:id", (req, res) => {
  res.json(meetings[req.params.id]);
});


// ================= MEETING PAGE =================
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
let dragging = false;


// ===== BUILD CALENDAR =====
function build(){
  let html = "";
  for(let h=8; h<=21; h++){
    for(let m=0; m<60; m+=30){
      const t = h + ":" + (m===0?"00":m);
     html += '<button onmousedown="start(this,\''+t+'\')" onmouseover="drag(this,\''+t+'\')" onmouseup="stop()">'+t+'</button>';
    }
    html += "<br>";
  }
  document.getElementById("calendar").innerHTML = html;
}


// ===== DRAG SELECT =====
function start(btn,t){
  dragging = true;
  toggle(btn,t);
}

function drag(btn,t){
  if(dragging) toggle(btn,t);
}

function stop(){
  dragging = false;
}


// ===== TOGGLE =====
function toggle(btn,time){
  if(btn.classList.contains("on")){
    btn.classList.remove("on");
    selected = selected.filter(x=>x!==time);
  } else {
    btn.classList.add("on");
    selected.push(time);
  }
}


// ===== SUBMIT =====
async function submit(){
  const name = document.getElementById("name").value;

  await fetch("/availability/"+id,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,slots:selected})
  });

  alert("Saved");
}


// ===== LOAD DATA =====
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
    document.getElementById("leader").innerHTML =
      '<input id="zoomInput" placeholder="Zoom link">' +
      '<button onclick="saveZoom()">Save Zoom</button>' +
      '<button onclick="generate()">Generate Best Time</button>';
  }
}


// ===== SAVE ZOOM =====
async function saveZoom(){
  const zoom = document.getElementById("zoomInput").value;

  await fetch("/zoom/"+id,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({zoom})
  });

  load();
}


// ===== GENERATE BEST TIME =====
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


// ================= SERVER =================
app.listen(10000, () => console.log("Server running"));
