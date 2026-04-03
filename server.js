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
