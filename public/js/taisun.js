// Taisun Launch page
// Client side javascript


// Initiate a websocket connection to the server
var host = window.location.hostname; 
var port = window.location.port;
var converter = new showdown.Converter({parseImgDimensions: true});
var socket = io.connect('http://' + host + ':' + port, {});
// If the page is being loaded for the first time render in the homepage
$(document).ready(function(){renderhome()}) 

// Whenever the stack list is updated rebuild the displayed table
socket.on('updatepage', function(containers) {
  $("#dockercontainers").dataTable().fnDestroy();
  var containertable = $('#dockercontainers').DataTable( {} );
  containertable.clear();
  //Loop through the containers to build the containers table
  for (var container in containers){
    var info = containers[container];
    if ( typeof info.Ports[0] !== 'undefined' && typeof info.Ports[0].PublicPort !== 'undefined' && info.Ports[0].PublicPort ){
      var ports = info.Ports[0];
    }
    else {
      var ports = {"PublicPort":"null","PrivatePort":"null"};
    }
    containertable.row.add( 
      [info.Names[0], 
      '<a href="http://' + host + ':' + ports.PublicPort + '" target="_blank">' + ports.PublicPort + '</a> => ' + ports.PrivatePort,
      info.Image, 
      info.State + ' ' + info.Status, 
      new Date( info.Created * 1e3).toISOString().slice(0,19),
      info.Command] 
    );
  }
  containertable.draw();
  // Loop through the VDIs deployed to show them on the vdi page
  $("#desktops").dataTable().fnDestroy();
  var desktoptable = $('#desktops').DataTable( {} );
  desktoptable.clear();
  //Loop through the containers to build the containers table
  for (var container in containers){
    var info = containers[container];
    if (info.Names[0].indexOf("taisunvdi_") != -1 ){
      desktoptable.row.add( 
        [info.Names[0].replace('/taisunvdi_',''), 
        '<a href="/desktop/' + info.Id + '" target="_blank" class="btn btn-sm btn-primary">Launch</a>',
        info.Image, 
        info.State + ' ' + info.Status, 
        new Date( info.Created * 1e3).toISOString().slice(0,19),
        info.Command] 
      );
    }
  }
  desktoptable.draw();
});

// When the guacd button is pressed tell the server to launch guacd docker container
$('body').on('click', '.guacdlaunch', function(){
  socket.emit('launchguac');
  modalpurge();
  $('#modaltitle').append('Launching GuacD');
  $('#modalloading').show();
});
// Parse output from the server on status of launching Guacd
socket.on('modal_update', function(message) {
  $('#modalconsole').show();
  $('#modalconsole').append(message + '\
  ');
});
socket.on('modal_finish', function(message) {
  $('#modalloading').hide();
  $('#modalconsole').append(message);
});


function renderhome(){
  $('.nav-item').removeClass('active');
  $('#pagecontent').empty();
  $('#pageheader').empty();  
  $('#pagecontent').append('Dashboard Goes here');
}

//// Containers Page rendering ////
function rendercontainers(){
  $('.nav-item').removeClass('active');
  $('#Containersnav').addClass('active');
  $('#pagecontent').empty();
  $('#pageheader').empty();
  $('#pagecontent').append('\
  <div class="card mb-3">\
  <div class="card-header">\
    <i class="fa fa-cubes"></i>\
    Docker Containers\
  </div>\
  <div class="card-body">\
    <div class="table-responsive">\
      <table id="dockercontainers" class="table table-bordered" width="100%" cellspacing="0">\
        <thead>\
          <tr>\
            <th>Name</th>\
            <th>PortMap</th>\
            <th>Image</th>\
            <th>Status</th>\
            <th>Created</th>\
            <th>Command</th>\
          </tr>\
        </thead>\
      </table>\
    </div>\
  </div>\
  ');
  socket.emit('getcontainers');
} 

