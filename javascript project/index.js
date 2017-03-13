
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	
  console.log('User connected');
  
  socket.on('disconnect', function(){
    console.log('User disconnected');
  });
  
  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
    socket.broadcast.emit('chat message', msg);
  });
  
  socket.on('base64 file', function (msg) {
    console.log('received base64 file from ' + msg.username);
    socket.username = msg.username;
    // socket.broadcast.emit('base64 image', //exclude sender
    socket.broadcast.emit('base64 file',

        {
          username: socket.username,
          file: msg.file,
          fileName: msg.fileName
        }

    );
});
  
});



http.listen(3000, function(){
  console.log('listening on *:3000');
});

app.use(express.static('public'));
