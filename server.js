const express = require("express");
const fs = require("fs");
const { v4: uuid } = require("uuid");

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
  meetings[id] = { responses: {}, zoom: "", finalTime: null };
  saveData(meetings);
  res.json({ id });
});

// MEETING PAGE
app.get("/meeting/:id", (req, res) => {
  const id = req.params.id;
  const meeting = meetings[id] || { responses: {}, zoom: "", finalTime: null };

  res.send(`
    <html>
      <body style="text-align:center; font-family:Arial; padding:20px;">

        <h2>Meeting ID: ${id}</h2>

        <button onclick="copyLink()">Copy Meeting Link</button>
        <div id="linkDisplay"></div>

        <br><br>

        <input id="zoom" placeholder="Paste Zoom link here" value="${meeting.zoom}" />
        <button onclick="saveZoom()">Save Zoom</button>

        <br><br>

        <input id="name" placeholder="Enter your name" />
        <br><br>

        <input id="timezoneSearch" placeholder="Search timezone..." />
        <br>
        <select id="timezone"></select>

        <br><br>

        <input type="date" id="startDate" />
        <br><br>

        <button onclick="generateSchedule()">Generate Schedule</button>

        <div id="schedule"></div>

        <br>
        <button onclick="submitAvailability()">Submit Availability</button>

        <h2>Final Meeting Time:</h2>
        <div id="final"></div>

        <h2>Best Times:</h2>
        <div id="results"></div>

        <script>
          const meetingId = "${id}";
          let selected = [];
          let isDragging = false;

          function copyLink() {
            const link = window.location.origin + "/meeting/" + meetingId;
            navigator.clipboard.writeText(link);
            document.getElementById("linkDisplay").innerText = link;
            alert("Meeting link copied!");
          }

          async function saveZoom() {
            const zoom = document.getElementById("zoom").value;

            await fetch("/zoom/" + meetingId, {
              method: "POST",
              headers: {"Content-Type":"application/json"},
              body: JSON.stringify({zoom})
            });

            alert("Zoom saved!");
          }

          function toggle(btn, key) {
            if (btn.classList.contains("selected")) {
              btn.classList.remove("selected");
              selected = selected.filter(t => t !== key);
            } else {
              btn.classList.add("selected");
              selected.push(key);
            }
          }

          function generateSchedule() {
            const startDate = new Date(document.getElementById("startDate").value);
            const scheduleDiv = document.getElementById("schedule");

            scheduleDiv.innerHTML = "";
            selected = [];

            document.body.onmousedown = () => isDragging = true;
            document.body.onmouseup = () => isDragging = false;

            for (let i = 0; i < 14; i++) {
              let day = new Date(startDate);
              day.setDate(startDate.getDate() + i);

              let header = document.createElement("h3");
              header.innerText = day.toDateString();
              scheduleDiv.appendChild(header);

              for (let hour = 8; hour <= 21; hour++) {
                for (let min of [0,30]) {

                  let local = new Date(
                    day.getFullYear(),
                    day.getMonth(),
                    day.getDate(),
                    hour,
                    min
                  );

                  let key = local.toISOString();

                  let btn = document.createElement("button");
                  btn.innerText = local.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

                  btn.onmousedown = () => toggle(btn, key);
                  btn.onmouseover = () => {
                    if (isDragging) toggle(btn, key);
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

            alert("Submitted!");
          }

          async function loadResults() {
            const res = await fetch("/results/" + meetingId);
            const data = await res.json();

            const resultsDiv = document.getElementById("results");
            const finalDiv = document.getElementById("final");

            resultsDiv.innerHTML = "";

            if (data.finalTime) {
              finalDiv.innerHTML =
                "<div style='font-size:20px; color:green; font-weight:bold;'>✅ FINAL MEETING TIME:</div>" +
                "<div style='font-size:18px;'>" +
                new Date(data.finalTime).toLocaleString() +
                "</div>";
            }

            data.best.forEach(item => {
              let btn = document.createElement("button");

              btn.innerText =
                new Date(item.time).toLocaleString() +
                " (" + item.count + " people)";

              btn.style.margin = "5px";
              btn.style.padding = "10px";

              btn.onclick = async () => {
                await fetch("/confirm/" + meetingId, {
                  method: "POST",
                  headers: {"Content-Type":"application/json"},
                  body: JSON.stringify({time: item.time})
                });

                // refresh AFTER click
                setTimeout(loadResults, 500);
              };

              resultsDiv.appendChild(btn);

              let namesDiv = document.createElement("div");
              namesDiv.innerText = item.names.join(", ");
              resultsDiv.appendChild(namesDiv);
            });
          }

          // slower refresh so clicks work
          setInterval(loadResults, 5000);
        </script>

      </body>
    </html>
  `);
});

// SAVE ZOOM
app.post("/zoom/:id", (req, res) => {
  meetings[req.params.id].zoom = req.body.zoom;
  saveData(meetings);
  res.sendStatus(200);
});

// SUBMIT
app.post("/submit/:id", (req, res) => {
  meetings[req.params.id].responses[req.body.name] = req.body.times;
  saveData(meetings);
  res.sendStatus(200);
});

// CONFIRM
app.post("/confirm/:id", (req, res) => {
  meetings[req.params.id].finalTime = req.body.time;
  saveData(meetings);
  res.sendStatus(200);
});

// RESULTS
app.get("/results/:id", (req, res) => {
  const data = meetings[req.params.id]?.responses || {};

  let counts = {};
  let names = {};

  Object.entries(data).forEach(([name, times]) => {
    times.forEach(t => {
      let hour = new Date(t).getHours();
      if (hour < 8 || hour > 21) return;

      counts[t] = (counts[t] || 0) + 1;
      if (!names[t]) names[t] = [];
      names[t].push(name);
    });
  });

  const best = Object.keys(counts)
    .map(t => ({
      time: t,
      count: counts[t],
      names: names[t]
    }))
    .sort((a,b)=>b.count-a.count)
    .slice(0,3);

  res.json({
    best,
    finalTime: meetings[req.params.id]?.finalTime
  });
});

app.listen(3000, () => {
  console.log("Scheduler running on port 3000");
});
