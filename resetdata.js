const fs = require('fs')
var dataStore = [{name: "Mandai Crematorium Indent", internalUID: 0, startDateTime: "01/04/2020 12:34", endDateTime: "01/04/2020 23:45", POC: "lmao", POCPhone: "999", origin: "Hell Camp", destination: "Hellish Camp", status: "Pending"}, {name: "Mandai Crematorium Indent", internalUID: 1, startDateTime: "01/04/2020 12:34", endDateTime: "01/04/2020 23:45", POC: "lmao", POCPhone: "999", origin: "Hell Camp", destination: "Hellish Camp", status: "Pending"}, {name: "Mandai Crematorium Indent", internalUID: 2, startDateTime: "01/04/2020 12:34", endDateTime: "01/04/2020 23:45", POC: "lmao", POCPhone: "999", origin: "Hell Camp", destination: "Hellish Camp", status: "Pending"}]
var notificationsStore = [{title: "Mandai Crematorium Indent is now Pending", internalUID: 0}]
const dataJSON = JSON.stringify(dataStore)
const notificationsJSON = JSON.stringify(notificationsStore)
fs.writeFile('./defaultData/dataStore.json', dataJSON, ()=>{})
fs.writeFile('./defaultData/notificationsStore.json', notificationsJSON, ()=>{})
fs.writeFile('./defaultData/uid.json', JSON.stringify(dataStore.length), ()=>{})