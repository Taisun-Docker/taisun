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
    // Sort resolutions by width so our future logic works
    var modes = resolutions.default.modes.sort(function(a, b){return b.width - a.width || b.height - a.height});
    for (var i = 0; i < modes.length; i++) {
      $('#resolutions').append('<option value="' + modes[i].width + 'x' + modes[i].height + '"');
      // Call final resize check
      if (i === modes.length - 1){
        // Loop through the modes to see if we got a good hit on the initial resize
        for (var i = 0; i < modes.length; i++) {
          if ($("#resolutions option")[i].value === $(window).width() + 'x' + $(window).height()){
            return;
          }
          // If we had a bad initial sizing lets find something smaller than this window but also the largest it can be
          else if (i === modes.length - 1){
            console.log($(window).width() + 'x' + $(window).height() + ' is not an available resolution');
            for (var i = 0; i < modes.length; i++) {
              if ( modes[i].width < $(window).width() && modes[i].height < $(window).height()){
                console.log(modes[i].width + 'x' + modes[i].height + ' is the closest resolution resizing');
                socket.emit('resizedesktop', modes[i].width, modes[i].height,path,'0');
                return;
              }
            }
          }
        }
      }
    }
  });
  $('#resform').on('change', function() {
    var resolution = this.value.split("x");
    socket.emit('resizedesktop', resolution[0], resolution[1],path,'0');
  });
});