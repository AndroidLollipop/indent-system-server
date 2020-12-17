const express = require("express");
const http = require("http");

/*pending an actual database*/
var dataStore = [{name: "Mandai Crematorium Indent", internalUID: 0, startDateTime: "01/04/2020 12:34", endDateTime: "01/04/2020 23:45", POC: "lmao", POCPhone: "999", origin: "Hell Camp", destination: "Hellish Camp", status: "Pending"}, {name: "Mandai Crematorium Indent", internalUID: 1, startDateTime: "01/04/2020 12:34", endDateTime: "01/04/2020 23:45", POC: "lmao", POCPhone: "999", origin: "Hell Camp", destination: "Hellish Camp", status: "Pending"}, {name: "Mandai Crematorium Indent", internalUID: 2, startDateTime: "01/04/2020 12:34", endDateTime: "01/04/2020 23:45", POC: "lmao", POCPhone: "999", origin: "Hell Camp", destination: "Hellish Camp", status: "Pending"}]
var notificationsStore = [{title: "Mandai Crematorium Indent is now Pending", internalUID: 0}]

const readDataStore = (internalUID) => {
  const result = dataStore.filter(x => x.internalUID === internalUID)
  if (result.length === 0) {
    return undefined
  }
  else {
    return result[0]
  }
}

const writeDataStore = (internalUID, write) => {
  const index = dataStore.findIndex(x => x.internalUID === internalUID)
  dataStore = [...dataStore]
  if (index > -1 && index < dataStore.length) {
    //MOCK SERVER, REMOVE IN PRODUCTION
    acknowledgeEdit(write, dataStore[index])
    dataStore[index] = write
  }
}

const appendDataStore = (write) => {
  dataStore = [...dataStore, {...write, internalUID: internalUID}]
  internalUID++
}

var internalUID = 3

const appendNotifications = (write) => {
  notificationsStore = [...notificationsStore, write]
}

const acknowledgeEdit = ({internalUID, status}, {internalUID: oldUID, status: oldStatus}) => {
  if (status !== oldStatus && internalUID === oldUID) {
    appendNotifications({title: readDataStore(internalUID).name+" is now "+status, internalUID: internalUID})
    notifyN()
  }
}

/*end*/

const port = process.env.PORT || 4001;
const index = require("./routes/index");

const app = express();
app.use(index);

const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "http://127.0.0.1:3000",
    methods: ["GET", "POST"]
  }
});

let interval;

var sockets = []

io.on("connection", (socket) => {
  sockets.push(socket)
  console.log("New client connected");
  if (interval) {
    clearInterval(interval);
  }
  interval = setInterval(() => getApiAndEmit(socket), 1000);
  socket.on("disconnect", () => {
    sockets = sockets.filter(s => s !== socket)
    console.log("Client disconnected");
    clearInterval(interval);
  });
  socket.on("ToAPI", (msg) => {
    console.log("From client: "+msg)
  })
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