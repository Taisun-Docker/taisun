// Taisun Launch page
// Client side javascript


// Initiate a websocket connection to the server
var host = window.location.hostname; 
var port = window.location.port;
var converter = new showdown.Converter({parseImgDimensions: true});
var socket = io.connect('http://' + host + ':' + port, {
});
// When Local is clicked render
$("#local").click(function(){
  renderlocal();
});
// When Dockerhub is clicked render
$("#dockerhub").click(function(){
  renderdockerhub();
});  
// When dockerhub is clicked render
//// Page renders for launching ////
// Local Images
function renderlocal(){
  $('#launchcontent').empty();
  $('#launchcontent').append('\
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
            '<button type="button" style="cursor:pointer;" class="btn btn-primary btn-xs launchcontainer" data-dismiss="modal" data-toggle="modal" data-target="#launchconsole" value="' + image.RepoTags[0] + '"><i class="fa fa-rocket"></i> Launch</button>'] 
          );
        }
      }
    }
    imagestable.draw();
  });
}
// Dockerhub Page
function renderdockerhub(){
  $('#launchcontent').empty();
  $('#launchcontent').append('\
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
    <center><h2>No Results</h2></center>\
    </div>\
  </div>');
  document.getElementById("hubsearch").addEventListener("keydown", function (e) {
    if (e.keyCode === 13) { 
      dockersearch(1);
    }
  });
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
      $('#hubresults').append('<tr><td>' + name + '</td><td>' + '<i class="fa fa-star-o"></i>' + stars + '</td><td>' + description + '</td><td><button type="button" data-toggle="modal" data-target="#pull" style="cursor:pointer;" class="btn btn-primary btn-xs hubinfo" value="' + name + '"><i class="fa fa-download"></i> Pull</button></td></tr>')
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
  $('#pulltitle').empty();
  $('#pulltitle').append($(this).attr("value").replace('_/','') + ' Image Information' );
  $('#pullbody').empty();
  $('#pullbody').append('<i class="fa fa-refresh fa-spin" style="font-size:36px"></i>');
});
// Render in info page for image on pull modal
socket.on('sendhubinfo', function(data) {
  $('#pullbody').empty();
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
  $('#pullbody').append('\
  <div class="row">\
    <div class="col-lg-8">' +
      description + '<br><br>\
      <ul class="list-group" style="width:30%;">\
        <li class="list-group-item justify-content-between">Stars <span class="badge badge-primary badge-pill pull-right">' + stars + '</span></li>\
        <li class="list-group-item justify-content-between">Pulls <span class="badge badge-primary badge-pill pull-right">' + pullcount + '</span></li>\
      </ul><br>\
    </div>\
    <div class="col-lg-4"><br><center>\
      <button type="button" style="cursor:pointer;" class="btn btn-success btn-xs pullimage" data-dismiss="modal" data-toggle="modal" data-target="#pullconsole" value="' + (user + '/' + name).replace('_/','') + ':latest' + '"><i class="fa fa-download"></i> Pull Latest</button><br><br>\
      <button type="button" style="cursor:pointer;" data-dismiss="modal" data-toggle="modal" data-target="#tags" class="btn btn-primary btn-xs browsetags" value="' + user + '/' + name + '"><i class="fa fa-eye"></i> Browse Tags</button><br><br>\
    </center></div>\
  </div>');
  $('#pullbody').append('\
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
  $('#tagstitle').empty();
  $('#tagstitle').append($(this).attr("value").replace('_/','') + ' Repo Tags' );
  $('#tagsbody').empty();
  $('#tagsbody').append('<i class="fa fa-refresh fa-spin" style="font-size:36px"></i>');
});
// When the server sends tag info populate tags modal
socket.on('sendtagsinfo', function(arr) {
  var data = arr[0];
  var name = arr[1];
  $('#tagsbody').empty();
  $('#tagsbody').append('<table style="width:100%" id="tagsresults" class="table table-bordered table-hover"></table>');
  $('#tagsresults').append('<thead><tr><th>Name</th><th>Size</th><th>Updated</th><th></th></tr></thead>');
  for (i = 0; i < data.length; i++){
    var tag = data[i].name;
    var size = data[i].full_size;
    var updated = data[i].last_updated;
    $('#tagsresults').append('<tr><td>' + tag + '</td><td>' + (size / 1000000) + ' MB' + '</td><td>' + updated + '</td><td><button type="button" style="cursor:pointer;" class="btn btn-primary btn-xs pullimage" data-dismiss="modal" data-toggle="modal" data-target="#pullconsole" value="' + name.replace('_/','') + ':' + tag  + '"><i class="fa fa-download"></i> Pull</button></td></tr>')
  }  
});
// Pull image at specific tag
$('body').on('click', '.pullimage', function(){
  socket.emit('sendpullcommand', $(this).attr("value"));
  $('#pullconsoletitle').empty();
  $('#pullconsoletitle').append('Pulling ' + $(this).attr("value"));
  $('#pullconsolebody').empty();
  $('#pullconsolebody').append('<i class="fa fa-refresh fa-spin" style="font-size:36px"></i>');
});
// Show console output for pull
socket.on('sendpullstart', function(output) {
  $('#pullconsolebody').empty();
  $('#pullconsolebody').append('<pre>' + output + '</pre>')
});
socket.on('sendpulloutput', function(output) {
  $('#pullconsolebody').append('<pre>' + output + '</pre>')
});
// Launch a single container (just console for now)
$('body').on('click', '.launchcontainer', function(){
  socket.emit('sendlaunchcommand', $(this).attr("value"));
  $('#launchconsoletitle').empty();
  $('#launchconsoletitle').append('Launching ' + $(this).attr("value"));
  $('#launchconsolebody').empty();
});
socket.on('container_update', function(output) {
  $('#launchconsolebody').append('<pre>' + output + '</pre>')
});

// Render local page on page load
renderlocal();



// Grabbed from the admin template
(function($) {
  "use strict"; // Start of use strict
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
  // Configure tooltips globally
  $('[data-toggle="tooltip"]').tooltip();
  // Smooth scrolling using jQuery easing
  $(document).on('click', 'a.scroll-to-top', function(event) {
    var $anchor = $(this);
    $('html, body').stop().animate({
      scrollTop: ($($anchor.attr('href')).offset().top)
    }, 1000, 'easeInOutExpo');
    event.preventDefault();
  });
  // Call the dataTables jQuery plugin
  $(document).ready(function() {
    $('#dataTable').DataTable();
  });
})(jQuery);