var http = require('http'),
    url = require('url'),
    net = require('net');

var callbacks = {};

exports.start = function (port, host) {
    server.listen(port, host);
}

exports.on = function (event, callback) {
    callbacks[event.toUpperCase()] = callback;
}

var server = http.createServer(function (cReq, cRes) {
    //for http
    var _url = url.parse(cReq.url);
    if (callbacks.CONNECT) {
        if (!callbacks.CONNECT(_url)) {
            cReq.end();
            return;
        }
    }
    var buffer = null;
    cReq.on('data', function (data) {
        if (!buffer) {
            buffer = data;
        } else {
            var temp = buffer;
            buffer = new Buffer(temp.length + data.length);
            temp.copy(buffer, 0);
            data.copy(buffer, temp.length);
        }
    });

    cReq.on('end', function () {
        var _request = {headers:cReq.headers, body:buffer};
        if (callbacks.SEND) {
            _request = callbacks.SEND(_request, _url, cReq);
            if (!_request) {
                cReq.end();
                return;
            }
        }
        var sReq = http.request({
            host: _url.hostname,
            port: _url.port || 80,
            path: cReq.url,
            method: cReq.method,
            headers: _request.headers
        }, function (res) {
            var buffer = null;
            res.on('data', function (data) {
                if (!buffer) {
                    buffer = data;
                } else {
                    var temp = buffer;
                    buffer = new Buffer(temp.length + data.length);
                    temp.copy(buffer, 0);
                    data.copy(buffer, temp.length);
                }
            });

            res.on('end', function () {
                var _response = { headers: res.headers, body: buffer };
                if (callbacks.RECV) {
                    _response = callbacks.RECV(_response, _url, cRes);
                    if (!_response) {
                        cReq.end();
                        return;
                    }
                }
                cRes.writeHead(res.statusCode, _response.headers);
                if (_response.body) cRes.write(_response.body);
                cRes.end();
            });
        });

        sReq.on('error', function () {
            cReq.end();
        });

        if(_request.body) sReq.write(_request.body);
        sReq.end();
    });
});

//for https
server.on('connect', function (cReq, cSock, header) {
    var _url = url.parse('https://' + cReq.url);
    if (callbacks.CONNECT) {
        if (!callbacks.CONNECT(_url)) {
            cReq.end();
            return;
        }
    }
    var sSock = net.connect(_url.port || 443, _url.hostname, function () {
        cSock.write('HTTP/1.0 200 Connection established\r\n\r\n');
        if (header && header.length) svrSoc.write(header);
        cSock.pipe(sSock);
    });
    sSock.pipe(cSock);
    sSock.on('error', function () {
        cSock.end();
    });
    cSock.on('error', function () {
        if (sSock) sSock.end();
    });
});


//for debug
function saveBinary(name, bin) {
    var fs = require('fs');
    var fd = fs.openSync('./' + name, 'w');
    fs.writeSync(fd, bin, 0, bin.length);
    fs.closeSync(fd);
}

exports.saveBinary = saveBinary;