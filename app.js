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
var PLAYER_LIST = {};

var Player = function(id) {
    var self = {
        x: 250,
        y: 250,
        id: id,
        number: "" + Math.floor(10 * Math.random()),
        pressingRight: false,
        pressingLeft: false,
        pressingUp: false,
        pressingDown: false,
        maxSpd: 10,
    }
    self.updatePosition = function() {
        if(self.pressingRight)
            self.x += self.maxSpd;
        if(self.pressingLeft)
            self.x -= self.maxSpd;
        if(self.pressingUp)
            self.y -= self.maxSpd;
        if(self.pressingDown)
            self.y += self.maxSpd;
    }
    return self;
}

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket) {
    console.log('socket connection');
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    var player = Player(socket.id);
    PLAYER_LIST[socket.id] = player;

    socket.on('disconnect', function() {
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
    })

    socket.on('keyPress', function(data) {
        if(data.inputId == 'left')
            player.pressingLeft = data.state;
        else if(data.inputId == 'right')
            player.pressingRight = data.state;
        else if(data.inputId == 'up')
            player.pressingUp = data.state;
        else if(data.inputId == 'down')
            player.pressingDown = data.state;
    });
});

setInterval(function(){
    var pack = [];
    for (var i in PLAYER_LIST) {
        var player = PLAYER_LIST[i];
        player.updatePosition();
        pack.push({
            x:player.x,
            y:player.y,
            number:player.number
        });
    }
    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit('newPosition', pack);
    }
}, 40);