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
    // Check if the server returned an error string
    if (q.error) {
      alert("Error returned from authorization server: " + q.error);
      return false
    }
    if (q.code) {
      console.log('pkce_state', localStorage.getItem("pkce_state"));
      console.log('q state', q.state);
      if (localStorage.getItem("pkce_state") != q.state) {
        console.debug('in the else')
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
      // Create and store a random "state" value
      const state = this.generateRandomString();
      localStorage.setItem("pkce_state", state);
      // Create and store a new PKCE code_verifier (the plaintext random secret)
      const code_verifier = this.generateRandomString();
      localStorage.setItem("pkce_code_verifier", code_verifier);
      // Hash and base64-urlencode the secret to use as the challenge
      const code_challenge = await this.pkceChallengeFromVerifier(code_verifier);
      // Build the authorization URL
      const url = this.config.authorization_endpoint
        + "?response_type=code"
        + "&client_id=" + encodeURIComponent(this.config.client_id)
        + "&state=" + encodeURIComponent(state)
        + "&scope=" + encodeURIComponent(this.config.requested_scopes)
        + "&redirect_uri=" + encodeURIComponent(this.config.redirect_uri)
        + "&code_challenge=" + encodeURIComponent(code_challenge)
        + "&code_challenge_method=S256"
        ;
      // Redirect to the authorization server
      window.location = url;
    },
    getAccessTokenFromCode(code) {
      // Exchange the authorization code for an access token
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
            this.refresh_token = json.refresh_token
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
        // this.getDevices();
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
            })1
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
      const url = 'https://api.spotify.com/v1/me/player/play?device_id=' + this.selectedDevice
      if (this.isTokenValid) {
        fetch(url,
          {
            method: 'PUT', // 'GET', 'PUT', 'DELETE', etc.
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
      fetch('http://localhost:8888/json-to-esp',
        {
          method: 'POST', // 'GET', 'PUT', 'DELETE', etc.
          body: JSON.stringify(newObj),
          headers: {
            'Content-Type': 'application/json'
            // 'Content-Type': 'application/x-www-form-urlencoded',
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
      // Create SHA256
      // Then convert the base64 encoded to base64url encoded
      //   (replace + with -, replace / with _, trim trailing =)
      const hashed = CryptoJS.SHA256(v);
      const base64 = CryptoJS.enc.Base64.stringify(hashed);
      const strip = base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
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