//// VDI Page rendering ////
function rendervdi (){
  $('.nav-item').removeClass('active');
  $('#VDInav').addClass('active');
  $('#pagecontent').empty();
  $('#pageheader').empty();
  socket.emit('checkguac');
}
socket.on('rendervdi', function(response){
  if (response == "no"){
    $('#pagecontent').append('\
    <div class="card mb-3">\
      <div class="card-header">\
        <i class="fa fa-desktop"></i>\
        VDI Management\
      </div>\
      <div class="card-body">\
        <center>\
          <h2>To run virtual desktops you must first launch Guacamole Server</h2>\
          <br>\
          <button type="button" class="btn btn-lg btn-primary guacdlaunch" data-toggle="modal" data-target="#modal">Launch Now</button>\
        </center>\
      </div>\
    </div>\
    ');
  }
  else if (response == "yes"){
    $('#pageheader').append('\
    <div class="row">\
      <div class="col-xl-3 col-sm-6 mb-3">\
        <a data-toggle="modal" data-target="#modal" class="text-white configurestack" style="cursor:pointer;" value="http://localhost/public/stackstemp/taisunvdi.yml">\
          <div class="card text-white bg-success o-hidden h-60">\
            <div class="card-body">\
              <div class="card-body-icon">\
                <i class="fa fa-fw fa-plus-square-o"></i>\
              </div>\
              <div class="mr-5">\
                Launch Desktop\
              </div>\
            </div>\
          </a>\
        </div>\
      </div>\
      <div class="col-xl-3 col-sm-6 mb-3">\
        <a data-toggle="modal" data-target="#modal" class="text-white" style="cursor:pointer;" onclick="vdidestroymodal()">\
          <div class="card text-white bg-danger o-hidden h-60">\
            <div class="card-body">\
              <div class="card-body-icon">\
                <i class="fa fa-fw fa-minus-circle"></i>\
              </div>\
              <div class="mr-5">\
                Destroy Desktop\
              </div>\
            </div>\
          </a>\
        </div>\
      </div>\
      <div class="col-xl-3 col-sm-6 mb-3">\
        <a data-toggle="modal" data-target="#modal" class="text-white" style="cursor:pointer;" onclick="vdibuildermodal()">\
          <div class="card text-white bg-primary o-hidden h-60">\
            <div class="card-body">\
              <div class="card-body-icon">\
                <i class="fa fa-fw fa-linux"></i>\
              </div>\
              <div class="mr-5">\
                Desktop Builder\
              </div>\
            </div>\
          </a>\
        </div>\
      </div>\
      <div class="col-xl-3 col-sm-6 mb-3">\
        <a data-toggle="modal" data-target="#modal" class="text-white" style="cursor:pointer;" onclick="guacstatusmodal()">\
          <div class="card text-white bg-success o-hidden h-60">\
            <div class="card-body">\
              <div class="card-body-icon">\
                <i class="fa fa-fw fa-thumbs-o-up"></i>\
              </div>\
              <div class="mr-5">\
                GuacD\
              </div>\
            </div>\
          </a>\
        </div>\
      </div>\
    </div>\
    ');
    $('#pagecontent').append('\
    <div class="card mb-3">\
      <div class="card-header">\
        <i class="fa fa-desktop"></i>\
        Deployed Desktops\
      </div>\
      <div class="card-body">\
        <div class="table-responsive">\
          <table id="desktops" class="table table-bordered" width="100%" cellspacing="0">\
            <thead>\
              <tr>\
                <th>Name</th>\
                <th>URL</th>\
                <th>Image</th>\
                <th>Status</th>\
                <th>Created</th>\
                <th>Command</th>\
              </tr>\
            </thead>\
          </table>\
        </div>\
      </div>\
    </div>\
    ')
    socket.emit('getcontainers');
  }
});
// VDI destroy modal
function vdidestroymodal(){
  modalpurge();
  $('#modaltitle').append('Destroy Desktop');
  $('#modalbody').show();
  $('#modalbody').append('\
  <div class="form-group row">\
  <label for="desktop-destroy" class="col-sm-2 control-label">Name</label>\
    <div class="col-sm-10">\
    <input type="text" class="form-control" id="desktop-destroy" placeholder="Desktop Name">\
    </div>\
  </div>\
  ');
  $('#modalfooter').show();
  $('#modalfooter').append('\
  <button type="button" class="btn btn-danger" data-dismiss="modal">Cancel</button>\
  <button type="button" class="btn btn-success" onclick="destroydesktop()" data-dismiss="modal">Destroy</button>\
  ');
}
// VDI Builder modal
function vdibuildermodal(){
  modalpurge();
  $('#modaltitle').append('Build Custom Desktop');
  $('#modalbody').show();
  $('#modalbody').append('\
  Coming Soon\
  ');
}

function githubmodal(){
  modalpurge();
  $('#modaltitle').append('Import Project from github');
  $('#modalbody').show();
  $('#modalbody').append('\
  Coming Soon\
  ');
}
// Guacstatus modal
function guacstatusmodal(){
  modalpurge();
  $('#modaltitle').append('Guacamole server info');
  $('#modalloading').show();
  socket.emit('getguacinfo');
}
socket.on('guacinfo', function (data){
  $('#modalloading').hide();
  $('#modalconsole').show();
  $('#modalconsole').append(JSON.stringify(data));
});

