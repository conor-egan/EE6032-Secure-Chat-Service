var settingsBar = document.getElementsByClassName("settingsBar")[0];
var textBox = document.getElementById("textInput");
var chatBox = document.getElementById("chatArea");
var encryptionSwitch = document.getElementById("encryptionBox");
var socket = io();
var usrName, Passphrase, otherUserName;
var myMessage;
var myNonce, otherUserNonce;
var bits = 1024;
var myRSAKey, myPublicKey, otherPublicKey;
var sharedSecretKey;
var encryptFlag, otherUserFlag;

// Function run once a client a client connects to the server from index.html
function start(){
	usrName = prompt("Enter your username");
	addClientName();
	Passphrase = prompt("Enter a passphrase for encryption");
	myNonce = createNonce();
	myRSAKey = cryptico.generateRSAKey(Passphrase, bits);
	myPublicKey = cryptico.publicKeyString(myRSAKey);
	sendPublicKey(myPublicKey);	
}

// Function to create a random 8 byte nonce
function createNonce() {
	var array = [];
	for(i=0;i<8;i++) {
		array.push(Math.round(Math.random()*255));
	}
	return array;
}

// Function to send the public key once a clinet connects to server
function sendPublicKey(key) {
	var publicKeyExchange = {};
	publicKeyExchange.publicKey = key;
	publicKeyExchange.hashedKey = sha1(key);
	publicKeyExchange.userName = usrName;
	publicKeyExchange.hashedUserName = sha1(usrName);
	socket.emit('public key', publicKeyExchange);
}

// Function to send your own public key once a key is received
function returnPublicKey(key) {
	var publicKeyExchange = {};
	publicKeyExchange.publicKey = key;
	publicKeyExchange.hashedKey = sha1(key);
	publicKeyExchange.userName = usrName;
	publicKeyExchange.hashedUserName = sha1(usrName);
	socket.emit('return public key', publicKeyExchange);
}

// Code run when a key is received
socket.on('public key', function(publicKeyReceived) {
    returnPublicKey(myPublicKey);
	otherPublicKey = publicKeyReceived.publicKey;
		
	var HashKey = publicKeyReceived.hashedKey;
	if(sha1(otherPublicKey) == HashKey&&sha1(publicKeyReceived.userName)==publicKeyReceived.hashedUserName) {
		otherUserName = publicKeyReceived.userName;
		addOtherClientName();
	}
});	

// When other user has received my key and I received theirs	
socket.on('return public key', function(publicKeyReceived) {
	otherPublicKey = publicKeyReceived.publicKey;
		
	var HashKey = publicKeyReceived.hashedKey;
	if(sha1(otherPublicKey) == HashKey&&sha1(publicKeyReceived.userName)==publicKeyReceived.hashedUserName) {
		otherUserName = publicKeyReceived.userName;
		addOtherClientName();
	}
	// Protocol Step 1, sending a nonce and hashed nonce all RSA encrypted
	var msg = {};
	var cipher = cryptico.encrypt(array2String(myNonce), otherPublicKey);
	msg.nonce = cipher.cipher;
	var hashed = cryptico.encrypt(sha1(array2String(myNonce)), otherPublicKey, myRSAKey);
	msg.hashed = hashed.cipher;
	socket.emit('ProtocolStep1', msg);
});

// When step 1 is received: check integrity and signature of nonce,
// create the session key, emit protocol step 3
socket.on('ProtocolStep1', function(Protocol1Received){
	var nonceReceived = cryptico.decrypt(Protocol1Received.nonceReceived, myRSAKey);
	var nonceArray = string2Array(nonceReceived.plaintext);
	var hashedNonceReceived = cryptico.decrypt(Protocol1Received.hashedNonce, myRSAKey);
	if(sha1(nonceReceived.plaintext) != hashedNonceReceived.plaintext ){
		console.log("Nonce has been tampered with");
		} else {
		if(hashedNonceReceived.signature=="verified"){
			// Create session key with my nonce and nonceReceived
			sharedSecretKey = createSessionKey(myNonce, nonceArray);
			protocolStep3(nonceArray);
		} else {console.log("Nonce signature is not verified");}
	}
});

// Send protocol step 3
function protocolStep3(receivedNonce) {
	var step3Msg = {};
	step3Msg.myNonce = cryptico.encrypt(array2String(myNonce), otherPublicKey).cipher;
	step3Msg.nonceReceived = cryptico.encrypt(aesEncrypt(array2String(receivedNonce),sharedSecretKey), otherPublicKey).cipher;
	step3Msg.hashedNonce = cryptico.encrypt(sha1(array2String(myNonce)), otherPublicKey, myRSAKey).cipher;
	step3Msg.hashedResponse = cryptico.encrypt(sha1(aesEncrypt(array2String(receivedNonce),sharedSecretKey)), otherPublicKey, myRSAKey).cipher;
	socket.emit('nonce package', step3Msg);
}

