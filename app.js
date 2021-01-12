const { Client } = require("pg");
const express = require("express");
const http = require("http");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

client.connect()

const fs = require('fs')
var internalUID = JSON.parse(fs.readFileSync("./defaultData/uid.json"))
const dataString = fs.readFileSync("./defaultData/dataStore.json")
const notificationsString = fs.readFileSync("./defaultData/notificationsStore.json")
var dataStore = JSON.parse(dataString)
var notificationsStore = JSON.parse(notificationsString)

client.query("SELECT my_data FROM mydata WHERE my_key='indents';", (err, res) => {
  if (err) throw err;
  for (let row of res.rows) {
    console.log(dataStore)
    dataStore = row["my_data"];
    console.log(dataStore)
  }
});

client.query("SELECT my_data FROM mydata WHERE my_key='notifications';", (err, res) => {
  if (err) throw err;
  for (let row of res.rows) {
    console.log(notificationsStore)
    notificationsStore = row["my_data"];
    console.log(notificationsStore)
  }
});

client.query("SELECT my_data FROM mydata WHERE my_key='uid';", (err, res) => {
  if (err) throw err;
  for (let row of res.rows) {
    console.log(internalUID)
    internalUID = row["my_data"];
    console.log(internalUID)
  }
});

const readDataStore = (internalUID) => {
  const result = dataStore.filter(x => x.internalUID === internalUID)
  if (result.length === 0) {
    return undefined
  }
  else {
    return result[0]
  }
}

const overwriteDS = () => {
  const dataJSON = JSON.stringify(dataStore)
  fs.writeFile('./defaultData/dataStore.json', dataJSON, ()=>{})
}

const overwriteNS = () => {
  const notificationsJSON = JSON.stringify(notificationsStore)
  fs.writeFile('./defaultData/notificationsStore.json', notificationsJSON, ()=>{})
}

const overwriteUID = () => {
  fs.writeFile('./defaultData/uid.json', JSON.stringify(internalUID), ()=>{})
}

const writeDataStore = (internalUID, write) => {
  const index = dataStore.findIndex(x => x.internalUID === internalUID)
  if (index > -1 && index < dataStore.length) {
    dataStore = [...dataStore]
    //MOCK SERVER, REMOVE IN PRODUCTION
    acknowledgeEdit(write, dataStore[index])
    dataStore[index] = write
    overwriteDS()
  }
}

const appendDataStore = (write) => {
  dataStore = [...dataStore, {...write, internalUID: internalUID}]
  internalUID++
  overwriteUID()
  overwriteDS()
}

const appendNotifications = (write) => {
  notificationsStore = [...notificationsStore, write]
  overwriteNS()
}

const acknowledgeEdit = ({internalUID, status}, {internalUID: oldUID, status: oldStatus}) => {
  if (status !== oldStatus && internalUID === oldUID) {
    appendNotifications({title: "Indent \""+readDataStore(internalUID).name+"\" is now "+status, internalUID: internalUID})
    notifyN()
  }
}

const port = process.env.PORT || 4001;
const index = require("./routes/index");

const app = express();
app.use(index);

const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "https://androidlollipop.github.io",
    methods: ["GET", "POST"]
  }
});

var sockets = []

io.on("connection", (socket) => {
  sockets.push(socket)
  console.log("New client connected");
  const interval = setInterval(() => getApiAndEmit(socket), 20000);
  socket.on("disconnect", () => {
    sockets = sockets.filter(s => s !== socket)
    console.log("Client disconnected");
    clearInterval(interval);
  });
  socket.on("requestIndents", () => {
    socket.emit("sendIndents", dataStore)
  })
  socket.on("requestNotifications", () => {
    socket.emit("sendNotifications", notificationsStore)
  })
  socket.on("writeDataStore", ([internalUID, write, token]) => {
    try {
      writeDataStore(internalUID, write)
      socket.emit("sendIndents", dataStore)
      notifyI(socket)
    }
    catch {

    }
  })
  socket.on("appendDataStore", ([write, token]) => {
    try {
      appendDataStore(write)
      socket.emit("sendIndents", dataStore, token)
      notifyI(socket)
    }
    catch {

    }
  })
});

const notifyN = (except) => {
  for (socket of sockets) {
    if (socket !== except) {
      socket.emit("sendNotifications", notificationsStore)
    }
  }
}

const notifyI = (except) => {
  for (socket of sockets) {
    if (socket !== except) {
      socket.emit("sendIndents", dataStore)
    }
  }
}

const getApiAndEmit = socket => {
  const response = new Date();
  // Emitting a new message. Will be consumed by the client
  socket.emit("FromAPI", response);
};

server.listen(port, () => console.log(`Listening on port ${port}`));