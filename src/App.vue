<script>
import spotify_auth from './components/spotify_auth.vue';


export default {

  data(){
    return {
      window: 'login',
      id: "934b2170ecfb4f34af81a0d0b159d851",
      secret: '61095338f0164dc98b728d7c930fe50e',

      mode: "playlist",
      previous_mode: "",


      playlists: [],
      currentPlaylist: undefined,
      currentPlaylistSongs: [],


      username: "",
      user_id: "",
      usermodel: {},
      user_img: "/test.png",

      player: {},
      player_raw: undefined,
      player_img: "",
      player_title: "",

      isCurrentSongLiked: false,

      currentSongId: "",
      contextUri: "",

      currentSongProgress: 0,
      SongProgressMs: 0,
      currentSongDurationTime: "0:00",
      currentSongProgressTime: "0:00",


      playlistFilterOptions: "",
      playlistSortedRandom: false,

      playlistFilters: {
        duplicates: false,
        length: {
          longer: "",
          shorter: "",
        },
        release: {
          before: "",
          after: "",
        },
        genres: {},

      },

      player: {
        item: {
          name: "",
          album: {
            images:[{},{url: ""}],
          },
        },
        device: {
            volume_percent: 100,
        },
      },

      saveUri: false,

      inputLink: "",

      currentFavId: "",
      currentFavType: "",
      currentFavList: {"tracks": []},
      volumeClickWidth: 0,
      progressClickWidth: 0,

      deviceActive: false,

      devices: [],
      activeDevice: "",

      que: [],
      currentSong: {name: "", },


      topPlaylistSongs: [],
      allPlaylists: [],
      currentSongPlaylists: [],

      AddSelectionOpen: false,
      FilterOpen: false,
      experimental: false,
    }
  },
  components: {
    spotify_auth,
  },
  props: {

  },
  methods: {

    RequestAuthorization(_id, _secret){
      this.$refs.auth_child.RequestAuthorization(_id, _secret);
    },


    CallApi(method, url, body, instruction){
        const currentScope = this;
        let xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
        xhr.send(JSON.stringify(body));
        xhr.onload = function() {
          if (this.status == 200 || this.status == 201){
              var data = JSON.parse(this.responseText);
              currentScope.doSmtWithData(data, instruction);
          }
          else if ( this.status == 401 ){
              currentScope.$refs.auth_child.refreshAccessToken();
          } else if ( this.status == 204 ){
              if(instruction == "playerState"){
                console.log("player isnt playing");
              }
          }
          else if(this.status == 502 || this.status == 500){
            if(method == "DELETE") {alert("spotify server error while deletion please try again (some items could be duplicated or missing)")};
            currentScope.CallApi(method, url, body, instruction);
            console.log(this.responseURL);
          } else if(this.status == 403){
              if(this.responseText == "Index out of bounds."){
                currentScope.CallApi(method, url, body, instruction);
              }
          } else {
            console.log(this.status);
          }
        };
    },




    doSmtWithData(_data, instruction){
      if(instruction == "initial"){
        this.usermodel = _data;
        this.username = _data.display_name.toString;
        this.user_img = _data.images[0].url;
        this.user_id = _data.id;

      } else if(instruction == "playerState"){
        if(_data.is_playing == false) {
          this.player.is_playing = false;
          return;
        };

        console.log(_data);

        if(this.currentSongId != _data.item.id){
          this.contextUri = _data.context.uri;
          this.currentSongId = _data.item.id;
          this.GetQue();
          this.GetDevices();
          this.CallApi( "GET", "https://api.spotify.com/v1/me/tracks/contains?ids=" + this.currentSongId, null, "checkIfLiked");
        }



        this.player = _data;
        this.SongProgressMs = _data.item.duration_ms;
        this.currentSongProgress = _data.progress_ms / _data.item.duration_ms * 100;



        this.currentSongProgressTime = (Math.floor((_data.progress_ms / 1000) / 60)).toString() + ":" + (Math.floor(_data.progress_ms / 1000) % 60).toString().padStart(2, "0");
        this.currentSongDurationTime = (Math.floor((_data.item.duration_ms / 1000) / 60)).toString() + ":" + (Math.floor(_data.item.duration_ms / 1000) % 60).toString().padStart(2, "0");
        //console.log(data);


      } else if(instruction == "checkIfLiked"){
        this.isCurrentSongLiked = _data[0];
      } else if(instruction == "InitialPlaylistSync"){

        _data.items.forEach(e => {
             if(e.images.length == 0){e.images.push("")}
        });
        this.playlists = this.playlists.concat(_data.items);

        if(_data.next != null){
          this.CallApi( "GET", _data.next, null, "InitialPlaylistSync");
        }

      } else if(instruction == "getSongsFromCurrentPlaylist"){
        if(playlistSelected){
          this.currentPlaylistSongs = [];
          playlistSelected = false;
        }
        this.currentPlaylistSongs = this.currentPlaylistSongs.concat(_data.items);
        if(_data.next != null){
          this.CallApi( 'GET', _data.next, null, 'getSongsFromCurrentPlaylist');
          console.log(_data);
        } else {
          playlistSelected = true;
          this.playlists[this.playlists.findIndex(e => e.id == this.currentPlaylist.id)].tracks.total = this.currentPlaylistSongs.length;
        }

        //if _data.total

      } else if(instruction == "updateCurrentPlaylist"){
        this.CallApi( 'GET', `https://api.spotify.com/v1/playlists/${this.currentPlaylist.id}/tracks`, null, 'getSongsFromCurrentPlaylist');
      } else if(instruction == "createPlaylist"){
        _data.items.forEach(e => {
          tempPlaylist.content.push(e.uri);
        });

        this.CallApi('POST', `https://api.spotify.com/v1/users/${this.user_id}/playlists`, { "name": tempPlaylist.name, "description": tempPlaylist.descr, "public": false}, "addSongstoNewPlaylist" );
        console.log(tempPlaylist.content);
      } else if(instruction == "addSongstoNewPlaylist"){
        if(_data.name == "top 30 days"){
          localStorage.setItem(`short_term+${this.user_id}`, _data.id);
        } else if (_data.name == "top 6 months"){
          localStorage.setItem(`medium_term+${this.user_id}`, _data.id);
        } else if(_data.name == "all time favs"){
          localStorage.setItem(`long_term+${this.user_id}`, _data.id);
        }
        const tempList = {"uris": [...tempPlaylist.content], "position": 0};
        this.CallApi('POST', `https://api.spotify.com/v1/playlists/${_data.id}/tracks`, tempList);

        console.log(_data);
        tempPlaylist = {name: "", descr: "", length: undefined, content: []};
      } else if(instruction == "GetImage"){
        window.open(_data.images[0].url, '_blank');
        console.log(_data)
      } else if(instruction == "refreshTopSongList"){
        console.log(_data);
        _data.items.forEach(e => {
          if(!e.track.uri.includes("spotify:local"))
          this.currentFavList.tracks.push({"uri": e.track.uri});
        });
        if(_data.next != null){
          this.CallApi( 'GET', _data.next, null, 'refreshTopSongList');
        } else {
          this.CallApi("DELETE", `https://api.spotify.com/v1/playlists/${this.currentFavId}/tracks`, this.currentFavList);

          this.currentFavList = {"tracks": []};

          this.CallApi("GET", `https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=${this.currentFavType}`, null, "updateTopSongList" )

        }
        //
      } else if(instruction == "updateTopSongList"){
        let _addData = {"uris": [], "position": 0};
        console.log(_data);
        _data.items.forEach((e) => {
          _addData.uris.push(e.uri);
        });
        this.CallApi("POST", `https://api.spotify.com/v1/playlists/${this.currentFavId}/tracks`, _addData);
      } else if(instruction == "getQue"){
        console.log(_data);
        this.currentSong = _data.currently_playing;
        this.que = _data.queue;
      } else if(instruction == "getDevices"){
        this.devices = _data.devices.filter(e => !e.is_active);
        this.activeDevice = _data.devices.filter(e => e.is_active)[0];

        console.log(_data.devices);
      } else if(instruction == "getAllPlaylists"){

        if(_data.hasOwnProperty("tracks")){
          this.allPlaylists.push(_data);

          if(_data.tracks.next != null){
            this.CallApi( 'GET', _data.tracks.next, null, 'getAllPlaylists');
          }
        } else {
          const _id = _data.href.split("/")[5];
          // console.log(this.allPlaylists.filter(e => e.id == _id)[0]);
          // console.log(_data.items);
          this.allPlaylists.filter(e => e.id == _id)[0].tracks.items = this.allPlaylists.filter(e => e.id == _id)[0].tracks.items.concat(_data.items);

          if(_data.next != null){
            this.CallApi( 'GET', _data.next, null, 'getAllPlaylists');
          }
        }
      }
    },



    HandleAuthResponse(a){
      console.log(a);
      RefreshTimer();

      this.CallApi( "GET", "https://api.spotify.com/v1/me/player", null, "playerState");

      this.CallApi( "GET", "https://api.spotify.com/v1/me/", null, "initial");

      this.CallApi( "GET", "https://api.spotify.com/v1/me/playlists?limit=50", null, "InitialPlaylistSync");

      let interval = false;
      if(!interval){
        window.setInterval(() => {
          this.CallApi( "GET", "https://api.spotify.com/v1/me/player", null, "playerState");
        }, 1000);
        interval = true;
      }


      console.log(access_token);

      this.window = 'main';
    },

    SaveCurrentPlaylist(){

      //remove all items from playlist
      let _data = {"tracks": []};
      for (let i = 0; i < this.currentPlaylistSongs.length; i++) {
        if(i % 100 == 0 && i != 0){
          this.CallApi("DELETE", `https://api.spotify.com/v1/playlists/${this.currentPlaylist.id}/tracks`, _data);
          _data = {"tracks": []};
        }
        if(!this.currentPlaylistSongs[i].track.uri.includes("spotify:local")){
          _data.tracks.push({"uri": this.currentPlaylistSongs[i].track.uri});
        }
      }
      this.CallApi("DELETE", `https://api.spotify.com/v1/playlists/${this.currentPlaylist.id}/tracks`, _data);


      //add Songs
      let skipedSongs = 0;
      let _addData = {"uris": [], "position": 0};
      for(let i = 0; i < this.filteredPlaylist.length; i++){
        if(i % 100 == 0 && i != 0){
          this.CallApi("POST", `https://api.spotify.com/v1/playlists/${this.currentPlaylist.id}/tracks`, _addData);
          _addData = {"uris": [], "position": i - skipedSongs};
        }
        if(!this.filteredPlaylist[i].track.uri.includes("spotify:local")){
          _addData.uris.push(this.filteredPlaylist[i].track.uri);
        } else {
          skipedSongs++;
        }
      }
      this.CallApi("POST", `https://api.spotify.com/v1/playlists/${this.currentPlaylist.id}/tracks`, _addData, "updateCurrentPlaylist");
    },

    AddSelection(_id){
      let _addData = {"uris": []};
      for(let i = 0; i < this.filteredPlaylist.length; i++){
        if(i % 100 == 0 && i != 0){
          this.CallApi("POST", `https://api.spotify.com/v1/playlists/${_id}/tracks`, _addData);
          _addData = {"uris": []};
        }
        if(!this.filteredPlaylist[i].track.uri.includes("spotify:local")){
          _addData.uris.push(this.filteredPlaylist[i].track.uri);
        }
      }
      this.CallApi("POST", `https://api.spotify.com/v1/playlists/${_id}/tracks`, _addData);

      this.AddSelectionOpen = false;
    },

    DeleteSelection(){
      let _data = {"tracks": []};
      for (let i = 0; i < this.filteredPlaylist.length; i++) {
        if(i % 100 == 0 && i != 0){
          this.CallApi("DELETE", `https://api.spotify.com/v1/playlists/${this.currentPlaylist.id}/tracks`, _data);
          _data = {"tracks": []};
        }
        if(!this.filteredPlaylist[i].track.uri.includes("spotify:local")){
          _data.tracks.push({"uri": this.filteredPlaylist[i].track.uri});
        }
      }
      this.CallApi("DELETE", `https://api.spotify.com/v1/playlists/${this.currentPlaylist.id}/tracks`, _data);
    },

    CreatePlaylist(_type, _descr, _length, _name){
      let tempUri = localStorage.getItem(`${_type}+${this.user_id}`);
      if(tempUri != null && this.saveUri == false){
        this.currentFavId = tempUri;
        this.currentFavType = _type;
        this.CallApi( 'GET', `https://api.spotify.com/v1/playlists/${tempUri}/tracks`, null, 'refreshTopSongList');
      } else if(this.own_playlists.filter(e => e.name == _name)[0].name == _name && this.saveUri == false){
        this.currentFavId = this.own_playlists.filter(e => e.name == _name)[0].id;
        this.currentFavType = _type;

        if(_name == "top 30 days"){
          localStorage.setItem(`short_term+${this.user_id}`, this.currentFavId);
        } else if (_name == "top 6 months"){
          localStorage.setItem(`medium_term+${this.user_id}`,this.currentFavId);
        } else if(_name == "all time favs"){
          localStorage.setItem(`long_term+${this.user_id}`, this.currentFavId);
        }

        this.CallApi( 'GET', `https://api.spotify.com/v1/playlists/${this.currentFavId}/tracks`, null, 'refreshTopSongList');
      } else{
        tempPlaylist.name = _name;
        tempPlaylist.descr = _descr;
        tempPlaylist.length = _length;
        this.CallApi("GET", `https://api.spotify.com/v1/me/top/tracks?limit=${(_length < 50)? _length : 50}&time_range=${_type}`, null, "createPlaylist" )
      }




    },

    GetImage(){
      let shortedUrl = this.inputLink.split("?")[0];
      let id;
      let type;

      if(shortedUrl.includes(":")){
        shortedUrl = shortedUrl.substring(8);
        type = shortedUrl.split("/")[1];
        id = shortedUrl.split("/")[2];
      } else {
        type = shortedUrl.split("/")[1];
        id = shortedUrl.split("/")[2];
      }

      if(type == "album"){
        this.CallApi("GET", `https://api.spotify.com/v1/albums/${id}`, null, "GetImage" )
      } else if(type == "playlist"){
        this.CallApi("GET", `https://api.spotify.com/v1/playlists/${id}`, null, "GetImage" )
      }

      this.inputLink = "";
    },

    AddToQue(_uri){
      this.CallApi("POST", `https://api.spotify.com/v1/me/player/queue?uri=${_uri}`, null,);
    },

    GetQue(){
      this.CallApi("GET", `https://api.spotify.com/v1/me/player/queue`, null, "getQue");
    },

    GetDevices(){
      this.CallApi("GET", 'https://api.spotify.com/v1/me/player/devices', null, "getDevices");
    },

    SkipNSongs(_i){
      for(_i; _i > 0; _i--){
        this.CallApi('POST', 'https://api.spotify.com/v1/me/player/next', null, 'test' )
      }

    },

    ChangeDevice(_clickedObj){
      this.CallApi('PUT', 'https://api.spotify.com/v1/me/player/', { 'device_ids': [_clickedObj.id]});
      this.devices.push(this.activeDevice);
      this.activeDevice = _clickedObj;
      this.devices = this.devices.filter(e => e != _clickedObj);
    },

    getTopSongs(){
      console.log(this.own_playlists);
      console.log(this.allPlaylists);
      this.allPlaylists.forEach((e) => {
        if(e.tracks.items.length > 100){
          console.log(e);
        }
      })

      this.allPlaylists = [];

      this.own_playlists.forEach((e) => {
        this.CallApi("GET", `https://api.spotify.com/v1/playlists/${e.id}`, null,"getAllPlaylists")
      });
    },
    sortTopSongs(){
      // this.allPlaylists.forEach((e) => {
      //   console.log(e);
      //   e.tracks.items.forEach((f) =>{
      //     // console.log(f)
      //     if(this.topPlaylistSongs.filter(g => g.track.uri == f.track.uri).length > 0){
      //       this.topPlaylistSongs.filter(g => g.track.uri == f.track.uri)[0].count ++;
      //       this.topPlaylistSongs.filter(g => g.track.uri == f.track.uri)[0].playlists.push(e.name);
      //     } else {
      //       f.count = 1;
      //       f.playlists = [];
      //       f.playlists.push(e.name);
      //       console.log(f.playlists);
      //       this.topPlaylistSongs.push(f);
      //     }
      //   })
      // });



      for(let i = 0; i < this.allPlaylists.length; i++){
        console.log(this.allPlaylists[i].name);
        for(let j = 0; j < this.allPlaylists[i].tracks.items.length; j++){

          if(this.topPlaylistSongs.filter(g => g.track.uri == this.allPlaylists[i].tracks.items[j].track.uri).length > 0){
            this.topPlaylistSongs.filter(g => g.track.uri == this.allPlaylists[i].tracks.items[j].track.uri)[0].count ++;
            this.topPlaylistSongs.filter(g => g.track.uri == this.allPlaylists[i].tracks.items[j].track.uri)[0].playlists.push({name: this.allPlaylists[i].name, position: j + 1});
          } else {
            this.allPlaylists[i].tracks.items[j].count = 1;
            this.allPlaylists[i].tracks.items[j].playlists = [];
            this.allPlaylists[i].tracks.items[j].playlists.push({name: this.allPlaylists[i].name, position: j + 1});
            this.topPlaylistSongs.push(this.allPlaylists[i].tracks.items[j]);
          }

        }
      }

      this.topPlaylistSongs.sort((b,a) => (a.count > b.count) ? 1 : (b.count > a.count) ? -1 : 0);
    },

    openExperimental(){
      if(confirm("warning! \n you are about to enable experimental features... while using certain features your browser can be unresponsive or crashing")){
        this.experimental = true;
      }
    },

    // showTopSongPlaylists(_playlists){
    //   this.currentSongPlaylists = _playlists;
    // },

  },
  created() {

  },
  mounted(){
    let warning = localStorage.getItem("warning");
    if(!warning){
      if(confirm(("warning, use this app at own risk, it can happen, that while rearanging a playlist, there can be songs missing or songs can be duplicated. always double check if the playlist ended up the right way. after leaving or reloading the page, playlists cant be restored, maybe there will be a feature added to reroll your playlists to a previous version. Be espacially cautios with local songs, there is no way to handle local songs with the api, so try to avoid playlists with local songs in them. \n \n this app is work in progress, use at own risk \n \n by pressing okay you wont get this promt again" ))){
        localStorage.setItem("warning", true);
      }
    }

    document.addEventListener("mousedown", (event) => {
        const target = event.target;

        if(target.id == "volumeBelowBar" || target.id == "volumeBar" ){
          let rect;
          if(target.id == "volumeBelowBar"){
            rect = target.parentElement.getBoundingClientRect();
          } else {
            rect = target.getBoundingClientRect();
          }
          this.volumeClickWidth = Math.round(((event.clientX - rect.left) / rect.width * 100) / 5) * 5;
          this.CallApi("PUT", `https://api.spotify.com/v1/me/player/volume?volume_percent=${this.volumeClickWidth}`, null);
        }
        else if(target.id == "playerProgress" || target.id == "playerProgressCurrent"){
          let rect;
          if(target.id == "playerProgressCurrent"){
            rect = target.parentElement.getBoundingClientRect();
          } else {
            rect = target.getBoundingClientRect();
          }
          const _progressClickWidth = Math.round((event.clientX - rect.left) / rect.width * this.SongProgressMs);
          this.CallApi("PUT", `https://api.spotify.com/v1/me/player/seek?position_ms=${_progressClickWidth}`, null);

        }

      });


  },
  watch: {
    playlistFilterOptions(){
      if(this.playlistFilterOptions != "random" && this.playlistSortedRandom){
        this.playlistSortedRandom = false;
      }
    }
  },
  computed: {
    player_Trackname(){
      return global_trackname;
    },
    own_playlists(){
      let _tempList = this.playlists;
      _tempList = _tempList.filter((e) => e.owner.id == this.user_id);
      return _tempList;
    },
    player_Img(){
      if(this.player.item.album.images.length == 0) {
        return '';
      } else {
        return this.player.item.album.images[1].url
      }
    },
    SortedPlaylist(){

      const temp = [...this.currentPlaylistSongs];

      if(this.playlistFilterOptions == "length_a"){

        temp.sort((a,b) => (a.track.duration_ms > b.track.duration_ms) ? 1 : ((b.track.duration_ms > a.track.duration_ms) ? -1 : 0));
        return temp;

      } else if(this.playlistFilterOptions == "length_d"){

        temp.sort((b,a) => (a.track.duration_ms > b.track.duration_ms) ? 1 : ((b.track.duration_ms > a.track.duration_ms) ? -1 : 0));
        return temp;

      } else if(this.playlistFilterOptions == "release_a"){

        temp.sort(function(a, b) {
          const data_a = Date.parse(a.track.album.release_date);
          const data_b = Date.parse(b.track.album.release_date);

          if( !isFinite(data_a) && !isFinite(data_b) ) {
              return 0;
          }
          if( !isFinite(data_a) ) {
              return 1;
          }
          if( !isFinite(data_b) ) {
              return -1;
          }
          return data_a-data_b;
        });
        return temp;

      } else if(this.playlistFilterOptions == "release_d"){

        temp.sort(function(b, a) {
          const data_a = Date.parse(a.track.album.release_date);
          const data_b = Date.parse(b.track.album.release_date);

          if( !isFinite(data_a) && !isFinite(data_b) ) {
              return 0;
          }
          if( !isFinite(data_a) ) {
              return 1;
          }
          if( !isFinite(data_b) ) {
              return -1;
          }
          return data_a-data_b;
        });
        return temp;

      } else if(this.playlistFilterOptions == "random"){
        temp.sort((a, b) => 0.5 - Math.random());
        return temp;
      } else if(this.playlistFilterOptions == "artist_a"){
        temp.sort((a,b) => ((a.track.artists[0].name).toLowerCase() > (b.track.artists[0].name).toLowerCase()) ? 1 : (((b.track.artists[0].name).toLowerCase() > (a.track.artists[0].name).toLowerCase()) ? -1 : 0));
        return temp;
      } else if(this.playlistFilterOptions == "artist_d"){
        temp.sort((b,a) => ((a.track.artists[0].name).toLowerCase() > (b.track.artists[0].name).toLowerCase()) ? 1 : (((b.track.artists[0].name).toLowerCase() > (a.track.artists[0].name).toLowerCase()) ? -1 : 0));
        return temp;
      } else if(this.playlistFilterOptions == "album_a"){
        temp.sort((a,b) => ((a.track.album.name).toLowerCase() > (b.track.album.name).toLowerCase()) ? 1 : (((b.track.album.name).toLowerCase() > (a.track.album.name).toLowerCase()) ? -1 : 0));
        return temp;
      } else if(this.playlistFilterOptions == "album_d"){
        temp.sort((b,a) => ((a.track.album.name).toLowerCase() > (b.track.album.name).toLowerCase()) ? 1 : (((b.track.album.name).toLowerCase() > (a.track.album.name).toLowerCase()) ? -1 : 0));
        return temp;
      } else if(this.playlistFilterOptions == "name_a"){
        temp.sort((a,b) => ((a.track.name).toLowerCase() > (b.track.name).toLowerCase()) ? 1 : (((b.track.name).toLowerCase() > (a.track.name).toLowerCase()) ? -1 : 0));
        return temp;
      } else if(this.playlistFilterOptions == "name_d"){
        temp.sort((b,a) => ((a.track.name).toLowerCase() > (b.track.name).toLowerCase()) ? 1 : (((b.track.name).toLowerCase() > (a.track.name).toLowerCase()) ? -1 : 0));
        return temp;
      } else if(this.playlistFilterOptions == "pop_a"){
        temp.sort((a,b) => (a.track.popularity > b.track.popularity) ? 1 : ((b.track.popularity > a.track.popularity) ? -1 : 0));
        return temp;
      } else if(this.playlistFilterOptions == "pop_d"){
        temp.sort((b,a) => (a.track.popularity > b.track.popularity) ? 1 : ((b.track.popularity > a.track.popularity) ? -1 : 0));
        return temp;
      }



      else {
        return this.currentPlaylistSongs;
      }


    },
    filteredPlaylist(){
      let temp = [...this.SortedPlaylist];

      if(this.playlistFilters.duplicates){
        temp = temp.reduce((accumulator, current) => {
        if (!accumulator.find((e) => e.track.id === current.track.id)) {
          accumulator.push(current);
        }
        return accumulator;
        }, []);
      }

      if(this.playlistFilters.release.before != ""){
        temp = temp.filter((e) => e.track.album.release_date <= this.playlistFilters.release.before)
      }

      if(this.playlistFilters.release.after != ""){
        temp = temp.filter((e) => e.track.album.release_date >= this.playlistFilters.release.after)
      }

      if(this.playlistFilters.length.longer != ""){
        if(!isNaN(this.playlistFilters.length.longer)){
          temp = temp.filter((e) => e.track.duration_ms >= (this.playlistFilters.length.longer * 1000))
        } else {
          this.playlistFilters.length.longer = 0;
        }
      }

      if(this.playlistFilters.length.shorter != ""){
        if(!isNaN(this.playlistFilters.length.shorter)){
          temp = temp.filter((e) => e.track.duration_ms <= (this.playlistFilters.length.shorter * 1000))
        } else {
          this.playlistFilters.length.shorter = 0;
        }
      }

      return temp;
    }
  }

}
</script>