// When the desktop form is submitted send the reqest to the server
function createdesktop(){
  socket.emit('createdesktop', $('#desktopname').val(),$('#socket').val());
}
// When the destroy desktop form is submitted send the reqest to the server
function destroydesktop(){
  socket.emit('destroydesktop', $('#desktop-destroy').val());
}

//// Launch Page rendering ////
function renderlaunch(){
  $('.nav-item').removeClass('active');
  $('#Launchnav').addClass('active');
  $('#pagecontent').empty();
  $('#pageheader').empty();
  $('#pageheader').append('\
  <div class="row">\
    <div class="col-xl-3 col-sm-6 mb-3" id="local" style="cursor:pointer;" onclick="renderlocal()">\
        <div class="card text-white bg-info o-hidden h-60">\
          <div class="card-body">\
            <div class="card-body-icon">\
              <i class="fa fa-fw fa-hdd-o"></i>\
            </div>\
            <div class="mr-5">\
              Local Images\
            </div>\
          </div>\
      </div>\
    </div>\
    <div class="col-xl-3 col-sm-6 mb-3" id="dockerhub" style="cursor:pointer;" onclick="renderdockerhub()">\
        <div class="card text-white bg-info o-hidden h-60">\
          <div class="card-body">\
            <div class="card-body-icon">\
              <i class="fa fa-fw fa-docker"></i>\
            </div>\
            <div class="mr-5">\
              DockerHub\
            </div>\
          </div>\
      </div>\
    </div>\
    <div class="col-xl-3 col-sm-6 mb-3">\
        <div data-toggle="modal" data-target="#modal" class="card text-white bg-info o-hidden h-60" style="cursor:pointer;" onclick="githubmodal()">\
          <div class="card-body">\
            <div class="card-body-icon">\
              <i class="fa fa-fw fa-github"></i>\
            </div>\
            <div class="mr-5">\
              From GitHub\
            </div>\
          </div>\
      </div>\
    </div>\
    <div class="col-xl-3 col-sm-6 mb-3">\
        <div class="card text-white bg-info o-hidden h-60" id="stacks" style="cursor:pointer;" onclick="renderstacks()">\
          <div class="card-body">\
            <div class="card-body-icon">\
              <i class="fa fa-fw fa-bars"></i>\
            </div>\
            <div class="mr-5">\
              Taisun Stacks\
            </div>\
          </div>\
      </div>\
    </div>\
  </div>\
  ');
  renderlocal();
}
// Local Images
function renderlocal(){
  $('#pagecontent').empty();
  $('#pagecontent').append('\
  <div class="card mb-3">\
    <div class="card-header">\
      <i class="fa fa-hdd-o"></i>\
      Local Images\
    </div>\
    <div class="card-body">\
      <div class="table-responsive">\
        <table id="images" class="table table-bordered" width="100%" cellspacing="0">\
          <thead>\
            <tr>\
              <th>Image</th>\
              <th>ID</th>\
              <th>Created</th>\
              <th>Size</th>\
              <th>Launch</th>\
            </tr>\
          </thead>\
        </table>\
      </div>\
    </div>\
  </div>');
  socket.emit('getimages');
  // When the server sends us the images on this machine render in the rows
  socket.on('sendimages', function(images) {
    $("#images").dataTable().fnDestroy();
    var imagestable = $('#images').DataTable( {} );
    imagestable.clear();
    //Loop through the images to build the images table
    for (i = 0; i < images.length; i++){
      var image = images[i];
      if (image.RepoTags){
        // Do not show dangling images
        if (image.RepoTags[0] != '<none>:<none>'){
          imagestable.row.add(
            [image.RepoTags[0],
            image.Id.split(':')[1].substring(0,12),
            new Date( image.Created * 1e3).toISOString().slice(0,19), 
            (image.Size / 1000000) + ' MB', 
            '<button type="button" style="cursor:pointer;" class="btn btn-primary btn-xs configuregeneric" data-toggle="modal" data-target="#modal" value="' + image.RepoTags[0] + '">Launch <i class="fa fa-rocket"></i></button>']
          );
        }
      }
    }
    imagestable.draw();
  });
}
// Dockerhub Page
function renderdockerhub(){
  $('#pagecontent').empty();
  $('#pagecontent').append('\
  <form class="form-inline mb-3" onsubmit="return false;">\
    <div class="input-group">\
      <input type="text" class="form-control" placeholder="Search" id="hubsearch">\
      <div class="input-group-btn">\
        <button onclick="dockersearch(1)" type="button" class="btn btn-default"><i class="fa fa-search"></i></button>\
      </div>\
    </div>\
  </form>\
  <div class="card mb-3">\
    <div class="card-header">\
      <i class="fa fa-docker"></i>\
      DockerHub\
    </div>\
    <div class="card-body" id="dockerresults">\
    <center><h2>Please search for Docker images</h2></center>\
    </div>\
  </div>');
  document.getElementById("hubsearch").addEventListener("keydown", function (e) {
    if (e.keyCode === 13) { 
      dockersearch(1);
    }
  });
}
// Dockerhub Page
function renderstacks(){
  socket.emit('getstacks', '1');
  $('#pagecontent').empty();
  $('#pagecontent').append('\
  <div class="card mb-3">\
    <div class="card-header">\
      <i class="fa fa-bars"></i>\
      Taisun Stacks\
    </div>\
    <div class="card-body" id="taisunstacks">\
    <center><i class="fa fa-refresh fa-spin" style="font-size:36px"></i><br><h2>Fetching available stacks from Taisun.io</h2></center>\
    </div>\
  </div>\
  ');
}



