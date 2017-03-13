var settingsBar = document.getElementsByClassName("settingsBar")[0];
var socket = io();

var myMessage;
var textBox = document.getElementById("textInput");
var chatBox = document.getElementById("chatArea");
var usrName;

var Passphrase = "usrName";
var bits = 1024;
var myRSAKey = cryptico.generateRSAKey(Passphrase, bits);
var myPublicKeyString = cryptico.publicKeyString(myRSAKey);

var samplePublicKey = "uXjrkGqe5WuS7zsTg6Z9DuS8cXLFz38ue+xrFzxrcQJCXtVccCoUFP2qH/AQ4qMvxxvqkSYBpRm1R5a4/NdQ5ei8sE8gfZEq7dlcR+gOSv3nnS4/CX1n5Z5m8bvFPF0lSZnYQ23xlyjXTaNacmV0IuZbqWd4j9LfdAKq5dvDaoE=";

function rsaEncrypt(message, targetPublicKey) {
	var EncryptionResult = cryptico.encrypt(message, targetPublicKey);
	console.log(EncryptionResult.cipher);
	return EncryptionResult.cipher;
}

function rsaDecrypt(message, myRSAKey) {
	var EncryptionResult = cryptico.decrypt(message, targetPublicKey);
	console.log(EncryptionResult.plaintext);
	return EncryptionResult.plaintext;
}

function aesEncrypt(message) {
	AES_Init();

	var key = new Array(16);
	for(var i = 0; i < 16; i++)
	key[i] = i;
	
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
	//Handle click event for send button
	console.log("Attachment pressed");
	document.getElementById('myImageFile').click();
}

function enterUserName() {
	usrName = prompt("Enter your username");
	console.log(usrName);
}

function readImageFile(input) {
	if (input.files && input.files[0]) {
		var fileName = input.files[0];
        var reader = new FileReader();

        reader.onload = function (e) {
            var src = e.target.result;
            displayMyImage(src);
            sendFile(fileName,src);
        };

        reader.readAsDataURL(fileName);
    }
}

function displayImage(src) {
	var img = document.createElement("img");
        img.classList.add("image");
        img.src = src;
        chatBox.innerHTML += "<div class='imageContainer'></div>";
        console.log(chatBox.getElementsByClassName("imageContainer").length);
        chatBox.getElementsByClassName("imageContainer")[chatBox.getElementsByClassName("imageContainer").length-1].appendChild(img);
}

function displayMyImage(src) {
	var img = document.createElement("img");
        img.classList.add("myImage");
        img.src = src;
        chatBox.innerHTML += "<div class='myImageContainer'></div>";
        console.log(chatBox.getElementsByClassName("myImageContainer").length);
        chatBox.getElementsByClassName("myImageContainer")[chatBox.getElementsByClassName("myImageContainer").length-1].appendChild(img);
}

function sendFile(file,data){

        var msg ={};
        msg.username = usrName;
        msg.file = data;
        msg.fileName = file.name;
        console.log(msg.fileName);
        socket.emit('base64 file', msg);
}

socket.on('chat message', function(msg){
    displayMessage(msg);
  });
  
socket.on('base64 file', function(msg) {
	displayImage(msg.file);
  });

function sha1(message) {
	var shaObj = new jsSHA("SHA-1", "TEXT");
	shaObj.update(message);
	var hash = shaObj.getHash("HEX");
	return hash;
}

function send() {
	if(textBox.value != "") {
	myMessage = textBox.value;
	console.log(sha1(myMessage));
	textBox.value = "";
	socket.emit("chat message", myMessage);
	displayMyMessage(myMessage);
	aesEncrypt(myMessage);
	rsaEncrypt(myMessage,samplePublicKey);
	}
}

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
document.addEventListener("keydown", function(event) {
	if(event.which == 13 && document.activeElement == textBox) {
		send();
	}
});

document.getElementById("settingsContainer").onclick = function() {
	//Handle click event for settings button
	console.log("Settings button pressed");
	if(settingsBar.classList.contains("settingsOpened")){
		settingsBar.classList.remove("settingsOpened");
} else {
	settingsBar.classList.add("settingsOpened");
}
}
