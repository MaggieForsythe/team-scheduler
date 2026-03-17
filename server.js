
const express = require("express");
const cors = require("cors");
const { v4: uuid } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const PASSWORD = "TeamScheduler2026";

let meetings = {};

// simple password check
app.post("/login", (req,res)=>{
  if(req.body.password === PASSWORD){
    res.json({success:true});
  } else {
    res.json({success:false});
  }
});

app.post("/create-meeting",(req,res)=>{
  const id = uuid();

  meetings[id] = {
    title:req.body.title,
    duration:90,
    responses:[]
  };

  res.json({meetingId:id});
});

app.post("/respond/:id",(req,res)=>{
  const meeting = meetings[req.params.id];
  if(!meeting){ return res.status(404).send("Meeting not found"); }

  meeting.responses.push(req.body);
  res.json({status:"saved"});
});

app.get("/best-times/:id",(req,res)=>{
  const meeting = meetings[req.params.id];
  if(!meeting){ return res.status(404).send("Meeting not found"); }

  let counts = {};

  meeting.responses.forEach(r=>{
    r.times.forEach(t=>{
      counts[t]=(counts[t]||0)+1;
    });
  });

  const best = Object.entries(counts)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3);

  res.json(best);
});

app.get("/", (req, res) => {
  res.send("<h1>Team Scheduler is running</h1>");
});

app.listen(3000,()=>{
  console.log("Scheduler running on port 3000");
});
app.get("/")
