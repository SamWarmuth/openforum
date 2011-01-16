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
  entity.css("left", data.xLocation + "px").css("top", data.yLocation + "px");
  var pixel = $("#p" + data.entityID);
  pixel.css("left", data.xLocation/24 + "px").css("top", data.yLocation/24 + "px");
  
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
  if (data.creator_id == UserID) return false
  if (data.type == "create"){  
    var color = "" + (9 - data.power) + (9 - data.power) + (9 - data.power);
    var wall = $("<div class='wall' style='top: " + data.y + "px; left: " + data.x + "px; background-color: #" +color +";'></div>").attr("id", data.wall_id);
    $(".map-view").append(wall);
    
    var pixel = $("<div class='pixel' style='top: " + data.y/24 + "px; left: " + data.x/24 + "px; background-color: #" + color+";'></div>").attr("id", "p" + data.wall_id);
    $(".birds-eye").append(pixel);
    obstructingObjects[data.x/16][data.y/16] = true;
    
  } else {
    console.log("removing " + data.wall_id + ".");
    obstructingObjects[data.x/16][data.y/16] = null;
    $("#"+data.wall_id).remove();
    $("#p"+data.wall_id).remove();
  }
});


pusher.bind('edituser', function(data){
  if (data.user_id == UserID) return false
  if (data.type == "create"){  
    var entity = $("<div class='entity' style='display: none; top: " + data.y + "px; left: " + data.x + "px; background-color: "+ data.color + ";'><div class='callout'>" + data.name + "</div></div>").attr("id", data.user_id);
    $(".map-view").append(entity);
    entity.fadeIn(500);
    
    var pixel = $("<div class='pixel' style='top: " + data.y/24 + "px; left: " + data.x/24 + "px; background-color: " + data.color + ";'></div>").attr("id", "p" + data.user_id);
    $(".birds-eye").append(pixel);
    obstructingObjects[data.x/16][data.y/16] = true;
    addStatus("<b>"+data.name + "</b> has entered this forum.");
  } else {
    console.log("removing " + data.user_id + ".");
    entity = $("#" + data.user_id);
    var pos = entity.position();
    obstructingObjects[pos.left/16][pos.top/16] = null;
    entity.fadeOut(300, function(){
      entity.remove();
    });
    $("#p"+data.user_id).remove();
  }
});


$(document).ready(function(){
  updateViewport();
  
  $('.loading-mask').hide();
  //humanMsg.displayMsg('<strong>Welcome to the Metaverse.</strong>');
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
    $("#chat-input").focus();
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
      $("#chat-input").focus();
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
    if (e.keyCode == SPACE){
      if ($(e.target).hasClass("body")) return false;
    }
  });
  $(document).keyup(function(e){
    $(".you").stop();
  });
  
  $(".just-name").click(function(){
    changeName($(".new-name").val());
    $(".new-user-signup").hide();
    $(".new-user-signup-overlay").hide();
  });
  $(".permanent").click(function(){
    var name = $(".new-name").val();
    var email = $(".email").val();
    var password = $(".password").val();
    setAccountDetails(name, email, password);
    $(".new-user-signup").hide();
    $(".new-user-signup-overlay").hide();
  });
});

function changeName(name){
  userName = name;
  $.post("/change-name", {name: name});
}

function setAccountDetails(name, email, password){
  userName = name;
  $.post("/set-account-details", {name: name, email: email, password: password});
}

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
  addMessage(UserName, color, message);
  $.post("/send-message", {x: loc.left, y: loc.top, content: message, distance: chatDistance});
  
  console.log("You ("+loc.left+":"+loc.top+"): "+message);
}

function addStatus(content){
  var status = $("<div class='message'><em>" + content + "</em></div>");
  status.appendTo(".message-list");
}

function addMessage(sender, color, content){
  var message = $("<div class='message'><div class='sender'>"+sender+"</div>"+content+"</div>")
  message.children().css("color", color);
  message.appendTo(".message-list");
  $(".message-list").stop(true,true).animate({ scrollTop: $(".message-list").attr("scrollHeight")}, 500);
  
  return true;
}

function updateViewport(){
  loc = $(".you").position()
  var map = $(".map-container");
  var mapWidth = map.width();
  var mapHeight = map.height();
  var leftSide = loc.left - (mapWidth/2);
  var topSide = loc.top - (mapHeight/2);
  if (leftSide < 0) leftSide = 0;
  if (topSide < 0) topSide = 0;
  var totalWidth = $(".map-view").width();
  var totalHeight = $(".map-view").height();
  
  if (leftSide + mapWidth > totalWidth) leftSide = totalWidth - mapWidth;
  if (topSide + mapHeight > totalHeight) topSide = totalHeight - mapHeight;
  
  map.scrollLeft(leftSide);
  map.scrollTop(topSide);
  $(".location-box").css("width", (mapWidth/24)+"px").css("height", (mapHeight/24)+"px").css("left", (leftSide/24 - 1)+"px").css("top", (topSide/24 - 1)+"px")
  
  var pixel = $("#p" + userID);
  pixel.css("left", loc.left/24 + "px").css("top", loc.top/24 + "px");
}

locationCount = 0
function updateLocation(){
  //send message to server with current map location
  locationCount++;
  var store = "false";
  if (locationCount % 10 == 0) store = "true"
  loc = $(".you").position()
  updateViewport();
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
  var pixel = $("<div class='pixel' style='top: " + y/24 + "px; left: " + x/24 + "px; background-color:" + UserColor + ";'></div>")
  $(".birds-eye").append(pixel);
  $.post("/edit-wall", {x: x, y: y, type: "create"}, function(data){
    wall.attr('id', data);
    pixel.attr('id', "p" + data);
    
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
  
  var wallID = existing.attr('id');
  $("#p"+wallID).remove();
  
  $.post("/edit-wall", {x: x, y: y, wall_id: wallID, type: "destroy"});
  console.log("destroyed wall");
  obstructingObjects[x/16][y/16] = null;
}

function setObstructions(){
  obstructingObjects = new Array($('.map-view').width() / 16);
  var mapHeight = $('.map-view').height() / 16;
  for (i = 0; i < obstructingObjects.length; i++) obstructingObjects[i] = new Array(mapHeight);
  
  $(".entity, .wall, .question").each(function(){
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