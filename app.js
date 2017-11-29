// Taisun
// Main Node.js app

//// Application Variables ////
const { spawn } = require('child_process');
var nunjucks = require('nunjucks');
var yaml = require('js-yaml');
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
let dockerHubAPI = require('docker-hub-api');
dockerHubAPI.setCacheOptions({enabled: false});

// Sleep Helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
    
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
        console.log('Guacd exists starting and restarting app via exit for nodemon to pickup');
        sleep(5000).then(() => {
          process.exit();
        });
      });
    }
    // If it is up and running use the IP we got from inspect to fire up the websocket tunnel used by the VDI application
    else {
      const guacServer = new GuacamoleLite({server: http,path:'/guaclite'},{host:containerdata.NetworkSettings.IPAddress,port:4822},clientOptions);
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
  res.sendFile(__dirname + '/public/index.html');
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
    // When container info is requested send to client
    socket.on('getcontainers', function(){
      emitter.emit('updatepage');
    });
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
            stream.once('end', function() {
              createdesktop(name,socket);
            });
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
      images.list(function (err, res) {
        io.emit('sendimages',res);
      });
    });
    // Launch Guacd
    socket.on('launchguac', function(){
      io.emit('modal_update','Starting Launch Process for Guacd');
      // Check if the guacd image exists on this server
      images.list(function (err, res) {
        if (JSON.stringify(res).indexOf('glyptodon/guacd:latest') > -1 ){
          deployguac();
        }
        else {
          io.emit('modal_update','Guacd image not present on server downloading now');
          docker.pull('glyptodon/guacd:latest', function(err, stream) {
            stream.pipe(process.stdout);
            stream.once('end', deployguac);
          });
        }
      });
    });
    // Get Docker Hub results
    socket.on('searchdocker', function(string, page){
      request.get({url:'https://registry.hub.docker.com/v1/search?q=' + string + '&page=' + page},function(error, response, body){
        io.emit('hubresults',JSON.parse(body));
      });
    });
    // Get complete dockerhub info for given image
    socket.on('gethubinfo', function(name){
      if (name.indexOf("/") != -1 ){
        var user = name.split('/')[0];
        var repo = name.split('/')[1];
      }
      else {
        var user = '_';
        var repo = name;
      }
      dockerHubAPI.repository(user, repo).then(function (info) {
        io.emit('sendhubinfo', info);
      });
    });
    // Get the tags for a specific image from dockerhub
    socket.on('gettags', function(name){
      var user = name.split('/')[0];
      var repo = name.split('/')[1];
      dockerHubAPI.tags(user, repo).then(function (data) {
        io.emit('sendtagsinfo', [data, name]);
      });
    });
    // Pull image
    socket.on('sendpullcommand', function(image){
      io.emit('sendpullstart', 'Starting Pull process for ' + image);
      console.log('Pulling ' + image);
      docker.pull(image, function(err, stream) {
        docker.modem.followProgress(stream, onFinished, onProgress);
        function onProgress(event) {
          io.emit('sendpulloutput', JSON.stringify(event));
        }
        function onFinished(err, output) {
          io.emit('sendpulloutputdone', 'Finished Pull process for ' + image);
          console.log('Finished Pulling ' + image);
        }       
      });
    });
    // Get Taisun.io stacks from json dump
    socket.on('getstacks', function(page){
      request.get({url:'http://localhost/public/stackstemp/stacks.json'},function(error, response, body){
        io.emit('stacksresults',JSON.parse(body));
      });
    });
    // Parse Taisun Stacks Yaml and send form to client
    socket.on('sendstackurl', function(url){
      request.get({url:url},function(error, response, body){
        var yml = yaml.safeLoad(body);
        var name = yml.name;
        var description = yml.description;
        var form = yml.form;
        io.emit('stackurlresults', [name,description,form,url]);
      });
    });
    // Parse Taisun Stacks Yaml and send form to client
    socket.on('sendimagename', function(imagename){
      request.get({url:'http://localhost/public/stackstemp/basetemplate.yml'},function(error, response, body){
        var yml = yaml.safeLoad(body);
        var name = yml.name;
        var description = yml.description;
        var form = yml.form;
        form.push({type:'input',format:'text',label:'image',FormName:'Image',placeholder:'',value:imagename});
        io.emit('stackurlresults', [name,description,form,'http://localhost/public/stackstemp/basetemplate.yml']);
      });
    });
    // When user submits stack data launch the stack
    socket.on('launchstack', function(userinput){
      var url = userinput.stackurl;
      var inputs = userinput.inputs;
      request.get({url:url},function(error, response, body){
        var yml = yaml.safeLoad(body);
        var compose = yml.compose;
        var composefile = nunjucks.renderString(compose, inputs);
        console.log(composefile);
        var composecommand = ['sh','-c','echo \'' + composefile + '\' | docker-compose -f - up -d'];
        const composeup = spawn('unbuffer', composecommand);
        composeup.stdout.setEncoding('utf8');
        composeup.stdout.on('data', (data) => {
          socket.emit('stackupdate',data);
        });
        composeup.on('close', (code) => {
          socket.emit('stacklaunched','Compose up process exited with code ' + code);
          emitter.emit('updatepage');
        });
      });
    });
    socket.on('checkguac', function(){
      var guacontainer = docker.getContainer('guacd');
      guacontainer.inspect(function (err, data) {
        if (data == null){
          io.emit('rendervdi', 'no');
        }
        else{
          io.emit('rendervdi', 'yes');
        }
      });
    });
    socket.on('getguacinfo', function(){
      var guacontainer = docker.getContainer('guacd');
      guacontainer.inspect(function (err, data) {
        if (data == null){
          io.emit('guacinfo', 'Error Getting GuacD infor');
        }
        else{
          io.emit('guacinfo', data);
        }
      });
    });
    // When the user checks the status of the remote gateway send it back
    socket.on('checkremote', function(){
      var remotecontainer = docker.getContainer('taisun_gateway');
      remotecontainer.inspect(function (err, data) {
        if (data == null){
          io.emit('renderremote', 'no');
        }
        else{
          var cmd = 'docker exec taisun_gateway ovpn_getclient taisun';
          exec(cmd, function (err, stdout) {
            var clientconfig = stdout;
            io.emit('renderremote', [data,clientconfig]);
          });
        }
      });
    });
    // When the user checks the status of portainer
    socket.on('checkportainer', function(){
      var portainercontainer = docker.getContainer('taisun_portainer');
      portainercontainer.inspect(function (err, data) {
        if (data == null){
          io.emit('renderportainer', 'no');
        }
        else{
          io.emit('renderportainer', data);
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
            io.emit('modal_update','Downloaded image and created Guacd container');
            container.start(function (err, data){
              if (err){
                console.log(JSON.stringify(err));
                io.emit('error_popup','Could not start Guacd');
              }
              else{
                io.emit('modal_finish','Guacd launched , Restarting server Please refresh');
                // Exit the application supervisor will restart
                process.exit();
              }
            });
          }
        });
      }
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
