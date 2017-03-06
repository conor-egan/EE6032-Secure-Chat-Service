
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
  
});



http.listen(3000, function(){
  console.log('listening on *:3000');
});

app.use(express.static('public'));
