var express = require("express");
var path = require("path");
var logger = require('morgan');
var fs = require("fs");
const { v4: uuidv4 } = require('uuid');

// Create http express server
var app = express();
var port = 3001;
const http = require('http');
const server = http.createServer(app);

// Socket io
const { Server } = require("socket.io");
const io = new Server(server);

let tasks = [
    {id: 1, text: "This is goal number one"},
    {id: 2, text: "This is the second task"},
    {id: 3, text: "Here's the last todo"}
]

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('goals/get', (msg) => {
        io.emit('goals/get', tasks);
    })

    socket.on('goals/add', (msg) => {
        tasks.push({id: uuidv4(), text: msg});
        io.emit('goals/get', tasks);
    })

    socket.on('goals/remove', (msg) => {
        tasks = tasks.filter(task => {
            return (task.id !== msg && task.text !== msg);
        });
        io.emit('goals/get', tasks);
    })
});

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
  