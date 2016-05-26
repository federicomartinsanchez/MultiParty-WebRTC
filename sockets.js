var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var participantes = 0;
var dest;
var User
var arrayDisconnected=[];
var arr=[];
var port = Number(process.env.PORT || 3034);
app.use(express.static('public'));
app.get('/', function(req, res) {
    //res.status(200).send("");
    //res.send('public');
});

server.listen(port, function() {

    console.log("Servidor funcionando en http://localhost:3034");

});

io.on('connection', function(socket) {
    participantes++;
    console.log("New User Connected!, Users online: ", participantes);
    socket.emit("message", {
        type: "Connected",
        id: participantes,
        nick: "Cliente" + participantes,
        disconnected: arrayDisconnected
    });

        socket.on('join', function(data) {
            socket.join(data.id);
            console.log("This peer joined room " + data.id + " successfully");
            socket.broadcast.emit("message", { type: "newPeer", Peers: participantes });
        });
        socket.on("closed", function(message) {
        console.log("User " + message.User + " has closed the window");
        User=message.User;
        });
        socket.on('disconnect', function() {
            console.log("User disconnected, Users online: ", participantes);
            socket.broadcast.emit("message", {
                type: "Disconnected",
                id: User
            });
            arrayDisconnected.push(User);
            console.log("Usuarios desconectados:" +arrayDisconnected.toString());

            if (User === "Cliente1"){
            participantes=0;
            arrayDisconnected=arr;
            console.log("Desconectado el creador de la sala array reestablecido");
            socket.broadcast.emit("endcall");
              }
        });
        socket.on('chat message', function(msg) {
            console.log("Message:" + msg);
            for (var i = 0; i <= participantes; i++) {
                //socket.broadcast.emit('chat message', msg); // we send the message to everyone
                io.to("Cliente" + i.toString()).emit('chat message', { sender: msg.sender, text: msg.text });
            }
            ///
        });

   

    socket.on('message', function(message) {

        console.log('mensaje recibido', message);
        if (message.type == 'dest') {
            dest = message.callee;
            dest1 = message.caller;

        }
        if (message.type == 'offer') {
            io.to(dest).emit('message', message);
            console.log("Enviando mensaje a " + dest)

        } else if (message.type == 'answer') {
            io.to(dest1).emit('message', message);
            io.to(dest1).emit('info', { name: dest });

        } else {
            socket.broadcast.emit('message', message);
        }
    });

});
