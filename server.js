function generateSchedule() {
  const startDate = new Date(document.getElementById("startDate").value);
  const scheduleDiv = document.getElementById("schedule");

  scheduleDiv.innerHTML = "";
  selected = [];

  for (let i = 0; i < 14; i++) {
    let day = new Date(startDate);
    day.setDate(startDate.getDate() + i);

    let header = document.createElement("h4");
    header.innerText = day.toDateString();
    scheduleDiv.appendChild(header);

    for (let hour = 8; hour <= 21; hour++) {
      for (let min of [0,30]) {

        let time = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          hour,
          min
        );

        let key = time.toISOString();

        let btn = document.createElement("button");
        btn.type = "button";
        btn.innerText = time.toLocaleTimeString([], {
          hour:'2-digit',
          minute:'2-digit'
        });

        btn.onclick = function() {
          if (btn.classList.contains("selected")) {
            btn.classList.remove("selected");
            selected = selected.filter(t => t !== key);
          } else {
            btn.classList.add("selected");
            selected.push(key);
          }
        };

        scheduleDiv.appendChild(btn);
      }
    }
  }
}
