"use strict";
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

var users = 0;
var user_numbers = [0];
var user_ids = [0];

var views = [0];

var object_list = [];
var circle_list = [];
var rectangle_list = [];
var player_list = [];
var C_player_list = [];
var R_player_list = [];
var flag_list = [];

app.get('/', function(req, res){
	  res.sendFile(path.join(__dirname, '/', 'capturetheflag.html'));
	});


class Object{
    constructor(x,y,team,type){
/* type =
   0: background
   1: defender
   2: player
   3: flag
   4: view
*/
       this.x = x;
       this.y = y;
       this.team = team;
       this.type = type;
       if (type == 1){
       //this.damage = 1;
       this.upgrades = 0;
       this.movement_radius = 10;
       }
       if (type == 2){
       //this.time_in_enemy_territory = 0;
       //this.score = 0;
       this.life = 10;
       this.health_count = this.life;
       }
       if (type == 3){
       this.value = 0;
       flag_list.push(this);
       }
      
    }
}
class Rectangle extends Object{
    constructor(x, y, team, type, width, height){
        super(x,y,team,type);
        this.width = width;
        this.height = height;
	this.shape = "rectangle"; 
        rectangle_list.push(this);
    }
    static touching_rectangle(rectA, rectB){
    return (rectA.x + rectA.width > rectB.x && rectA.x < rectB.x + rectB.width && rectA.y + rectA.height> rectB.y && rectA.y < rectB.y + rectB.height);    
    }
}
class Circle extends Object{
    constructor(x, y, team, type, radius){
        super(x,y,team,type);
        this.radius = radius;
	this.shape = "circle";
        circle_list.push(this);
        }
   
   static touching_circle(circleA, circleB){
        if (sqrt(pow((circleA.x - circleB.x),2) + pow((circleA.y - circleB.y),2)) < (circleA.radius + circleB.radius)){
            return true
            }
        else {
            return false
        }

     }
   static r_touching_circle(circle, rectangle){
       var circleDistance = {};
       var rectCenter = {};
       var radius = circle.radius/settings.gridsize
       rectCenter.x = rectangle.x + rectangle.width/2
       rectCenter.y = rectangle.y + rectangle.height/2
       circleDistance.x = Math.abs(circle.x - rectCenter.x)
       circleDistance.y = Math.abs(circle.y - rectCenter.y)
       if (circleDistance.x > (rectangle.width/2 + circle.r)) {return false;}
       if (circleDistance.y > (rectangle.height/2 + circle.r)) {return false;}
       if (circleDistance.x - circle.radius <= (rectangle.width/2)) {
           if (circleDistance.y - circle.radius <= (rectangle.height/2)) {
           return true; } 
       }
       var cornerDistance = Math.pow((circleDistance.x - rectangle.width/2),2) + Math.pow((circleDistance.y - rectangle.height/2),2);
       return (cornerDistance <= Math.pow(circle.radius,2));
    }
}

var startingBackgroundRadius = 10;
var playerRadius = 1;
var flagRadius = 0.5;
var startingStillDefenderLength = 3;
var startingStillDefenderWidth = 1;
var startRotate = 2;
var startDistanceApart = 50;
var initialStillDefenderDistanceFromCenter = 5;

var teams = [0];
var scores = [0];
var initial_score = 10;

var viewWidth = 200;
var viewHeight = 100;
var next_start = {};
var first_start = {};
first_start.x = 100;
next_start.x = 100;
next_start.y = first_start.y = 100;

var direction = 1;
var adjustDistance = 50;
function getNextStartLocation(){
next_start.y += startDistanceApart * Math.sin(startRotate);
next_start.x += startDistanceApart * Math.cos(startRotate);

return next_start;
}

function isCinView(circle, view){
	var circleDistance = {};
	var radius = circle.radius/settings.gridsize
	circleDistance.x = Math.abs(circle.x - view.x)
	circleDistance.y = Math.abs(circle.y - view.y)
	if (circleDistance.x > (view.width/2 + circle.r)) {return false;}
	if (circleDistance.y > (view.height/2 + circle.r)) {return false;}
	if (circleDistance.x - circle.radius <= (view.width/2)) {
           if (circleDistance.y - circle.radius <= (view.height/2)) {
           return true; } 
       }
       var cornerDistance = Math.pow((circleDistance.x - view.width/2),2) + Math.pow((circleDistance.y - view.height/2),2);
       return (cornerDistance <= Math.pow(circle.radius,2));
}

function isRinView(rectA, view){
	rectB = view;
	rectB.x -= rectB.width/2;
	rectB.y -= rectB.height/2;
	return (Rectangle.touching_rectangle(rectA, rectB));
}

function circlesInView(view){
	var circles = [];
	for (i = 0; i < circle_list.length; i++){
		if (isCinView(circle_list[i], view)){
			circles.push(circle_list[i]);
		}
	}
	return circles;
}
function rectanglesInView(view){
	var rectangles = [];
	for (i = 0; i < rectangle_list.length; i++){
		if (isRinView(rectangle_list[i], view)){
			rectangles.push(rectangle_list[i]);
		}
	}
	return rectangles;
}

