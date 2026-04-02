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

<h2>Meeting ID: ${id}</h2>

<div>Your timezone: <span id="tz"></span></div>

<button onclick="copyLink()">Copy Link</button>
<button onclick="shareLink()">Share</button>
<div id="link"></div>
<div id="share"></div>

<br
