const express = require('express');
const fs = require('fs');
const { v4: uuid } = require('uuid');

const app = express();
app.use(express.json());

const DATA_FILE = "data.json";

 async function load(){
  const r = await fetch("/results/"+id);
  const d = await r.json();

  if(d.leaderCode === leaderCode) isLeader = true;
  if(d.finalTime) locked = true;

  // 🔒 Hide zoom button for non-leaders
  if(!isLeader){
    document.getElementById("zoomBtn").style.display = "none";
  }

  // ✅ ALWAYS SHOW ZOOM (FIXED)
  if(d.zoom){
    document.getElementById("zoomDisplay").innerHTML =
      "<h3>📹 Zoom Meeting</h3>" +
      '<a href="'+d.zoom+'" target="_blank">' + d.zoom + "</a>";
  } else {
    document.getElementById("zoomDisplay").innerHTML =
      "<p>No Zoom link added yet</p>";
  }

  // ✅ FINAL TIME
  if(d.finalTime){
    document.getElementById("final").innerHTML =
      "<h3>✅ FINAL MEETING TIME</h3>" +
      new Date(d.finalTime).toLocaleString();
  }

  // ✅ RESULTS
  const div = document.getElementById("results");
  div.innerHTML = "";

  if(d.perfect.length === 0){
    div.innerHTML = "No full match yet";
    return;
  }

  d.perfect.forEach(t=>{
    let p = document.createElement("p");
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
  try { return JSON.parse(fs.readFileSync(DATA_FILE)); }
  catch { return {}; }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let meetings = loadData();

// HOME PAGE
app.get("/", (req, res) => {
  res.send(`
  <html>
  <body style="text-align:center;font-family:Arial;padding:40px;">

    <h1>Team Scheduler</h1>

    <button onclick="createMeeting()">Create New Meeting</button>

    <div id="output" style="margin-top:20px;"></div>

    <script>
    async function createMeeting(){
      const r = await fetch('/create');
      const d = await r.json();

      const leaderLink =
        window.location.origin + "/meeting/" + d.id + "?leader=" + d.leaderCode;

      const teamLink =
        window.location.origin + "/meeting/" + d.id;

      document.getElementById("output").innerHTML = \`
        <h3>Meeting Created</h3>

        <p><strong>Leader Link (keep private)</strong><br>
        <input value="\${leaderLink}" style="width:90%"></p>

        <p><strong>Team Link (send this)</strong><br>
        <input value="\${teamLink}" style="width:90%"></p>

        <button onclick="navigator.clipboard.writeText('\${teamLink}')">
          Copy Team Link
        </button>

        <br><br>

        <button onclick="window.location.href='\${leaderLink}'">
          Go to Leader Page
        </button>
      \`;
    }
    </script>

  </body>
  </html>
  `);
});

// CREATE MEETING
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

<style>
button { margin:2px; padding:6px; }
.selected { background:green; color:white; }
</style>

<h2>Team Scheduler</h2>

<input id="name" placeholder="Your name"><br><br>
<input type="date" id="startDate"><br><br>

<button onclick="generate()">Generate Schedule</button>

<div id="schedule"></div>

<br>
<button onclick="submit()">Submit Availability</button>

<h3>Top 3 Times (Everyone Available)</h3>
<div id="results"></div>

<h3>Final Meeting</h3>
<div id="final"></div>

<input id="zoom" placeholder="Zoom link">
<button id="zoomBtn" onclick="saveZoom()">Save Zoom</button>

<div id="zoomDisplay"></div>

<script>
const id="${id}";
let selected=[];
let dragging=false;
let locked=false;

const params = new URLSearchParams(window.location.search);
const leaderCode = params.get("leader");
let isLeader=false;

// GENERATE
function generate(){
  if(locked){
    alert("Schedule locked");
    return;
  }

  const startVal=document.getElementById("startDate").value;
  if(!startVal){
    alert("Select a date");
    return;
  }

  const start=new Date(startVal);
  const div=document.getElementById("schedule");

  div.innerHTML="";
  selected=[];

  for(let d=0;d<14;d++){
    let day=new Date(start);
    day.setDate(start.getDate()+d);

    let h=document.createElement("h4");
    h.innerText=day.toDateString();
    div.appendChild(h);

    for(let hr=8;hr<=21;hr++){
      for(let m of [0,30]){
        let t=new Date(day.getFullYear(),day.getMonth(),day.getDate(),hr,m);
        let key=t.toISOString();

        let b=document.createElement("button");
        b.innerText=t.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

        b.onclick=()=>toggle(b,key);

        b.onmousedown=()=>dragging=true;
        b.onmouseup=()=>dragging=false;
        b.onmouseover=()=>{ if(dragging) toggle(b,key); };

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
    selected=selected.filter(x=>x!==k);
  } else {
    b.classList.add("selected");
    if(!selected.includes(k)) selected.push(k);
  }
}

// SUBMIT
async function submit(){
  const name=document.getElementById("name").value.trim();

  if(!name){ alert("Enter name"); return; }
  if(selected.length===0){ alert("Select times"); return; }

  await fetch("/submit/"+id,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,times:selected})
  });

  alert("Submitted!");
  load();
}

// LOAD
async function load(){
  const r=await fetch("/results/"+id);
  const d=await r.json();

  if(d.leaderCode===leaderCode) isLeader=true;
  if(d.finalTime) locked=true;

  if(!isLeader){
    document.getElementById("zoomBtn").style.display="none";
  }

  if(d.zoom){
    document.getElementById("zoomDisplay").innerHTML=
      '<a href="'+d.zoom+'" target="_blank">Join Zoom</a>';
  }

  if(d.finalTime){
    document.getElementById("final").innerText=
      new Date(d.finalTime).toLocaleString();
  }

  const div=document.getElementById("results");
  div.innerHTML="";

  if(d.perfect.length===0){
    div.innerHTML="No full match yet";
    return;
  }

  d.perfect.forEach(t=>{
    let p=document.createElement("p");
    p.innerText=new Date(t.time).toLocaleString();

    if(isLeader && !locked){
      p.style.cursor="pointer";
      p.onclick=async()=>{
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

// SAVE ZOOM
async function saveZoom(){
  if(!isLeader) return;

  const z=document.getElementById("zoom").value;

  await fetch("/zoom/"+id,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({zoom:z})
  });

  load();
}

load();
</script>

</body>
</html>
`);
});

// BACKEND
app.post("/submit/:id",(req,res)=>{
  const {name,times}=req.body;
  meetings[req.params.id].responses[name]=times;
  saveData(meetings);
  res.json({ok:true});
});

app.post("/zoom/:id",(req,res)=>{
  meetings[req.params.id].zoom=req.body.zoom;
  saveData(meetings);
  res.json({ok:true});
});

app.post("/final/:id",(req,res)=>{
  meetings[req.params.id].finalTime=req.body.time;
  saveData(meetings);
  res.json({ok:true});
});

app.get("/results/:id",(req,res)=>{
  const m=meetings[req.params.id];
  const map={};
  const total=Object.keys(m.responses).length;

  Object.values(m.responses).forEach(times=>{
    times.forEach(t=>{
      if(!map[t]) map[t]=0;
      map[t]++;
    });
  });

  const perfect=Object.entries(map)
    .filter(([t,c])=>c===total && total>0)
    .map(([t])=>({time:t}))
    .sort((a,b)=>new Date(a.time)-new Date(b.time))
    .slice(0,3);

  res.json({
    zoom:m.zoom,
    finalTime:m.finalTime,
    leaderCode:m.leaderCode,
    perfect
  });
});

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log("Running"));
