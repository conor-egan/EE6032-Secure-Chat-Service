
// Create settingsBar variable and access the HTML settingsBar element
var settingsBar = document.getElementsByClassName("settingsBar")[0];
// Create a new socket
var socket = io();

// Variable to hold my outgoing message
var myMessage;

// Create a textBox variable to access the HTML textBox element
var textBox = document.getElementById("textInput");
// Create a chatBox variable to access the HTML chatArea element
var chatBox = document.getElementById("chatArea");
// Variable to hold this clients username
var usrName;

// Variable Passphrase to hold the RSA key generation 'phrase'
var Passphrase;

var myNonce;

// bits indicates how many bits in the RSA encryption
var bits = 1024;
// Create variable myRSAKey using the cryptico.generateRSAKey() function
var myRSAKey;
// Create variable myPublicKey from the variable myRSAKey
var myPublicKey;

// Var to store other users public key
var otherPublicKey;

var sharedSecretKey;

function sendPublicKey(key) {
	// Create array of public key, and hashed public key encrypted with private key
	var publicKeyExchange = {};
	publicKeyExchange.publicKey = key;
	publicKeyExchange.hashedKey = sha1(key);
	// Send my public key to the server
	socket.emit('public key', publicKeyExchange);
}

function createNonce() {
	var array = [];
	for(i=0;i<8;i++) {
		array[i].push(Math.round(Math.random()*255));
	}
	return array;
}

function keyExchangeStep1(nonce) {
	var keyGenExchange = {};
	var hashNonce = sha1(nonce);
	keyGenExchange.nonce = cryptico.encrypt(nonce, otherPublicKey);
	keyGenExchange.signedNonce = cryptico.encrypt(nonce, otherPublicKey, myRSAKey);
	socket.emit("KeyGen Exchange", keyGenExchange);
}

socket.on("KeyGen Exchange", function(msg)) {
	var key = receiveNonceA(msg);
	keyExchangeStep3(key);
}

function keyExchangeStep3(seshKey) {
	
}

function receiveNonceA(message){
	var receivedNonce = rsaDecrypt(message.nonce, myRSAKey);
	var decryptedSignature = rsaDecrypt(message.signedNonce, myRSAKey);
	
	var signedBoolean = decryptedSignature.signature;
	if (signedBoolean == "verified") {
		console.log("signature verified");
		var key = createSessionKey(receivedNonce, myNonce);
		return key;
		} else {
		console.log("Signature failed");
	}
}

function createSessionkey(keyA, keyB) {
	var sessionKey = [];
	for(i=0;i<keyA.length;i++){
		sessionKey[i].push(keyA[i]);
	}
	for(i=0;i<keyB.length;i++){
		sessionKey[i+8].push(keyB[i]);
	}
	
	return sessionKey;
}

// Function that takes in the message to be encrypted and the public key
// for the target recipient
function rsaEncrypt(message, targetPublicKey) {
	var EncryptionResult = cryptico.encrypt(message, targetPublicKey);
	console.log(EncryptionResult.cipher); // log the encrypted message to the console
	return EncryptionResult.cipher;	// return the encrypted message
}

// Function that decrypts an incoming RSA encrypted message using my private key
function rsaDecrypt(encryptedMessage, myRSAKey) {
	var EncryptionResult = cryptico.decrypt(encryptedMessage, myRSAKey);
	console.log(EncryptionResult.plaintext);
	return EncryptionResult.plaintext;
}

// Function to demonstrate AES session key encryption
// Take in a message, creates a AES session and encrypts the message with
// a 128 bit key, converts the string to binary, encrypts the message,
// prints the encrypted message, calls the decrypt function and prints
// the decrypted message, then closes the AES session
function aesEncrypt(message, key) {
	AES_Init();
	
	var block = string2Bin(message);
	AES_ExpandKey(key);
	AES_Encrypt(block, key);
	var data=bin2String(block);
	
	console.log("AES encrypted message: "+ data);
	
	console.log("Decrypted message: "+decrypt(data,key));
	
	AES_Done();
}

function decrypt ( inputStr,key ) {
	block = string2Bin(inputStr);
	AES_Decrypt(block, key);
	var data=bin2String(block);
	return data;
}

document.getElementById("buttonContainer").onclick = function() {
	//Handle click event for send button
	send();
}

