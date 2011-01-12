var LARROW = 37;
var UARROW = 38;
var RARROW = 39;
var DARROW = 40;
var SPACE = 32;
var ENTER = 13;
var ZKEY = 122;
var TKEY = 84;

var MapID = window.mapID;
var UserID = window.userID;
var UserPower = window.userPower;
var UserName = window.userName;

var UserColor = "";

var clickCreate = "wall";

var chatDistance = 128;

var obstructingObjects;


pusher = new Pusher('834b3ca0e7e453c73863', MapID);

pusher.bind('locationupdate', function(data) {
  if (data.entityID == UserID) return false;
  var entity = $("#" + data.entityID);
  if (entity.data("lastMoved") > data.date) return false;
  entity.data("lastMoved", data.date);
  var pos = entity.position();
  obstructingObjects[pos.left/16][pos.top/16] = null;
  entity.animate({left: data.xLocation}, 0).animate({top: data.yLocation}, 0);
  obstructingObjects[data.xLocation/16][data.yLocation/16] = true;
  
});

pusher.bind('message', function(data){
  var entity = $("#"+data.entityID);
  var color = entity.css('background-color');
  if (UserID != data.entityID){
    console.log(distanceTo(entity) + " from you (max: "+data.distance+")");
    pulse(entity, data.distance);
    if (distanceTo(entity) < data.distance) addMessage(data.username, color, data.content);
  }
});

pusher.bind('editwall', function(data){
  $(".map-view").append(wall);
  if (data.creator_id == UserID) return false
  if (data.type == "create"){    
    var wall = $("<div class='wall' style='top: " + data.y + "px; left: " + data.x + "px; background-color: #" + (9 - data.power) + (9 - data.power) + (9 - data.power)+";'></div>").attr("id", data.wall_id);
    $(".map-view").append(wall);
    
    obstructingObjects[data.x/16][data.y/16] = true;
    
  } else {
    console.log("removing " + data.wall_id + ".");
    var pos = 
    obstructingObjects[data.x/16][data.y/16] = null;
    $("#"+data.wall_id).remove();
  }
});


$(document).ready(function(){
  var initloc = $(".you").position()
  var initmap = $(".map-container");
  initmap.scrollLeft(initloc.left - (initmap.width()/2));
  initmap.scrollTop(initloc.top - (initmap.height()/2));
  $('.loading-mask').hide();
  humanMsg.displayMsg('<strong>Welcome to the Metaverse.</strong>');
  $("#chat-input").focus();
  
  new Dragdealer('distance-slider',
  {
    x: 0.5,
    animationCallback: function(x, y)
    {
      chatDistance = 512*x*x + 8;
      var ring = $(".reach-ring");
      var you = $(".you")
      var pos = you.position();
      ring.css('left', (6 + chatDistance/-1)+'px').css('top', (6 + chatDistance/-1)+'px');
      ring.width(chatDistance*2);
      ring.height(chatDistance*2);
      ring.css('border-radius', (chatDistance)+'px');
      if (x < 0.2){
        $(".red-bar").text("Whisper");
      } else if ( x < 0.4){
        $(".red-bar").text("Quiet");
      } else if (x < 0.65){
        $(".red-bar").text("Medium");
      } else if (x < 0.85){
        $(".red-bar").text("Yell");
      } else {
        $(".red-bar").text("Shout");
      }
      console.log(x);
    }
  });
  UserColor = $("#user-power").css("background-color");
  UserPower = rgb2power(UserColor);
  
  setObstructions();
  
  window.setInterval("glow()", 750)
  $(".message-list").stop(true,true).animate({ scrollTop: $(".message-list").attr("scrollHeight") }, 0);

  $(".settings-tab").click(function(){
    if ($(".settings").position().top < -10){
      $(".settings").animate({top: 0}, 500);
    }else{
      $(".settings").animate({top: -150}, 500);
    }
    
  });
  
  $(".entity").live("mouseover", function(){
    $(this).children(".callout").show();
  });
  
  $(".entity").live("mouseout", function(){
    $(this).children(".callout").hide();
  });
  
  
  $(".map-view").click(function(e){
    x = ($(".map-container").scrollLeft() + e.pageX) - ($(".map-container").scrollLeft() + e.pageX)%16;
    y = ($(".map-container").scrollTop() + e.pageY) - ($(".map-container").scrollTop() + e.pageY)%16;
    if ($(".entity").filter(function(){
      return ($(this).position().top == y && $(this).position().left == x)
    }).length != 0) return true;
    
    if (obstructingObjects[x/16][y/16] == null) {
      if (clickCreate == "wall") createWall(x,y);
    } else {   
      if (clickCreate == "wall") destroyWall(x,y);
    }
  });

  $(document).keydown(function(e){
    if (e.keyCode >= LARROW && e.keyCode <= DARROW){
      humanMsg.removeMsg();
      var pos = $(".you").position();
      obstructingObjects[pos.left/16][pos.top/16] = null;
      $(".you").stop(true, true);
      if (e.keyCode == LARROW){
        if (pos.left - 16 < 0) return false;
        if (!obstructed(pos.left-16, pos.top)) $('.you').css('left', pos.left-16);
      }
      if (e.keyCode == UARROW){
        if (pos.top - 16 < 0) return false;
        if (!obstructed(pos.left, pos.top-16)) $('.you').css('top', pos.top-16);
      }  
      if (e.keyCode == RARROW){
        if (pos.left + 16 >= $('.map-view').width()) return false;
        if (!obstructed(pos.left+16, pos.top)) $('.you').css('left', pos.left+16);
      }  
      if (e.keyCode == DARROW){
        if (pos.top + 16 >= $('.map-view').height()) return false;
        
        if (!obstructed(pos.left, pos.top+16)) $('.you').css('top', pos.top+16);
      }
      newpos = $(".you").position();
      obstructingObjects[newpos.left/16][newpos.top/16] = true;
      
      if (pos.top != newpos.top || pos.left != newpos.left){
        updateLocation();
      }
      return false;
    }
    if (e.keyCode == ENTER){
      var message = $("#chat-input").val();
      $("#chat-input").val("");
      if (message == "") return false;
      sendMessage(message);
      pulse($(".you"), chatDistance);
      return false;
    }
    if (e.keyCode == TKEY){
      if ($(e.target).hasClass("body")){
        $("#chat-input").focus();
        return false;
      }
    }
    if (e.keyCode == SPACE){
      if ($(e.target).hasClass("body")) return false;
    }
  });
  $(document).keyup(function(e){
    $(".you").stop();
  });
});

