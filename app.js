const { Client } = require("pg");
const express = require("express");
const http = require("http");

const postgresSafe = x => {
  var ret = ""
  for (char of x) {
    if (char === "'"){
      ret += "''"
    }
    else {
      ret += char
    }
  }
  return ret
}

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

client.query("SELECT my_data FROM mydata WHERE my_key='uid';", (err, res) => {
  if (err) throw err;
  for (let row of res.rows) {
    console.log(internalUID)
    internalUID = row["my_data"];
    console.log(internalUID)
  }
});

client.query("SELECT my_data FROM mydata WHERE my_key='indents';", (err, res) => {
  if (err) throw err;
  for (let row of res.rows) {
    console.log(dataStore)
    dataStore = row["my_data"];
    console.log(dataStore)
    notifyI()
  }
});

client.query("SELECT my_data FROM mydata WHERE my_key='notifications';", (err, res) => {
  if (err) throw err;
  for (let row of res.rows) {
    console.log(notificationsStore)
    notificationsStore = row["my_data"];
    console.log(notificationsStore)
    notifyN()
  }
});

var authenticated = false
var sheets
var queue = []

const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.

// Load client secrets from a local file.
authorize(JSON.parse(process.env.CREDENTIALS_JSON), authenticate);

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  oAuth2Client.setCredentials(JSON.parse(process.env.TOKEN_JSON));
  callback(oAuth2Client);
}

/**
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */

function authenticate(auth) {
  sheets = google.sheets({version: 'v4', auth})
  authenticated = true
  const myQueue = queue
  queue = []
  appendJSONs(myQueue)
}

function appendJSON(jsonString) {
  appendJSONs([jsonString])
}

function appendJSONs(jsonStrings) {
  if (authenticated === false) {
    queue.push(...jsonStrings)
    return
  }
  sheets.spreadsheets.values.append({
    spreadsheetId: '1Rdp0Z4CKpp5DH41ufeOzC1edE87Nf4DjswmsNYCiI6Q',
    range: 'IndentBackup!A2:A',
    valueInputOption: "RAW",
    resource: {
      majorDimension: "ROWS",
      values: jsonStrings.map(x => [x])
    }
  }, (err, _)=>{
    if (err) return console.log('The API returned an error: ' + err)
  })
}

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
  client.query("UPDATE mydata SET my_data = '"+postgresSafe(dataJSON)+"' WHERE my_key='indents'", (err, res) => {
    if (err) throw err;
  })
  fs.writeFile('./defaultData/dataStore.json', dataJSON, ()=>{})
}

const overwriteNS = () => {
  const notificationsJSON = JSON.stringify(notificationsStore)
  client.query("UPDATE mydata SET my_data = '"+postgresSafe(notificationsJSON)+"' WHERE my_key='notifications'", (err, res) => {
    if (err) throw err;
  })
  fs.writeFile('./defaultData/notificationsStore.json', notificationsJSON, ()=>{})
}

const overwriteUID = () => {
  client.query("UPDATE mydata SET my_data = '"+postgresSafe(JSON.stringify(internalUID))+"' WHERE my_key='uid'", (err, res) => {
    if (err) throw err;
  })
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
  appendJSON(JSON.stringify(write))
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