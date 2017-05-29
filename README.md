# EE6032-Secure-Chat-Service
Javascript application that allows two parties to chat via socket to socket communication. RSA encryption is used to mutually generate a session key between the two users. Image files and messages can then be encrypted using symmetric encryption. Uses cryptico.js for RSA encryption functionality, jsaes.js for symmetric encryption and sha.js for hashing functionality. The socket.io library is used to facilitate socket to socket communication. Node.js was used to provide server functionality.

This project was undertaken as part of the final grading requirement for UL module EE6032, taught by Dr. Thomas Newe.

N.B. This project is intended for demonstration purposes only. It cannot guarantee secure communication between users. This project utilises in-browser cryptography, generally considered insecure.

## Installation Instructions

Project is designed to allow two users on the same network to communicate. One host will be required to run the node.js server. Ensure that node.js and npm are installed on the host machine.

To run the server:
* Clone this repository to the host machine.
* In the terminal, navigate to the project directory
* Run the command `node index.js`

This should start the server running on the host computers localhost on port 3000.
The second user should then navigate to the hosts IP address at port 3000 to establish communications.

## Security Protocol
The project uses RSA encryption to mutually generate a session key, which is then used for all communication thereafter. Symmetric encryption can be toggled on or off by clicking the settings icon in the UI.

The protocol diagram for the encryption protocol implemented can be seen below:

![Protocol Diagram](https://github.com/conor-egan/EE6032-Secure-Chat-Service/blob/master/Protocol%20Diagram.png)
