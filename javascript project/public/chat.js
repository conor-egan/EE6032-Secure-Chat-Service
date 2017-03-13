var settingsBar = document.getElementsByClassName("settingsBar")[0];
var socket = io();

var myMessage;
var textBox = document.getElementById("textInput");
var chatBox = document.getElementById("chatArea");
var usrName;

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
	var shaObj = new jsSHA("SHA-1", "TEXT");
	shaObj.update(myMessage);
	var hash = shaObj.getHash("HEX");
	console.log(sha1(myMessage));
	textBox.value = "";
	socket.emit("chat message", myMessage);
	displayMyMessage(myMessage);
	}
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
