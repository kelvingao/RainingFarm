var express = require('express');
var path = require('path');
var app = express();
var serv = require('http').createServer(app);

app.get('/', function(req, res) {
    res.render('index');
});
app.use('/client', express.static(__dirname + '/client'));

app.set('views', path.join(__dirname, 'client'));
app.set('view engine', 'pug');

serv.listen(2000);
console.log("Server started.");

var SOCKET_LIST = {};

// Player and Bulletin share some common properties
var Entity = function() {
    var self = {
        x: 250,
        y: 250,
        spdX: 0, //shift distance
        spdY: 0,
        id: "",
    }
    self.update = function() {
        self.updatePosition();
    }
    self.updatePosition = function() {
        self.x += self.spdX;
        self.y += self.spdY;
    }
    return self;
}

var Player = function(id) {
    var self = Entity();
    self.id = id;
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingRight = false,
    self.pressingLeft = false,
    self.pressingUp = false,
    self.pressingDown = false,
    self.pressingAttack = false,
    self.mouseAngle = 0,
    self.maxSpd = 10;

    var super_update = self.update; // save it
    self.update = function() {
        self.updateSpd();
        super_update();

        if(self.pressingAttack) {
           self.shootBullet(self.mouseAngle);
        }
    }
    self.shootBullet = function(angle) {
        var b = Bullet(angle);
        b.x = self.x;
        b.y = self.y;
    }

    self.updateSpd = function() {
        if(self.pressingRight)
            self.spdX = self.maxSpd;
        else if(self.pressingLeft)
            self.spdX = -self.maxSpd;
        else self.spdX = 0;

        if(self.pressingUp)
            self.spdY = -self.maxSpd;
        else if(self.pressingDown)
            self.spdY = self.maxSpd;
        else self.spdY = 0;
    }
    
    Player.list[id] = self;
    return self;
}

// Global
Player.list = {};
Player.onConnect = function(socket) {
    var player = Player(socket.id);
    socket.on('keyPress', function(data) {
        if(data.inputId == 'left')
            player.pressingLeft = data.state;
        else if(data.inputId == 'right')
            player.pressingRight = data.state;
        else if(data.inputId == 'up')
            player.pressingUp = data.state;
        else if(data.inputId == 'down')
            player.pressingDown = data.state;
        else if(data.inputId == 'attack')
            player.pressingAttack = data.state;
        else if(data.inputId == 'mouseAngle')
            player.mouseAngle = data.state;
    });
}

Player.onDisconnect = function(socket) {
        delete Player.list[socket.id];
}

var DEBUG = true;

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket) {
    console.log("Start connection.");
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    Player.onConnect(socket);

    socket.on('disconnect', function() {
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
    })
    socket.on('sendMsgToServer',function(data) {
        var playerName = ("" + socket.id).slice(2,7);
        for (var i in SOCKET_LIST) {
            SOCKET_LIST[i].emit('addToChat', playerName + ': ' + data);
        }
    })
    socket.on('evalServer', function(data) {
        if (!DEBUG)
            return;
        var res = eval(data);
        socket.emit('evalAnswer', res);
    })
});

Player.update = function() {
    var pack = [];
    for (var i in Player.list) {
        var player = Player.list[i];
        player.update();
        pack.push({
            x:player.x,
            y:player.y,
            number:player.number
        });
    }
    return pack;
}

var Bullet = function(angle) {
    var self = Entity();
    self.id = Math.random();
    self.spdX = Math.cos(angle/180*Math.PI) * 10;
    self.spdY = Math.sin(angle/180*Math.PI) * 10;

    self.timer = 0;
    self.toRemove = false;
    var super_update = self.update;
    self.update = function() {
        if(self.timer++ > 100)
            self.toRemove = true;
        super_update();
    }
    Bullet.list[self.id] = self;
    return self;
}

Bullet.list = {};
Bullet.update = function() {

    var pack = [];
    for (var i in Bullet.list) {
        var bullet = Bullet.list[i];
        bullet.update();
        pack.push({
            x:bullet.x,
            y:bullet.y,
        });
    }
    return pack;
}

setInterval(function(){
    var pack = {
        player: Player.update(),
        bullet: Bullet.update(),
    }

    for (var i in SOCKET_LIST) {    
        var socket = SOCKET_LIST[i];
        socket.emit('newPosition', pack);
    }
}, 40);