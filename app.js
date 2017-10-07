// Taisun
// Main Node.js app

//// Application Variables ////
var request = require('request');
const crypto = require('crypto');
var events = require('events');
var ejs = require('ejs');
var emitter = new events.EventEmitter();
var express = require('express');
var app = require('express')();
var proxy = require('http-proxy-middleware');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Docker = require('dockerode');
var docker = new Docker({socketPath: '/var/run/docker.sock'});
var exec = require('child_process').exec;
const fs = require('fs');
var dockops = require('dockops');
var dockerops = dockops.createDocker();
var images = new dockops.Images(dockerops);
var containers = new dockops.Containers(dockerops);
var xparse = require('xrandr-parse');
    
///// Guac Websocket Tunnel ////
const GuacamoleLite = require('guacamole-lite');
var clientOptions = {
  crypt: {
    cypher: 'AES-256-CBC',
    key: 'TaisunKYTaisunKYTaisunKYTaisunKY'
  },
  log: {
    verbose: false
  }
};
// Spinup the Guac websocket proxy on port 3000 if guacd is running
var guacontainer = docker.getContainer('guacd');
guacontainer.inspect(function (err, containerdata) {
  // For first time users or people that do not care about VDI
  if (containerdata == null){
    console.log('Guacd does not exist on this server will not start websocket tunnel');
  }
  else {
    // Start Guacd if it exists and it not running then exit the process supervisor will pick it up
    if (containerdata.State.Status != 'running'){
      guacontainer.start(function (err, data) {
        process.exit();
      });
    }
    // If it is up and running use the IP we got from inspect to fire up the websocket tunnel used by the VDI application
    else {
      const guacServer = new GuacamoleLite({port:3000},{host:containerdata.NetworkSettings.IPAddress,port:4822},clientOptions);
    }
  }
});
// Function needed to encrypt the token string for guacamole connections
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
// ***TODO**** Proxy websocket requests using a path so the client can connect even behind firewalls or through a proxy


