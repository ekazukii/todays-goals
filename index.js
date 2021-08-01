var express = require("express");
var path = require("path");
var logger = require('morgan');
var fs = require("fs");
const { v4: uuidv4 } = require('uuid');
var sqlite3 = require('sqlite3').verbose();
const {OAuth2Client} = require('google-auth-library');
const CLIENT_ID = "595427916137-78nfjo08g37j3jscvsrl9o1b6nbaaj1l.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);


// Create http express server
var app = express();
var port = 3001;
const http = require('http');
const server = http.createServer(app);
var db = new sqlite3.Database(':memory:');

// Socket io
const { Server } = require("socket.io");
const io = new Server(server);
db.serialize(function() {
    db.get("PRAGMA foreign_keys = ON")
    db.run("CREATE TABLE IF NOT EXISTS Users (userId INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, timezone TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS Tasks (taskId TEXT PRIMARY KEY, userId INTEGER, date TEXT, text TEXT, color TEXT, checked INT, FOREIGN KEY(userId) REFERENCES Users(userId))");
    db.run("CREATE TABLE IF NOT EXISTS SharedTasks (sharedId TEXT PRIMARY KEY, sharerId INTEGER, receiverId INTEGER, text TEXT, color TEXT, FOREIGN KEY(receiverId) REFERENCES Users(userId), FOREIGN KEY(sharerId) REFERENCES Users(userId))");

    db.run('INSERT INTO Users (email, timezone) VALUES ("contact@ekazuki.fr", "FRANCE/PARIS")')
    db.run('INSERT INTO Tasks (taskId, userId, date, text, color, checked) VALUES ("niels", 1, "20210801", "This is goal number one", "black", 0)');
    db.run('INSERT INTO Tasks (taskId, userId, date, text, color, checked) VALUES ("niels2", 1, "20210801", "This is goal number one", "black", 0)');
    db.run('INSERT INTO Tasks (taskId, userId, date, text, color, checked) VALUES ("niels3", 1, "20210801", "Here\'s the last todo f", "black", 0)');
    console.log("niels")



});

let tasks = {
    "20210731": [
        {id: 1, text: "This is goal number one"},
        {id: 2, text: "This is the second task"},
        {id: 3, text: "Here's the last todo"}
    ]
}

io.on('connection', (socket) => {
    console.log('a user connected');

    /**
     * date = "YYYYMMDD"
     */
    socket.on('goals/get', (date) => {
        db.all('SELECT * FROM Tasks WHERE userId = ? AND date = ?', [1, date], (err, rows) => {
            io.emit('goals/get', rows);
        })
    })

    /**
     * msg = {
     *   text: "Todo text"
     *   date: "YYYYMMDD"
     * }
     */
    socket.on('goals/add', (msg) => {
        db.serialize(function() {
            db.run('INSERT INTO Tasks (taskId, userId, date, text, color, checked) VALUES (?, 1, ?, ?, "black", 0)', [uuidv4(), msg.date, msg.text]);

            db.all('SELECT * FROM Tasks WHERE userId = ? AND date = ?', [1, msg.date], (err, rows) => {
                io.emit('goals/get', rows);
            })
        })
    })

    socket.on("google/auth", (msg) => {
        verify(msg);
    });

    /**
     * msg = {
     *   text: "Todo text"
     *   id: "UUIDV4"
     *   date: "YYYYMMDD"
     * }
     */
    socket.on('goals/remove', (msg) => {
        db.serialize(function() {
            db.run('DELETE FROM Tasks WHERE text = ?', msg.text)

            db.all('SELECT * FROM Tasks WHERE userId = ? AND date = ?', [1, msg.date], (err, rows) => {
                io.emit('goals/get', rows);
            })
        })
    })
});

async function verify(token) {
  const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
      // Or, if multiple clients access the backend:
      //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
  });
  const payload = ticket.getPayload();
  const userid = payload['sub'];

  console.log(payload)
  // If request specified a G Suite domain:
  // const domain = payload['hd'];
}

//app.use(helmet());

app.use(logger('common', {
    stream: fs.createWriteStream('./access.log', {flags: 'a'})
}));

app.use(logger('dev'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
    //res.render('ekasite/views/home.ejs');   
});

app.use('/img', express.static(path.join(__dirname, 'public/img')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/', express.static(path.join(__dirname, 'public/favicons')));

server.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});
  