var localStream;
var remoteStream = [];
var peerconnection = [];
//var peerconnection2;
var num = 0;
var soytres = false;
var soyeluno = false;
var participantes;
var callcounter = 0;
var n = 0;
var User;
var t = 1;
var callee;
var nummsg = 0;
var remoteUser;
var arraydisconnected = [];

///////**************************  GET USER MEDIA  **************************///////

var localVideo = document.getElementById("localVideo");
var constraints = { video: true /*, audio: true*/ };

function successCallback(stream) {
    localVideo.src = window.URL.createObjectURL(stream);
    localStream = stream;
    console.log('Adding local stream.');
    createRTCPeerConnection();
    peerconnection[n].addStream(localStream);
}

function errorCallback(error) {
    console.log("Get User Media error: ", error);
}

navigator.webkitGetUserMedia(constraints, successCallback, errorCallback);

///////************************** SOCKET.IO MESSAGES  **************************///////

var socket = io.connect();

function socketMessage(message) {
    console.log("Enviando mensaje: ", message);
    socket.emit('message', message);
}


socket.on('message', function(message) { // Reaccion cuando se disparan determinados eventos
    console.log("Mensaje Recibido: ", message);
    if (message.type == 'Connected') {
        console.log("Bienvenido: " + message.nick);
        User = message.nick;
        arraydisconnected = message.disconnected;
        if (message.id > 2 && localStream) { soytres = true; }
        if (message.id > 1 && localStream) {
            console.log("Llamando a Cliente" + (message.id - 1).toString() + "...");
            participantes = message.id - 1;
            callee = "Cliente" + participantes.toString();
            User = message.nick;
            while (arraydisconnected.indexOf(callee) > -1) {
                participantes--;
                callee = "Cliente" + participantes.toString();
            }
            Call(callee);

            participantes--;
        }

        socket.emit('join', { id: message.nick });
        $("#localname").text(User);

    } else if (message.type == 'Disconnected') {
        console.log("Peer disconnected" + message.id);
        $('#' + message.id).remove();
    } else if (message.type == 'offer') {
        peerconnection[n].setRemoteDescription(new RTCSessionDescription(message));
        doAnswer();

    } else if (message.type == 'answer') {
        peerconnection[n].setRemoteDescription(new RTCSessionDescription(message));

        if (soytres = true && participantes > 0) {
            n++;
            createRTCPeerConnection();
            peerconnection[n].addStream(localStream);
            callee = "Cliente" + participantes.toString();
            while (arraydisconnected.indexOf(callee) > -1) {
                participantes--;
                callee = "Cliente" + participantes.toString();
            }

            Call(callee);
            soytres = false;
            participantes--;

        } else if (soyeluno) {
            createRTCPeerConnection();
            peerconnection[n].addStream(localStream);
        }
    } else if (message.type == 'candidate') {

        var candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });
        peerconnection[n].addIceCandidate(candidate);

    } else if (message.type == 'newPeer') {
        console.log("Nuevo usuario, usuarios conectados a la web... " + message.Peers);
        if (message.Peers > 2) {
            n++;
            createRTCPeerConnection();
            peerconnection[n].addStream(localStream);
            console.log("el valor de n es...... " + n);
        }
    } else if (message.type == "dest") {
        remoteUser = message.caller.toString();
    }

});

socket.on("info", function(message) {

    remoteUser = message.name;
});



///////**************************  RTCPEERCONNECTION  **************************///////

var pc_config = { 'iceServers': [{ 'url': 'stun:stun.stunprotocol.org' }] };
var pc_constraints = {
    'optional': [
        { 'DtlsSrtpKeyAgreement': true },
        { 'RtpDataChannels': true }
    ]
};

var sdpConstraints = {
    'mandatory': {
        'OfferToReceiveAudio': true,
        'OfferToReceiveVideo': true
    }
};

