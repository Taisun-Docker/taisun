// Taisun Launch page
// Client side javascript

$(document).ready(function(){
  // Initiate a websocket connection to the server
  var host = window.location.hostname; 
  var port = window.location.port;
  var socket = io.connect('http://' + host + ':' + port, {
  });
  socket.emit('getimages');
  // Whenever the stack list is updated rebuild the displayed table
  socket.on('sendimages', function(images) {
    $("#images").dataTable().fnDestroy();
    var imagestable = $('#images').DataTable( {} );
    imagestable.clear();
    //Loop through the containers to build the containers table
    for (i = 0; i < images.length; i++){
      var image = images[i]
      imagestable.row.add(
        [image.RepoTags[0].split(':')[0],
        image.Id.split(':')[1].substring(0,12),
        new Date( image.Created * 1e3).toISOString().slice(0,19), 
        (image.Size / 1000000) + ' MB', 
        '<a href="/desktop/' + image.Id + '" target="_blank" class="btn btn-sm btn-primary">Launch</a>'] 
      );
    }
    imagestable.draw();
  });
});