//// DockerHub Search ////
// When search button is activated send string to server
function dockersearch(page){
  $('#dockerresults').empty();
  // Set the content to a spinner to signify loading
  $('#dockerresults').append('<i class="fa fa-refresh fa-spin" style="font-size:36px"></i>');
  socket.emit('searchdocker', $('#hubsearch').val(), page);
}
// When the server gives us the results parse them
socket.on('hubresults', function(data) {
  $('#dockerresults').empty();
  // If we did not get an results do not create table
  if (data.num_results == 0){
    $('#dockerresults').append('<center><h2>No Results</h2></center>');
  }
  else {
    // Create table for dockerhub results
    $('#dockerresults').append('<table style="width:100%" id="hubresults" class="table table-bordered table-hover"></table>');
    $('#hubresults').append('<thead><tr><th>Name</th><th>Rating</th><th>Description</th><th></th></tr></thead>');
    for (i = 0; i < data.results.length; i++){
      var name = data.results[i].name;
      var description = data.results[i].description;
      var stars = data.results[i].star_count;
      $('#hubresults').append('<tr><td>' + name + '</td><td>' + '<i class="fa fa-star-o"></i>' + stars + '</td><td>' + description + '</td><td><button type="button" data-toggle="modal" data-target="#modal" style="cursor:pointer;" class="btn btn-primary btn-xs hubinfo" value="' + name + '"><i class="fa fa-download"></i> Pull</button></td></tr>')
    }
    // Pagination logic show +2 and -2 pages at the bottom of the table
    $('#dockerresults').append('<ul id="dockerhubpages" class="pagination"></ul>');
    for (i = -2; i < 3; i++){
      var pagenumber = parseInt(data.page) + i;
      // If negative page number do not display 
      if ( pagenumber <= 0){
      }
      // If current page highlight current
      else if ( pagenumber == data.page){
        $('#dockerhubpages').append('<li class="page-item active"><a class="page-link" onclick="dockersearch(' + pagenumber + ')">' + pagenumber + '</a></li>');
      }
      // If not current page
      else if (parseInt(data.num_pages) - pagenumber >= 0){
        $('#dockerhubpages').append('<li class="page-item"><a class="page-link" onclick="dockersearch(' + pagenumber + ')">' + pagenumber + '</a></li>');
      }
    }
  }
});

