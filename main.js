// prefixをまとめる
window.RTCPeerConnection = ( window.webkitPeerConnection00 ||
                             window.webkitRTCPeerConnection ||
                             window.mozRTCPeerConnection ||
														 window.RTCPeerConnection);
window.RTCSessionDescription = ( window.mozRTCSessionDescription ||
                                 window.RTCSessionDescription);
window.RTCIceCandidate = ( window.mozRTCIceCandidate ||
                           window.RTCIceCandidate);
navigator.getUserMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);

// config
var iceServers = {
  "iceServers" : [
    { url: "stun:stun.l.google.com:19302" }
  ]
};
var peerDataConnectionConfig = {
  "optional" : [
		{ DtlsSrtpKeyAgreement: true },
    {      RtpDataChannels: true }
  ]
};

var socket  = new WebSocket("ws://localhost:65529/");
var peerCon = new RTCPeerConnection(iceServers, peerDataConnectionConfig);

var camera1;
var camera2;

var localStream = null;

var started = false;
var myid = Math.random();

window.onload = function(){
	camera1  = document.getElementById("local");
	camera2  = document.getElementById("remote");
	document.getElementById("id").innerHTML = myid;
	
	document.getElementById("offer").onclick = makeOffer;
	
	requireUserMedia();
	
	peerCon.onaddstream = function(streamEv){ // 相手のストリームを受け取ったら
		console.log("Stream added");
		camera2.src = URL.createObjectURL(streamEv.stream);
		camera2.play();
	};
	peerCon.onicecandidate = function(candidateEv){ // STUNサーバが経路候補を返してくれたら
		if(candidateEv.candidate){
			console.log("ICE Received");
			socket.send(JSON.stringify({candidate: candidateEv.candidate}));
		}
	};
	
};

socket.onmessage = function(ev){
	var mes = JSON.parse(ev.data);
	
	if (mes.offer){ // 相手からofferが来たら
		console.log("Offer received");
		// これは相手のSDP(自己紹介)
		var remoteSdp = new RTCSessionDescription(mes.offer);
		
		peerCon.setRemoteDescription(remoteSdp, function(){
			// 自分へのofferだったらanswerを返す
			if (remoteSdp.type == "offer") {
				peerCon.createAnswer(function(answer){
					peerCon.setLocalDescription(answer, function(){
						// 相手に自分のSDP(自己紹介)を送る
						socket.send(JSON.stringify({
							answer: answer,
							from: myid
						}));
						
						console.log("Answer sended");
					}, error);
				}, error);
			}
		}, error);
	}
	
	if (mes.candidate && mes.from != myid){ // 相手からcandidate(接続候補)をもらったら
		// candidateをセット
		var candidate = new RTCIceCandidate(mes.candidate);
		console.log(candidate);
		peerCon.addIceCandidate(candidate);
	}
	
	if (mes.answer && mes.from != myid){ // 相手からAnswerがかえってきたら
		console.log("Answer received");
		
		// これは相手のSDP(自己紹介)
		var remoteSdp = new RTCSessionDescription(mes.answer);
		peerCon.setRemoteDescription(remoteSdp);
	}
};

function makeOffer(){
	peerCon.createOffer(function(offer){
		console.log("Created offer");
		peerCon.setLocalDescription(offer, function(){
			socket.send(JSON.stringify({
				offer: offer,
				from: myid
			}));
			console.log("offer sended");
		});
	}, error);
}

function requireUserMedia(){
	navigator.getUserMedia({
		video: true, audio:true
	}, successUserMedia, error);
}

function successUserMedia(stream){ // requireUserMediaが成功したら
	camera1.src = URL.createObjectURL(stream);
	camera1.play();
	localStream = stream;
	peerCon.addStream(localStream); // 相手向けにストリームを設定
}

function error(){}