// Function to creeate a session key using my nonce and the other user nonce
function createSessionKey(keyA, keyB) {
	var sessionKey = [];
	for(i=0;i<keyA.length;i++){
		sessionKey.push(keyA[i]);
	}
	for(i=0;i<keyB.length;i++){
		sessionKey.push(keyB[i]);
	}
	return sessionKey;
}

// When protocol step 3 is received:
// Decrypt and verify everything and create own session key
socket.on('nonce package', function(noncePackageReceived){
	var otherNonce = cryptico.decrypt(noncePackageReceived.otherNonce,myRSAKey).plaintext;
	otherUserNonce = string2Array(otherNonce);
	var AESResponse = cryptico.decrypt(noncePackageReceived.response,myRSAKey).plaintext;
	var hashedOtherUserNonce = cryptico.decrypt(noncePackageReceived.hashedNonce, myRSAKey).plaintext;
	var signature1 = cryptico.decrypt(noncePackageReceived.hashedNonce, myRSAKey).signature;
	var hashedAESResponse = cryptico.decrypt(noncePackageReceived.hashedResponse, myRSAKey).plaintext;
	var signature2 = cryptico.decrypt(noncePackageReceived.hashedResponse, myRSAKey).signature;
	if(sha1(otherNonce)==hashedOtherUserNonce&&sha1(AESResponse)==hashedAESResponse){
		if(signature1=="verified"&&signature2=="verified") {
			sharedSecretKey = createSessionKey(otherUserNonce,myNonce);
			if(decrypt(AESResponse, sharedSecretKey)==array2String(myNonce)){
			}
			}else{
			console.log("Signatures are not verified");
		}
		}else{
		console.log("Hash is not intact");
	}
});

// Function that takes in the message to be encrypted and the public key
// for the target recipient
function rsaEncrypt(message, targetPublicKey) {
	var EncryptionResult = cryptico.encrypt(message, targetPublicKey);
	return EncryptionResult.cipher;	// return the encrypted message
}

// Function that decrypts an incoming RSA encrypted message using my private key
function rsaDecrypt(encryptedMessage, myRSAKey) {
	var EncryptionResult = cryptico.decrypt(encryptedMessage, myRSAKey);
	//console.log(EncryptionResult.plaintext);
	return EncryptionResult.plaintext;
}

// Function to demonstrate AES session key encryption
// Take in a message, creates a AES session and encrypts the message with
// a 128 bit key, converts the string to binary, encrypts the message,
// prints the encrypted message, calls the decrypt function and prints
// the decrypted message, then closes the AES session
function aesEncrypt(message, key) {	
	var textBytes = aesjs.utils.utf8.toBytes(message);
	var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter());
	var encryptedBytes = aesCtr.encrypt(textBytes);
	var encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
	return encryptedHex;
}

// Function to AES decrypt cipher text
function decrypt ( inputStr,key ) {
	var encryptedBytes = aesjs.utils.hex.toBytes(inputStr);
	var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter());
	var decryptedBytes = aesCtr.decrypt(encryptedBytes);
	
	
	// Convert our bytes back into text
	var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
	return decryptedText;
}

// Function to call the sha1 hashing algorithm in sha.js
function sha1(message) {
	var shaObj = new jsSHA("SHA-1", "TEXT");
	shaObj.update(message);
	var hash = shaObj.getHash("HEX");
	return hash;
}

// Funtion to send a chat message, checks whether or not the message is to be encrypted
function send() {
	if(textBox.value != "") { // if textBox is not empty
		if(encryptionSwitch.checked) {
			var myMessage = textBox.value; // get the textBox contents
			textBox.value = "";		// clear the textBox
			var encryptedMsg = aesEncrypt(myMessage, sharedSecretKey);
			var msg = {};
			msg.encryptFlag = sha1("1");
			msg.encryptedMsg = encryptedMsg;
			socket.emit("chat message", msg);	//Emit the text message
			displayMyMessage(myMessage);		// Display my message
			} else {
			var myMessage = textBox.value; // get the textBox contents
			textBox.value = "";		// clear the textBox
			var encryptedMsg = myMessage;
			var msg = {};
			msg.encryptFlag = sha1("0");
			msg.encryptedMsg = encryptedMsg;
			socket.emit("chat message", msg);	//Emit the text message
			displayMyMessage(myMessage);		// Display my message
		}
	}
}

// When a 'chat message' event is received, run this function
// Check if the message is to be decrypted
socket.on('chat message', function(msg){
	otherUserFlag = msg.otherUserFlag;
	if(otherUserFlag == sha1("1")) {
		var decryptedMsg = decrypt(msg.message, sharedSecretKey);
		displayMessage(decryptedMsg);
		} else if(otherUserFlag == sha1("0")){
		displayMessage(msg.message);
	}
    
});

// Function to display my message to the page
function displayMyMessage(message) {
	chatBox.innerHTML += "<div class='myMessage'>"+"<b>"+usrName+"</b>"+"<b>: </b>"+message+"</div>";
}

