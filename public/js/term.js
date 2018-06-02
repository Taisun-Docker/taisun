// Initiate a websocket connection to the server
//import * as fit from './fit.js';
var host = window.location.hostname; 
var port = window.location.port;
var protocol = window.location.protocol;
var socket = io.connect(protocol + '//' + host + ':' + port, {});
var containerid = $('#containerid').val();
var shell = $('#shell').val();
$(document).ready(function(){
  var terminalContainer = document.getElementById('terminal-container');
  var term = new Terminal({cursorBlink: true});
  term.open(terminalContainer);
  var geometry = proposeGeometry(term);
  socket.emit('spawnterm', containerid, geometry.cols, geometry.rows, shell );
  // Browser -> Backend
  term.on('data', function (data) {
    fit(term);
    socket.emit('termdata', data);
  });
  // Backend -> Browser
  socket.on('termdata', function (data) {
    term.write(data);
  });
  // When window is closed terminate the shell
  window.onbeforeunload = closepid;
  function closepid(){
   socket.emit('killterm');
   return null;
  }
  // Resize TTY when window stops resizing
  $(window).resize(function() {
    if(this.resizeTO) clearTimeout(this.resizeTO);
    this.resizeTO = setTimeout(function() {
      $(this).trigger('resizeEnd');
    }, 500);
  });
  $(window).bind('resizeEnd', function() {
    resizeterm();
  });
  function resizeterm(){
    fit(term);
    var geometry = proposeGeometry(term);
    socket.emit('resizeterm', geometry.cols, geometry.rows);
  }
});


// Fit logic pulled xterm fit addon and modified to send geometry to docker for tty

function proposeGeometry(term) {
  if (!term.element.parentElement) {
    return null;
  }
  var parentElementStyle = window.getComputedStyle(term.element.parentElement);
  var parentElementHeight = parseInt(parentElementStyle.getPropertyValue('height'));
  var parentElementWidth = Math.max(0, parseInt(parentElementStyle.getPropertyValue('width')) - 17);
  var elementStyle = window.getComputedStyle(term.element);
  var elementPaddingVer = parseInt(elementStyle.getPropertyValue('padding-top')) + parseInt(elementStyle.getPropertyValue('padding-bottom'));
  var elementPaddingHor = parseInt(elementStyle.getPropertyValue('padding-right')) + parseInt(elementStyle.getPropertyValue('padding-left'));
  var availableHeight = parentElementHeight - elementPaddingVer;
  var availableWidth = parentElementWidth - elementPaddingHor;
  var geometry = {
    cols: Math.floor(availableWidth / term.renderer.dimensions.actualCellWidth),
    rows: Math.floor(availableHeight / term.renderer.dimensions.actualCellHeight)
  };
  return geometry;
}

function fit(term) {
  var geometry = proposeGeometry(term);
  if (geometry) {
    // Force a full render
    if (term.rows !== geometry.rows || term.cols !== geometry.cols) {
      term.renderer.clear();
      term.resize(geometry.cols, geometry.rows);
    }
  }
}