//// Get supplimental info on the dockerhub container
$('body').on('click', '.hubinfo', function(){
  socket.emit('gethubinfo', $(this).attr("value"));
  modalpurge();
  $('#modaltitle').append($(this).attr("value").replace('_/','') + ' Image Information' );
  $('#modalloading').show();
});
// Render in info page for image on pull modal
socket.on('sendhubinfo', function(data) {
  $('#modalloading').hide();
  $('#modalbody').show();
  if (data.user == 'library'){
    var user = '_';
  }
  else{
    var user = data.user;
  }
  var name = data.name;
  var pullcount = data.pull_count;
  var stars = data.star_count;
  var description = data.description;
  $('#modalbody').append('\
  <div class="row">\
    <div class="col-lg-8">' +
      description + '<br><br>\
      <ul class="list-group" style="width:30%;">\
        <li class="list-group-item justify-content-between">Stars <span class="badge badge-primary badge-pill pull-right">' + stars + '</span></li>\
        <li class="list-group-item justify-content-between">Pulls <span class="badge badge-primary badge-pill pull-right">' + pullcount + '</span></li>\
      </ul><br>\
    </div>\
    <div class="col-lg-4"><br><center>\
      <button type="button" style="cursor:pointer;" class="btn btn-success btn-xs pullimage" value="' + (user + '/' + name).replace('_/','') + ':latest' + '"><i class="fa fa-download"></i> Pull Latest</button><br><br>\
      <button type="button" style="cursor:pointer;" class="btn btn-primary btn-xs browsetags" value="' + user + '/' + name + '"><i class="fa fa-eye"></i> Browse Tags</button><br><br>\
    </center></div>\
  </div>');
  $('#modalbody').append('\
  <div class="card mb-3">\
    <div class="card-header">\
      <i class="fa fa-book"></i>\
      Full Description\
    </div>\
    <div class="card-body">' + 
    converter.makeHtml(data.full_description) +
    '</div>\
  </div>');
});
// When the tags modal is launched clear it out and ask the server for the info
$('body').on('click', '.browsetags', function(){
  socket.emit('gettags', $(this).attr("value"));
  modalpurge();
  $('#modaltitle').append($(this).attr("value").replace('_/','') + ' Repo Tags' );
  $('#modalloading').show();
});
// When the server sends tag info populate tags modal
socket.on('sendtagsinfo', function(arr) {
  var data = arr[0];
  var name = arr[1];
  $('#modalloading').hide();
  $('#modalbody').show();
  $('#modalbody').append('<table style="width:100%" id="tagsresults" class="table table-bordered table-hover"></table>');
  $('#tagsresults').append('<thead><tr><th>Name</th><th>Size</th><th>Updated</th><th></th></tr></thead>');
  for (i = 0; i < data.length; i++){
    var tag = data[i].name;
    var size = data[i].full_size;
    var updated = data[i].last_updated;
    $('#tagsresults').append('<tr><td>' + tag + '</td><td>' + (size / 1000000) + ' MB' + '</td><td>' + updated + '</td><td><button type="button" style="cursor:pointer;" class="btn btn-primary btn-xs pullimage" value="' + name.replace('_/','') + ':' + tag  + '"><i class="fa fa-download"></i> Pull</button></td></tr>')
  }  
});
// Pull image at specific tag
$('body').on('click', '.pullimage', function(){
  socket.emit('sendpullcommand', $(this).attr("value"));
  modalpurge();
  $('#modaltitle').append('Pulling ' + $(this).attr("value"));
  $('#modalloading').show();
});
// Show console output for pull
socket.on('sendpullstart', function(output) {
  $('#modalconsole').show();
  $('#modalconsole').append(output)
});
socket.on('sendpulloutput', function(output) {
  $('#modalconsole').append(output);
});
socket.on('sendpulloutputdone', function(output) {
  $('#modalloading').hide();
  $('#modalconsole').append(output);
  $('#modalfooter').show();
  $('#modalfooter').append('\
  <button type="button" class="btn btn-success" data-dismiss="modal">Close <i class="fa fa-check"></i></button>\
  ');  
});
// Launch a single container (just console for now)
$('body').on('click', '.launchcontainer', function(){
  socket.emit('sendlaunchcommand', $(this).attr("value"));
  modalpurge();
  $('#modaltitle').append('Launching ' + $(this).attr("value"));
  $('#modalloading').show();
  $('#modalconsole').show();
});
socket.on('container_update', function(output) {
  $('#modalconsole').append(output);
});
socket.on('container_finish', function(output) {
  $('#modalloading').hide();
  $('#modalconsole').append(output);
  $('#modalfooter').show();
  $('#modalfooter').append('\
  <button type="button" class="btn btn-success" data-dismiss="modal">Close <i class="fa fa-check"></i></button>\
  ');
});

//// Taisun Stacks Rendering
// When the server gives us the stacks parse them
socket.on('stacksresults', function(data) {
  $('#taisunstacks').empty();
  // If the file is invalid show error
  if (data.stacktemplates == null || data.stacktemplates == undefined){
    $('#taisunstacks').append('<center><h2>Error Fetching file</h2></center>');
  }
  else {
    // Create table for taisun results
    $('#taisunstacks').append('<table style="width:100%" id="stackstable" class="table table-bordered table-hover"></table>');
    $('#stackstable').append('<thead><tr><th></th><th>Name</th><th>Description</th><th></th></tr></thead>');
    for (i = 0; i < data.stacktemplates.length; i++){
      var name = data.stacktemplates[i].name;
      var description = data.stacktemplates[i].description;
      var iconurl = data.stacktemplates[i].icon;
      var dataurl = data.stacktemplates[i].stackdata;
      $('#stackstable').append('<tr height="130"><td><center><img src="' + iconurl + '"></center></td><td>' + name + '</td><td>' + description + '</td><td><button type="button" data-toggle="modal" data-target="#modal" style="cursor:pointer;" class="btn btn-primary btn-xs configurestack" value="' + dataurl + '">Configure and Launch <i class="fa fa-rocket"></i></button></td></tr>')
    }
  }
});
// When the configure button is clicked send the URL to the server and give the user a spinner
$('body').on('click', '.configurestack', function(){
  socket.emit('sendstackurl', $(this).attr("value"));
  modalpurge();
  $('#modaltitle').append('Pulling definition from ' + $(this).attr("value"));
  $('#modalloading').show();
});
// When the configuregeneric button is clicked send the container Image name to the server
$('body').on('click', '.configuregeneric', function(){
  socket.emit('sendimagename', $(this).attr("value"));
  modalpurge();
  $('#modaltitle').append('Generating Launch form for ' + $(this).attr("value"));
  $('#modalloading').show();
});

