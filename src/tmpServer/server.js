const http = require('http');
const https = require('https');
const urlLib = require('url'); // built-in utility

function playAlbum(selected_device, access_token, context_uri) {
  const album = JSON.stringify({
    "context_uri": context_uri,
    "offset": {
      "position": 0
    },
    "position_ms": 0
  });
  const options = {
    hostname: 'api.spotify.com',
    path: '/v1/me/player/play?device_id=' + selected_device,
    method: 'PUT',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
      'Authorization': 'Bearer ' + access_token
    }
  }
  console.log(options, album)
  const req2 = https.request(options, res2 => {
    console.log(`statusCode: ${res2.statusCode}`)
    res2.on('data', d => {
      process.stdout.write(d)
    })
  })

  req2.on('error', error => {
    console.error(error)
  })

  req2.write(album)
  req2.end()
}

http.createServer(function (req, res) {
  var status = urlLib.parse(req.url).pathname.replace('/', '');
  if (status === 'redir' && req.method === "POST") {
    console.log('hit the redir');
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      console.log(data);
      let parsedAuth = JSON.parse(data);
      let split = parsedAuth._Kjt.split('>');
      console.log(split)
      playAlbum(...split)
      res.end(JSON.stringify({
        "POST": true,
        parsedAuth,
      }));
    });

  }


  if (status === 'play' && req.method === "POST") {
    console.log('hit the post');
    req.on('data', chunk => {
      let data = '';
      console.log(`Data chunk available: ${chunk}`);
      data += chunk;
      let parsed = JSON.parse(data);


      res.end(JSON.stringify({
        "POST": true,
        parsed,
      }));
    });
  }

}).listen(8051);
console.log('api server live');