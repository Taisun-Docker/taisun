// Taisun
// Main Node.js app

//// Application Variables ////
const crypto = require('crypto');
var events = require('events');
var ejs = require('ejs');
var emitter = new events.EventEmitter();
var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Docker = require('dockerode');
var docker = new Docker({socketPath: '/var/run/docker.sock'});
var exec = require('child_process').exec;

///// Guac Websocket Tunnel ////
const GuacamoleLite = require('guacamole-lite');
const websocketOptions = {
  port: 3000
};
const guacdOptions = {
  host: "172.17.0.4",
  port: 4822
};
const clientOptions = {
  crypt: {
    cypher: 'AES-256-CBC',
    key: 'TaisunKYTaisunKYTaisunKYTaisunKY'
  },
  log: {
    verbose: false
  }
};
// Spinup the Guac websocket proxy on port 3000
const guacServer = new GuacamoleLite(websocketOptions, guacdOptions, clientOptions);
// Function needed to encrypt the token string
const encrypt = (value) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(clientOptions.crypt.cypher, clientOptions.crypt.key, iv);
  let crypted = cipher.update(JSON.stringify(value), 'utf8', 'base64');
  crypted += cipher.final('base64');
  const data = {
    iv: iv.toString('base64'),
    value: crypted
  };
  return new Buffer(JSON.stringify(data)).toString('base64');
};
// Proxy websocket requests using a path so the client can connect even behind firewalls or through a proxy


////// PATHS //////
//// Main ////
app.get("/", function (req, res) {
  res.render(__dirname + '/views/containers.ejs');
});
//// VDI ////
app.get("/vdi", function (req, res) {
  res.render(__dirname + '/views/vdi.ejs');
});
//// Public JS and CSS ////
app.use('/public', express.static(__dirname + '/public'));
//// Embedded guac ////
app.get("/desktop/:containerid", function (req, res) {
  var container = docker.getContainer(req.params.containerid);
  container.inspect(function (err, data) {
    if (err){
      res.send('container does not exist');
    }
    else{
      var connectionstring = encrypt({"connection":{"type":"vnc","settings":{"hostname":data.NetworkSettings.IPAddress,"port":"5900"}}});
      res.render(__dirname + '/views/guac.ejs', {token : connectionstring});
    }
  });
});

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
