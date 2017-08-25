// Taisun
// Main Node.js app

//// Application Variables ////
var events = require('events');
var emitter = new events.EventEmitter();
var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Docker = require('dockerode');
var docker = new Docker({socketPath: '/var/run/docker.sock'});
var exec = require('child_process').exec;
var vncports = [];
var guacports = [];
for (var i = 5900; i <= 5999; i++) {vncports.push(i);}
for (var i = 7900; i <= 7999; i++) {guacports.push(i);}


////// PATHS //////
//// Main ////
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});
//// Public JS and CSS ////
app.use('/public', express.static(__dirname + '/public'));


// Update the containers page
emitter.on('updatepage', function(updatetable) {
  docker.listContainers(function (err, containers) {
    if (err){
      io.emit('error_popup','Could not list containers something is wrong with docker on this host');
    }
    else{
      io.emit('updatepage',containers);
    }
  });
});

// Socket IO connection
io.on('connection', function(socket){
  //// Socket Connect ////
  // Log Client and connection time
  var clientIp = socket.request.connection.remoteAddress;
  console.log(clientIp + ' connected time=' + (new Date).getTime());
  socket.join(clientIp);
    // Select current active containers in docker and send it to the client
    emitter.emit('updatepage');
});

// Spin up application on port 80
http.listen(80, function(){
  console.log('listening on *:80');
});
