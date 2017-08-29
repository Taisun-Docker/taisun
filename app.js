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

///// Guac Websocket Tunnel ////
const GuacamoleLite = require('guacamole-lite');
const websocketOptions = {
  port: 3000
};
const guacdOptions = {
  host: "172.17.0.5",
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
    if (err){
      res.send('container does not exist');
    }
    else{
      var connectionstring = encrypt({"connection":{"type":"vnc","settings":{"hostname":data.NetworkSettings.IPAddress,"port":"5900"}}});
      res.render(__dirname + '/views/guac.ejs', {token : connectionstring});
    }
  });
});

//// Development Proxy ////
var devrouter = function(req) {
    return 'http://192.168.10.13:' + req.url.replace('/dev/', '');
};
var options = {
    target: 'dynamic',
    router: devrouter,
    pathRewrite: {
        '^/dev/[0-9]{4}' : '/'
    },
    ws: true,
    changeOrigin: true,
    logLevel: 'silent'
};
var devproxy = proxy(options);
app.use('/dev**', devproxy);

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
    socket.on('createdesktop', function(name, socket){
      createdesktop(name, socket);
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
});


//// Functions ////
// Launch the container for a desktop
function createdesktop(name,socket){
  // Grab the current running docker container information
  docker.listContainers(function (err, containers) {
    if (err){
      io.emit('error_popup','Could not list containers something is wrong with docker on this host');
    }
    else{
        var desktopoptions ={
          Image: 'desktopbase',
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