// When the server sends us the stack data render in the configure modal
socket.on('stackurlresults', function(data) {
  $('#modalloading').hide();
  var name = data[0];
  var markdown = data[1];
  var url = data[3];
  $('#modaltitle').empty();
  $('#modaltitle').append(name);
  $('#modalbody').show();
  $('#modalbody').append(converter.makeHtml(markdown));
  $('#modalbody').append('\
  <div class="card mb-3">\
    <div class="card-header">\
      <i class="fa fa-pencil"></i>\
      Launch Options\
    </div>\
    <div class="card-body">' + 
       formbuilder(data[2]) +
    '</div>\
  </div>');
  $('#modalfooter').show();
  $('#modalfooter').append('\
  <button type="button" class="btn btn-danger" data-dismiss="modal">Cancel <i class="fa fa-times-circle-o"></i></button>\
  <button type="button" class="btn btn-success" id="createstack" value="' + url + '">Create<i class="fa fa-rocket"></i></button>\
  ');
});
// Convert the body object we get from the server into a bootstrap form
function formbuilder(data){
  var formdata = '';
  // Loop through the form elements and render based on type
  for (i = 0; i < data.length; i++){
    if(i !== data.length -1) { 
      formdata += inputbuild(data[i]);
    }
    else {
      formdata += inputbuild(data[i]);
      return formdata;
    }
  }
}
//individual input lines
function inputbuild(input) {
  var type = input.type;
  switch(type){
    case 'input':
      if (input.value){
      return '\
        <div class="form-group row">\
        <label class="col-sm-2 control-label">' + input.FormName + '</label>\
          <div class="col-sm-10">\
          <input type="text" data-label="' + input.label + '" class="form-control stackinputdata" value="' + input.value + '" placeholder="' + input.placeholder + '">\
          </div>\
        </div>';
      break;        
      }
      else {
      return '\
        <div class="form-group row">\
        <label class="col-sm-2 control-label">' + input.FormName + '</label>\
          <div class="col-sm-10">\
          <input type="text" data-label="' + input.label + '" class="form-control stackinputdata" placeholder="' + input.placeholder + '">\
          </div>\
        </div>';
      break;
      }
    case 'select':
      var options = '';
      var opts = input.options;
      for (i = 0; i < opts.length; i++){
        if(i !== opts.length -1) { 
          options += '<option value="' + opts[i] + '">' + opts[i] + '</option>';
        }
        else {
          options += '<option value="' + opts[i] + '">' + opts[i] + '</option>';
          return'\
          <div class="form-group row">\
            <label class="col-sm-2 control-label">' + input.FormName + '</label>\
              <div class="col-sm-10">\
              <select data-label="' + input.label + '" class="custom-select stackinputdata">' + 
                options +
              '</select>\
              </div>\
           </div>';
           break;
        }
      }
    case 'checkbox':
      return '\
        <div class="form-group row">\
        <label class="col-sm-2 control-label">' + input.FormName + '</label>\
          <div class="col-sm-10">\
          <input type="checkbox" value="false" data-label="' + input.label + '" class="form-check-input stackinputdata">\
          </div>\
        </div>';
      break;
    case 'textarea':
      if (input.value){
      return '\
        <div class="form-group row">\
        <label class="col-sm-2 control-label">' + input.FormName + '</label>\
          <div class="col-sm-10">\
          <textarea data-label="' + input.label + '" class="form-control stackinputdata" value="' + input.value + '" placeholder="' + input.placeholder + '" rows="3"></textarea>\
          </div>\
        </div>';
      break;        
      }
      else {
      return '\
        <div class="form-group row">\
        <label class="col-sm-2 control-label">' + input.FormName + '</label>\
          <div class="col-sm-10">\
          <textarea type="text" data-label="' + input.label + '" class="form-control stackinputdata" placeholder="' + input.placeholder + '" rows="3"></textarea>\
          </div>\
        </div>';
      break;
      }
    case 'advanced':
      return '\
        <div class="form-group row">\
        <label class="col-sm-2 control-label">Command</label>\
          <div class="col-sm-10">\
          <input type="text" data-label="command" class="form-control stackinputdata" placeholder="Leave empty to run default">\
          </div>\
        </div>\
        <div class="form-group row">\
        <label class="col-sm-2 control-label">Volumes</label>\
          <div class="col-sm-10">\
          <textarea data-label="volumes" class="form-control stackinputdata" placeholder="To enter multiple use line breaks (enter) Format /hostfolder:/containerfolder" rows="3"></textarea>\
          </div>\
        </div>\
        <div class="form-group row">\
        <label class="col-sm-2 control-label">Ports</label>\
          <div class="col-sm-10">\
          <textarea data-label="ports" class="form-control stackinputdata" rows="3" placeholder="To enter multiple use line breaks (enter) Format <hostport>:<containerport>"></textarea>\
          </div>\
        </div>\
        <div class="form-group row">\
        <label class="col-sm-2 control-label">Environment Variables</label>\
          <div class="col-sm-10">\
          <textarea data-label="envars" class="form-control stackinputdata" rows="3" placeholder="To enter multiple use line breaks (enter) Format MYENVVALUE=SOMEVALUE"></textarea>\
          </div>\
        </div>';
      break;
    // If hidden return nothing
    case 'hidden':
      break;
    // if no matches return blank  
    default:
      return '';
  }
}
// Send the form data to the server
$('body').on('click', '#createstack', function(){
  var inputs = {};
  var url = $("#createstack").val();
  // Create an object with all the inputs for nunchucks
  $(".stackinputdata").each(function() {
    if ($(this).is(':checked') == true ) {
      var label = $(this).data('label');
      inputs[label] = 'true';
    }
    else if ($(this).is("textarea") ) {
      var value = $(this).val();
      if (value != '') {
        var label = $(this).data('label');
        inputs[label] = value.split("\n");
      }
    }
    else {
      var value = $(this).val();
      if (value != '') {
        var label = $(this).data('label');
        inputs[label] = value;
      }
    }
  }).promise().done(function(){
    socket.emit('launchstack',{"stackurl":url,"inputs":inputs});
    modalpurge();
    $('#modalloading').show();
    $('#modaltitle').append('Launching ' + url);
    $('#modalconsole').show();
  });
});
// Show output from launch command
socket.on('stackupdate', function(data) {
  $('#modalconsole').append(data);
});
// On finish remove spinner and add close button
socket.on('stacklaunched', function(data) {
  $('#modalloading').hide();
  $('#modalconsole').append(data);
  $('#modalfooter').show();
  $('#modalfooter').append('\
  <button type="button" class="btn btn-success" data-dismiss="modal">Close <i class="fa fa-check"></i></button>\
  ');
});

