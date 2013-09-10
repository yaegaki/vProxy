var vp = require('./vProxy');

//client to server
vp.on('send', function (data, info, client){
	console.log('connect to '+info.address.href);

	//block yahoo
	if(info.address.href.match(/yahoo/)){
		console.log("blocked");
		client.write("HTTP/1.1 200 OK\r\n\r\nThis page is blocked by vProxy.");
		return null;
	}
	return data;
});

//server to client
vp.on('recv', function(data, info, client){
	console.log('recv from '+ info.address.href);
	var response = vp.parseHTTP(data);

	//response modify
	for(var i = 0;i < response.headers.length;i++){
		if(response.headers[i].match(/text\/html/)){
			var aybabtu = "<html><h1>All your base are belong to us.</h1></html>";
			return vp.createHTTP(["HTTP/1.1 200 OK","Content-Length: 0"], aybabtu);
		}
	}
	return data;
});

vp.start(8080);
