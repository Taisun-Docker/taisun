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
    var containertable = $('#dockercontainers').DataTable( {} );
    //Loop through the containers to build the table
    for (var container in containers){
      var info = containers[container];
      var ports = info.Ports;
      containertable.row.add( 
        [info.Names[0], 
        '<a href="http://' + host + ':' + ports[0].PublicPort + '" target="_blank">' + ports[0].PublicPort + '</a> => ' + ports[0].PrivatePort,
        info.Image, 
        info.State, 
        new Date( info.Created * 1e3).toISOString().slice(0,19),
        info.Command] 
      ).draw();
    }
    // Empty desktops Table
    $('#desktops').empty();
    for (var container in containers){
      var info = containers[container];
      var ports = info.Ports;
      if (info.Names[0].indexOf("taisunvdi_") != -1 ){
        $('#desktops').append(
  					'<div class="card text-center" style="width: 10rem;">' +
            '  <img class="card-img-top" src="/public/img/debian.png">' +
            '  <div class="card-block">' +
            '    <h4 class="card-title">' + info.Names[0].replace('/taisunvdi_','') +'</h4>' +
            '    <div class="card-footer">' + 
            '      <a href="/desktop/' + info.Id + '" target="_blank" class="btn btn-primary">Launch</a>' +
            '    </div>' + 
            '  </div>' +
            '</div>'
        );
      }
    }
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
