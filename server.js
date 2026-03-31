<h2>Team Scheduler</h2>

<input id="name" placeholder="Meeting name">
<input id="person" placeholder="Person (e.g. John)">
<input id="date" type="date">
<input id="time" type="time">

<button onclick="add()">Add</button>

<h3>Appointments</h3>
<ul id="list"></ul>

</div>

<script>
async function add() {
  const name = document.getElementById('name').value;
  const person = document.getElementById('person').value;
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;

  const datetime = new Date(date + "T" + time);

  await fetch('/appointments', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      name,
      person,
      datetime: datetime.toISOString()
    })
  });

  load();
}

async function load() {
  const res = await fetch('/appointments');
  const data = await res.json();

  const list = document.getElementById('list');
  list.innerHTML = '';

  data.forEach(a => {
    const li = document.createElement('li');

    const localTime = new Date(a.datetime).toLocaleString();
    li.textContent = a.person + ": " + a.name + " - " + localTime;

    const btn = document.createElement('button');
    btn.textContent = " Delete";

    btn.onclick = async () => {
      await fetch('/appointments/' + a.id, { method: 'DELETE' });
      load();
    };

    li.appendChild(btn);
    list.appendChild(li);
  });
}

load();
</script>

</body>
</html>
👉 Click:

👉 Commit changes

🚀 STEP 3 — Deploy

Go to Render

👉 Click:

Manual Deploy
Deploy latest commit
🌐 STEP 4 — Test

👉 Open your app
👉 Hard refresh:

Command + Shift + R
🎉 Expected result

You should now see:

👉 Example:

John: Team Meeting - 3/25/2026, 10:00 AM
👍 This avoids ALL errors
No partial edits
No missed lines
Clean working version

👉 Tell me:

Do you now see the “Person: Meeting” format?
