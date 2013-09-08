var sys = require('util');
var net = require('net');
var url = require('url');

var callbacks = {};

var server = net.createServer(function(client){
	client.on('data', function(data){
		var headers = data.toString().split('\r\n');
		if(headers[0]){
			var temp = headers[0].split(' ');
			var info = {};
			var method = temp[0];
			var address = url.parse(temp[1]);
			
			info.method = method;
			info.address = address;
			info.chunked = false;
			info.separate = false;
			info.contentLength = 0;
			address.port = address.port || 80;
			if(callbacks.SEND){
				data = callbacks.SEND(data, client, info);
				if(data == null){
					client.end();
					return;
				}
			}

			var socket = net.createConnection(address.port, address.host,function(){				socket.write(data);
			});

			socket.on('data', function(data){
				if(info.contentLength != 0){
					info.data += data;
					var bodyLength = parseHTTP(info.data).body.length;
					if(info.contentLength <= bodyLength){
						if(callbacks.RECV){
							data = callbacks.RECV(info.data, client, info);
							if(data == null){
								if(client) client.end();
								socket.end();
								return;
							}
						}
						if(client) client.write(data);
						socket.end();

					}
					return;
				}else if(info.chunked){
					info.data += data;
					if(data.toString().split('\r\n')[1] == '0'){
						if(callbacks.RECV){
							data = callbacks.RECV(info.data, client, info);
							if(data == null){
								if(client) client.end();
								socket.end();
								return;
							}
						}
						if(client) client.write(data);
						socket.end();
					}
					socket.end();
					return;
				}
				var temp = parseHTTP(data);
				var headers = temp.headers;
				for(var i = 0;i < headers.length;i++){
					var header;
					if(header = headers[i].match(/chunked/)){
						info.chunked = true;
						info.data = data;
						socket.end();
						return;
					}else if(header = headers[i].match(/Content-Length:(.*)/)){
						info.contentLength = Number(header[1]);
					}else if(headers[i] == ""){
						break;
					}
				}
				if(temp.body.length < info.contentLength){
					info.data = data;
					return;
				}
				if(callbacks.RECV){
					data = callbacks.RECV(data, client, info);
					if(data == null){
						if(client) client.end();
						socket.end();
						return;
					}
				}
				if(client) client.write(data);
				socket.end();
			});

			socket.on('error', function(data){
				client.end();
			});

		}
	});
	client.on('end',function(){
		client = null;
	});
});


exports.start = function(port, host){
	server.listen(port,host);
}


//event: send or recv
//callback:
//	arg1:data(http request or response)
//	arg2:client socket
//	arg3:infomation object
//		address:parsed url
//		method:http method(GET or POST)
//	return value:data(http request or url) if return null, socket is closed.
exports.on = function(event, callback){
	callbacks[event.toUpperCase()] = callback;
}

exports.createHTTP = createHTTP;
exports.parseHTTP = parseHTTP;
exports.unicodeEscape = unicodeEscape;

function parseHTTP(data){
	var headers = [];
	var body = "";
	var temp = data.toString().split('\r\n');
	var count = 0;
	var chunked = true;
	for(count = 0;count < temp.length;count++){
		if(temp[count] != ""){
			headers.push(temp[count]);
			if(temp[count].match(/Content-Length/)){
				chunked = false;
			}
		}else break;
	}
	count++;
	if(chunked){
		for(var i = 0;temp[count+i*2+2];i++){
			body += temp[count+i*2+1];
			if(temp[count+i*2+2] == '0') break;

		}
	}else{
		body = temp[count];
	}
	return {headers:headers, body:body};
}

function createHTTP(headers, body){
	var data = "";
	var chunked = true;
	for(var i = 0;i < headers.length;i++){
		if(headers[i].match(/Content-Length/)){
			headers[i] = "Content-Length: "+body.length;
			chunked = false;
		}
		data += headers[i] + '\r\n';
	}


	data += '\r\n';
	if(chunked) data += body.length + '\r\n';
	data += body;
	if(chunked) data += '\r\n0\r\n';


	return data;

}

function unicodeEscape(str){
	var result = "";
	for(var i = 0;i < str.length;i++){
		var charCode = str.charCodeAt(i);
		if(charCode > 0xff){
			result += '\\u' + charCode.toString(16).slice(-4);
		}else{
			result += str[i];
		}
	}
	return result;
}
