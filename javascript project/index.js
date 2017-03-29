// Require the server dependecies, node modules
var express = require('express'); 	// node web application framework
var app = express();				// New instance of express
var http = require('http').Server(app);	// create node simple server
var io = require('socket.io')(http);	// Load socket.io on the server
var maxConnections = 2;
var connectionCounter = 0;

// When a client connects to the server, 
// this sends the HTML file to the client's browser
app.get('/', function(req, res){
	if(connectionCounter == 2) {
			res.end();
			console.log("Client connection prevented, Max clients reached");
	} else {res.sendFile(__dirname + '/index.html');}
});

// Connection event handler for the server
// When a client connects to the server run this function
io.on('connection', function(socket){
	
  console.log('User connected'); // Print User connected
  
  // When a client disconnects, run this function
  socket.on('disconnect', function(){
    console.log('User disconnected');
  });
  
  // When a public key is received
  socket.on('public key', function(publicKeyExchange){
	socket.broadcast.emit('public key', 
		{
			publicKey: publicKeyExchange.publicKey,
			DSnInt: publicKeyExchange.DSnInt
		}
	);
  });
  
  // When a nonce is received
  socket.on('nonce', function(nonce){
	socket.broadcast.emit('nonce', nonce);
  });
  
  // When a nonce package is received
  socket.on('nonce package', function(noncePackage){
	socket.broadcast.emit('nonce package', 
		{
			nonceReceived: noncePackage.senderNonce,
			myNonce: noncePackage.nonceReceived
		}
	);
  });
  
  // When a socket (user) sends a chat message run this function
  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
    // The sending socket broadcasts its message to all other clients and not itself
    socket.broadcast.emit('chat message', msg);
  });
  
  // When a socket (user) sends an image file...
  socket.on('base64 file', function (msg) {
    console.log('received base64 file from ' + msg.username);
    //~ socket.username = msg.username;
    // The sending socket broadcasts the base64 file to all other connections
    socket.broadcast.emit('base64 file',

        {
          username: socket.username,
          file: msg.file,
          fileName: msg.fileName
        }

    );
});
  
});


// Server to run on port 3000
http.listen(3000, function(){
  console.log('listening on *:3000');
});

// Tell the express application to include files in the public folder
app.use(express.static('public'));
