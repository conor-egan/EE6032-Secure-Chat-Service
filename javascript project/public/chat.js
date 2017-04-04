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

function start(){
	usrName = prompt("Enter your username");
	addClientName();
	Passphrase = prompt("Enter a passphrase for encryption");
	myNonce = createNonce();
	myRSAKey = cryptico.generateRSAKey(Passphrase, bits);
	myPublicKey = cryptico.publicKeyString(myRSAKey);
	sendPublicKey(myPublicKey);
	console.log("Client: "+usrName+" has completed start()");
	
}

function createNonce() {
	var array = [];
	for(i=0;i<8;i++) {
		array.push(Math.round(Math.random()*255));
	}
	return array;
	console.log("Nonce Successfully created");
}

function sendPublicKey(key) {
	var publicKeyExchange = {};
	publicKeyExchange.publicKey = key;
	publicKeyExchange.hashedKey = sha1(key);
	publicKeyExchange.userName = usrName;
	publicKeyExchange.hashedUserName = sha1(usrName);
	socket.emit('public key', publicKeyExchange);
	console.log("Public key sent");
}

socket.on('public key', function(publicKeyReceived) {
	if(otherPublicKey != publicKeyReceived.publicKey){
	    sendPublicKey(myPublicKey);
		// console.log('Other users public key: '+ publicKeyReceived.publicKey);
		otherPublicKey = publicKeyReceived.publicKey;
		
		var HashKey = publicKeyReceived.hashedKey;
		if(sha1(otherPublicKey) == HashKey&&sha1(publicKeyReceived.userName)==publicKeyReceived.hashedUserName) {
			console.log('Integrity of key exists');
			otherUserName = publicKeyReceived.userName;
			addOtherClientName();
		}
	}
	else {
		// Protocol Step 1 
		var msg = {};
		var cipher = cryptico.encrypt(array2String(myNonce), otherPublicKey);
		msg.nonce = cipher.cipher;
		var hashed = cryptico.encrypt(sha1(array2String(myNonce)), otherPublicKey, myRSAKey);
		msg.hashed = hashed.cipher;
		socket.emit('ProtocolStep1', msg);
		console.log("Client "+usrName+" has emitted step1");
	}	
});

// On receiving ProtocolStep1, emit step2
socket.on('ProtocolStep1', function(Protocol1Received){
	console.log("Entering receive protocolStep1");
	var nonceReceived = cryptico.decrypt(Protocol1Received.nonceReceived, myRSAKey);
	console.log(nonceReceived.plaintext);
	var nonceArray = string2Array(nonceReceived.plaintext);
	var hashedNonceReceived = cryptico.decrypt(Protocol1Received.hashedNonce, myRSAKey);
	// console.log("Nonce received: "+ nonceArray);
	if(sha1(nonceReceived.plaintext) != hashedNonceReceived.plaintext ){
		console.log("Nonce has been tampered with");
		} else {
		console.log("Nonce hash is intact");
		if(hashedNonceReceived.signature=="verified"){
			console.log("Nonce signature is verified");
			// Create session key with my nonce and nonceReceived
			console.log("Client "+usrName+" is emitting protocolStep3");
			sharedSecretKey = createSessionKey(myNonce, nonceArray);
			protocolStep3(nonceArray);
		} else {console.log("Nonce signature is not verified");}
	}
});

function protocolStep3(receivedNonce) {
	console.log(array2String(myNonce));
	var step3Msg = {};
	step3Msg.myNonce = cryptico.encrypt(array2String(myNonce), otherPublicKey).cipher;
	console.log("My nonce cipher: "+step3Msg.myNonce+" type: "+typeof(step3Msg.myNonce));
	step3Msg.nonceReceived = cryptico.encrypt(aesEncrypt(array2String(receivedNonce),sharedSecretKey), otherPublicKey).cipher;
	step3Msg.hashedNonce = cryptico.encrypt(sha1(array2String(myNonce)), otherPublicKey, myRSAKey).cipher;
	step3Msg.hashedResponse = cryptico.encrypt(sha1(aesEncrypt(array2String(receivedNonce),sharedSecretKey)), otherPublicKey, myRSAKey).cipher;
	console.log("Step3Msg: "+step3Msg+" type: "+typeof(step3Msg));
	socket.emit('nonce package', step3Msg);
	console.log("Step3 Emitted successfully");
}

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

socket.on('nonce package', function(noncePackageReceived){
	//~ console.log(noncePackageReceived.otherNonce.plaintext);
	var otherNonce = cryptico.decrypt(noncePackageReceived.otherNonce,myRSAKey).plaintext;
	otherUserNonce = string2Array(otherNonce);
	var AESResponse = cryptico.decrypt(noncePackageReceived.response,myRSAKey).plaintext;
	var hashedOtherUserNonce = cryptico.decrypt(noncePackageReceived.hashedNonce, myRSAKey).plaintext;
	var signature1 = cryptico.decrypt(noncePackageReceived.hashedNonce, myRSAKey).signature;
	var hashedAESResponse = cryptico.decrypt(noncePackageReceived.hashedResponse, myRSAKey).plaintext;
	var signature2 = cryptico.decrypt(noncePackageReceived.hashedResponse, myRSAKey).signature;
	if(sha1(otherNonce)==hashedOtherUserNonce&&sha1(AESResponse)==hashedAESResponse){
		console.log("Hashes are intact");
		if(signature1=="verified"&&signature2=="verified") {
			console.log("Signatures are verified");
			sharedSecretKey = createSessionKey(otherUserNonce,myNonce);
			if(decrypt(AESResponse, sharedSecretKey)==array2String(myNonce)){
				console.log("Session key matches for both clients");
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
	var textBytes = aesjs.utils.utf8.toBytes(message);
	var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter());
	var encryptedBytes = aesCtr.encrypt(textBytes);
	var encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
	return encryptedHex;
}

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

// Funtion to send a chat message
function send() {
	if(textBox.value != "") { // if textBox is not empty
		if(encryptionSwitch.checked) {
			console.log("Encryption is on");
			var myMessage = textBox.value; // get the textBox contents
			textBox.value = "";		// clear the textBox
			var encryptedMsg = aesEncrypt(myMessage, sharedSecretKey);
			var msg = {};
			msg.encryptFlag = sha1("1");
			msg.encryptedMsg = encryptedMsg;
			socket.emit("chat message", msg);	//Emit the text message
			displayMyMessage(myMessage);		// Display my message
			} else {
			console.log("Encryption is off");
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
socket.on('chat message', function(msg){
	otherUserFlag = msg.otherUserFlag;
	if(otherUserFlag == sha1("1")) {
		var decryptedMsg = decrypt(msg.message, sharedSecretKey);
		displayMessage(decryptedMsg);
		} else if(otherUserFlag == sha1("0")){
		displayMessage(msg.message);
	}
    
});

function displayMyMessage(message) {
	chatBox.innerHTML += "<div class='myMessage'>"+message+"</div>";
}

function displayMessage(message) {
	chatBox.innerHTML += "<div class='message'>"+message+"</div>";
}

function displayEncryptionOn() {
	chatBox.innerHTML += "<div class='encryptOn'>Encryption is now on. Your messages are secure.</div>";
}

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
	console.log(msg.fileName);
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
	console.log("Attachment pressed");
	document.getElementById('myImageFile').click();
}

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

function array2String(array) {
	var newString = array.join();
	return newString;
}
function string2Array(string) {
	var newArray = JSON.parse("["+string+"]");
	return newArray;
}
