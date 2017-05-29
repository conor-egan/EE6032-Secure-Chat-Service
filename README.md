# EE6032-Secure-Chat-Service
Javascript application that allows two parties to chat via socket to socket communication. RSA encryption is used to mutually generate a session key between the two users. Image files and messages can then be encrypted using symmetric encryption. Uses cryptico.js for RSA encryption functionality, jsaes.js for symmetric encryption and sha.js for hashing functionality. The socket.io library is used to facilitate socket to socket communication. Node.js was used to provide server functionality.

This project was undertaken as part of the final grading requirement for UL module EE6032, taught by Dr. Thomas Newe.

N.B. This project is intended for demonstration purposes only. It cannot guarantee secure communication between users. This project utilises in-browser cryptography, generally considered insecure.

## Project Specification

i
