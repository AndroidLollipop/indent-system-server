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
var nueue = []

const readline = require('readline');
const {google} = require('googleapis');

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
  const myNueue = nueue
  nueue = []
  appendJSONs(myQueue)
  appendNSONs(myNueue)
}

function appendJSON(jsonObj) {
  appendJSONs([jsonObj])
}

function appendNSON(jsonObj) {
  appendNSONs([jsonObj])
}

function appendJSONs(jsonObjs) {
  if (authenticated === false) {
    queue.push(...jsonObjs)
    return
  }
  try {
    sheets.spreadsheets.values.append({
      spreadsheetId: '1Rdp0Z4CKpp5DH41ufeOzC1edE87Nf4DjswmsNYCiI6Q',
      range: 'IndentBackup!A2:A',
      valueInputOption: "RAW",
      resource: {
        majorDimension: "ROWS",
        values: jsonObjs.map(x => [JSON.stringify(x)])
      }
    }, (err, _)=>{
      if (err) return console.log('The API returned an error: ' + err)
    })
    sheets.spreadsheets.values.append({
      spreadsheetId: '1Rdp0Z4CKpp5DH41ufeOzC1edE87Nf4DjswmsNYCiI6Q',
      range: 'Data!A2:I',
      valueInputOption: "RAW",
      resource: {
        majorDimension: "ROWS",
        values: jsonObjs.map(x => {
          const obj = {...x}
          for (property in obj) {
            obj[property] = ""+obj[property]
          }
          return [obj.internalUID, obj.name, obj.startDateTime, obj.endDateTime, obj.origin, obj.destination, obj.POC, obj.POCPhone, obj.vehicles, obj.notes]
        })
      }
    }, (err, _)=>{
      if (err) return console.log('The API returned an error: ' + err)
    })
  }
  catch {

  }
}

function appendNSONs(jsonObjs) {
  if (authenticated === false) {
    nueue.push(...jsonObjs)
    return
  }
  try {
    sheets.spreadsheets.values.append({
      spreadsheetId: '1Rdp0Z4CKpp5DH41ufeOzC1edE87Nf4DjswmsNYCiI6Q',
      range: 'NotificationsBackup!A2:A',
      valueInputOption: "RAW",
      resource: {
        majorDimension: "ROWS",
        values: jsonObjs.map(x => [JSON.stringify(x)])
      }
    }, (err, _)=>{
      if (err) return console.log('The API returned an error: ' + err)
    })
    sheets.spreadsheets.values.append({
      spreadsheetId: '1Rdp0Z4CKpp5DH41ufeOzC1edE87Nf4DjswmsNYCiI6Q',
      range: 'Notifications!A2:I',
      valueInputOption: "RAW",
      resource: {
        majorDimension: "ROWS",
        values: jsonObjs.map(([x, title]) => {
          const obj = {...x}
          for (property in obj) {
            obj[property] = ""+obj[property]
          }
          return [obj.internalUID, title, obj.title]
        })
      }
    }, (err, _)=>{
      if (err) return console.log('The API returned an error: ' + err)
    })
  }
  catch {

  }
}

var email_authenticated = false
var gmail
var email_queue = []
const SENDER_ADDRESS = "tolueneeisner@gmail.com"

// Load client secrets from a local file.
email_authorize(JSON.parse(process.env.EMAIL_CREDENTIALS_JSON), email_authenticate);

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function email_authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  oAuth2Client.setCredentials(JSON.parse(process.env.EMAIL_TOKEN_JSON));
  callback(oAuth2Client);
}

function email_authenticate(auth) {
  gmail = google.gmail({version: 'v1', auth})
  email_authenticated = true
  const myEmails = email_queue
  email_queue = []
  email_sendEmails(myEmails)
}

function email_sendEmail(email) {
  email_sendEmails([email])
}

async function email_sendEmails(emails) {
  if (email_authenticated === false) {
    email_queue.push(...emails)
  }
  for (let {senderTitle, recipientAddress, subject, message} of emails) {
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `From: ${senderTitle} <${SENDER_ADDRESS}>`,
      `To: <${recipientAddress}>`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      message
    ];
    const message = messageParts.join('\n');

    // The body needs to be base64url encoded.
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
    console.log("EMAIL")
    console.log(res)
  }
}

email_sendEmail({senderTitle: "Indent System",
  recipientAddress: "tolueneeisner@gmail.com",
  subject: "🤘 Hello 🤘",
  message: "This is a message just to say hello.\nSo... <b>Hello!</b>  🤘❤️😎"
})

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
  const insert = {...write, internalUID: internalUID}
  appendJSON(insert)
  dataStore = [...dataStore, insert]
  internalUID++
  overwriteUID()
  overwriteDS()
}

const appendNotifications = (write, title) => {
  appendNSON([write, title])
  notificationsStore = [...notificationsStore, write]
  overwriteNS()
}

const acknowledgeEdit = ({internalUID, status}, {internalUID: oldUID, status: oldStatus, name: title}) => {
  if (status !== oldStatus && internalUID === oldUID) {
    appendNotifications({title: "Indent \""+readDataStore(internalUID).name+"\" is now "+status, internalUID: internalUID}, title)
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