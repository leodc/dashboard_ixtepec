//dependencies
var express = require("express");
var app = express();
var http = require("http").Server(app);
var path = require("path");
var io = require("socket.io")(http);
//var cartodb = require("./cartoDB");

//setup
app.set('port', process.env.PORT || 22322);
app.use(express.static(path.join(__dirname, 'client')));


//sockets
//io.on('connection', function(socket){});

//start
http.listen(app.get('port'), function(){
  console.log('server on port ' + app.get('port'));
});
