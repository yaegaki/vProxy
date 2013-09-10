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
			var method = temp[0]
			var address;
			try{
				var address = url.parse(temp[1]);
			}catch(e)
				console.log("invalid request");
				client.end();{
			}
			if(!address.href.match(/^http:\/\/.+/)){
				console.log("invalid request");
				client.end();
				return;
			}
			info.method = method;
			info.address = address;
			info.chunked = false;
			info.separate = false;
			info.contentLength = 0;
			info.response = {};
			address.port = address.port || 80;
			if(callbacks.SEND){
				data = callbacks.SEND(data, info, client);
				if(data == null){
					client.end();
					return;
				}
			}

			var socket = net.createConnection(address.port, address.host,function(){
				socket.write(data);
			});

			socket.on('data', function(data){
				if(info.contentLength != 0){
					var bodyLength = info.response.body.length;

					var buffer = new Buffer(bodyLength+data.length);
					info.response.body.copy(buffer, 0);
					data.copy(buffer, bodyLength);
					info.response.body = buffer;
					if(info.contentLength <= buffer.length){
						data = createHTTP(info.response.headers, info.response.body);
						if(callbacks.RECV){
							data = callbacks.RECV(data, info, client);
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
					var chunk;
					if(info.response.remain){
						chunk = new Buffer(info.response.remain.length + data.length);
						info.response.remain.copy(chunk, 0);
						data.copy(chunk, info.response.remain.length);
					}else{
						chunk = data;
					}

					var result = parseChunk(chunk, info.response.body);				
					info.response.remain = result.remain;
					
					if(result.buffer){
						info.response.body = result.buffer;
					}

					if(result.end){
						data = createHTTP(info.response.headers, info.response.body);
						if(callbacks.RECV){
							data = callbacks.RECV(data, info, client);
							if(data == null){
								if(client){
									client.write(data);
									client = null;
								}
								socket.end();
								return;
							}
						}
						if(client){
							client.write(data);
							//client.end();
						}
					}
					socket.end();
					return;
				}
				info.response = parseHTTP(data);
				var headers = info.response.headers;	
				if(info.response.chunked){
					info.chunked = true;
					if(info.response.end){
						if(callbacks.RECV){
							data = callbacks.RECV(data, info, client);
							if(data == null){
								if(client) client.end();
								socket.end();
								return;
							}
						}

					}
					
					socket.end();
					return;
				}
				info.contentLength = info.response.contentLength;
				if(!info.response.end){
					return;
				}

				if(callbacks.RECV){
					data = callbacks.RECV(data, info, client);
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
//	arg2:infomation object
//		address:parsed url
//		method:http method(GET or POST)
//	arg3:client socket
//	return value:data(http request or url) if return null, socket is closed.
exports.on = function(event, callback){
	callbacks[event.toUpperCase()] = callback;
}

exports.createHTTP = createHTTP;
exports.parseHTTP = parseHTTP;
exports.unicodeEscape = unicodeEscape;

function parseHTTP(data){
	var headers = [];
	var body = new Buffer(0);	
	var temp = data.toString().split('\r\n');
	var status = temp[0].match(/HTTP\/1.1 ([0-9]+)/)[1];
	var chunked = false;
	var contentLength = -1;
	var end = false;
	var remain;
	for(var i = 0;i < temp.length;i++){
		if(temp[i] != ""){
			headers.push(temp[i]);
			var cl = temp[i].match(/Content-Length:(.*)/);
			if(cl){
				contentLength = Number(cl[1]);
			}
			if(temp[i].match(/Transfer-Encoding:\s?chunked/)){
				chunked = true;
			}
		}else break;
	}

	if(chunked || contentLength > 0){
		for(var i = 0;i < data.length;i++){
			if(data[i] == 0xd && data[i+1] == 0xa && data[i+2] == 0xd && data[i+3] == 0xa){
				body = new Buffer(data.length-(i+4));
				data.copy(body, 0, i+4, data.length);
				break;
			}
		}	
		if(chunked){
			var result = parseChunk(body, new Buffer(0));

			end = result.end;
			body = result.buffer || new Buffer(0);
			remain = result.remain;
		}
	}else{
		end = true;
	}
	if(body == null || body.length == contentLength) end = true;
	return {headers:headers, status:status, contentLength:contentLength, chunked:chunked, remain:remain,body:body, end:end};
}

function createHTTP(headers, body){
	var data = "";
	var chunked = true;
	var buffer;
	if(typeof body == 'string' || body instanceof String) body = new Buffer(body);
	for(var i = 0;i < headers.length;i++){
		if(headers[i].match(/Content-Length/)){
			headers[i] = "Content-Length: "+body.length;
			chunked = false;
		}
		data += headers[i] + '\r\n';
	}


	data += '\r\n';


	var headers_buffer = new Buffer(data);
	var bufferSize = headers_buffer.length + body.length;
	var bl = body.length.toString(16);
	if(chunked) bufferSize += 9 + bl.length;
	buffer = new Buffer(bufferSize);
	var pos=headers_buffer.length;
	headers_buffer.copy(buffer, 0);
	if(chunked){
		for(var i = 0;i < bl.length;i++){
			buffer[pos++] = bl.charCodeAt(i);
		}
		buffer[pos++] = 0x0d;
		buffer[pos++] = 0x0a;
	}
	body.copy(buffer, pos);
	pos += body.length;
	if(chunked){
		buffer[pos++] = 0x0d;
		buffer[pos++] = 0x0a;
		buffer[pos++] = 0x30;
		buffer[pos++] = 0x0d;
		buffer[pos++] = 0x0a;
		buffer[pos++] = 0x0d;
		buffer[pos++] = 0x0a;
	}
	return buffer;
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

function parseChunk(chunk, acc){
	var buffer;
	var remain = null;
	var length = 0;
	var end = false;
	var offset = 0;
	for(var i = 0;i < chunk.length-1;i++){
		if(chunk[i] == 0x0d && chunk[i+1] == 0x0a){
			length = parseInt(chunk.slice(offset, i), 16);

			if(chunk.length < length + i + 7){
				remain = chunk.slice(offset, chunk.length);
				break;
			}
			buffer = new Buffer(acc.length + length);
			acc.copy(buffer, 0);
			chunk.copy(buffer, acc.length, i+2, i+2+length);
			if(chunk.length >= i+6+length){
				if(chunk[i+4+length] == 0x30 && chunk[i+5+length] == 0xd){
					end = true;
					break;
				}else{
					acc = buffer;
					offset = i = i + 4 + length;
				}
			}else{
				break;
			}
		}
	}


	return {buffer:buffer, end:end, remain:remain};
}


//for debug
function saveBinary(name,bin){
	var fs = require('fs');
	var fd = fs.openSync('./'+name, 'w');
	fs.writeSync(fd, bin, 0, bin.length);
	fs.closeSync(fd);
}
