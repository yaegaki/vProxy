var vp = require('./vProxy');

vp.on('connect', function (url) {
    console.log(url.href);
    return true;
});

vp.on('send', function (req, url, con) {
    return req;
});

vp.on('recv', function (res, url, con) {
    for (var i in res.headers) {
        console.log(res.headers[i]);
        if (res.headers[i].match(/html/)) {
            res.body = '<h1>All your base are belong to us.</h1>';
        }
    }
    return res;
});

vp.start(8080);
