var http = require('http');

import creds from './wifiDevCreds.json';

var WIFI_SSID = creds.ssid;
var WIFI_OPTIONS = { password: creds.password };

var devMode = true;

var config = {
  'access_token': null,
  'refresh_token': null,
  'client_id': null,
  'selected_device': null,
};

if (devMode) {
  createHttpServer();
}
else {
  const trigger = NodeMCU.D5;
  pinMode(trigger, "input_pullup");
  setWatch(function () {
    console.log('triggered this button press');
    makeSongRequest('spotify:album:2CrhjdQvzrbNA5LwyDVbro');
  }, trigger, { repeat: true, debounce: 50, edge: "rising" });
  onInit();
}

function onInit() {
  var wifi = require("Wifi");
  if (wifi)
    wifi.stopAP(); // disable Wi-Fi AP
  // untoggle for ap mode configuration
  // wifi.startAP('Espruino_Server', {}, createServer);
  wifi.connect(WIFI_SSID, WIFI_OPTIONS, function (err) {
    if (err) {
      console.log("ERROR: Connection failed, error: " + err);
    } else {
      console.log("INFO: Successfully connected");
      console.log(wifi.getStatus());
      console.log(wifi.getIP());

      // set hostname and make the NodeMCU available
      // through espruino.local (ping or for using the
      // Espruino IDE over Wi-Fi
      wifi.setHostname("espruino");

      // save the Wi-Fi settings and they'll be used
      // automatically at power-up.
      wifi.save();
      createHttpServer();
    }
  });
  // createHttpServer();
}


function createHttpServer() {
  http.createServer(function (req, res) {
    const parse = req.url.replace('/', '').split("?");
    const status = parse[0];
    if (status === 'home') {
      let cont = { 'Content-Type': 'text/html' };
      res.writeHead(200, cont);
      res.end(page);
    }

    if (status === 'app.js') {
      let cont = {
        'Content-Type': 'application/javascript;charset=UTF-8;',
        'Transfer-Encoding': 'chunked',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
      };
      res.writeHead(200, cont);
      res.write(vue);
      res.end();
    }

    if (status === 'play' && req.method === "POST") {
      console.log('hit the post');
      req.on('data', chunk => {
        let data = '';
        console.log(`Data chunk available: ${chunk}`);
        data += chunk;
        let parsed = JSON.parse(data);

        makeSongRequest(parsed.context_uri);

        res.end(JSON.stringify({
          "POST": true,
          parsed,
        }));
      });
    }

    if (status === 'auth-to-esp' && req.method === "POST") {
      console.log('hit the token');
      let data = '';
      // req.on('data', chunk => {
      //   data += chunk;
      // }) 
      req.on('data', chunk => {
        console.log(`Data chunk available: ${chunk}`);
        data += chunk;
        let parsed = JSON.parse(data);
        config.access_token = parsed.access_token;
        config.refresh_token = parsed.refresh_token;
        config.client_id = parsed.client_id;
        config.selected_device = parsed.selected_device;
        res.end(JSON.stringify({
          config
        }));
      });
    }
  }).listen(8050);
  console.log('server live');
}
function makeSongRequest(context_uri) {
  const obs = `${config.selected_device}>${config.access_token}>${context_uri}`;
  const payload = JSON.stringify({
    "_Kjt": obs
  });
  const options = {
    hostname: '192.168.0.45',
    port: 8051,
    path: '/redir',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    }
  };
  const req2 = http.request(options, res2 => {
    console.log(`statusCode: ${res2.statusCode}`);
    res2.on('data', d => {
      console.log('success');
      process.stdout.write(d);
    });
  });

  req2.write(payload);
  req2.end();

  req2.on('error', error => {
    console.error(error);
  });
}

