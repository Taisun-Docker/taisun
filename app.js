// Taisun
// Main Node.js app

//// Application Variables ////
const uuidv4 = require('uuid/v4');
const { spawn } = require('child_process');
const si = require('systeminformation');
var gitClone = require('git-clone');
var rmdir = require('rmdir');
var tar = require('tar-fs');
var AU = require('ansi_up');
var stream = require('stream');
var ansi_up = new AU.default;
var nunjucks = require('nunjucks');
var yaml = require('js-yaml');
var request = require('request');
const crypto = require('crypto');
var ejs = require('ejs');
var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Docker = require('dockerode');
var docker = new Docker({socketPath: '/var/run/docker.sock'});
var exec = require('child_process').exec;
var dockops = require('dockops');
var dockerops = dockops.createDocker();
var images = new dockops.Images(dockerops);
var xparse = require('xrandr-parse');
var fs = require('fs');
var path = require('path');
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
  if (err) return;
  // For first time users or people that do not care about VDI
  if (containerdata == null){
    console.log('Guacd does not exist on this server will not start websocket tunnel');
    startstacks();
  }
  else {
    // Start Guacd if it exists and it not running then exit the process supervisor will pick it up
    if (containerdata.State.Status != 'running'){
      guacontainer.start(function (err, data) {
        if (err) return;
        console.log('Guacd exists starting and restarting app via exit for nodemon to pickup');
        sleep(5000).then(() => {
          process.exit();
        });
      });
    }
    // If it is up and running use the IP we got from inspect to fire up the websocket tunnel used by the VDI application
    else {
      const guacServer = new GuacamoleLite({server: http,path:'/guaclite'},{host:containerdata.NetworkSettings.IPAddress,port:4822},clientOptions);
      startstacks();
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

// Start all Taisun Stack containers
function startstacks(){
  docker.listContainers({all: true}, function (err, containers) {
    if (err){
      console.log(err);
    }
    else{
      containers.forEach(function(container){
        // If the container has a stackname label assume it is a taisun container
        if (container.Labels.stackname){
          // If the container is not running
          if (container.State != 'running'){
            var contostart = docker.getContainer(container.Id);
            contostart.start();
            console.log('Started ' + container.Names[0] + ' time=' + (new Date).getTime());
          }
        }
      });
    }
  });
}

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
  // Make sure this is a container
  container.inspect(function (err, data) {
    if (data == null){
      res.send('container does not exist');
    }
    else{
      var labels = data.Config.Labels;
      if (typeof labels.vditype != 'undefined' && labels.vditype == 'RDP' ){
        var connectionstring = encrypt(
          {
            "connection":{
              "type":"rdp",
              "settings":{
                "hostname":data.NetworkSettings.IPAddress,
                "port":"3389",
                "username":"abc",
                "password":"taisun",
                "security": "any",
                "ignore-cert": true
              }
            }
          });
        res.render(__dirname + '/views/rdp.ejs', {token : connectionstring});
      }
      else {
        var connectionstring = encrypt(
          {
            "connection":{
              "type":"vnc",
              "settings":{
                "hostname":data.NetworkSettings.IPAddress,
                "port":"5900"
              }
            }
          });
        res.render(__dirname + '/views/guac.ejs', {token : connectionstring});
      }
    }
  });
});
//// Embedded VNC ////
app.get("/VNC/:containerid", function (req, res) {
  var container = docker.getContainer(req.params.containerid);
  // Make sure this is a container
  container.inspect(function (err, data) {
    if (data == null){
      res.send('container does not exist');
    }
    else{
      var labels = data.Config.Labels;
      var connectionstring = encrypt(
        {
          "connection":{
            "type":"vnc",
            "settings":{
              "hostname":labels.host,
              "port":labels.port,
              "username":labels.host,
              "password":labels.password
            }
          }
        });
      console.log(connectionstring);
      res.render(__dirname + '/views/vnc.ejs', {token : connectionstring});
    }
  });
});
//// Embedded RDP ////
app.get("/RDP/:containerid", function (req, res) {
  var container = docker.getContainer(req.params.containerid);
  // Make sure this is a container
  container.inspect(function (err, data) {
    if (data == null){
      res.send('container does not exist');
    }
    else{
      var labels = data.Config.Labels;
      var connectionstring = encrypt(
        {
          "connection":{
            "type":"rdp",
            "settings":{
              "hostname":labels.host,
              "port":labels.port,
              "username":labels.user,
              "password":labels.password,
              "security": "any",
              "ignore-cert": true
            }
          }
        });
      console.log(connectionstring);
      res.render(__dirname + '/views/rdp.ejs', {token : connectionstring});
    }
  });
});
//// Terminal Emulator ////
app.get("/terminal/:containerid", function (req, res) {
  var container = docker.getContainer(req.params.containerid);
  // Make sure this is a container
  container.inspect(function (err, data) {
    if (data == null){
      res.send('container does not exist');
    }
    // If this is a tmux container attach to the running session
    else if ( JSON.stringify(data.Config.Labels).indexOf('taisuntmux.yml') > -1 ) {
      res.render(__dirname + '/views/terminal.ejs', {containerid : req.params.containerid,shell : 'tmux'});
    }
    else{
      // Shell check
      var options = {
        Cmd: ['/bin/sh', '-c', 'test -e /bin/bash'],
        AttachStdout: true,
        AttachStderr: true
      };
      container.exec(options, function(err, exec) {
        if (err) return;
        exec.start(function(err, stream) {
          if (err) return;
          container.modem.demuxStream(stream, process.stdout, process.stderr);
          stream.on('end', function(output){
            exec.inspect(function(err, data) {
              if (err) return;
              if (data.ExitCode == 0){
                res.render(__dirname + '/views/terminal.ejs', {containerid : req.params.containerid,shell : '/bin/bash'});
              }
              else{
                res.render(__dirname + '/views/terminal.ejs', {containerid : req.params.containerid,shell : '/bin/sh'});
              }
            });
          });
        });
      });
    }
  });
});
//// Api ////
// Container data
app.get("/containers", function (req, res) {
  docker.listContainers({all: true}, function (err, containers) {
    if (err){
      res.send(JSON.stringify({'error':'cannot access docker on taisun'}));
    }
    else{
      res.send(JSON.stringify(containers));
    }
  });
});


