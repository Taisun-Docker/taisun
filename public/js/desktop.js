$(document).ready(function(){
  var host = window.location.hostname; 
  var port = window.location.port;
  var path = window.location.pathname;
  // Initiate a websocket connection to the server
  var socket = io.connect('http://' + host + ':' + port, {
  });
  // Send the client window resolution to resize the desktop
  socket.emit('resizedesktop', $(window).width(), $(window).height(),path,'0');
  socket.emit('getres', path);
  socket.on('sendres', function(resolutions){
    var modes = resolutions.default.modes;
    for (var i = 0; i < modes.length; i++) {
      $('#resolutions').append('<option value="' + modes[i].width + 'x' + modes[i].height + '"');
    }
  });
  $('#resform').on('change', function() {
    var resolution = this.value.split("x");
    socket.emit('resizedesktop', resolution[0], resolution[1],path,'0');
  });
});