document.getElementById("attachment").onclick = function() {
	//Handle click event for attachment button
	console.log("Attachment pressed");
	document.getElementById('myImageFile').click();
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// This promts for a Username input, function is run on body load
function start() {
	usrName = prompt("Enter your username");
	Passphrase = prompt("Enter a passphrase for encryption");
	
	myNonce = createNonce();
	
	// Create variable myRSAKey using the cryptico.generateRSAKey() function
	myRSAKey = cryptico.generateRSAKey(Passphrase, bits);
	// Create variable myPublicKey from the variable myRSAKey
	myPublicKey = cryptico.publicKeyString(myRSAKey);
	
	sendPublicKey(myPublicKey);
}

// Take the file data from the input button, read the file
function readImageFile(input) {
	if (input.files && input.files[0]) {
		var fileName = input.files[0]; // get the name of the file
        var reader = new FileReader(); // Create a new file reader object
		
		// When data is available to the reader
        reader.onload = function (e) {
            var src = e.target.result; // get the source of the file
            displayMyImage(src);		// call displayMyImage() with the file source
            sendFile(fileName,src);	// Send the image with sendFile()
		};
		
        reader.readAsDataURL(fileName); // Read the file
	}
}

// Create an HTML img element and use it to display the image
function displayImage(src) {
	var img = document.createElement("img");
	img.classList.add("image");
	img.src = src;
	chatBox.innerHTML += "<div class='imageContainer'></div>"; // Attach the image Container to the chatBox
	console.log(chatBox.getElementsByClassName("imageContainer").length);
	chatBox.getElementsByClassName("imageContainer")[chatBox.getElementsByClassName("imageContainer").length-1].appendChild(img);
	// This line gets the array of elements of className 'imageContainer' and appends 'img' to the last 'imageContainer'
}

// This is same as above but displays the Image frm this client instead of received images
function displayMyImage(src) {
	var img = document.createElement("img");
	img.classList.add("myImage");
	img.src = src;
	chatBox.innerHTML += "<div class='myImageContainer'></div>";
	console.log(chatBox.getElementsByClassName("myImageContainer").length);
	chatBox.getElementsByClassName("myImageContainer")[chatBox.getElementsByClassName("myImageContainer").length-1].appendChild(img);
}

// This function emits the base 64 file object to the server
// it accepts a file name and the data of the file
function sendFile(file,data){
	
	var msg = {}; // create a message object
	msg.username = usrName; //create properties for the message object
	msg.file = data;
	msg.fileName = file.name;
	console.log(msg.fileName);
	socket.emit('base64 file', msg); // send the file to the server
}
socket.on('public key', function(publicKeyReceived) {
	// Need to emit my public key here incase I am the first user connected
	// Need to first check if the key received has already been received
	// If so, do nothing, if not, emit my public key
	if(otherPublicKey != publicKeyReceived.publicKey){
	    socket.emit('public key', publicKeyExchange);
		console.log('Other users public key: '+ publicKeyReceived.publicKey);
		otherPublicKey = publicKeyReceived.publicKey;
		
		var HashKey = publicKeyReceived.hashedKey;
		if(sha1(otherPublicKey) == HashKey) {
			console.log('Integrity of key exists');
			
		}
	}
	
});


// When a 'chat message' event is received, run this function
socket.on('chat message', function(msg){
    displayMessage(msg);
});

// When a 'base64 file' event is received, run this function  
socket.on('base64 file', function(msg) {
	displayImage(msg.file);
});

// Function to call the sha1 hashing algorithm in sha.js
function sha1(message) {
	var shaObj = new jsSHA("SHA-1", "TEXT");
	shaObj.update(message);
	var hash = shaObj.getHash("HEX");
	return hash;
}

// Funtion to send a chat message
function send() {
	if(textBox.value != "") { // if textBox is not empty
		myMessage = textBox.value; // get the textBox contents
		console.log(sha1(myMessage)); // log the hashed message
		textBox.value = "";		// clear the textBox
		socket.emit("chat message", myMessage);	//Emit the text message
		displayMyMessage(myMessage);		// Display my message
		aesEncrypt(myMessage);		// Run the AES Encryption demo function
		var cipher = rsaEncrypt(myMessage,myPublicKey); // RSA encrypt with the demo key passPhrase
		rsaDecrypt(cipher,myRSAKey);	// Decrypt the RSA cipher with the demo key
	}
}

// Utility functions
function bin2String(array) {
	var result = "";
	for (var i = 0; i < array.length; i++) {
		result += String.fromCharCode(parseInt(array[i], 2));
	}
	return result;
}

function string2Bin(str) {
	var result = [];
	for (var i = 0; i < str.length; i++) {
		result.push(str.charCodeAt(i));
	}
	return result;
}

function bin2String(array) {
	return String.fromCharCode.apply(String, array);
}


function displayMyMessage(message) {
	chatBox.innerHTML += "<div class='myMessage'>"+message+"</div>";
}


function displayMessage(message) {
	chatBox.innerHTML += "<div class='message'>"+message+"</div>";
}

// Keyboard shortcut to send the text image
document.addEventListener("keydown", function(event) {
	if(event.which == 13 && document.activeElement == textBox) {
		send();
	}
});

// Function to open the settingsBar
document.getElementById("settingsContainer").onclick = function() {
	//Handle click event for settings button
	console.log("Settings button pressed");
	if(settingsBar.classList.contains("settingsOpened")){
		settingsBar.classList.remove("settingsOpened");
		} else {
		settingsBar.classList.add("settingsOpened");
	}
}
