const game = new Chess();
const socket = io();

const pname = document.getElementById('pName');
const playerState = document.getElementById('player');
const room = document.getElementById('room');
const roomNumber = document.getElementById('roomNumbers');
const button = document.getElementById('button');
const state = document.getElementById('state');
const chat = document.getElementById('chat');
const message = document.getElementById('message');
document.getElementById('formMessage').addEventListener('click', (e) => { e.preventDefault() });
document.getElementById('formSubmit').addEventListener('click', (e) => { e.preventDefault() });

var color;
var roomId;
var pName;
var board;
var play = true;


const connect = () => {
    roomId = room.value;
    pName = pname.value[0].toUpperCase() + pname.value.slice(1);
    if (!pName.match(/^[a-zA-Z0-9]*$/) || !roomId.match(/^[a-zA-Z0-9]*$/) || pName == '' || roomId == '') return;
    socket.emit('joined', { roomId, pName });
};

const send_message = () => {
    if (message.value == '' || message.value.length > 100) return message.value = '';
    socket.emit('chatMessage', { message: message.value, roomId, pName });
    $('.messages').append(`<div class="messageSent"><i>You:</i> ${message.value}</div>`);
    $('.messages').scrollTop($('.messages').height());
    message.value = '';
};

const removeGreySquares = () => { $('#board .square-55d63').css('background', '') };

const greySquare = (square) => {
    var squareEl = $(`#board .square-${square}`);
    var background = '#a9a9a9';
    if (squareEl.hasClass('black-3c85d')) background = '#696969';
    squareEl.css('background', background);
};

const onDragStart = (source, piece) => {
    if (game.game_over() || play ||
        (game.turn() == 'w' && piece.search(/^b/) != -1) ||
        (game.turn() == 'b' && piece.search(/^w/) != -1) ||
        (game.turn() == 'w' && color == 'black') ||
        (game.turn() == 'b' && color == 'white'))
        return false;
};

const onDrop = (source, target) => {
    removeGreySquares();
    var move = game.move({ from: source, to: target, promotion: 'q' });
    if (game.game_over()) { socket.emit('gameOver', { roomId, pName }); state.innerHTML = 'GAME OVER, You won !' };
    if (move === null) return 'snapback'
    else socket.emit('move', { move, board: game.fen(), room: roomId });
};

const onMouseoverSquare = (square, piece) => {
    var moves = game.moves({ square, verbose: true });
    if (moves.length === 0) return;
    greySquare(square);
    for (var i = 0; i < moves.length; i++) { greySquare(moves[i].to) };
};

const onMouseoutSquare = (square, piece) => { removeGreySquares() };
const onSnapEnd = () => { board.position(game.fen()) };


socket.on('full', (msg) => { alert('This room is full'); window.location.href = '/' });

socket.on('play', (msg) => {
    if (msg.roomId != roomId) return;
    play = false;
    state.innerHTML = (msg.pNames[0] == pName) ? `Playing against ${msg.pNames[1]}` : `Playing against ${msg.pNames[0]}`;
});

socket.on('player', (msg) => {
    pname.remove();
    room.remove();
    button.remove();
    color = msg.color;
    playerState.innerHTML = `Playing ${color}`;
    roomNumber.innerHTML = `Room ID : ${roomId}`;
    chat.style.display = 'block';

    if (msg.nbPlayers == 2) {
        play = false;
        socket.emit('play', { roomId: msg.roomId, pNames: msg.pNames });
        state.innerHTML = (msg.pNames[0] == pName) ? `Playing against ${msg.pNames[1]}` : `Playing against ${msg.pNames[0]}`;
    } else state.innerHTML = 'Waiting for Second player';

    board = ChessBoard('board', { orientation: color, draggable: true, position: 'start', onDragStart, onDrop, onMouseoutSquare, onMouseoverSquare, onSnapEnd });
});

socket.on('move', (msg) => {
    if (msg.room != roomId) return;
    game.move(msg.move);
    board.position(game.fen());
});

socket.on('notValid', () => { alert('Username already exists'); room.value = ''; pname.value = '' });
socket.on('chatMessage', (msg) => { if (msg.roomId == roomId) $('.messages').append(`<div class="messageSent"><i>${msg.pName}:</i> ${msg.message}</div>`); $('.messages').scrollTop($('.messages').height()) });
socket.on('gameOver', (msg) => { if (msg.roomId == roomId) state.innerHTML = `GAME OVER, ${msg.pName} won !`; });
socket.on('disconnection', (msg) => { if (msg.roomId == roomId) { alert(`${msg.playerId} left`); window.location.href = '/' } });
