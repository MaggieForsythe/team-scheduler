  load();// ===== MEETING PAGE =====
app.get("/meeting/:id",(req,res)=>{
res.send(`
<html>
<body style="font-family:Arial;text-align:center">

<h2>Global Team Scheduler</h2>

<input id="name" placeholder="Your Name"><br><br>

<div id="calendar"></div><br>

<button onclick="submit()">Submit Availability</button>

<br><br>

<div id="leader"></div>
<div id="results"></div>
<div id="final"></div>
<div id="zoom"></div>

<script>

const id = location.pathname.split("/")[2];
const isLeader = location.search.includes("leader");

let selected = [];
let dragging = false;


// ===== BUILD 2-WEEK CALENDAR =====
function build(){
  let html = "";

  for(let d=0; d<14; d++){
    const date = new Date();
    date.setDate(date.getDate()+d);

    html += "<h3>"+date.toDateString()+"</h3>";

    for(let h=8; h<=21; h++){
      for(let m=0; m<60; m+=30){

        const dt = new Date(date);
        dt.setHours(h);
        dt.setMinutes(m);

        const utc = dt.toISOString();

        html += '<button onmousedown="start(this,\\''+utc+'\\')" onmouseover="drag(this,\\''+utc+'\\')" onmouseup="stop()">'+h+':'+(m===0?"00":m)+'</button>';
      }
      html += "<br>";
    }
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


// ===== LOAD =====
async function load(){
  const d = await fetch("/data/"+id).then(r=>r.json());

  // FINAL TIME
  if(d.final){
    document.getElementById("final").innerHTML =
      "<h3>FINAL: "+new Date(d.final).toLocaleString()+"</h3>";
  }

  // ZOOM
  if(d.zoom){
    document.getElementById("zoom").innerHTML =
      '<a href="'+d.zoom+'" target="_blank">Join Zoom</a>';
  }

  // LEADER
  if(isLeader){
    document.getElementById("leader").innerHTML =
      '<input id="zoomInput" placeholder="Zoom link">' +
      '<button onclick="saveZoom()">Save Zoom</button>' +
      '<button onclick="generate()">Generate Best Times</button>';
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


// ===== GENERATE TOP 3 =====
async function generate(){
  const d = await fetch("/data/"+id).then(r=>r.json());

  const count = {};
  const names = {};

  Object.entries(d.availability).forEach(([person,slots])=>{
    slots.forEach(t=>{
      count[t] = (count[t]||0)+1;

      if(!names[t]) names[t]=[];
      names[t].push(person);
    });
  });

  const sorted = Object.keys(count).sort((a,b)=>count[b]-count[a]);

  let html = "<h3>Top 3 Times</h3>";

  sorted.slice(0,3).forEach(t=>{
    html += "<p>"+new Date(t).toLocaleString()+" ("+count[t]+" people)<br>"+names[t].join(", ")+"</p>";
  });

  // ALL AVAILABLE
  const total = Object.keys(d.availability).length;
  const all = sorted.filter(t=>count[t]===total);

  if(all.length){
    html += "<h3>Everyone Available</h3>";
    all.forEach(t=>{
      html += "<p>"+new Date(t).toLocaleString()+"</p>";
    });
  }

  // FINALIZE
  html += "<h3>Select Final</h3>";

  sorted.slice(0,3).forEach(t=>{
    html += '<button onclick="finalize(\\''+t+'\\')">'+new Date(t).toLocaleString()+'</button>';
  });

  document.getElementById("results").innerHTML = html;
}


// ===== FINALIZE =====
async function finalize(time){
  await fetch("/final/"+id,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({time})
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


// ===== SERVER =====
app.listen(10000,()=>console.log("Server running"));}


// ===== GENERATE TOP 3 =====
async function generate(){
  const d = await fetch("/data/"+id).then(r=>r.json());

  const count = {};
  const names = {};

  Object.entries(d.availability).forEach(([person,slots])=>{
    slots.forEach(t=>{
      count[t] = (count[t]||0)+1;

      if(!names[t]) names[t]=[];
      names[t].push(person);
    });
  });

  const sorted = Object.keys(count).sort((a,b)=>count[b]-count[a]);

  let html = "<h3>Top 3 Times</h3>";

  sorted.slice(0,3).forEach(t=>{
    html += "<p>"+new Date(t).toLocaleString()+" ("+count[t]+" people)<br>"+names[t].join(", ")+"</p>";
  });

  // ALL AVAILABLE
  const total = Object.keys(d.availability).length;
  const all = sorted.filter(t=>count[t]===total);

  if(all.length){
    html += "<h3>Everyone Available</h3>";
    all.forEach(t=>{
      html += "<p>"+new Date(t).toLocaleString()+"</p>";
    });
  }

  // FINALIZE
  html += "<h3>Select Final</h3>";

  sorted.slice(0,3).forEach(t=>{
    html += '<button onclick="finalize(\\''+t+'\\')">'+new Date(t).toLocaleString()+'</button>';
  });

  document.getElementById("results").innerHTML = html;
}


// ===== FINALIZE =====
async function finalize(time){
  await fetch("/final/"+id,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({time})
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


// ===== SERVER =====
app.listen(10000,()=>console.log("Server running"));