//// Render the remote access pages ////
function renderremote(){
  $('.nav-item').removeClass('active');
  $('#Remotenav').addClass('active');
  $('#pagecontent').empty();
  $('#pageheader').empty();  
  socket.emit('checkremote');
}
// Render the page based on the response from the server
socket.on('renderremote', function(data){
  if (data == 'no'){
    renderremotestart();
  }
  else {
    rendergateway(data);
  }
});

// Start page for remote access
function renderremotestart() {
  $('#pagecontent').append('\
  <div class="card mb-3">\
    <div class="card-header">\
      <i class="fa fa-sitemap"></i>\
      Remote access quickstart\
    </div>\
    <div class="card-body">\
      <center>\
        <h2>You will need a DNS endpoint that points to your IP to continue <a href="https://api.taisun.io/prod/genurl" target="_blank">Click Here</a> to generate one</h2>\
        <br>\
        <button type="button" class="btn btn-lg btn-primary configurestack" data-toggle="modal" data-target="#modal" value="http://localhost/public/stackstemp/taisungateway.yml">I have an Endpoint</button>\
      </center>\
    </div>\
  </div>\
  ');
}
// Gateway management page
function rendergateway(data) {
  var envars = data[0];
  var clientconfig = data[1];
  $('#pagecontent').append('\
  <div class="card mb-3">\
    <div class="card-header">\
      <i class="fa fa-sitemap"></i>\
      Taisun Gateway Status\
    </div>\
    <div class="card-body">\
        <p> A chrome extension for using the web proxy can be found <a href="https://chrome.google.com/webstore/detail/taisun-connect/cfikmlkjcnlbabkghfcnakfcbgnokkpd" target="_blank">here</a></p><br>\
        <table id="gatewaytable" class="table table-bordered">\
          <tr><td>State</td><td>' + envars.State.Status + '</td></tr>\
          <tr><th>Env Variable</th><th>Value</th></tr>\
        </table>\
    </div>\
  </div>\
  <div class="card mb-3">\
    <div class="card-header">\
      <i class="fa fa-file-code-o"></i>\
      OpenVPN Client File\
    </div>\
    <div class="card-body">\
    <pre>' + clientconfig + '<pre>\
    </div>\
  </div>\
  ').promise().done(function(){
    var envarr = envars.Config.Env;
    for (i = 0; i < envarr.length; i++){
      var key = envarr[i].split('=')[0];
      var value = envarr[i].split('=')[1];
      if (key == 'SQUIDPASS'){
        $('#gatewaytable').append('<tr><td>' + key + '</td><td>***********</td></tr>');
      }
      else {
        $('#gatewaytable').append('<tr><td>' + key + '</td><td>' + value + '</td></tr>');
      }
    }
  });
}


