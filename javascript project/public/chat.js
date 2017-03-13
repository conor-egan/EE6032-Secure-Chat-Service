var settingsBar = document.getElementsByClassName("settingsBar")[0];
var socket = io();

var myMessage;
var textBox = document.getElementById("textInput");
var chatBox = document.getElementById("chatArea");

document.getElementById("buttonContainer").onclick = function() {
	//Handle click event for send button
	send();
}

document.getElementById("attachment").onclick = function() {
	//Handle click event for send button
	console.log("Attachment pressed");
	document.getElementById('myImageFile').click();
}

function readImageFile(input) {
	if (input.files && input.files[0]) {
        var reader = new FileReader();
        var img = document.createElement("img");
        img.classList.add("myImage");

        reader.onload = function (e) {
            img.src = e.target.result;
        };

        reader.readAsDataURL(input.files[0]);
        chatBox.innerHTML += "<div class='imageContainer'></div>";
        console.log(chatBox.getElementsByClassName("imageContainer").length);
        chatBox.getElementsByClassName("imageContainer")[chatBox.getElementsByClassName("imageContainer").length-1].appendChild(img);
    }
}

socket.on('chat message', function(msg){
    displayMessage(msg);
  });

function send() {
	if(textBox.value != "") {
	myMessage = textBox.value;
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