function newPlayer(number, x, y){
teams[number] = []; //types
teams[number][0] = [new Circle(x, y, number, 0, startingBackgroundRadius)]; //backgrounds
teams[number][1] = []; //defenders
teams[number][1][0] = []; //moving defenders
teams[number][1][1] = [new Rectangle((x - (initialStillDefenderDistanceFromCenter + startingStillDefenderWidth/2)), (y + (startingStillDefenderLength/2)), number, 1, startingStillDefenderWidth, startingStillDefenderLength), new Rectangle((x + initialStillDefenderDistanceFromCenter - startingStillDefenderWidth/2), (y + startingStillDefenderLength/2), number, 1, startingStillDefenderWidth, startingStillDefenderLength), new Rectangle( (x - startingStillDefenderLength/2), (y + initialStillDefenderDistanceFromCenter - startingStillDefenderWidth/2), number, 1, startingStillDefenderLength, startingStillDefenderWidth), new Rectangle( (x - startingStillDefenderLength/2), (y - initialStillDefenderDistanceFromCenter - startingStillDefenderWidth/2), number, 1, startingStillDefenderLength, startingStillDefenderWidth)]; //still defenders
teams[number][2] = [new Circle(x, y, number, 2, playerRadius)];
teams[number][3] = [new Circle(x, y, number, 3, flagRadius)];
//views[number] = new Rectangle(x - viewWidth/2, y - viewHeight/2, -2, 4, viewWidth, viewHeight); //views on team -2, so everything except other views will be enemies
views[number].x=x;
views[number].y=y;
views[number].width=viewWidth;
views[number].height=viewHeight;
scores[number] = initial_score;
}


var text_list = [];
class Text {
	constructor(x, y, words, font, font_size, visible){
		this.x = x;
		this.y = y;
		this.words = words;
		this.font = font;
		this.font_size = font_size;
		this.visible = visible;
		text_list.push(this);
		}
	}

var enemy_number;
function touchingEnemyOfType(object, type){
if (object instanceof Circle){

    for (i = 0; i < circle_list.length; i++){
      if (object.team != circle_list[i].team && Number(circle_list[i].type) == Number(type)){
            if (Circle.touching_circle(object, circle_list[i])){
            enemy_number = circle_list[i];
            return true;
            }
        }
    }
    for (i = 0; i < rectangle_list.length; i++){
        if (object.team != rectangle_list[i].team && rectangle_list[i].type == type){
            if (Circle.r_touching_circle(object, rectangle_list[i])){
                enemy_number = rectangle_list[i];
                return true;
                }
        }
    }
}
if (object instanceof Rectangle){
    for (i = 0; i < circle_list.length; i++){
        if (object.team =! circle_list[i].team){
            if (Circle.r_touching_circle(circle_list[i], object)){
                enemy_number = circle_list[i];
                return true;
                }
        }
    }
    for (i = 0; i < rectangle_list.length; i++){
        if (object.team =! rectangle_list[i].team){
            if (Rectangle.touching_rectangle(rectangle_list[i], object)){
                enemy_number = rectangle_list[i];
                return true;
                }
        }
    }
}
return false;
}

function onCanvas(object){
if (object instanceof Circle){
   console.log("object is a circle");
    if (object.x + object.radius > settings.width){return false;}
    else if(object.x - object.radius < 0){return false;}
    else if(object.y + object.radius > settings.height){return false;}
    else if(object.y - object.radius < 0){return false;}
    else {return true;}
    }
else{
    if (object.x > settings.width){return false;}
    else if(object.x < 0){return false;}
    else if(object.y > settings.height){return false;}
    else if(object.y < 0){return false;}
    else {return true;}
    }
}

function stayOnCanvas(object){
if (object.x > settings.width){object.x = settings.width;}
else if(object.x < 0){object.x = 0;}
else if(object.y > settings.height){object.y = settings.height;}
else if(object.y < 0){object.y = 0;}
}

function movePlayer(object, speed, deltatime, left, right, up, down, remainOnCanvas){
var distance = deltatime * speed;
var partial_distance = distance / Math.sqrt(2);
if ((left || right) && (up || down)){
    if (left){
    object.x -= partial_distance;
    }
    if (right){
    object.x += partial_distance;
    }
    if (up){
    object.y -= partial_distance;
    }
    if (down){
    object.y += partial_distance;
    }
}
else{
    if (left){
    object.x -= distance;
    }
    if (right){
    object.x += distance;
    }
    if (up){
    object.y -= distance;
    }
    if (down){
    object.y += distance;
    }
}
if (remainOnCanvas){stayOnCanvas(object);}
}

io.on('connection', function(socket){
  console.log('a user connected');

 // users++;
 // user_numbers.push(users);

old_number_used = false;
for(i = 1; i <= users; i++){

if(!io.sockets.connected[user_ids[i]]){
user_ids[i] = socket.id;
io.to(socket.id).emit('setUserNumber', i);
old_number_used = true;
break;
}

}

if(!old_number_used){
users++;
user_numbers.push(users);
user_ids[users] = socket.id;
}

 io.to(socket.id).emit('setUserNumber', users);
  console.log('users: ' + users);
  
  socket.on('disconnect', function(){
    console.log('user disconnected');
    console.log('users: ' + users);
  });

var visibleCircleArray;
var visibleRectangleArray;
var visibleTextArray = [];
socket.on('update all positions', function(number, left, right, up, down, mouse_x, mouse_y){
	//set directions and amounts to move here
	io.to(user_ids[number]).emit('position update (everything)', number, circlesInView(view[number]), rectanglesInView(view[number]), visibleTextArray, new Date.getTime(), false, 0, view[number]);
});

socket.on('add to game', function(number){
start = getNextStartLocation();
newPlayer(number, start.x, start.y);
});

});


app.listen(4000, function(){
	  console.log('listening on *:4000');
	});