var page = `<!doctype html><html><head><title>Example of the Authorization Code flow with Spotify</title><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.2.1/css/bootstrap.min.css" integrity="sha512-c8AIFmn4e0WZnaTOCXTOLzR+uIrTELY9AeIuUq6ODGaO619BjqG2rhiv/y6dIdmM7ba+CpzMRkkztMPXfVBm9g==" crossorigin="anonymous" /> <script src="http://code.jquery.com/jquery-1.10.1.min.js"></script> <script src="https://cdn.jsdelivr.net/npm/vue/dist/vue.js"></script> <script type="application/javascript">${test}</script> <style>body{font-size:16px;line-height:1.5;font-weight:400}#nfc_esp_spotify{height:100%;position:relative;background:black;color:white;font-family:Circular,spotify-circular,Helvetica,Arial,sans-serif}.buttons{padding:30px 15px}.user-profile-devices{border:1px solid black;padding:25px 0px;border-radius:15px}.tokens{margin-top:15px;margin-bottom:15px;border:1px solid black;padding:15px 15px;border-radius:15px}.custom-select{color:black}</style></head><body><div id="nfc_esp_spotify"><div class="container"><div class="title text-center"> <a href="/"><h1 class="display-2">Welcome to NFCSpot</h1> </a></div><template v-if="accessGranted == false"><div class="login"><h2>Step 1</h2><h4>Click here to get your token from Spotify</h4> <button class="btn btn-primary" @click="getCodeFromSpotify()">Submit</button><hr></div><div><h2>Step 2</h2><h4>Click here to get your token into NFC Spot Arduino Device</h4> <label>Enter Token</label> <input type="text" v-model="code_input" placeholder="Type a string" /> <button class="btn btn-primary" @click="htmlLoginRedirect()">Submit</button></div> </template><template v-else><section class="buttons row"><div class="col text-center"> <button class="btn btn-success" @click="getDevices">Refresh Devices</button> <button class="btn btn-success" @click="getRefreshToken">Refresh Token</button> <button class="btn btn-success" @click="downloadJson">Download JSON</button></div> </section><section class="row user-profile-devices"><div v-if="profile != ''" class="col-md-8"><div class="media"><div class="pull-left"> <img class="media-object" width="150" :src="profile.images[0].url" /></div><div class="media-body"><dl class="dl-horizontal"><dt>Display name</dt><dd class="clearfix">{{profile.display_name}}</dd><dt>Id</dt><dd>{{profile.id}}</dd><dt>Email</dt><dd>{{profile.email}}</dd><dt>Spotify URI</dt><dd><a :href="profile.external_urls.spotify">{{profile.external_urls.spotify}}</a></dd><dt>Link</dt><dd><a :href="profile.href">{{profile.href}}</a></dd><dt>Profile Image</dt><dd class="clearfix"><a target="_blank" :href="profile.images[0].url">View</a></dd><dt>Country</dt><dd>{{profile.country}}</dd></dl></div></div></div><div v-if="devices != ''" class="input-group col-md-4"><div class="input-group-prepend"> <label class="input-group-text" for="inputGroupSelect01">Devices</label></div> <select v-model="selectedDevice" class="custom-select" id="inputGroupSelect02"><option disabled selected value="">Choose your device</option><option v-for="items in devices" :value="items.id">{{ items.name }} - {{ items.volume_percent}}%</option> </select></div> </section><section class="row tokens"><div class="col"> <label>Access Token</label><pre style="white-space: pre-wrap;">{{ access_token }}</pre></div><div class="col"> <label>Refresh Token</label><pre style="white-space: pre-wrap;">{{ refresh_token }}</pre></div> </section><section class="albums"><div><div class="input row"><div class="input-group col-6"><div class="input-group-prepend"> <span class="input-group-text" id="basic-addon1">Card ID</span></div> <input v-model="albumSearch.cardId" type="text" class="form-control" placeholder="Card ID" aria-label="Card ID" aria-describedby="basic-addon1"><div class="input-group-prepend"> <span class="input-group-text" id="basic-addon2">Spotify Album Id</span></div> <input v-model="albumSearch.albumId" type="text" class="form-control" placeholder="Spotify Album Id" aria-label="Spotify Album Id" aria-describedby="basic-addon2"></div><button class="btn btn-success" @click="getAlbumInfo(albumSearch.cardId, albumSearch.albumId)">Add Album</button> <button class="btn btn-alert" @click="getDevices">Clear</button></div></div><table class="table"><thead class="thead-dark"><tr><th scope="col">Card No#</th><th scope="col">Image</th><th scope="col">Artist</th><th scope="col">Album</th><th scope="col">Spotify Album Id</th><th scope="col">Play</th></tr></thead><tbody><tr v-for="album in albumList" :key="album.cardId"><th scope="row">{{album.cardId}}</th><td><div style="height:100px"> <img style="height:100%" :src="album.image_url" /></div></td><td>{{album.artistName}}</td><td>{{album.albumName}}</td><td>{{album.context_uri}}</td><td> <button class="btn btn-success" @click="playOnSelectedDevice(album.context_uri)">Play</button></td></tr></tbody></table> </section></template></div></div></body> <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/crypto-js.min.js" integrity="sha512-nOQuvD9nKirvxDdvQ9OMqe2dgapbPB7vYAMrzJihw5m+aNcf0dX53m6YxM4LgA9u8e9eg9QX+/+mPu8kCNpV2A==" crossorigin="anonymous"></script> </html>`;