function glow(){
  $(".you").animate({opacity: 0.5}, 50).animate({opacity: 1}, 50);
}

function pulse(entity, distance){
  entity = $(entity);
  var identity = (new Date).getTime();
  var ring = $("<div class='ring'></div>")
  var color = entity.css('background-color');
  ring.css({'left': entity.css('left'), 'top': entity.css('top'), 'border-color': color});
  
  $(".map-view").append(ring);
  //120px is 128px (centered) minus half the width/height of the circle
  ring.animate({left: "-="+(distance - 10)+"px",
                top: "-=" +(distance - 10)+"px",
                width: (distance*2 - 8) +'px',
                height: (distance*2 - 8) +'px',
                'border-radius': distance+'px', 
                opacity: '0.1'
               }, 500, 'easeOutQuad', function(){
    ring.remove();
  });
  return true;
}

function sendMessage(message){
  var color = $(".you").css('background-color');
  var loc = $(".you").position()
  addMessage($("#user-name").text(), color, message);
  $.post("/send-message", {x: loc.left, y: loc.top, content: message, distance: chatDistance});
  
  console.log("You ("+loc.left+":"+loc.top+"): "+message);
}

function addMessage(sender, color, content){
  var message = $("<div class='message'><div class='sender'>"+sender+"</div>"+content+"</div>")
  message.children().css("color", color);
  message.appendTo(".message-list");
  $(".message-list").stop(true,true).animate({ scrollTop: $(".message-list").attr("scrollHeight")}, 500);
  
  return true;
}

locationCount = 0
function updateLocation(){
  //send message to server with current map location
  locationCount++;
  var store = "false";
  if (locationCount % 10 == 0) store = "true"
  loc = $(".you").position()
  var map = $(".map-container");
  map.scrollLeft(loc.left - (map.width()/2));
  map.scrollTop(loc.top - (map.height()/2));
  
  $.post("/update-location", {x: loc.left, y: loc.top, store: store, date: (new Date).getTime()});
}

function distanceTo(entityB){
  var entityA = $(".you");
  var coordsA = [entityA.position().left, entityA.position().top];
  var entityB = $(entityB);
  var coordsB = [entityB.position().left, entityB.position().top];
  
  return Math.sqrt(Math.pow(coordsA[0] - coordsB[0], 2) + Math.pow(coordsA[1] - coordsB[1], 2));
}

function obstructed(x,y){
  return (obstructingObjects[x / 16][y / 16] == true)
}

function createWall(x,y){
  var wall = $("<div class='wall' style='top: " + y + "px; left: " + x + "px; background-color:"+UserColor+" ;'></div>");
  $(".map-view").append(wall);
  $.post("/edit-wall", {x: x, y: y, type: "create"}, function(data){
    wall.attr('id', data);
    console.log("returned wall id: " + data);
  });
  console.log("created wall");
  obstructingObjects[x/16][y/16] = true;
}

function destroyWall(x, y){
  var existing = $(".wall").filter(function(){
    return ($(this).position().top == y && $(this).position().left == x)
  });
  if (UserPower > rgb2power(existing.css("background-color"))) return false;
  existing.remove();
  
  $.post("/edit-wall", {x: x, y: y, wall_id: existing.attr('id'), type: "destroy"});
  console.log("destroyed wall");
  obstructingObjects[x/16][y/16] = null;
}

function setObstructions(){
  obstructingObjects = new Array($('.map-view').width() / 16);
  var mapHeight = $('.map-view').height() / 16;
  for (i = 0; i < obstructingObjects.length; i++) obstructingObjects[i] = new Array(mapHeight);
  
  $(".entity, .wall").each(function(){
    obstructingObjects[$(this).position().left/16][$(this).position().top/16] = true;
  });
}


function rgb2hex(rgb){
 rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
 return ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[3],10).toString(16)).slice(-2);
}
function rgb2power(rgb){
 hex = rgb2hex(rgb);
 return parseInt(hex, 16);
}