<template>
  <spotify_auth @response="(a) => HandleAuthResponse(a)" ref="auth_child"/>
  <div id="sessionTimer">
    <p id="ct">remaining session time: 60:00</p>
  </div>


  <div id="loginWrapper" v-if="window === 'login' && !loggedIn">

  </div>

  <div id="mainWrapper" v-else>
    <div id="userprofile">
      <div id="userIcon" class="clickable unmarkable">
        <img v-bind:src="user_img">
      </div>
    </div>

    <div id="interaction">
      <!-- <div id="topbar">

      </div> -->
      <div id="drawer" class="unmarkable">

        <div id="drawerTopArea" class="levelOneContainer">
          <div class="TopDrawerButton clickable" id="TopDrawerPlaylist" @click="mode = 'playlist'" >
            <h2 :class="{activeText: mode == 'playlist'}">Playlist editor</h2>
          </div>
          <div class="TopDrawerButton clickable" id="TopDrawerCreate" @click="mode = 'create'" >
            <h2 :class="{activeText: mode == 'create'}">Utils</h2>
          </div>
        </div>

        <div id="drawerBottomArea" class="levelOneContainer">
          <div v-for="list in own_playlists" class="playlists clickable" @click=" currentPlaylist = list; CallApi( 'GET', list.tracks.href, null, 'getSongsFromCurrentPlaylist'); ">
            <img :src="list.images[0].url">
            <p>{{ list.name }}</p><small>{{ list.tracks.total }} songs</small>
          </div>
        </div>

      </div>






      <!-- main section -->
      <div id="interactionWindow" class="unmarkable">


        <div id="que" v-if="mode == 'que'">
          <h1>QUE</h1><br>
          <h3>current Song:</h3>
          <p id="currentSongQue"><b>{{ currentSong.name }}</b> by {{ currentSong.artists[0].name }}</p><br><br>
          <h3>queued Songs:</h3>
          <div id="queuedSongs">
            <p v-for="(song, index) in que" @click="SkipNSongs(index + 1)"><b>{{ song.name }}</b> by {{ song.artists[0].name }}</p><br><br>
          </div>


        </div>

        <div id="playlistCreator" v-else-if="mode == 'create'">
          <button @click="CreatePlaylist('short_term','your top Songs from the last 30 Days', 50, 'top 30 days')" style="background-color: transparent; border: 1px solid white; outline: none; border-radius: 4px;">top 30 Days</button>
          <button @click="CreatePlaylist('medium_term','your top Songs from the last 6Months', 50, 'top 6 months')" style="background-color: transparent; border: 1px solid white; outline: none; border-radius: 4px;">top 6 Months</button>
          <button @click="CreatePlaylist('long_term','your top Songs ever', 50, 'all time favs')" style="background-color: transparent; border: 1px solid white; outline: none; border-radius: 4px;">top All time</button><br>
          <input type="checkbox" v-model="saveUri"> create new Playlist<br><br><br>


          <input type="text" v-model="inputLink" style="background-color: transparent; width: 760px;" placeholder="paste a Link to a playlist or an album to get there Cover" >
          <button @click="GetImage" style="background-color: transparent; border: 1px solid white; outline: none; border-radius: 4px;">Get Image</button><br><br>

          <button style="background-color: transparent; border: 1px solid white; outline: none; border-radius: 4px;" @click="openExperimental()" v-if="!experimental">enable experimental features</button>
          <div id="experimentalSection" v-if="experimental">
            <button @click="getTopSongs()">get Top Songs in Playlists</button>
          <button @click="sortTopSongs()">show Top Songs in Playlists</button>
          <div id="topsonglist" style=" width: 50%; height: 400px; overflow-y: scroll;">
            <div v-for="songs in topPlaylistSongs" @click="currentSongPlaylists = songs.playlists" class="clickable">
              {{ songs.track.name }} - {{ songs.track.artists[0].name }} : {{ songs.count }}
            </div>
          </div>
          <div id="topSongPlaylists" style=" position: relative; left: 50%; top: -400px; width: 30%; height: 300px; overflow-y: scroll;">
            <div v-for="playlist in currentSongPlaylists">
              {{ playlist.name }} -  {{ playlist.position }}
            </div>
          </div>
          </div>
        </div>

        <div id="interactivePlaylistEditor" v-else>


          <div id="PlaylistEditorPlaylistSelectWrapper" v-if="currentPlaylist == undefined">

          </div>


          <div id="PlaylistEditorViewerWrapper" v-else>

            <div id="PlatlistEditorUpperSection">

              <div id="PlaylistEditorSelectedPlaylistWrapper">
                <img :src="currentPlaylist.images[0].url">
                <p v-if="currentPlaylist.public">public playlist</p>
                <p v-else>private playlist</p>
                <h2>{{ currentPlaylist.name }}</h2>
                <h4>by {{ currentPlaylist.owner.display_name }} • {{ currentPlaylist.tracks.total }} songs</h4>
              </div>



              <div id="playlistEditorFilterMenu" :class="FilterOpen? '': 'invisible'" @click.self="FilterOpen = false">
                <div id="playlistFilterModalInner">
                  <p style="position: absolute; right: 15px; top: -5px; font-weight: bold; font-size: large;" @click="FilterOpen = false" class="clickable">x</p>
                  Filter by
                  <br><br>
                  duplicates: <input type="checkbox" v-model="playlistFilters.duplicates"><br>
                  release: after <input type="date" v-model="playlistFilters.release.after" style="background-color: transparent; border: none;"> before <input type="date" v-model="playlistFilters.release.before" style="background-color: transparent; border: none;"><br>
                  length (in seconds): longer than <input type="text" v-model="playlistFilters.length.longer" style="background-color: transparent; border: 1px solid white; border-radius: 4px;"> shorter then <input type="text" v-model="playlistFilters.length.shorter" style="background-color: transparent; border: 1px solid white; border-radius: 4px;"><br>
                </div>
              </div>

              <div id="playlistEditorButtons">
                <div id="addplaylistPopup" :class="AddSelectionOpen? '' : 'invisible'">
                  <div v-for="list in own_playlists" @click="AddSelection(list.id)">
                    {{ list.name }}
                  </div>
                </div>
                <button @click="AddSelectionOpen = !AddSelectionOpen" class="playlistEditorButtonsBtns clickable">add Selection to other Playlist</button>
                <button @click="DeleteSelection()" class="playlistEditorButtonsBtns clickable">delete Selection</button>
                <button id="saveBtnPlaylistEditor" @click="SaveCurrentPlaylist()" class="clickable playlistEditorButtonsBtns">save Selection</button>
              </div>

            </div>

            <div id="PlatlistEditorSectionDevider"></div>

            <div id="PlatlistEditorLowerSection">
              <div class="platlistEditorLowerSectionContainer" style="padding-bottom: 15px; position: fixed; background: linear-gradient(180deg, var(--firstElementBackground) 40%, rgba(255, 0, 0, 0) 100%);">
                <div class="platlistEditorLowerSectionContainerLine playlistLineLong" style="color: var(--accentGreen); font-weight: bold;">Name <p v-if="playlistFilterOptions == 'name_a'" @click="playlistFilterOptions = 'name_d'" class="clickable">▲</p><p v-else-if="playlistFilterOptions == 'name_d'" @click="playlistFilterOptions = ''" class="clickable" >▼</p><p v-else @click="playlistFilterOptions = 'name_a'" class="clickable">-</p> </div>
                <div class="platlistEditorLowerSectionContainerLine playlistLineLong" style="color: var(--accentGreen); font-weight: bold;">Album <p v-if="playlistFilterOptions == 'album_a'" @click="playlistFilterOptions = 'album_d'" class="clickable">ʌ</p><p v-else-if="playlistFilterOptions == 'album_d'" @click="playlistFilterOptions = ''" class="clickable">v</p><p v-else @click="playlistFilterOptions = 'album_a'" class="clickable">-</p> </div>
                <div class="platlistEditorLowerSectionContainerLine playlistLineLong" style="color: var(--accentGreen); font-weight: bold;">Artist <p v-if="playlistFilterOptions == 'artist_a'" @click="playlistFilterOptions = 'artist_d'" class="clickable">ʌ</p><p v-else-if="playlistFilterOptions == 'artist_d'" @click="playlistFilterOptions = ''" class="clickable">v</p><p v-else @click="playlistFilterOptions = 'artist_a'" class="clickable">-</p> </div>
                <div class="platlistEditorLowerSectionContainerLine playlistLineMedium" style="color: var(--accentGreen); font-weight: bold;">Release Date <p v-if="playlistFilterOptions == 'release_a'" @click="playlistFilterOptions = 'release_d'" class="clickable">ʌ</p><p v-else-if="playlistFilterOptions == 'release_d'" @click="playlistFilterOptions = ''" class="clickable">v</p><p v-else @click="playlistFilterOptions = 'release_a'" class="clickable">-</p> </div>
                <div class="platlistEditorLowerSectionContainerLine playlistLineShort" style="color: var(--accentGreen); font-weight: bold;">Length <p v-if="playlistFilterOptions == 'length_a'" @click="playlistFilterOptions = 'length_d'" class="clickable">ʌ</p><p v-else-if="playlistFilterOptions == 'length_d'" @click="playlistFilterOptions = ''" class="clickable">v</p><p v-else @click="playlistFilterOptions = 'length_a'" class="clickable">-</p> </div>
                <div class="platlistEditorLowerSectionContainerLine playlistLineShort" style="color: var(--accentGreen); font-weight: bold;">Popularity <p v-if="playlistFilterOptions == 'pop_a'" @click="playlistFilterOptions = 'pop_d'" class="clickable">ʌ</p><p v-else-if="playlistFilterOptions == 'pop_d'" @click="playlistFilterOptions = ''" class="clickable">v</p><p v-else @click="playlistFilterOptions = 'pop_a'" class="clickable">-</p> </div>
                <div class="platlistEditorLowerSectionContainerLine playlistLineShort" style="color: var(--accentGreen); font-weight: bold;">Random <input type="checkbox"  v-model="playlistSortedRandom" class="PlaylistEditSortingBox clickable" @change="playlistSortedRandom ? playlistFilterOptions = 'random' : playlistFilterOptions = ''" ></div>
                <div class="platlistEditorLowerSectionContainerLine playlistLineShort clickable" style="color: var(--accentGreen); font-weight: bold; text-decoration: underline;" @click="FilterOpen = true">Filter</div>
              </div>
              <div style="margin-bottom: 40px;"></div>
              <div v-for="songs in filteredPlaylist" class="platlistEditorLowerSectionContainer">
                <div class="platlistEditorLowerSectionContainerLine playlistLineLong" style="cursor: pointer;" @click="AddToQue(songs.track.uri)"> {{ songs.track.name }} </div>
                <div class="platlistEditorLowerSectionContainerLine playlistLineLong"> {{ songs.track.album.name }} </div>
                <div class="platlistEditorLowerSectionContainerLine playlistLineLong"> {{ songs.track.artists[0].name }} </div>
                <div class="platlistEditorLowerSectionContainerLine playlistLineMedium"> {{ songs.track.album.release_date }} </div>
                <div class="platlistEditorLowerSectionContainerLine playlistLineShort"> {{ Math.floor(songs.track.duration_ms / 1000 / 60 % 60).toString().padStart(2, "0") }}:{{ Math.floor(songs.track.duration_ms / 1000 % 60).toString().padStart(2, "0") }} </div>
                <div class="platlistEditorLowerSectionContainerLine playlistLineShort"> {{ songs.track.popularity }} </div>
              </div>
            </div>

          </div>

        </div>




        <div id="player">


          <div id="playerLeftBar">
            <img id="playerImg" v-bind:src="player_Img" class="unmarkable">

              <div id="playerPlaying" >
                <p class="unmarkable">{{ this.player.item.name }}</p>
                <div id="playerArtist">
                  <small v-for="(artists, index) in player.item.artists" class="unmarkable">
                    <small v-if="index != 0 || index == player.item.artists.length">,</small>
                    {{ artists.name }}
                  </small>
                </div>
                <div id="playerLiked" class="unmarkable">
                  <img v-if="isCurrentSongLiked" src="iconation/heart_green.png" class="likedIconPlayer">
                  <img v-else src="iconation/heart.png" class="likedIconPlayer">
                </div>

            </div>

          </div>


          <div id="playerCenterBar" class="unmarkable">

            <div id="playerCenterBarTop">
              <div id="playerShuffle" class="playerButton">
                <img v-if="player.shuffle_state" src="iconation/shuffle_active.png" @click="CallApi('PUT', 'https://api.spotify.com/v1/me/player/shuffle?state=false', null )">
                <img v-else src="iconation/shuffle.png" @click="CallApi('PUT', 'https://api.spotify.com/v1/me/player/shuffle?state=true', null )">
              </div>
              <img id="playerPrevious" src="iconation/rewind-button.png" class="playerButton" @click="CallApi('POST', 'https://api.spotify.com/v1/me/player/previous', null )">
              <div id="playerPlay" class="playerButton">
                <img v-if="player.is_playing" src="iconation/pause.png" @click="CallApi('PUT', 'https://api.spotify.com/v1/me/player/pause', null )">
                <img v-else src="iconation/play-button.png" @click="CallApi('PUT', 'https://api.spotify.com/v1/me/player/play', {} )">
              </div>
              <img id="playerNext" src="iconation/skip.png" class="playerButton" @click="CallApi('POST', 'https://api.spotify.com/v1/me/player/next', null )">
              <div id="playerLoop" class="playerButton">
                <img v-if="player.repeat_state == 'track'" src="iconation/RepeatOnce.png" @click="CallApi('PUT', 'https://api.spotify.com/v1/me/player/repeat?state=off', null )">
                <img v-else-if="player.repeat_state == 'context'" src="iconation/repeat_active.png" @click="CallApi('PUT', 'https://api.spotify.com/v1/me/player/repeat?state=track', null )">
                <img v-else src="iconation/repeat.png" @click="CallApi('PUT', 'https://api.spotify.com/v1/me/player/repeat?state=context', null )">
              </div>
            </div>

            <div id="playerCenterBarBottom">
              <div id="playerCurrerntTime" class="unmarkable">{{ currentSongProgressTime }}</div>
              <div id="playerProgress">
                <div id="playerProgressCurrent" :style="{'width': currentSongProgress + '%'}"></div>
              </div>
              <div id="playerTotalTime" class="unmarkable">{{ currentSongDurationTime }}</div>
            </div>

          </div>


          <div id="playerRightBar">
            <img class="playerRightBarImg" id="playerQue" src="iconation/activeList.png" v-if="mode == 'que'" @click="mode = previous_mode">
            <img class="playerRightBarImg" id="playerQue" src="iconation/list.png" v-else @click="previous_mode = mode; mode = 'que'; GetQue()">
            <div>
              <img class="playerRightBarImg" id="playerDevices" src="iconation/deviced_active.png" v-if="deviceActive" @click="deviceActive = false">
              <img class="playerRightBarImg" id="playerDevices" src="iconation/deviced.png" v-else  @click="deviceActive = true; GetDevices()">
              <div id="deviceList" :class="deviceActive? 'deviceShow': 'deviceHide'">
                <h3><b>active Device</b></h3>
                <p>{{ activeDevice.name }}</p>
                <h4>select other Device</h4>
                <div id="deviceWrapper">
                  <div v-for="device in devices" id="deviceListAvailible" @click="ChangeDevice(device)">
                  <p>{{ device.name }}</p>

                  <img class="availibleImg" src="iconation/pc.png" v-if="device.type == 'Computer'">
                  <img class="availibleImg" src="iconation/smartphone.png" v-else-if="device.type == 'Smartphone'">
                  <img class="availibleImg" src="iconation/speaker.png" v-else="device.type == 'Speaker'">
                </div>
                </div>
                
              </div>
            </div>
            <div id="playerVolume">
              <img class="playerRightBarImg" v-if="player.device.volume_percent > 90" src="iconation/speaker-full.png">
              <img class="playerRightBarImg" v-else-if=" 0 < player.device.volume_percent" src="iconation/speaker-medium.png">
              <img class="playerRightBarImg" v-else src="iconation/speaker-muted.png">
              <div id="volumeBar">
                <div id="volumeBelowBar" :style="{'width': player.device.volume_percent + '%'}"></div>
              </div>
            </div>
          </div>


        </div>
      </div>

    </div>


  </div>