// Function to display other user message to the page
function displayMessage(message) {
	chatBox.innerHTML += "<div class='message'>"+"<b>"+otherUserName+"</b>"+"<b>: </b>"+message+"</div>";
}

// Function to display a message in chat area to show that encryption is on
function displayEncryptionOn() {
	chatBox.innerHTML += "<div class='encryptOn'>Encryption is now on. Your messages are secure.</div>";
}

// Function to display a message in chat area to show that encryption is off
function displayEncryptionOff() {
	chatBox.innerHTML += "<div class='encryptOff'>Encryption is now off. Your messages are not secure.</div>";
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

// This function emits the base 64 file object to the server
// it accepts a file name and the data of the file
function sendFile(file,data){
	var msg = {}; // create a message object
	msg.username = usrName; //create properties for the message object
	if(encryptionSwitch.checked) {
		var encryptedFile = aesEncrypt(data, sharedSecretKey);
		msg.encryptFlag = sha1("1");
		} else {
		var encryptedFile = data;
		msg.encryptFlag = sha1("0");
	}
	msg.file = encryptedFile;
	msg.fileName = file.name;
	socket.emit('base64 file', msg); // send the file to the server
}

// When a 'base64 file' event is received, run this function  
socket.on('base64 file', function(msg) {
	if(msg.encryptFlag==sha1("1")) {
		var decryptedFile = decrypt(msg.file, sharedSecretKey);
		} else if(msg.encryptFlag==sha1("0")){
		var decryptedFile = msg.file;
	}
	displayImage(decryptedFile);
});

// Create an HTML img element and use it to display the image
function displayImage(src) {
	var img = document.createElement("img");
	img.classList.add("image");
	img.src = src;
	chatBox.innerHTML += "<div class='imageContainer'></div>"; // Attach the image Container to the chatBox
	chatBox.getElementsByClassName("imageContainer")[chatBox.getElementsByClassName("imageContainer").length-1].appendChild(img);
	// This line gets the array of elements of className 'imageContainer' and appends 'img' to the last 'imageContainer'
}

// This is same as above but displays the Image frm this client instead of received images
function displayMyImage(src) {
	var img = document.createElement("img");
	img.classList.add("myImage");
	img.src = src;
	chatBox.innerHTML += "<div class='myImageContainer'></div>";
	chatBox.getElementsByClassName("myImageContainer")[chatBox.getElementsByClassName("myImageContainer").length-1].appendChild(img);
}

// Adds the name of the client to the settings container
function addClientName() {
	var nameDiv = document.createElement('div');
	nameDiv.classList.add("nameDiv");
	nameDiv.innerHTML=usrName.charAt(0);
	var clientName = document.createElement('div');
	clientName.classList.add("clientName");
	clientName.innerHTML=usrName+" (You)";
	document.getElementById("nameContainer").appendChild(nameDiv);
	document.getElementById("nameContainer").appendChild(clientName);
}

// Adds the names of the other client to the settings container
function addOtherClientName() {
	var nameDiv = document.createElement('div');
	nameDiv.classList.add("nameDiv");
	nameDiv.classList.add("otherNameDiv");
	nameDiv.innerHTML=otherUserName.charAt(0);
	var clientName = document.createElement('div');
	clientName.classList.add("clientName");
	clientName.innerHTML=otherUserName;
	document.getElementById("otherNameContainer").appendChild(nameDiv);
	document.getElementById("otherNameContainer").appendChild(clientName);
}

// Removed the other client from the settings bar when they disconnect
socket.on('User Disconnected', function() {
	var disconnectedClient = document.getElementById("otherNameContainer");
	while(disconnectedClient.firstChild) {
		disconnectedClient.removeChild(disconnectedClient.firstChild);
	}
});

// Keyboard shortcut to send the text image
document.addEventListener("keydown", function(event) {
	if(event.which == 13 && document.activeElement == textBox) {
		send();
	}
});

document.getElementById("buttonContainer").onclick = function() {
	//Handle click event for send button
	send();
}

// When the encryption switch is toggled, display notification to the user
encryptionSwitch.onchange = function() {
	//Handle click event for send button
	if(encryptionSwitch.checked){
		displayEncryptionOn();
		}else{
		displayEncryptionOff();
	}
}

document.getElementById("attachment").onclick = function() {
	//Handle click event for attachment button
	document.getElementById('myImageFile').click();
}

// Function to open the settingsBar
document.getElementById("settingsContainer").onclick = function() {
	//Handle click event for settings button
	if(settingsBar.classList.contains("settingsOpened")){
		settingsBar.classList.remove("settingsOpened");
		} else {
		settingsBar.classList.add("settingsOpened");
	}
}

// Function to convert an array to a string
function array2String(array) {
	var newString = array.join();
	return newString;
}

// Function to convert a string to an array
function string2Array(string) {
	var newArray = JSON.parse("["+string+"]");
	return newArray;
}
