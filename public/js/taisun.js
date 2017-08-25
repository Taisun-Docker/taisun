// Taisun
// Client side javascript

$(document).ready(function(){
  // Initiate a websocket connection to the server
  var host = window.location.hostname; 
  var port = window.location.port;
  var socket = io.connect('http://' + host + ':' + port, {
  });
  // Whenever the stack list is updated rebuild the displayed table
  socket.on('updatepage', function(containers) {
    // Empty Containers Table
    $('#dockercontainers').empty();
    //Loop through the containers to build the table
    for (var container in containers){
      var info = containers[container];
      var ports = info.Ports;
      $('#dockercontainers').append(
        '<tr scope="row"><td>' + info.Names[0] + '</td>' +
        '<td><a href="http://' + host + ':' + ports[0].PublicPort + '" target="_blank">' + ports[0].PublicPort + '</a> => ' + ports[0].PrivatePort + '</td>' + 
        '<td>' +  info.Image + '</td>' +
        '<td>' +  info.State + ' ' + info.Status + '</td>' + 
        '<td>' + new Date( info.Created * 1e3).toISOString().slice(0,19) + '</td>' + 
        '<td>' + info.Command + '</td></tr>'
      );
    }
  });
});