//// Render the remote access pages ////
function renderportainer(){
  $('.nav-item').removeClass('active');
  $('#Portainernav').addClass('active');
  $('#pagecontent').empty();
  $('#pageheader').empty();  
  socket.emit('checkportainer');
}
// Render the page based on the response from the server
socket.on('renderportainer', function(data){
  if (data == 'no'){
    renderportainerstart();
  }
  else {
    renderportainerrunning(data);
  }
});

// Start page for remote access
function renderportainerstart() {
  $('#pagecontent').append('\
  <div class="card mb-3">\
    <div class="card-header">\
      <i class="fa fa-docker"></i>\
      Portainer quickstart\
    </div>\
    <div class="card-body">\
      <center>\
        <h2>Portainer is a great web based management interface for docker.<br>It has more polished features than Taisun for basic container management <a href="https://portainer.io/" target="_blank">Portainer.io</a></h2>\
        <br>\
        <button type="button" class="btn btn-lg btn-primary configurestack" data-toggle="modal" data-target="#modal" value="http://localhost/public/stackstemp/taisunportainer.yml">Launch Portainer</button>\
      </center>\
    </div>\
  </div>\
  ');
}

//// Render the portainer page ////
function renderportainerrunning(){
  $('#pagecontent').empty();
  $('#pageheader').empty(); 
  $('#pagecontent').append('<iframe src="http://' + host + ':9000" frameborder="0"style="position: relative; height: calc(100vh - 95px); width: 100%;"></iframe>')
}

// Purge the modal of data
function modalpurge(){
  $('#modaltitle').empty();
  $('#modalbody').empty();
  $('#modalconsole').empty();
  $('#modalfooter').empty();
  $('#modalloading').hide();
  $('#modalbody').hide();
  $('#modalconsole').hide();
  $('#modalfooter').hide();
}
//// Grabbed from the admin template ////
// Configure tooltips for collapsed side navigation
$('.navbar-sidenav [data-toggle="tooltip"]').tooltip({
  template: '<div class="tooltip navbar-sidenav-tooltip" role="tooltip"><div class="arrow"></div><div class="tooltip-inner"></div></div>'
});
// Toggle the side navigation
$("#sidenavToggler").click(function(e) {
  e.preventDefault();
  $("body").toggleClass("sidenav-toggled");
  $(".navbar-sidenav .nav-link-collapse").addClass("collapsed");
  $(".navbar-sidenav .sidenav-second-level, .navbar-sidenav .sidenav-third-level").removeClass("show");
});
// Force the toggled class to be removed when a collapsible nav link is clicked
$(".navbar-sidenav .nav-link-collapse").click(function(e) {
  e.preventDefault();
  $("body").removeClass("sidenav-toggled");
});
// Prevent the content wrapper from scrolling when the fixed side navigation hovered over
$('body.fixed-nav .navbar-sidenav, body.fixed-nav .sidenav-toggler, body.fixed-nav .navbar-collapse').on('mousewheel DOMMouseScroll', function(e) {
  var e0 = e.originalEvent,
    delta = e0.wheelDelta || -e0.detail;
  this.scrollTop += (delta < 0 ? 1 : -1) * 30;
  e.preventDefault();
});
// Scroll to top button appear
$(document).scroll(function() {
  var scrollDistance = $(this).scrollTop();
  if (scrollDistance > 100) {
    $('.scroll-to-top').fadeIn();
  } else {
    $('.scroll-to-top').fadeOut();
  }
});
// Smooth scrolling using jQuery easing
$(document).on('click', 'a.scroll-to-top', function(event) {
  var $anchor = $(this);
  $('html, body').stop().animate({
    scrollTop: ($($anchor.attr('href')).offset().top)
  }, 1000, 'easeInOutExpo');
  event.preventDefault();
});