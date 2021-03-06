var express = require("express");
var path = require("path");
var logger = require('morgan');
var fs = require("fs");
const { v4: uuidv4 } = require('uuid');
var sqlite3 = require('sqlite3').verbose();
const {OAuth2Client} = require('google-auth-library');
const CLIENT_ID = "595427916137-78nfjo08g37j3jscvsrl9o1b6nbaaj1l.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);
const PORT = process.env.PORT;

// Create http express server
var app = express();
var port = PORT || 3001;
const http = require('http');
const server = http.createServer(app);
var db = new sqlite3.Database('tasks.db');

// Socket io
const { Server } = require("socket.io");
const io = new Server(server);
db.serialize(function() {
    db.get("PRAGMA foreign_keys = ON")
    db.run("CREATE TABLE IF NOT EXISTS Users (userId INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, timezone TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS Tasks (taskId TEXT PRIMARY KEY, userId INTEGER, date TEXT, text TEXT, color TEXT, checked INT, FOREIGN KEY(userId) REFERENCES Users(userId))");
    db.run("CREATE TABLE IF NOT EXISTS SharedTasks (sharedId TEXT PRIMARY KEY, sharerId INTEGER, receiverId INTEGER, text TEXT, color TEXT, FOREIGN KEY(receiverId) REFERENCES Users(userId), FOREIGN KEY(sharerId) REFERENCES Users(userId))");
    db.run("CREATE TABLE IF NOT EXISTS Sessions (sessionId TEXT PRIMARY KEY, userId INTEGER, FOREIGN KEY(userId) REFERENCES Users(userId))")
});

io.on('connection', (socket) => {
    console.log('a user connected');

    /**
     * date = "YYYYMMDD"
     * sessId: UUIDV4
     */
    socket.on('goals/get', (msg) => {
        getUserId(msg.sessId).then((userId) => {
            sendTasks(userId, msg.date, socket)
        })
    })

    /**
     * msg = {
     *   text: "Todo text"
     *   date: "YYYYMMDD"
     *   sessId: UUIDV4
     * }
     */
    socket.on('goals/add', (msg) => {
        getUserId(msg.sessId).then((userId) => {
            db.run('INSERT INTO Tasks (taskId, userId, date, text, color, checked) VALUES (?, ?, ?, ?, "black", 0)', [uuidv4(), userId, msg.date, msg.text], () => {
                sendTasks(userId, msg.date, socket)
            });
        })
    })
    /**
     * msg = {
     *   text: "Todo text"
     *   id: "UUIDV4"
     *   date: "YYYYMMDD"
     *   sessId: UUIDV4
     * }
     */
    socket.on('goals/remove', (msg) => {
        getUserId(msg.sessId).then((userId) => {
            console.log(msg.text);
            db.run('DELETE FROM Tasks WHERE text = ?', [msg.text], () => {
                sendTasks(userId, msg.date, socket)
            })
        })
    })

    /**
     * msg = {
     *   text: "Todo text"
     *   id: "UUIDV4"
     *   date: "YYYYMMDD"
     *   sessId: UUIDV4
     *   checked: 0 || 1
     * }
     */
    socket.on('goals/update', (msg) => {
        getUserId(msg.sessId).then((userId) => {
            console.log(msg.text);
            db.run('UPDATE Tasks SET checked = ? WHERE text = ?', [msg.checked, msg.text], () => {
                sendTasks(userId, msg.date, socket)
            })
        })
    })

    socket.on("google/auth", (tokenId) => {
        //verify(msg);
        getEmail(tokenId).then(email => {
            db.serialize(() => {
                db.run("INSERT OR IGNORE INTO Users (email) VALUES (?)", email);
                db.get("SELECT userId FROM Users WHERE email = ?", email, (err, res) => {
                    let sessId = uuidv4();
                    db.run("INSERT INTO Sessions (sessionId, userId) VALUES (?, ?)", [sessId, res.userId])
                    socket.emit("auth/session", sessId);
                });
            })
        })
    });

    socket.on("test", (msg) => {
        setTimeout(() => {
            db.all("SELECT * FROM Users", (err, rows) => {
                console.log(rows)
            })
        }, 10000)
    })

});

function sendTasks(userId, date, socket) {
    db.all('SELECT * FROM Tasks WHERE userId = ? AND date = ?', [userId, date], (err, rows) => {
        socket.emit('goals/get', rows);
    })
}

function getUserId(sessionId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT userId FROM Sessions WHERE sessionId = ?', sessionId, (err, row) => {
            if(row?.userId) {
                resolve(row.userId)
            } else {
                console.error("No session found")
                reject(new Error("No session found"))
            }
        })
    })
}

async function getEmail(token) {
    return new Promise((resolve, reject) => {
        client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID
        }).then(ticker => {
            resolve(ticker.getPayload()["email"])
        }).catch(err => {
            reject(err);
        })
    })
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
  
