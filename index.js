var express = require("express");
var path = require("path");
var logger = require('morgan');
var fs = require("fs");

var app = express();
var port = 3001;

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

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});
  