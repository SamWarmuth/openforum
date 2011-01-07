LARROW = 37;
UARROW = 38;
RARROW = 39;
DARROW = 40;
SPACE = 32;
ENTER = 13;
ZKEY = 122;
TKEY = 84;


pusher = new Pusher('834b3ca0e7e453c73863', "global");

pusher.bind('locationupdate', function(data) {
  if (data.entityID == $("#user-id").text()) return false;
  $("#" + data.entityID).animate({left: data.xLocation}, 0).animate({top: data.yLocation}, 0)
});

pusher.bind('message', function(data){
  var entity = $("#"+data.entityID);
  var color = entity.css('background-color');
  if ($("#user-id").text() != data.entityID){
    console.log(distanceTo(entity) + " from you (max: "+data.distance+")");
    pulse(entity);
    if (distanceTo(entity) < data.distance) addMessage(data.username, color, data.content);
  }
});

pusher.bind('editwall', function(data){
  $(".map-view").append(wall);
  if (data.creator_id == $("#user-id").text()) return false
  if (data.type == "create"){    
    var wall = $("<div class='wall' style='top: " + data.y + "px; left: " + data.x + "px;'></div>");
    $(".map-view").append(wall);
  } else {
    var existing = $(".wall").filter(function(){
      return ($(this).position().top == data.y && $(this).position().left == data.x)
    })
    existing.remove();
  }
});



$(document).ready(function(){
  window.setInterval("glow()", 750)
  $(".message-list").stop(true,true).animate({ scrollTop: $(".message-list").attr("scrollHeight") }, 0);

  var initloc = $(".you").position()
  var initmap = $(".map-container");
  map.scrollLeft(initloc.left - (initmap.width()/2));
  map.scrollTop(initloc.top - (initmap.height()/2));
  
  
  $(".entity").click( function(){
    pulse(this);      
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
    }).length != 0) return false
    
    if ($(".wall").filter(function(){
      return ($(this).position().top == y && $(this).position().left == x)
    }).length == 0) {
      var wall = $("<div class='wall' style='top: " + y + "px; left: " + x + "px;'></div>");
      $(".map-view").append(wall);
      $.post("/edit-wall", {x: x, y: y, type: "create"});
      console.log("created wall");
    } else {
      $.post("/edit-wall", {x: x, y: y, type: "destroy"});
      
      var existing = $(".wall").filter(function(){
        return ($(this).position().top == y && $(this).position().left == x)
      })
      existing.remove();
      console.log("destroyed wall");
    }
  });

  $(document).keydown(function(e){
    if (e.keyCode >= LARROW && e.keyCode <= DARROW){
      var pos = $(".you").position();
      var allObstructions = $(".entity, .wall");
      $(".you").stop(true, true);
      if (e.keyCode == LARROW){
        if (pos.left - 16 < 0) return false;
        if (!obstructed(pos.left-16, pos.top)) $('.you').animate({left: '-=16'}, 0);
      }
      if (e.keyCode == UARROW){
        if (pos.top - 16 < 0) return false;
        if (!obstructed(pos.left, pos.top-16)) $('.you').animate({top: '-=16'}, 0);
      }  
      if (e.keyCode == RARROW){
        if (!obstructed(pos.left+16, pos.top)) $('.you').animate({left: '+=16'}, 0);
      }  
      if (e.keyCode == DARROW){
        if (!obstructed(pos.left, pos.top+16)) $('.you').animate({top: '+=16'}, 0);
      }  
      newpos = $(".you").position();
      if (pos.top != newpos.top || pos.left != newpos.left){
        $(".reach-ring").animate({left: newpos.left - 120, top: newpos.top - 120}, 0)
        updateLocation();
      }
      return false;
    }
    if (e.keyCode == ENTER){
      var message = $("#chat-input").val();
      $("#chat-input").val("");
      if (message == "") return false;
      sendMessage(message);
      pulse($(".you"));
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

function pulse(entity){
  entity = $(entity);
  var identity = (new Date).getTime();
  var ring = $("<div class='ring'></div>")
  var color = entity.css('background-color');
  ring.css({'left': entity.css('left'), 'top': entity.css('top'), 'border-color': color});
  
  $(".map-view").append(ring);
  //120px is 128px (centered) minus half the width/height of the circle
  ring.animate({left: '-=121px',
                top: '-=121px',
                width: '256px',
                height: '256px',
                'border-radius': '128px', 
                opacity: '0.1'
               }, 500, 'easeOutQuad', function(){
    ring.remove();
  });
  return true;
}

function sendMessage(message){
  var userID = $("#user-id").text();
  var color = $(".you").css('background-color');
  var loc = $(".you").position()
  addMessage($("#user-name").text(), color, message);
  $.post("/send-message", {x: loc.left, y: loc.top, content: message});
  
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
  $.post("/update-location", {x: loc.left, y: loc.top, store: store});
  var map = $(".map-container");
  map.scrollLeft(loc.left - (map.width()/2));
  map.scrollTop(loc.top - (map.height()/2));

  console.log(loc.left, loc.top);
}

function distanceTo(entityB){
  var entityA = $(".you");
  var coordsA = [entityA.position().left, entityA.position().top];
  var entityB = $(entityB);
  var coordsB = [entityB.position().left, entityB.position().top];
  
  return Math.sqrt(Math.pow(coordsA[0] - coordsB[0], 2) + Math.pow(coordsA[1] - coordsB[1], 2));
}

function obstructed(x,y){
  var allObstructions = $(".entity, .wall");
  var actualObstructions = allObstructions.filter(function(){
    return ($(this).position().top == y && $(this).position().left == x)
  })
  return (actualObstructions.length != 0)
}