$(document).ready(function(){
  var host = window.location.hostname; 
  var port = window.location.port;
  var path = window.location.pathname;
  // Initiate a websocket connection to the server
  var socket = io.connect('http://' + host + ':' + port, {
  });
  // Send the client window resolution to resize the desktop
  socket.emit('resizedesktop', $(window).width(), $(window).height(),path,'0');
});