function createRTCPeerConnection() {
    try {
        peerconnection[n] = new RTCPeerConnection(pc_config, pc_constraints);
        console.log('Created RTCPeerConnnection ' + n + ' with:\n' +
            '  config: \'' + JSON.stringify(pc_config) + '\';\n' +
            '  constraints: \'' + JSON.stringify(pc_constraints) + '\'.');
    } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }
    peerconnection[n].onicecandidate = handleICE;
    peerconnection[n].onaddstream = handleRemoteStreamAdded;
    peerconnection[n].onremovestream = handleRemoteStreamRemoved;
};

function handleICE(event) {
    console.log("ICE: ", event);
    if (event.candidate) {
        socketMessage({
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            dest: callee
        });

    } else { console.log("End of candidates") }

}

function handleRemoteStreamAdded(event) {
    $("#container").append("<div id=" + remoteUser + " class='remotediv'><video width='640' height='480' controls class='remote' id='remoteVideo" + num + "' autoplay></video><p id='remotename'>" + remoteUser + "</p></div>");
    var remoteVideo = document.getElementById("remoteVideo" + num);
    console.log('Remote stream added.');
    remoteVideo.src = window.URL.createObjectURL(event.stream);
    remoteStream[num] = event.stream;
    num++;
}

function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event: ', event);
}

function failureCallback(error) {
    console.log("error creating offer: ", error);

}

function doAnswer() {
    console.log('Sending answer to peer.');
    peerconnection[n].createAnswer(setLocalAndsocketMessage, failureCallback, sdpConstraints);
};


function mergeConstraints(cons1, cons2) {
    var merged = cons1;
    for (var name in cons2.mandatory) {
        merged.mandatory[name] = cons2.mandatory[name];
    }
    merged.optional.concat(cons2.optional);
    return merged;
}

function setLocalAndsocketMessage(sessionDescription) {
    peerconnection[n].setLocalDescription(sessionDescription);
    socketMessage(sessionDescription);
}

function successIceCallback(candidate) {
    console.log("Added ice candidate: ", candidate);

}

function failureIceCallback(error) {
    console.log("Error: Failure during addIceCandidate()", error);

}
/***** No estoy usando estas tres 
function hangup() {
    console.log('Hanging up.');
    stop();
    socketMessage('bye');
}

function handleRemoteHangup() {
    console.log('Session terminated.');
    stop();

}

function stop() {
    // isAudioMuted = false;
    // isVideoMuted = false;
    pc.close();
    pc = null;
} */

///////**************************  CHAT  **************************///////

$(document).keypress(function(event) {
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if (keycode == '13') {
        $('#Chatbtn').click();
    }
});

$('#Chatbtn').click(function() {
    socket.emit('chat message', { sender: User, text: $('#m').val() });
    $('#m').val("");
    return false;
});

function Call(dest) {
    socketMessage({ type: 'dest', caller: User, callee: dest });
    $('#l').val("");
    var constraints = { 'optional': [], 'mandatory': {} };
    constraints = mergeConstraints(constraints, sdpConstraints);
    console.log('Sending offer to ' + dest + ', with constraints: \n' +
        '  \'' + JSON.stringify(constraints) + '\'.');
    peerconnection[n].createOffer(setLocalAndsocketMessage, failureCallback, constraints);
    return false;
}

socket.on('chat message', function(msg) {
    $('#messages').append($('<li id="remotemsg" class=' + nummsg + '>').text(msg.text));
    $('.' + nummsg).append($('<b id="msgsender">').text('  ' + msg.sender));
    nummsg++;

    console.log("***************************************************" + msg)
});

$(window).unload(function() {
    socket.emit("closed", { User: User });
});

socket.on("endcall",function(){
alert("El creador de la sala se ha desconectado, llamada terminada");
sockets.emit("disconnected");

    /*for (var p=0; peerconnection.length;p++){
    peerconnection[p].close();
    peerconnection[p] = null;
    }*/
});