var vue = `window.onload = function() { 
  new Vue({
  el: '#nfc_esp_spotify',
  data: {
    access_token: '',
    refresh_token: '',
    expiry: '',
    profile: [],
    devices: [],
    selectedDevice: '',
    albumList: [
      {
        "cardId": "48768545",
        "image_url": "https://i.scdn.co/image/ab67616d0000b273dc30583ba717007b00cceb25",
        "context_uri": "spotify:album:0ETFjACtuP2ADo6LFhL6HN",
        "artistName": "The Beatles",
        "albumName": "Abbey Road (Remastered)"
      },
      {
        "cardId": "56765894",
        "image_url": "https://i.scdn.co/image/ab67616d0000b2737da6d6787071a97593cfbcee",
        "context_uri": "spotify:album:5m1RkwKeU7MV0Ni6PH2lPy",
        "artistName": "Bonobo",
        "albumName": "Black Sands"
      },
      {
        "cardId": "358567",
        "image_url": "https://i.scdn.co/image/ab67616d0000b27368b2690cd6fac72eb0776f3b",
        "context_uri": "spotify:album:0Cgimhjcc2xUIo0Q5BPjAJ",
        "artistName": "Oasis",
        "albumName": "The Masterplan"
      },
      {
        "cardId": "3196796",
        "image_url": "https://i.scdn.co/image/ab67616d0000b2739737959b4ac5694679793e66",
        "context_uri": "spotify:album:5vpSQUagobcDEf6IVcmM1m",
        "artistName": "Fatboy Slim",
        "albumName": "Why Try Harder - The Greatest Hits"
      }
    ],
    albumSearch: {
      cardId: '',
      albumId: ''
    },
    config: {
      client_id: "8b48899cde754633a63eba10a60e1828",
      redirect_uri: "http://localhost:8888",
      authorization_endpoint: "https://accounts.spotify.com/authorize",
      token_endpoint: "https://accounts.spotify.com/api/token",
      requested_scopes: "user-modify-playback-state user-read-private user-read-email user-read-playback-state"
    }
  },
  computed: {
    accessGranted: function () {
      if (this.access_token != '') {
        return true;
      }
      return false;
    },
    isTokenValid: function () {
      console.warn('expiry', this.expiry);
      console.warn('current time', new Date().getTime());
      if (this.expiry > new Date().getTime()) {
        return true;
      }
      return false;
    },
  },
  mounted() {
    var q = this.parseQueryString(window.location.search.substring(1));
    console.log('this is parse string', q);
    if (q.error) {
      alert("Error returned from authorization server: " + q.error);
      return false
    }
    if (q.code) {
      console.log('pkce_state', localStorage.getItem("pkce_state"));
      console.log('q state', q.state);
      if (localStorage.getItem("pkce_state") != q.state) {
        console.debug('in the if')
        alert("Invalid state");
      } else {
        console.debug('in the else')
        this.getAccessTokenFromCode(q.code)
      }
    }
  },
  watch: {
    accessGranted() {
      if (this.accessGranted) {
        this.getProfile();
        this.getDevices();
      }
    },
  },
  methods: {
    async getCodeFromSpotify() {
      const state = this.generateRandomString();
      localStorage.setItem("pkce_state", state);

      const code_verifier = this.generateRandomString();
      localStorage.setItem("pkce_code_verifier", code_verifier);

      const code_challenge = await this.pkceChallengeFromVerifier(code_verifier);

      const url = this.config.authorization_endpoint
        + "?response_type=code"
        + "&client_id=" + encodeURIComponent(this.config.client_id)
        + "&state=" + encodeURIComponent(state)
        + "&scope=" + encodeURIComponent(this.config.requested_scopes)
        + "&redirect_uri=" + encodeURIComponent(this.config.redirect_uri)
        + "&code_challenge=" + encodeURIComponent(code_challenge)
        + "&code_challenge_method=S256"
        ;
      window.location = url;
    },
    getAccessTokenFromCode(code) {
      const token = {
        grant_type: "authorization_code",
        code: code,
        client_id: this.config.client_id,
        redirect_uri: this.config.redirect_uri,
        code_verifier: localStorage.getItem("pkce_code_verifier")
      };
      const tokenBody = Object.keys(token).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(token[key])).join('&');
      fetch(this.config.token_endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          body: tokenBody
        }).then(response => {
          response.json().then(json => {
            console.log('getAccessTokenFromCode response', json)
            this.access_token = json.access_token;
            this.refresh_token = json.refresh_token;
            this.expiry = this.createNewExpiry();
            localStorage.setItem("access_token", json.access_token)
          })
        }).catch(err => {
          console.log('getAccessTokenFromCode err', jserron)
        })
      history.replaceState({}, document.title, ".");
    },
    getRefreshToken() {
      let details = {
        grant_type: 'refresh_token',
        client_id: this.config.client_id,
        refresh_token: this.refresh_token
      }
      const formBody = Object.keys(details).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(details[key])).join('&');
      fetch('https://accounts.spotify.com/api/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          body: formBody
        }).then(response => {
          response.json().then(json => {
            console.log(json)
            if (json.access_token && json.refresh_token) {
              this.access_token = json.access_token;
              this.refresh_token = json.refresh_token;
              this.expiry = this.createNewExpiry()
            }
            else {
              console.log(json)
            }
          })
        })
    },
    getProfile() {
      if (this.isTokenValid) {
        fetch('https://api.spotify.com/v1/me',
          {
            headers: {
              'Authorization': 'Bearer ' + this.access_token
            }
          }).then(response => {
            response.json().then(json => {
              this.profile = json
            })
          })
      } else {
        getRefreshToken();
      }
    },
    async getDevices() {
      if (this.isTokenValid) {
        fetch('https://api.spotify.com/v1/me/player/devices',
          {
            headers: {
              'Authorization': 'Bearer ' + this.access_token
            }
          }).then(response => {
            if (!response.ok) {
              this.getRefreshToken()
            }
            else {
              response.json().then(json => {
                this.devices = json.devices
              })
            }
          })
      } else {
        await this.getRefreshToken();
      }
    },
    getAlbumInfo(cardId, albumId) {
      if (this.isTokenValid) {
        fetch('https://api.spotify.com/v1/albums' + albumId.replace('spotify:album:', '?ids='),
          {
            headers: {
              'Authorization': 'Bearer ' + this.access_token
            }
          }).then(response => {
            response.json().then(json => {
              if (json.albums.length > 0) {
                const al = json.albums[0];
                const albumArr =
                {
                  cardId: cardId,
                  image_url: al.images[0].url,
                  context_uri: albumId,
                  artistName: al.artists[0].name,
                  albumName: al.name,
                };
                this.albumList.push(albumArr);
              }
              else {
                console.log('Album not found');
              }
            })
          })
      } else {
        getRefreshToken();
      }
    },
    playOnSelectedDevice(context_uri) {
      const album = {
        "context_uri": context_uri,
        "offset": {
          "position": 0
        },
        "position_ms": 0
      };
      const url = 'https://api.spotify.com/v1/me/player/play?device_id=' + this.selectedDevice;
      if (this.isTokenValid) {
        fetch(url,
          {
            method: 'PUT',
            body: JSON.stringify(album),
            headers: {
              'Authorization': 'Bearer ' + this.access_token
            }
          }).then(response => {
            response.json().then(json => {
              console.log(json);
            })
          })
      } else {
        this.getRefreshToken();
      }
    },
    htmlLoginRedirect() {
      return window.location.href = this.code_input;
    },
    downloadJson() {
      const newObj = {
        accessToken: this.access_token,
        refreshToken: this.refresh_token,
        selectedDevice: this.selectedDevice,
        albumList: this.albumList,
        expiry: this.expiry
      }
      fetch('/auth-to-esp', {
        method: 'POST',
        body: JSON.stringify({
          'access_token' : this.access_token,
          'refresh_token': this.refresh_token,
          'expiry' : this.expiry,
          'client_id': this.config.client_id,
          'selected_device': this.selectedDevice
        }),
        headers: {
          'Content-Type': 'application/json'
        },
      }).then(response => {
        response.json().then(json => {
          console.log(json);
          console.log('config file sent to ESP');
        })
      })
    },
    createNewExpiry() {
      const myDate = new Date();
      return myDate.setHours(myDate.getHours() + 1);
    },
    async pkceChallengeFromVerifier(v) {
      let reg1, reg2, reg3 = '';
      reg1 = ${/\+/g};
      reg2 = ${/\//g};
      reg3 = ${/=+$/};
      const hashed = CryptoJS.SHA256(v);
      const base64 = CryptoJS.enc.Base64.stringify(hashed);
      console.warn(base64);
      const strip = base64.replace(reg1, '-').replace(reg2, '_').replace(reg3, '');
      console.warn(strip);
      return strip;
    },
    generateRandomString() {
      const array = new Uint32Array(28);
      window.crypto.getRandomValues(array);
      return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
    },
    parseQueryString(string) {
      if (string == "") { return {}; }
      const segments = string.split("&").map(s => s.split("="));
      let queryString = {};
      segments.forEach(s => queryString[s[0]] = s[1]);
      return queryString;
    },
  },
})
}`;