</template>

<style>

  /* vars */
  :root{
    --mainBackground: #121212;
    --firstElementBackground: #212121;
    --accentGreen: #1db954;
    --secondElementBackground: #535353;
    --thirdElementBackground: #b3b3b3;
  }

  #sessionTimer{
    position: absolute;
    left: 15px;
    height: fit-content;
  }

  #userIcon {
    position: absolute;
    right: 15px;
    top: 15px;
    z-index: 2;
  }
  #userIcon img{
    width: 64px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.384);
  }

  .clickable{
    cursor: pointer;
  }

  .activeText{
    color: var(--accentGreen);
  }

  .unmarkable{
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  .playlists{
    padding: 10px;
    padding-bottom: 5px;
    width: 100%;
    height: 64px;
    position: relative;
  }

  .playlists img{
    border-radius: 12px;
    width: 64px;
    object-fit: cover;
    height: 64px;
  }

  .playlists p{
    font-size: large;
    margin: 0;
    position: absolute;
    top:21%;
    left: 85px;
    white-space: nowrap;
    overflow: hidden;
  }

  .playlists small{
    font-size: 14px;
    position: absolute;
    top:52%;
    left: 85px;
  }

  .playerButton{
    opacity: 0.75;
  }

  .playerButton:hover{
    opacity: 1;
  }


  .levelOneContainer{
    position: relative;
    background-color: var(--firstElementBackground);
    border-radius: 12px;
  }

  #drawer{
    width: 400px;
    height: 100vh;
    background-color: var(--mainBackground);
    position: absolute;
    top: 0;
    left: 0;
    padding: 12px;
    box-sizing: border-box;
  }


  #drawerTopArea{
    width: 100%;
    height: 110px;
  }

  .TopDrawerButton{
    margin-left: 30px;
    position: absolute;
  }


  #TopDrawerPlaylist{
    top: 17px;
  }

  #TopDrawerCreate{
    bottom: 17px;
  }




  #drawerBottomArea{
    width: 100%;
    height: calc(100% - 118px);

    bottom: -20px;
    overflow-y: scroll;
    overflow-x: hidden;
  }




  #interactionWindow{
    width: calc(100% - 400px);
    height: 100vh;
    background-color: var(--firstElementBackground);
    position: absolute;
    top: 0;
    right: 0;
    padding: 12px;
    box-sizing: border-box;
  }

  #interactivePlaylistEditor{
    height: 100%;
  }

  #PlatlistEditorUpperSection{
    height: 200px;
    width: 100%;
    position: relative;
  }

  #PlaylistEditorViewerWrapper{
    width: 100%;
    height: calc(100% - 110px - 205px);
  }

  #PlaylistEditorSelectedPlaylistWrapper{
    height: 168px;
    width: 100%;
  }

  #PlaylistEditorSelectedPlaylistWrapper img{
    width: 128px;
    height: 128px;
    object-fit: cover;
    border-radius: 12px;
    position: absolute;
    top: 20px;
    left: 20px;
  }

  #PlaylistEditorSelectedPlaylistWrapper p {
    position: absolute;
    left: 168px;
    top: 20px;
  }

  #PlaylistEditorSelectedPlaylistWrapper h2 {
    position: absolute;
    left: 168px;
    top: 60px;
  }

  #PlaylistEditorSelectedPlaylistWrapper h4{
    position: absolute;
    left: 168px;
    top: 80px;
    font-weight: 100;
  }

  #playlistEditorSortingMenu{
    position: absolute;
    left: 60px;
  }

  #playlistEditorFilterMenu{
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: 6;
    background-color: #00000098;
    top: 0;
    left: 0;
    text-align: center;
  }

  #playlistFilterModalInner{
    width: 660px;
    height: 140px;
    padding: 20px;
    background-color: #101014;
    border-radius: 12px;

    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  #playlistEditorButtons{
    position: absolute;
    right: 20px;
    bottom: 20px;
    width: 380px;
    height: 40px;
    display: flex;
    justify-content: space-between;
  }

  .invisible{
    display: none;
  }

  #addplaylistPopup{
    position: absolute;
    transform: translateY(40px);
    width: 190px;
    height: 280px;
    background-color: rgba(255, 0, 0, 0.123);
    z-index: 4;
    overflow-y: scroll;
  }

  .playlistEditorButtonsBtns {
    background-color: transparent;
    border-radius: 4px;
    outline: none;
    border: 1px solid white;
    margin: 2px;
  }

  #saveBtnPlaylistEditor{
    color: var(--accentGreen);
    text-transform:uppercase;
    font-weight: bold;
  }


  #PlatlistEditorSectionDevider{
    height: 2px;
    background-color: rgba(255, 255, 255, 0.349);
    width: 98%;
    margin-left: 1%;
    margin-bottom: 15px;
  }

  #PlatlistEditorLowerSection{
    overflow-y: scroll;
    overflow-x: hidden;
    height: 100%;
  }



  .platlistEditorLowerSectionContainer{
    display: flex;
    flex-wrap: nowrap;
  }

  .platlistEditorLowerSectionContainerLine{

    margin-right: 10px;
    overflow: hidden;
    white-space: nowrap;
    margin: 0px 0 6px 0;
  }

  .playlistLineLong{
    width: 340px;
  }

  .playlistLineShort{
    width: 95px;
  }

  .playlistLineMedium{
    width: 160px;
  }

  .platlistEditorLowerSectionContainerLine p {
    display: inline;
  }



  #que{
    text-align: center;
  }

  #currentSongQue{
    margin-top: 40px;
  }

  #queuedSongs{
    height: 550px;
    overflow-y: scroll;
  }




  #deviceList{
    width: 200px;
    height: 350px;
    background-color: rgb(48, 48, 48);
    position: absolute;
    right: 76px;
    bottom: 60px;
    z-index: 2;

    text-align: center;
    border-radius: 12px;

  }

  #deviceWrapper{
    height: 215px;
    overflow-y: auto;
  }

  #deviceList h3{
    margin-top: 10px;
  }

  #deviceListAvailible{
    text-align: right;
    display: flex;
    flex-wrap: nowrap;
    justify-content: space-between;
    margin: 0 8px;
  }

  .availibleImg{
    width: 20px;
    height: 20px;
    position: relative;
    top:20px;
    display: inline;
  }

  .deviceShow{
    display: block;
  }

  .deviceHide{
    display: none;
  }














  #player{
    position: absolute;
    bottom: 0px;
    left: 0px;
    width: 100%;
    height: 110px;
    background-color: var(--mainBackground);
  }

  #playerLeftBar{
    position: absolute;
    width: 400px;
    height: 80px;

    top: 15px;
    left: 15px;
  }

  #playerImg{
    width: 80px;
    border-radius: 5px;
  }

  #playerPlaying{
    width: fit-content;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: absolute;
    left: 90px;
    top: -3px;
    margin: 0;
    padding: 0;
  }

  #playerPlaying p{
    line-height: 0%;
  }

  #playerPlaying small{
    line-height: 100%;
    overflow: visible;
  }

  #playerArtist{
    line-height: 70%;
    overflow: hidden;
    white-space: nowrap;
  }

  .likedIconPlayer{
    width: 20px;
    float: right;
    position: absolute;
    top: 45%;
    right: -48px;
  }








  #playerCenterBar{
    position: absolute;
    width: 700px;
    height: 80px;

    top: 15px;
    left: 50%;
    transform: translateX(-50%);

  }



  #playerCenterBarTop{
    position: absolute;
    top: 0;
    width: 100%;
    height: 75%;
    display: inline;
  }

  #playerCenterBarTop img{
    width: 28px;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  #playerPrevious {
    left: 38%;
  }

  #playerNext {
    right: 38%;
  }


  #playerPlay img{
    width: 44px;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  #playerLoop img{
    right: 30%;
    width: 24px;
  }

  #playerShuffle img {
    left: 30%;
    width: 28px;
  }







  #playerCenterBarBottom{
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 25%;
  }


  #playerProgress{
    width: 80%;
    height: 40%;
    top: 30%;
    left: 10%;
    border-radius: 30px;
    position: relative;
    background-color: var(--secondElementBackground);
  }

  #playerProgressCurrent{
    width: 10%;
    height: 100%;
    border-radius: 30px;

    background-color: var(--accentGreen);
  }

  #playerCurrerntTime{
    position: absolute;
    right: calc(90% + 5px);
  }


  #playerTotalTime{
    position: absolute;
    top: 0;
    left: calc(90% + 5px);
  }








  #playerRightBar{
    position: absolute;
    width: 400px;
    height: 80px;

    top: 15px;
    right: 15px;
  }


  .playerRightBarImg{
    width: 20px;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  #volumeBar{
    width: 120px;
    height: 6px;
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);


    background-color: var(--secondElementBackground);
    border-radius: 12px;
  }

  #volumeBelowBar{
    background-color: var(--accentGreen);
    height: 6px;
    border-radius: 12px;
  }

  #playerVolume img{
    right: 130px;
  }

  #playerDevices{
    right: 165px;
  }

  #playerQue{
    right: 200px;
  }







  #topbar{
    position: relative;
    top: 50px;
    left: 50%;
    transform: translateX(-50%);
    width: 1800px;
    height: 100px;
    background-color: rgba(255, 0, 0, 0.192);
  }

</style>