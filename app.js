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

class Player {
    constructor(id) {
        this.x = 250;
        this.y = 250;
        this.id = id;
        this.number = "" + Math.floor(10 * Math.random());
    }
}
// var Player = function(id) {
//     var self = {
//         x: 250,
//         y: 250,
//         id: id,
//         number: "" + Math.floor(10 * Math.random())
//     }
//     return self;
//}

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket) {
    console.log('socket connection');
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    var player = new Player(socket.id);
    PLAYER_LIST[socket.id] = player;

    socket.on('disconnect', function() {
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
    })
});

setInterval(function(){
    var pack = [];
    for (var i in PLAYER_LIST) {
        var player = PLAYER_LIST[i];
        player.x++;
        player.y++;
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