// Socket IO connection
io.on('connection', function(socket){
  //// Socket Connect ////
  // Log Client and connection time
  console.log(socket.id + ' connected time=' + (new Date).getTime());
  socket.join(socket.id);
  ///////////////////////////
  ////// Socket events //////
  ///////////////////////////
  // When dash info is requested send to client
  socket.on('getdashinfo', function(){
    var dashinfo = {};
    si.cpu(function(cpu) {
      dashinfo['cpu'] = cpu;
      si.mem(function(mem) {
        dashinfo['mem'] = mem;
        si.currentLoad(function(currentLoad) {
          dashinfo['CPUpercent'] = currentLoad.currentload_user;
          docker.listContainers({all: true}, function (err, containers) {
            if (err){
              io.sockets.in(socket.id).emit('renderdash',dashinfo);
            }
            else{
              dashinfo['containers'] = containers;
              images.list(function (err, images) {
                if (err) return;
                dashinfo['images'] = images;
                io.sockets.in(socket.id).emit('renderdash',dashinfo);
              });
            }
          });
        });
      });
    });
  });
  //// VDI related
  // When vdi info is requested send to client
  socket.on('getvdi', function(){
    containerinfo('updatevdi');
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
  // Send local images
  socket.on('getimages', function(){
    images.list(function (err, res) {
      if (err) return;
      io.sockets.in(socket.id).emit('sendimages',res);
    });
  });
  // Launch Guacd
  socket.on('launchguac', function(){
    io.sockets.in(socket.id).emit('modal_update','Starting Launch Process for Guacd');
    // Check if the guacd image exists on this server
    images.list(function (err, res) {
      if (err) return;
      if (JSON.stringify(res).indexOf('linuxserver/guacd:latest') > -1 ){
        deployguac();
      }
      else {
        io.sockets.in(socket.id).emit('modal_update','Guacd image not present on server downloading now');
        docker.pull('linuxserver/guacd:latest', function(err, stream) {
          if (err) return;
          stream.pipe(process.stdout);
          stream.once('end', deployguac);
        });
      }
    });
  });
  // Get Docker Hub results
  socket.on('searchdocker', function(string, page){
    request.get({url:'https://registry.hub.docker.com/v1/search?q=' + string + '&page=' + page},function(error, response, body){
      io.sockets.in(socket.id).emit('hubresults',JSON.parse(body));
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
      io.sockets.in(socket.id).emit('sendhubinfo', info);
    });
  });
  // Get the tags for a specific image from dockerhub
  socket.on('gettags', function(name){
    var user = name.split('/')[0];
    var repo = name.split('/')[1];
    dockerHubAPI.tags(user, repo).then(function (data) {
      io.sockets.in(socket.id).emit('sendtagsinfo', [data, name]);
    });
  });
  // Pull image
  socket.on('sendpullcommand', function(image){
    io.sockets.in(socket.id).emit('senddockerodeoutstart', 'Starting Pull process for ' + image);
    console.log('Pulling ' + image);
    docker.pull(image, function(err, stream) {
      if (err) return;
      docker.modem.followProgress(stream, onFinished, onProgress);
      function onProgress(event) {
        io.sockets.in(socket.id).emit('senddockerodeout', event);
      }
      function onFinished(err, output) {
        if (err) return;
        io.sockets.in(socket.id).emit('senddockerodeoutdone', 'Finished Pull process for ' + image);
        console.log('Finished Pulling ' + image);
      }
    });
  });
  // Get Taisun.io stacks running locally
  socket.on('getstacks', function(){
    containerinfo('localstacks');
  });
  // Get remote list of stack definition files from stacks.taisun.io
  socket.on('browsestacks', function(page){
    request.get({url:'https://api.taisun.io/stacks'},function(error, response, body){
      io.sockets.in(socket.id).emit('stacksresults',JSON.parse(body));
    });
  });
  // Get Stack search results
  socket.on('searchstacks', function(string, page){
    request.get({url:'https://api.taisun.io/stacks?search=' + string + '&page=' + page},function(error, response, body){
      io.sockets.in(socket.id).emit('stacksresults',JSON.parse(body));
    });
  });
  // Parse Taisun Stacks Yaml and send form to client
  socket.on('sendstackurl', function(url){
    if (url.substring(0,4) == 'http'){
      request.get({url:url},function(error, response, body){
        var yml = yaml.safeLoad(body);
        var name = yml.name;
        var description = yml.description;
        var form = yml.form;
        io.sockets.in(socket.id).emit('stackurlresults', [name,description,form,url,body]);
      });
    }
    // Try to grab a dockerhub endpoint for stack data if this is not a URL
    else{
      renderprivatestack(url);
    }
  });
  // Parse Yaml for single container and send to user
  socket.on('sendimagename', function(imagename){
    request.get({url:'http://localhost:3000/public/taisuntemplates/basetemplate.yml'},function(error, response, body){
      var yml = yaml.safeLoad(body);
      var name = yml.name;
      var description = yml.description;
      var form = yml.form;
      form.push({type:'input',format:'text',label:'image',FormName:'Image',placeholder:'',value:imagename});
      io.sockets.in(socket.id).emit('stackurlresults', [name,description,form,'http://localhost:3000/public/taisuntemplates/basetemplate.yml',body]);
    });
  });
  // Get custom Yaml from user and create a temp file for using the standard workflow
  socket.on('sendyaml', function(code){
    var guid = uuidv4().substring(0,12);
    var file = path.join(__dirname, 'public/stackstemp/', guid + '.yml');
    fs.writeFile(file, code, function(err) {
      if(err) {
        return console.log(err);
      }
      var yml = yaml.safeLoad(code);
      var name = yml.name;
      var description = yml.description;
      var form = yml.form;
      io.sockets.in(socket.id).emit('stackurlresults', [name,description,form,'http://localhost:3000/public/stackstemp/' + guid + '.yml',code]);
    });
  });
  // When user submits stack data launch the stack
  socket.on('launchstack', function(userinput){
    var url = userinput.stackurl;
    var inputs = userinput.inputs;
    var template = userinput.template;
    var templatename = url.split('/').slice(-1)[0];
    var stacktype = 'community';
    inputs['stacktype'] = stacktype;
    inputs['stackurl'] = url;
    if (inputs.name){
      inputs['stackname'] = inputs.name;
    }
    else {
      inputs['stackname'] = uuidv4().substring(0,8);
    }
    var yml = yaml.safeLoad(template);
    var compose = yml.compose;
    var composefile = nunjucks.renderString(compose, inputs);
    var composeupcommand = ['sh','-c','echo \'' + composefile + '\' | docker-compose -p '+ inputs.stackname+' -f - up -d'];
    var composepullcommand = ['sh','-c','echo \'' + composefile + '\' | docker-compose -p '+ inputs.stackname+' -f - pull'];
    const composepull = spawn('unbuffer', composepullcommand);
    composepull.stdout.setEncoding('utf8');
    composepull.stdout.on('data', (data) => {
      io.sockets.in(socket.id).emit('sendconsoleout',ansi_up.ansi_to_html(data).trim());
    });
    composepull.on('close', (code) => {
      if (code != '0'){
        destroystack(inputs.stackname);
        io.sockets.in(socket.id).emit('sendconsoleoutdone','Compose pull process exited with code ' + code);
      }
      else{
        const composeup = spawn('unbuffer', composeupcommand);
        composeup.stdout.setEncoding('utf8');
        composeup.stdout.on('data', (data) => {
          io.sockets.in(socket.id).emit('sendconsoleout',ansi_up.ansi_to_html(data).trim());
        });
        composeup.on('close', (code) => {
          io.sockets.in(socket.id).emit('sendconsoleoutdone','Compose up process exited with code ' + code);
          containerinfo('updatestacks');
          if (code != '0'){
            destroystack(inputs.stackname);
          }
          if (stacktype == 'community' && url.indexOf('https://stacks.taisun.io/templates/') > -1){
            var guid = templatename.replace('.yml','');
            request.get({url:'https://api.taisun.io/stacks/download?guid=' + guid},function(error, response, body){
              console.log('updated download count for stack ' + guid);
            });
          }
        });
      }
    });
  });
  // Get GuacD full container information and render VDI page based on status
  socket.on('checkguac', function(return_name){
    var guacontainer = docker.getContainer('guacd');
    guacontainer.inspect(function (err, data) {
      if (data == null){
        io.sockets.in(socket.id).emit(return_name, 'no');
      }
      else{
        io.sockets.in(socket.id).emit(return_name, 'yes');
      }
    });
  });
  // Send GuacD container info to client
  socket.on('getguacinfo', function(){
    var guacontainer = docker.getContainer('guacd');
    guacontainer.inspect(function (err, data) {
      if (data == null){
        io.sockets.in(socket.id).emit('guacinfo', 'Error Getting GuacD infor');
      }
      else{
        io.sockets.in(socket.id).emit('guacinfo', data);
      }
    });
  });
  // When the user checks the status of the remote gateway send it back
  socket.on('checkremote', function(){
    var remotecontainer = docker.getContainer('taisun_gateway');
    remotecontainer.inspect(function (err, data) {
      if (data == null){
        io.sockets.in(socket.id).emit('renderremote', 'no');
      }
      else{
        io.sockets.in(socket.id).emit('renderremote', data);
        containerinfo('updategateway');
      }
    });
  });
  // When devstacks info is requested send to client
  socket.on('getdev', function(){
    containerinfo('updatedev');
  });
  // When termstacks info is requested send to client
  socket.on('getterm', function(){
    containerinfo('updateterm');
  });
  // When rdpvnc info is requested send to client
  socket.on('getrdpvnc', function(){
    containerinfo('updaterdbvnc');
  });
  // When stack destruction is requested initiate
  socket.on('destroystack', function(name){
    destroystack(name, 'no');
  });
  // When Upgrade is requested launch upgrade helper
  socket.on('upgradetaisun', function(){
    upgradetaisun();
  });
  // When version is requested send
  socket.on('getversion', function(){
    fs.readFile('version', 'utf8', function (err, version) {
      if (err) return;
      var taisunversion = version;
      io.sockets.in(socket.id).emit('sendversion', taisunversion);
    });
  });
  // When Stack Upgrade is requested execute
  socket.on('upgradestack', function(stackname){
    upgradestack(stackname);
  });
  // When Stack Restart is requested execute
  socket.on('restartstack', function(stackname){
    restartstack(stackname);
  });
  // When Stack Stop is requested execute
  socket.on('stopstack', function(stackname){
    stopstack(stackname);
  });
  // When Stack Start is requested execute
  socket.on('startstack', function(stackname){
    startstack(stackname);
  });
  // When Stack Logs are requested execute
  socket.on('containerlogs', function(containerid){
    containerlogs(containerid);
  });
  // When build from git is requested execute
  socket.on('builddockergit', function(formdata){
    var repo = formdata[0];
    var path = formdata[1];
    var checkout = formdata[2];
    var tag = formdata[3];
    builddockergit(repo,path,checkout,tag);
  });
  // When user chooses to push a stack template to dockerhub execute
  socket.on('buildencrypto', function(formdata){
    var tag = formdata[0];
    var template = formdata[1];
    var dockeruser = formdata[2];
    var dockerpass = formdata[3];
    var pass = uuidv4();
    buildencrypto(tag,pass,template,dockeruser,dockerpass);
  });
  // When the user requests a remote access check ping the port checker with the URL
  socket.on('checkremoteaccess', function(domain){
    var url = 'https://api.taisun.io/server/portcheck?host=' + domain;
    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        io.sockets.in(socket.id).emit('sendremotestatus', JSON.parse(body));
      }
    });
  });
  // Get Taisun.io stacks running locally for stack management
  socket.on('getmanage', function(){
    containerinfo('manageinfo');
  });
  // Container Terminal access
  socket.on('spawnterm', function(containerid, w, h, shell){
    console.log('Spawning terminal on ' + containerid);
    var container = docker.getContainer(containerid);
    if (shell != 'tmux'){
      var cmd = {
        "AttachStdout": true,
        "AttachStderr": true,
        "AttachStdin": true,
        "Tty": true,
        Cmd: [shell]
      };
    }
    else {
      var cmd = {
        "AttachStdout": true,
        "AttachStderr": true,
        "AttachStdin": true,
        "Tty": true,
        Cmd: ['/usr/bin/tmux','a','-t','taisun']
      };    
    }
    container.exec(cmd, (err, exec) => {
      if (err) return;
      var options = {
        'Tty': true,
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true,
        hijack: true
      };
      exec.start(options, (err, stream) => {
        if (err) return;
        var dimensions = { h, w };
        exec.resize(dimensions, () => { });
        stream.on('data', (chunk) => {
          io.sockets.in(socket.id).emit('termdata', chunk.toString());
        });
        socket.on('termdata', (data) => {
          stream.write(data);
        });
        socket.on('resizeterm', (w, h) => {
          var dimensions = { h, w };
          exec.resize(dimensions, () => { });
        });
        // Close Terminal
        socket.on('killterm', function(){
          console.log('Killing Terminal on ' + containerid);
          stream.end();
        });
      });
    });
  });
  // Destroy a single container by name
  socket.on('destroycontainer', function(name){
    destroycontainer(name);
  });
  ///////////////////
  //// Functions ////
  ///////////////////
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
      if (err) return;
      var resolutions = xparse(stdout);
      io.sockets.in(socket.id).emit('sendres', resolutions);
    });
  }
  // Get all container information
  function containerinfo(target){
    docker.listContainers({all: true}, function (err, containers) {
      if (err){
        io.sockets.in(socket.id).emit(target,err);
      }
      else{
        io.sockets.in(socket.id).emit(target,containers);
      }
    });
  }
  // Destroy a Stack
  function destroystack(name, auto){
    docker.listContainers({all: true}, function (err, containers) {
      if (err){
        io.sockets.in(socket.id).emit('error_popup','Could not list containers something is wrong with docker on this host');
      }
      else{
        containers.forEach(function (container){
          if (container.Labels.stackname){
            if (container.Labels.stackname == name){
              docker.getContainer(container.Id).remove({force: true},function (err, data) {
                if (err){
                  console.log(JSON.stringify(err));
                  io.sockets.in(socket.id).emit('error_popup','Could destroy Stack container for ' + name);
                }
                else{
                  console.log('Destroyed Stack container ' + container.Names[0] + ' for stack ' + name);
                  containerinfo('updatestacks');
                }
              });
            }
          }
        });
      }
    });
  }
  // Destroy a Single container
  function destroycontainer(name){
    io.sockets.in(socket.id).emit('modal_update','Attempting to destroy ' + name);
    docker.getContainer(name).remove({force: true},function (err, data) {
      if (err){
        console.log(JSON.stringify(err));
        io.sockets.in(socket.id).emit('modal_finish','Cannot destroy ' + name + ' does not exist');
      }
      else{
        console.log('Destroyed container ' + name);
        io.sockets.in(socket.id).emit('modal_finish','Destroyed ' + name);
        // Restart the app if we just killed the guacd container
        if (name == 'guacd'){
          process.exit();
        }
      }
    });
  }
  // Launch Guacd container
  function deployguac(){
    // Grab the current running docker container information
    docker.listContainers(function (err, containers) {
      if (err){
        io.sockets.in(socket.id).emit('error_popup','Could not list containers something is wrong with docker on this host');
      }
      else{
          var guacoptions ={
            Image: 'linuxserver/guacd',
            name: 'guacd'
          };
          docker.createContainer(guacoptions, function (err, container){
            if (err){
              console.log(JSON.stringify(err));
              io.sockets.in(socket.id).emit('error_popup','Could not pull Guacd container');
            }
            else{
              io.sockets.in(socket.id).emit('modal_update','Downloaded image and created Guacd container');
              container.start(function (err, data){
                if (err){
                  console.log(JSON.stringify(err));
                  io.sockets.in(socket.id).emit('error_popup','Could not start Guacd');
                }
                else{
                  io.sockets.in(socket.id).emit('modal_finish','Guacd launched , Restarting page will refresh in 5 seconds');
                  // Exit the application supervisor will restart
                  process.exit();
                }
              });
            }
          });
        }
    });
  }
  // Launch Upgrade container
  function upgradetaisun(){
    // Check if the upgrade image exists on this server
    images.list(function (err, res) {
      if (err) return;
      if (JSON.stringify(res).indexOf('containrrr/watchtower:latest') > -1 ){
        runupgrade();
      }
      else {
        docker.pull('containrrr/watchtower:latest', function(err, stream) {
          if (err) return;
          stream.pipe(process.stdout);
          stream.once('end', runupgrade);
        });
      }
    });
  }
  function runupgrade(){
    // Grab the current running docker container information
    docker.listContainers(function (err, containers) {
      if (err){
        io.sockets.in(socket.id).emit('error_popup','Could not list containers something is wrong with docker on this host');
      }
      else{
        docker.run('containrrr/watchtower:latest', ['--run-once', 'taisun'], process.stdout, {
            HostConfig: {
                Binds: ["/var/run/docker.sock:/var/run/docker.sock"],
                AutoRemove: true
            }
        }, {},function (err, data, container) {
            if(err)
                console.log("Error: ", err);
            else
                console.log(data.StatusCode);
        });
      }
    });
  }
  // Launch Upgrade container
  function upgradestack(stackname){
    // Check if the upgrade image exists on this server
    images.list(function (err, res) {
      if (err) return;
      if (JSON.stringify(res).indexOf('containrrr/watchtower:latest') > -1 ){
        stackupgrade(stackname);
      }
      else {
        io.sockets.in(socket.id).emit('senddockerodeoutstart','Need to pull the updater image');
        docker.pull('containrrr/watchtower:latest', function(err, stream) {
          if (err) return;
          docker.modem.followProgress(stream, onFinished, onProgress);
          function onProgress(event) {
           io.sockets.in(socket.id).emit('senddockerodeout', event);
          }
          function onFinished(err) {
            if (err) return;
            io.sockets.in(socket.id).emit('senddockerodeoutstart', 'Finished Pull process for updater');
            stackupgrade(stackname);
            console.log('Finished Pulling updater');
          }
        });
      }
    });
  }
  function stackupgrade(stackname){
    // Grab the current running docker container information
    docker.listContainers(function (err, containers) {
      if (err){
        io.sockets.in(socket.id).emit('error_popup','Could not list containers something is wrong with docker on this host');
      }
      else{
        containers.forEach(function(container){
          // If the container has the stackname passed
          if (container.Labels.stackname == stackname){
            io.sockets.in(socket.id).emit('senddockerodeoutstart','Started upgrade run for ' + container.Names[0]);
            docker.run('containrrr/watchtower:latest', ['--run-once', container.Names[0]], process.stdout,{
                HostConfig: {
                    Binds: ["/var/run/docker.sock:/var/run/docker.sock"],
                    AutoRemove: true
                }
            },function (err, data, container) {
                if(err)
                    console.log("Error: "+ err);
              }).on('stream', function (stream) {
                stream.setEncoding('utf8');
                stream.on('data', (data) => {
                  io.sockets.in(socket.id).emit('sendconsoleout',ansi_up.ansi_to_html(data).trim());
                });
                stream.on('end', function(){
                  io.sockets.in(socket.id).emit('sendconsoleoutdone','Finished upgrade run for ' + container.Names[0]);
                });
              });
          }
        });
      }
    });
  }
  // Build a docker container from a git repository
  function builddockergit(repo,path,checkout,tag){
    var tempfolder = '/tmp/' + uuidv4(); + '/';
    if (checkout == ''){
      var checkout = 'master';
    }
    io.sockets.in(socket.id).emit('senddockerodeoutstart', 'Starting git clone process for ' + repo);
    gitClone(repo, tempfolder, {
    	checkout: checkout },
    	function(err) {
    	  if (err){
    	    io.sockets.in(socket.id).emit('senddockerodeoutdone', 'Error unable to checkout ' + repo);
    	    console.log(err);
    	    rmdir(tempfolder);
    	  }
    	  else{
    	    io.sockets.in(socket.id).emit('senddockerodeoutstart', repo + ' checked out');
          var tarStream = tar.pack(tempfolder + path);
          docker.buildImage(tarStream, {
            t: tag
          }, function(error, output) {
            if (error) {
              io.sockets.in(socket.id).emit('senddockerodeoutdone', 'Error executing build');
              console.error(error);
              rmdir(tempfolder);
            }
            else{
              io.sockets.in(socket.id).emit('senddockerodeoutstart', 'Building ' + tag);
              docker.modem.followProgress(output, onFinished, onProgress);
              function onProgress(event) {
                io.sockets.in(socket.id).emit('senddockerodeout', event);
              }
              function onFinished(err, output) {
                if (err) return;
                io.sockets.in(socket.id).emit('senddockerodeoutdone', 'Finished Build process for ' + repo + ' at ' + checkout);
                console.log('Finished building ' + repo + ' at ' + checkout);
                rmdir(tempfolder);
              }
            }
          });
    	  }
    });
  }
  // Build and push an encrypto image with a stack in it
  function buildencrypto(tag,pass,template,dockeruser,dockerpass){
    var tarStream = tar.pack('/usr/src/Taisun/buildlocal/encrypto/');
    docker.buildImage(tarStream, {
      t: tag,
      buildargs: {
        "INPUT": template,
        "PASS": pass
      }
    }, function(err, output) {
      if (err) {
        io.sockets.in(socket.id).emit('senddockerodeoutdone', 'Error executing build');
        console.log(err);
      }
      else{
        io.sockets.in(socket.id).emit('senddockerodeoutstart', 'Building ' + tag);
        docker.modem.followProgress(output, onFinished, onProgress);
        function onProgress(event) {
          io.sockets.in(socket.id).emit('senddockerodeout', event);
        }
        function onFinished(err, output) {
          if (err) return;
          io.sockets.in(socket.id).emit('senddockerodeoutstart', 'Finished Build process for ' + tag);
          console.log('Finished building ' + tag);
          pushencrypto(tag,pass,dockeruser,dockerpass);
        }
      }
    });
  }
  // Push an encrypted blob to dockerhub
  function pushencrypto(tag,pass,dockeruser,dockerpass){
    var image = docker.getImage(tag);
    var auth = {
      username: dockeruser,
      password: dockerpass,
      serveraddress: "https://index.docker.io/v1",
      auth: "",
      email: ""
    };
    image.push({authconfig: auth}, function(err, output){
      if (err) {
        io.sockets.in(socket.id).emit('senddockerodeoutdone', 'Error executing Push');
        console.log(err);
      }
      else {
        io.sockets.in(socket.id).emit('senddockerodeoutstart', 'Pushing ' + tag);
        docker.modem.followProgress(output, onFinished, onProgress);
        function onProgress(event) {
          io.sockets.in(socket.id).emit('senddockerodeout', event);
        }
        function onFinished(err, output) {
          if (err) return;
          io.sockets.in(socket.id).emit('senddockerodeoutstart', 'Finished Push process for ' + tag);
          io.sockets.in(socket.id).emit('senddockerodeoutdone', 'Your Taisun stack link is : ' + tag + '|' + pass  );
          console.log('Finished Pushing ' + tag);
        }
      }
    });
  }
  // Decrypt remote stack on Dockerhub
  function renderprivatestack(url){
    var image = url.split('|')[0];
    var pass = url.split('|')[1];
    io.sockets.in(socket.id).emit('senddockerodeoutstart', 'Starting Pull process for ' + image);
    if (! pass){
      console.log('nothing set for pass malformed encrypted dockerhub endpoint');
      io.sockets.in(socket.id).emit('senddockerodeoutdone', 'Error pulling ' + url);
    }
    else{
      console.log('Pulling ' + image);
      docker.pull(image, function(err, stream) {
        if (err) return;
        docker.modem.followProgress(stream, onFinished, onProgress);
        function onProgress(event) {
          io.sockets.in(socket.id).emit('senddockerodeout', event);
        }
        function onFinished(err, output) {
          if (err) return;
          io.sockets.in(socket.id).emit('senddockerodeoutdone', 'Finished Pull process for ' + image + ' rendering template');
          console.log('Finished Pulling ' + image);
          docker.run(image, [], undefined, {
              env: ['PASS=' + pass],
              HostConfig: {
                  AutoRemove: true
              }
          },function (err, data, container) {
              if(err)
                  console.log("Error: "+ err);
            }).on('stream', function (stream) {
              var basestring = '';
              stream.setEncoding('utf8');
              stream.on('data', (data) => {
                basestring += data;
              });
              stream.on('end', function(){
                var template = new Buffer(basestring, 'base64').toString('utf8');
                var yml = yaml.safeLoad(template);
                var name = yml.name;
                var description = yml.description;
                var form = yml.form;
                io.sockets.in(socket.id).emit('stackurlresults', [name,description,form,url,template]);
              });
            });
        }
      });
    }
  }
  // Restart all containers in a stack
  function restartstack(stackname){
    // Grab the current running docker container information
    docker.listContainers(function (err, containers) {
      if (err){
        io.sockets.in(socket.id).emit('error_popup','Could not list containers something is wrong with docker on this host');
      }
      else{
        containers.forEach(function(container){
          // If the container has the stackname as the label
          if (container.Labels.stackname == stackname){
            var restartcontainer = docker.getContainer(container.Id);
            io.sockets.in(socket.id).emit('sendmodalstart','Started restart for ' + container.Names[0]);
            restartcontainer.restart(function (err, data) {
              if (err){
                io.sockets.in(socket.id).emit('sendmodalstart','Error restarting ' + container.Names[0]);
              }
              else{
                io.sockets.in(socket.id).emit('sendmodalend','Restarted ' + container.Names[0]);
                containerinfo('updatestacks');
              }
            });
          }
        });
      }
    });
  }
  // Stop all containers in a stack
  function stopstack(stackname){
    // Grab the current running docker container information
    docker.listContainers(function (err, containers) {
      if (err){
        io.sockets.in(socket.id).emit('error_popup','Could not list containers something is wrong with docker on this host');
      }
      else{
        containers.forEach(function(container){
          // If the container has the stackname as the label
          if (container.Labels.stackname == stackname){
            var stopcontainer = docker.getContainer(container.Id);
            io.sockets.in(socket.id).emit('sendmodalstart','Started stop for ' + container.Names[0]);
            stopcontainer.stop(function (err, data) {
              if (err){
                io.sockets.in(socket.id).emit('sendmodalstart','Error stopping ' + container.Names[0]);
              }
              else{
                io.sockets.in(socket.id).emit('sendmodalend','Stopped ' + container.Names[0]);
                containerinfo('updatestacks');
              }
            });
          }
        });
      }
    });
  }
  // Start all containers in a stack
  function startstack(stackname){
    // Grab the current running docker container information
    docker.listContainers({all: true}, function (err, containers) {
      if (err){
        io.sockets.in(socket.id).emit('error_popup','Could not list containers something is wrong with docker on this host');
      }
      else{
        containers.forEach(function(container){
          // If the container has the stackname as the label
          if (container.Labels.stackname == stackname){
            var startcontainer = docker.getContainer(container.Id);
            io.sockets.in(socket.id).emit('sendmodalstart','Started start for ' + container.Names[0]);
            startcontainer.start(function (err, data) {
              if (err){
                io.sockets.in(socket.id).emit('sendmodalstart','Error starting ' + container.Names[0]);
              }
              else{
                io.sockets.in(socket.id).emit('sendmodalend','Started ' + container.Names[0]);
                containerinfo('updatestacks');
              }
            });
          }
        });
      }
    });
  }
  // Get logs for all containers in stack
  function containerlogs(containerid){
    var logcontainer = docker.getContainer(containerid);
    var logOpts = {
      stdout: 1,
      stderr: 1,
      tail:100,
      follow:true
    };
    io.sockets.in(socket.id).emit('senddockerodeoutstart','Getting logs for ' + containerid);
    var logStream = new stream.PassThrough();
    logcontainer.logs(logOpts,function (err, stream) {
      if (err){
        io.sockets.in(socket.id).emit('sendconsoleoutdone','Error Getting logs for ' + containerid);
        console.log(err);
      }
      else{
        if (Buffer.isBuffer(stream)){
          var lines = stream.toString('utf8').split(/\r?\n/);
          lines.forEach(function(line){
            io.sockets.in(socket.id).emit('sendconsoleout',line.substr(8));
          });
          io.sockets.in(socket.id).emit('sendconsoleoutdone','Logs for ' + containerid + ' below');
        }
        else {
          logcontainer.modem.demuxStream(stream, logStream, logStream);
          logStream.on('data', (data) => {
            io.sockets.in(socket.id).emit('sendconsoleout',ansi_up.ansi_to_html(data).trim());
          });
          // End the stream after 2 seconds
          setTimeout(endstream, 2000);
          function endstream(){
            stream.push(null);
          }
          stream.on('end', function(){
            io.sockets.in(socket.id).emit('sendconsoleoutdone','Logs for ' + containerid + ' below');
          });
        }
      }
    });
  }
});




// Spin up application on port 3000
http.listen(3000, function(){
  console.log('listening on *:3000');
});
