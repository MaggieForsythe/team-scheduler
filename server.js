const express = require("express");
const app = express();

app.use(express.json());

let responses = {};

// HOME
app.get("/", (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; text-align: center; padding: 20px;">
        
        <h1>Team Scheduler</h1>

        <input id="name" placeholder="Your name" />
        <br><br>

        <input type="date" id="startDate" />
        <br><br>

        <button onclick="generate()">Generate Schedule</button>

        <div id="schedule"></div>

        <br><br>
        <button onclick="submit()">Submit Availability</button>

        <h2>Best Times:</h2>
        <div id="results"></div>

        <script>
          let selected = [];

          function generate() {
            const start = new Date(document.getElementById("startDate").value);
            const div = document.getElementById("schedule");
            div.innerHTML = "";
            selected = [];

            for (let i = 0; i < 14; i++) {
              let day = new Date(start);
              day.setDate(start.getDate() + i);

              let h = document.createElement("h3");
              h.innerText = day.toDateString();
              div.appendChild(h);

              for (let hour = 8; hour <= 21; hour++) {
                let btn = document.createElement("button");
                btn.innerText = hour + ":00";

                let key = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour).toISOString();

                btn.onclick = () => {
                  if (btn.style.backgroundColor === "lightgreen") {
                    btn.style.backgroundColor = "";
                    selected = selected.filter(t => t !== key);
                  } else {
                    btn.style.backgroundColor = "lightgreen";
                    selected.push(key);
                  }
                };

                div.appendChild(btn);
              }
            }
          }

          async function submit() {
            const name = document.getElementById("name").value;

            await fetch("/submit", {
              method: "POST",
              headers: {"Content-Type":"application/json"},
              body: JSON.stringify({name, times: selected})
            });

            alert("Saved!");
          }

          async function load() {
            const res = await fetch("/results");
            const data = await res.json();

            const div = document.getElementById("results");
            div.innerHTML = "";

            data.forEach(([t, c]) => {
              let d = document.createElement("div");
              d.innerText = new Date(t).toLocaleString() + " (" + c + ")";
              div.appendChild(d);
            });
          }

          setInterval(load, 3000);
        </script>

      </body>
    </html>
  `);
});

// SAVE
app.post("/submit", (req, res) => {
  responses[req.body.name] = req.body.times;
  res.sendStatus(200);
});

// RESULTS
app.get("/results", (req, res) => {
  let counts = {};

  Object.values(responses).forEach(times => {
    times.forEach(t => {
      counts[t] = (counts[t] || 0) + 1;
    });
  });

  const best = Object.entries(counts)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3);

  res.json(best);
});

app.listen(3000, () => {
  console.log("Scheduler running on port 3000");
});
