<script>
import spotify_auth from './components/spotify_auth.vue';


export default {

  data(){
    return {
      window: 'login',
      id: "934b2170ecfb4f34af81a0d0b159d851",
      secret: '61095338f0164dc98b728d7c930fe50e',

      mode: "player",


      playlists: [
        // {name: "test", tracks:{total: 5}, images: [{url: "https://i.scdn.co/image/ab67616d00004851dbf39405c765e4f4a7b9ad89"}]},
        
      ],
      currentPlaylist: undefined,
      currentPlaylistSongs: [],


      username: "",
      usermodel: {},
      user_img: "/test.png",

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
      player_raw: undefined,
      player_img: "",
      player_title: "",

      isCurrentSongLiked: false,

      currentSongId: "",

      currentSongProgress: 0,
      currentSongDurationTime: "0:00",
      currentSongProgressTime: "0:00",


      playlistFilterOptions: "",


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
          if (this.status == 200 ){
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
          else {
              console.log(this.status);
          }
        };
    },


    

    doSmtWithData(_data, instruction){
      if(instruction == "initial"){
        this.usermodel = _data;
        this.username = _data.display_name.toString;
        this.user_img = _data.images[0].url;

      } else if(instruction == "playerState"){
        if(_data.is_playing == false) {
          this.player.is_playing = false;
          return;
        };

        console.log(_data);
        
        if(this.currentSongId != _data.item.id){
          this.currentSongId = _data.item.id;
          this.CallApi( "GET", "https://api.spotify.com/v1/me/tracks/contains?ids=" + this.currentSongId, null, "checkIfLiked");
        }

        

        this.player = _data;

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
        console.log(_data);
        if(_data.next != null){
          this.CallApi( 'GET', _data.next, null, 'getSongsFromCurrentPlaylist')
        } else {
          playlistSelected = true;
          this.playlists[this.playlists.findIndex(e => e.id == this.currentPlaylist.id)].tracks.total = this.currentPlaylistSongs.length;
        }
        console.log(_data);
        //if _data.total 

      } else if(instruction == "updateCurrentPlaylist"){
        this.CallApi( 'GET', `https://api.spotify.com/v1/playlists/${this.currentPlaylist.id}`, null, 'getSongsFromCurrentPlaylist');
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
        _data.tracks.push({"uri": this.currentPlaylistSongs[i].track.uri});

      }
      this.CallApi("DELETE", `https://api.spotify.com/v1/playlists/${this.currentPlaylist.id}/tracks`, _data);  



      //add Songs
      let _addData = {"uris": []};
      for(let i = 0; i < this.filteredPlaylist.length; i++){
        if(i % 100 == 0 && i != 0){
          this.CallApi("POST", `https://api.spotify.com/v1/playlists/${this.currentPlaylist.id}/tracks`, _addData);
          _addData = {"uris": []};
        }
        _addData.uris.push(this.filteredPlaylist[i].track.uri);

      }
      this.CallApi("POST", `https://api.spotify.com/v1/playlists/${this.currentPlaylist.id}/tracks`, _addData, "updateCurrentPlaylist");   
    },



  },
  created() {
      
  },
  mounted(){
    // const _tempLogin = GetLoginStatus();
    // this.loggedIn = _tempLogin;


  },
  watch: {
 
  },
  computed: {
    player_Trackname(){
      return global_trackname;
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
      } //else if(){
        
      // } else if(){
        
      // } else if(){
        
      // } else if(){
        
      // }
      
      
      
      else {
        return this.currentPlaylistSongs;
      }

      
    },
    filteredPlaylist(){
      const temp = [...this.SortedPlaylist];

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

    <input type="text" v-model="id">
    <input type="text" placeholder="secret" v-model="secret">
    <button class="clickable" @click="RequestAuthorization(id, secret)">Login</button>

  </div>

  <div id="mainWrapper" v-else>
      <div id="userprofile">
      <div id="userIcon" class="clickable unmarkable">
        <img v-bind:src="user_img">
        <p v-bind="username"></p>
      </div>
    </div>

    <div id="interaction">
      <!-- <div id="topbar">

      </div> -->
      <div id="drawer" class="unmarkable">

        <div id="drawerTopArea" class="levelOneContainer">
          <div class="TopDrawerButton clickable" id="TopDrawerPlayer" @click="mode = 'player'" >
            <h2 :class="{activeText: mode == 'player'}">Web Player</h2>
          </div>
          <div class="TopDrawerButton clickable" id="TopDrawerPlaylist" @click="mode = 'playlist'" >
            <h2 :class="{activeText: mode == 'playlist'}">Playlist editor</h2>
          </div>
        </div>

        <div id="drawerBottomArea" class="levelOneContainer">
          <div v-for="list in playlists" class="playlists clickable" @click="currentPlaylist = list; CallApi( 'GET', list.tracks.href, null, 'getSongsFromCurrentPlaylist')">
            <img :src="list.images[0].url">
            <p>{{ list.name }}</p><small>{{ list.tracks.total }} songs</small>
          </div>
        </div>

      </div>






      <!-- main section -->
      <div id="interactionWindow" class="unmarkable">
        
        <div id="interactionNavigation">
          
        </div>  
        
        <div id="interactivePlayer" v-if="mode == 'player'">
          player {{ playlists.length }}
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

              <div id="playlistEditorSortingMenu">
                Sort by 
                <br><br>
                length: ascending<input type="radio" value="length_a" v-model="playlistFilterOptions"> 
                descending<input type="radio" value="length_d" v-model="playlistFilterOptions" class="PlaylistEditSortingBox">
                <br>
                by Artist: ascending <input type="radio" value="artist_a" v-model="playlistFilterOptions" class="PlaylistEditSortingBox">
                descending <input type="radio" value="artist_d" v-model="playlistFilterOptions" class="PlaylistEditSortingBox">
                <br>
                by Album: ascending <input type="radio" value="album_a" v-model="playlistFilterOptions" class="PlaylistEditSortingBox">
                descending <input type="radio" value="album_d" v-model="playlistFilterOptions" class="PlaylistEditSortingBox">
                <br>
                by Name: ascending <input type="radio" value="name_a" v-model="playlistFilterOptions" class="PlaylistEditSortingBox">
                descending <input type="radio" value="name_a" v-model="playlistFilterOptions" class="PlaylistEditSortingBox">
                <br>
                by Popularity: ascending <input type="radio" value="pop_a" v-model="playlistFilterOptions" class="PlaylistEditSortingBox">
                descending <input type="radio" value="pop_d" v-model="playlistFilterOptions" class="PlaylistEditSortingBox">
                <br>
                by Release: old to new<input type="radio" value="release_a" v-model="playlistFilterOptions" class="PlaylistEditSortingBox">
                new to old<input type="radio" value="release_d" v-model="playlistFilterOptions" class="PlaylistEditSortingBox">
                <br>
                random <input type="radio" value="random" v-model="playlistFilterOptions" class="PlaylistEditSortingBox">



                <!-- <br><br>  -->
                none <input type="radio" value="" v-model="playlistFilterOptions" class="PlaylistEditSortingBox">
              </div>

              <div id="playlistEditorButtons">
                <button @click="SaveCurrentPlaylist()">save playlist</button>
              </div>

            </div>

            <div id="PlatlistEditorSectionDevider"></div>

            <div id="PlatlistEditorLowerSection">
              <div v-for="songs in filteredPlaylist">
                {{ songs.track.name }}
              </div>
            </div>

          </div>

        </div>
        



        <div id="player">


          <div id="playerLeftBar">
            <img id="playerImg" v-bind:src="this.player.item.album.images[1].url" class="unmarkable">

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
              <div id="playerShuffle" >
                <img v-if="player.shuffle_state" src="iconation/shuffle_active.png">
                <img v-else src="iconation/shuffle.png">
              </div>
              <img id="playerPrevious" src="iconation/rewind-button.png">
              <div id="playerPlay">
                <img v-if="player.is_playing" src="iconation/pause.png">
                <img v-else src="iconation/play-button.png">
              </div>
              <img id="playerNext" src="iconation/skip.png">
              <div id="playerLoop">
                <img v-if="player.repeat_state == 'track'" src="iconation/RepeatOnce.png">
                <img v-else-if="player.repeat_state == 'context'" src="iconation/repeat_active.png">
                <img v-else src="iconation/repeat.png">
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
            <img id="playerQue" src="iconation/list.png">
            <img id="playerDevices" src="iconation/deviced.png">
            <div id="playerVolume">
              <img v-if="player.device.volume_percent > 90" src="iconation/speaker-full.png">
              <img v-else-if=" 0 < player.device.volume_percent" src="iconation/speaker-medium.png">
              <img v-else src="iconation/speaker-muted.png">
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
  }

  .playlists p{
    font-size: large;
    margin: 0;
    position: absolute;
    top:21%;
    left: 85px;
  }

  .playlists small{
    font-size: 14px;
    position: absolute;
    top:52%;
    left: 85px;
  }

  .playerButton{
    opacity: 0.9;
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
    height: 140px;
  }

  .TopDrawerButton{
    margin-left: 30px;
    position: absolute;
  }

  #TopDrawerPlayer{
    top: 25px;
  }

  #TopDrawerPlaylist{
    bottom: 25px;
  }





  #drawerBottomArea{
    width: 100%;
    height: calc(100% - 160px);

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
    height: 400px;
    width: 100%;
    background-color: rgba(255, 0, 0, 0.158);
    position: relative;
    
  }

  #PlaylistEditorViewerWrapper{
    width: 100%;
    height: calc(100% - 110px - 400px);
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


  #PlatlistEditorSectionDevider{
    height: 2px;
    background-color: rgba(255, 255, 255, 0.349);
    width: 98%;
    margin-left: 1%;
  }

  #PlatlistEditorLowerSection{
    overflow-y: scroll;
    overflow-x: hidden;
    height: 100%;
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

    /* background-color: rgba(250, 235, 215, 0.26); */

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


  #playerRightBar img{
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