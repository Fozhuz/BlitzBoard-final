const { PORTS_AVAILABLE } = require('./utilities.js');
const ip = require('ip');
const express = require('express');
const http = require('http');
const socket = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socket(server);
const colors = require('colors');

const port = (process.env.npm_config_port && process.env.npm_config_port.match(PORTS_AVAILABLE)) ? process.env.npm_config_port : 8000;

var games = [];
var gamesRandom = [];


app.use(express.static('static'));

app.get('/', (req, res) => { res.sendFile(__dirname + '/static/html/startpage.html') });
app.get('/custom', (req, res) => { res.sendFile(__dirname + '/static/html/custom.html') });
app.get('/random', (req, res) => { res.sendFile(__dirname + '/static/html/random.html') });
app.get('*', (req, res) => { res.redirect('/') });


io.on('connection', (socket) => {
    var playerId;
    var color;
    var type; // 0 = custom, 1 = random

    socket.on('joined', (msg) => {
        let roomNumber;
        let roomId = msg.roomId;
        playerId = msg.pName;
        type = 0;
        for (let i = 0; i < games.length; i++) {
            if (games[i].pNames[0] == playerId || games[i].pNames[1] == playerId) { playerId = ''; return socket.emit('notValid') };
            if (games[i].code == roomId) { roomNumber = i; break };
        };
        if (roomNumber === undefined) {
            roomNumber = games.length;
            games.push({ code: roomId, players: 1, pNames: [msg.pName, ''] });
        } else if (games[roomNumber].players == 1) {
            games[roomNumber].players++;
            games[roomNumber].pNames[1] = msg.pName;
        } else return socket.emit('full');

        console.log(games[roomNumber]);
        let nbPlayers = games[roomNumber].players;
        color = (nbPlayers % 2 == 0) ? 'black' : 'white';
        socket.emit('player', { pNames: games[roomNumber].pNames, pName: msg.pName, nbPlayers, color, roomId });
    });

    socket.on('joinedRandom', (msg) => {
        let roomNumber;
        playerId = msg.pName;
        type = 1;
        for (let i = 0; i < gamesRandom.length; i++) {
            if (gamesRandom[i].pNames[0] == playerId || gamesRandom[i].pNames[1] == playerId) { playerId = ''; return socket.emit('notValid') };
            if (gamesRandom[i].players < 2) { roomNumber = i; break };
        };
        if (roomNumber === undefined) {
            roomNumber = gamesRandom.length;
            gamesRandom.push({ game: gamesRandom.length + 1, players: 1, pNames: [msg.pName, ''] });
        } else { gamesRandom[roomNumber].players++; gamesRandom[roomNumber].pNames[1] = msg.pName };

        console.log(gamesRandom[roomNumber]);
        let nbPlayers = gamesRandom[roomNumber].players;
        color = (nbPlayers % 2 == 0) ? 'black' : 'white';
        socket.emit('playerRandom', { pNames: gamesRandom[roomNumber].pNames, pName: msg.pName, nbPlayers, color, game: gamesRandom[roomNumber].game });
    });

    socket.on('play', (msg) => { socket.broadcast.emit('play', { roomId: msg.roomId, pNames: msg.pNames }); console.log(`Room '${msg.roomId}' ready`) });
    socket.on('playRandom', (msg) => { socket.broadcast.emit('playRandom', { roomId: msg.roomId, pNames: msg.pNames }); console.log(`Room ${msg.roomId} ready`) });
    socket.on('move', (msg) => { socket.broadcast.emit('move', msg) });
    socket.on('chatMessage', (msg) => { socket.broadcast.emit('chatMessage', { message: msg.message, roomId: msg.roomId, pName: msg.pName }) });
    socket.on('gameOver', (msg) => { socket.broadcast.emit('gameOver', { roomId: msg.roomId, pName: msg.pName }) });

    socket.on('disconnect', () => {
        if (playerId == '') return;
        if (type == 0)
            for (let i = 0; i < games.length; i++) {
                if (games[i].pNames[0] == playerId || games[i].pNames[1] == playerId) {
                    socket.broadcast.emit('disconnection', { roomId: games[i].code, playerId });
                    games.splice(i, 1);
                };
            }
        else
            for (let i = 0; i < gamesRandom.length; i++) {
                if (gamesRandom[i].pNames[0] == playerId || gamesRandom[i].pNames[1] == playerId) {
                    socket.broadcast.emit('disconnection', { roomId: gamesRandom[i].game, playerId });
                    gamesRandom.splice(i, 1);
                };
            };
        (playerId == undefined) ? '' : console.log(`${playerId} disconnected`);
    });
});

server.listen(port);
console.log(colors.green(`From this device : Connect to localhost:${port}\nFrom a LAN device : Connect to ${ip.address()}:${port}`));
