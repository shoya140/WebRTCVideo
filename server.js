var ws = require("websocket.io");
var server = ws.listen(65529,
	function(){
		console.log("\u001b[32mwebsocket start\u001b[0m");
	}
);

server.on("connection", function(socket){
	socket.on("message", function(data){
		console.log("Message received: " + data);
		
		server.clients.forEach(function(client){
			client.send(data); // ブロードキャスト
		});
	});
});

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});