////// PATHS //////
//// Main ////
app.get("/", function (req, res) {
  res.render(__dirname + '/views/containers.ejs');
});
//// VDI ////
app.get("/vdi*", function (req, res) {
  var guacontainer = docker.getContainer('guacd');
  guacontainer.inspect(function (err, data) {
    if (data == null){
      fs.readFile('/usr/src/Taisun/views/body/vdi/noguac.html', function (err, data) {
        res.render(__dirname + '/views/vdi.ejs', {body : data});
      });
    }
    else{
      fs.readFile('/usr/src/Taisun/views/body/vdi/running.html', function (err, data) {
        res.render(__dirname + '/views/vdi.ejs', {body : data});
      });
    }
  });
});
//// Launch ////
app.get("/launch", function (req, res) {
  res.render(__dirname + '/views/launch.ejs');
});
//// Public JS and CSS ////
app.use('/public', express.static(__dirname + '/public'));
//// Embedded guac ////
app.get("/desktop/:containerid", function (req, res) {
  var container = docker.getContainer(req.params.containerid);
  container.inspect(function (err, data) {
    if (data == null){
      res.send('container does not exist');
    }
    else{
      var connectionstring = encrypt({"connection":{"type":"vnc","settings":{"hostname":data.NetworkSettings.IPAddress,"port":"5900"}}});
      res.render(__dirname + '/views/guac.ejs', {token : connectionstring});
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
    ///////////////////////////
    ////// Socket events //////
    ///////////////////////////
    // create a desktop
    socket.on('createdesktop', function(name,socket){
      io.emit('desktop_update','Starting Launch Process for desktop ' + name);
      // Check if the guacd image exists on this server
      images.list(function (err, res) {
        if (JSON.stringify(res).indexOf('taisun/vdi_debian:latest') > -1 ){
          createdesktop(name,socket);
        }
        else {
          console.log('imagenotfound');
          io.emit('desktop_update','Desktop image not present on server downloading now');
          docker.pull('taisun/vdi_debian:latest', function(err, stream) {
            stream.pipe(process.stdout);
            stream.once('end', createdesktop(name,socket));
          });
        }
      });
    });
    // destroy a desktop
    socket.on('destroydesktop', function(name){
      destroydesktop(name, 'no');
    });
    // resize a desktop
    socket.on('resizedesktop', function(width,height,path,monitor){
      var id = path.replace('/desktop/','');
      resizedesktop(width,height,id,monitor);
    });
    // When client requests resolutions call container xrandr
    socket.on('getres', function(path){
      var id = path.replace('/desktop/','');
      getres(id);
    });
    // Resize monitor when clients browser sends it to us
    function resizedesktop(width,height,id,monitor){
      var cmd = 'docker exec ' + id + ' /changeres.sh ' + monitor.toString() + ' ' + width.toString() + ' ' + height.toString() ;
      exec(cmd, function(err, stdout, stderr) {
        if (err){
          console.log(err);
        }
        else{
          console.log('Resized Desktop for ' + id + ' on screen ' +  monitor.toString() + ' to the dimensions ' + width.toString() + 'x' + height.toString());
        }
      });
    }
    // Get available resolutions from container
    function getres(id){
      var xcmd = 'docker exec ' + id + ' xrandr';
      exec(xcmd, function (err, stdout) {
        var resolutions = xparse(stdout);
        io.emit('sendres', resolutions);
      });
    }
    // Update the containers page
    emitter.on('updatepage', function(updatetable) {
      docker.listContainers({all: true}, function (err, containers) {
        if (err){
          io.emit('error_popup','Could not list containers something is wrong with docker on this host');
        }
        else{
          io.emit('updatepage',containers);
        }
      });
    });
    // Send local images
    socket.on('getimages', function(){
      request({url: 'http://unix:/var/run/docker.sock:/images/json', headers:{host: 'http'}}, function(err, response, body){
        io.emit('sendimages',JSON.parse(body));
      });
    });
    // Launch Guacd
    socket.on('launchguac', function(){
      io.emit('guac_update','Starting Launch Process for Guacd');
      // Check if the guacd image exists on this server
      images.list(function (err, res) {
        if (JSON.stringify(res).indexOf('glyptodon/guacd:latest') > -1 ){
          deployguac();
        }
        else {
          io.emit('guac_update','Guacd image not present on server downloading now');
          docker.pull('glyptodon/guacd:latest', function(err, stream) {
            stream.pipe(process.stdout);
            stream.once('end', deployguac);
          });
        }
      });
    });
});


//// Functions ////
// Launch Guacd container
function deployguac(){
  // Grab the current running docker container information
  docker.listContainers(function (err, containers) {
    if (err){
      io.emit('error_popup','Could not list containers something is wrong with docker on this host');
    }
    else{
        var guacoptions ={
          Image: 'glyptodon/guacd',
          name: 'guacd'
        };
        docker.createContainer(guacoptions, function (err, container){
          if (err){
            console.log(JSON.stringify(err));
            io.emit('error_popup','Could not pull Guacd container');
          }
          else{
            io.emit('guac_update','Downloaded image and created Guacd container');
            container.start(function (err, data){
              if (err){
                console.log(JSON.stringify(err));
                io.emit('error_popup','Could not start Guacd');
              }
              else{
                io.emit('guac_update','Guacd launched , Restarting server Please refresh');
                // Exit the application supervisor will restart
                process.exit();
              }
            });
          }
        });
      }
  });
}
// Launch the container for a desktop
function createdesktop(name,socket){
  // Grab the current running docker container information
  docker.listContainers(function (err, containers) {
    if (err){
      io.emit('error_popup','Could not list containers something is wrong with docker on this host');
    }
    else{
        var desktopoptions ={
          Image: 'taisun/vdi_debian',
          Cmd: ["/usr/bin/supervisord"],
          name: 'taisunvdi_' + name,
          ENV: [
            'SCREEN_RESOLUTION=1920x1080'
          ],
          HostConfig:{
            Binds: ['/var/run/docker.sock:/var/run/docker.sock'],
          }
        };
        docker.createContainer(desktopoptions, function (err, container){
          if (err){
            console.log(JSON.stringify(err));
            io.emit('error_popup','Could not launch the desktop for ' + name);
          }
          else{
            container.start(function (err, data){
              if (err){
                console.log(JSON.stringify(err));
                io.emit('error_popup','Could not launch the desktop for ' + name);
              }
              else{
                console.log('Created desktop for ' + name);
                emitter.emit('updatepage');
              }
            });
          }
        });
      }
  });
}
// Get current docker images on local machine
function getimages(){
  request({url: 'http://unix:/var/run/docker.sock:/images/json', headers:{host: 'http'}}, function(err, response, body){
    return body;
  });
}
// Destroy a desktop container set
function destroydesktop(name, auto){
  docker.listContainers({all: true}, function (err, containers) {
    if (err){
      io.emit('error_popup','Could not list containers something is wrong with docker on this host');
    }
    else{
      containers.forEach(function (container){
        if (container.Names[0] == '/taisunvdi_' + name){
          docker.getContainer(container.Id).remove({force: true},function (err, data) {
            if (err){
              console.log(JSON.stringify(err));
              io.emit('error_popup','Could destroy desktop container for ' + name);
            }
            else{
              console.log('Destroyed Desktop container for ' + name);
              emitter.emit('updatepage');
            }
          });
        }
      });
    }
  });
}

// Spin up application on port 80
http.listen(80, function(){
  console.log('listening on *:80');
});
