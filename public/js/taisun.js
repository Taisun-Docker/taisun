// Taisun
// Client side javascript

$(document).ready(function(){
  // Initiate a websocket connection to the server
  var host = window.location.hostname; 
  var port = window.location.port;
  var socket = io.connect('http://' + host + ':' + port, {
  });
  // When the desktop form is submitted send the reqest to the server
  $("#createdesktop").click(function(){
    socket.emit('createdesktop', $('#desktopname').val(),$('#socket').val());
  });
  // When the destroy desktop form is submitted send the reqest to the server
  $("#destroydesktop").click(function(){
    socket.emit('destroydesktop', $('#desktop-destroy').val());
  });
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
});


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
})(jQuery); // End of use strict
