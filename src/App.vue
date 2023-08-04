<script>
import spotify_auth from './components/spotify_auth.vue';

import {toRaw } from "vue";


export default {

  data(){
    return {
      window: 'login',
      id: "934b2170ecfb4f34af81a0d0b159d851",
      secret: '61095338f0164dc98b728d7c930fe50e',

      loggedIn: false,




      playlists: [],
      totalPlaylists: null,



      username: "",
      usermodel: {},
      user_img: "/test.png",

      player: {
        item: "",
      },
      player_raw: undefined,
      player_img: "",
      player_title: "",
    }
  },
  components: {
    spotify_auth,
  },
  props: {
      
  },
  methods: {
    RequestAuthorization(_id, _secret){
        client_id = _id;
        client_secret = _secret;

        localStorage.setItem("client_id", _id);
        localStorage.setItem("client_secret", _secret); // In a real app you should not expose your client_secret to the user

        let url = AUTHORIZE;
        url += "?client_id=" + _id;
        url += "&response_type=code";
        url += "&redirect_uri=" + redirect_uri;
        url += "&show_dialog=true";
        url += "&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private";
        window.location.href = url; // Show Spotify's authorization screen
    },



    CallApi(method, url, body, instruction){
        const currentScope = this;
        let xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
        xhr.send(body);
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


    
    RefreshPlaylists(){
      this.CallApi( "GET", "https://api.spotify.com/v1/me/playlists", null,);
    },

    doSmtWithData(_data, instruction){
      if(instruction == "initial"){
        this.usermodel = _data;
        this.username = _data.display_name.toString;
        this.user_img = _data.images[0].url;

      } else if(instruction == "playerState"){
        if(_data.is_playing == false) return;
        console.log(_data);
        const temp = _data.item.name.toString();

        // this.player = {
        //   img: _data.item.album.images[1].url,
        //   title: (_data.item.name).toString,
        //   //artists: String(_data.item.artists[0].name), 
        // };

        this.player_img = _data.item.album.images[1].url;
        this.player_title = _data.item.name.toString();
        this.player_raw = _data;
        
        this.player = _data;

        //console.log(data);
        console.log(this.player.item.name);

      } 
    },


    RefreshPlayer(_data){

    },







    HandleAuthResponse(a){
      console.log(a);
      RefreshTimer();

      this.CallApi( "GET", "https://api.spotify.com/v1/me/player", null, "playerState");

      this.CallApi( "GET", "https://api.spotify.com/v1/me/", null, "initial");
      

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





    GetUser(){
      var tempScope = this;
      var temp;

      (async() => {
        return await (fetchWebApi('v1/me/', 'GET').then((e => tempScope.username = e.display_name)));
      })();

      this.username = this.usermodel.display_name;
      console.log(this.usermodel);
    },



    GetPlaylists(){ 
      
      var tempScope = this;

      
      Object.prototype.toString.call(this.playlists);

      this.playlists = (async () => {
        const data = await GetPlaylists(); return data
      })(); 


      
      console.log(this.playlists);

      async function GetPlaylists(){
        await fetchWebApi('v1/me/playlists?limit=1', 'GET').then((e) => {tempScope.totalPlaylists = e.total});

        if(tempScope.totalPlaylists != null){
          var _iterations = Math.floor(tempScope.totalPlaylists / 50);
          var _lastIteration = tempScope.totalPlaylists % 50;

          var templist = new Array;

          for(var i = 0; i < _iterations; i++){
            await fetchWebApi(`v1/me/playlists?limit=50&offset=${50 * i}`, 'GET').then((e) => {
              e.items.forEach(e => {
                templist.push(e)
              });
            });
          }
          await fetchWebApi(`v1/me/playlists?limit=${_lastIteration}&offset=${50 * _iterations}`, 'GET').then((e) => {
            e.items.forEach(e => {
              templist.push(e)
            });
          });
                  }

        return templist;
      }
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
    <div style="position: absolute; left: 20%; top: 20%; width: 120px; height: 30px; background-color: red; display: block;">
      <button style="background-color: transparent;" @click="RefreshPlaylists()">test</button>
      <p v-bind="username"></p>
    </div> 

    <div id="userprofile">
      <div id="userIcon" class="clickable">
        <img v-bind:src="user_img">
        <p v-bind="username"></p>
      </div>
    </div>

    <div id="interaction">
      <!-- <div id="topbar">

      </div> -->
      <div id="drawer">

        <div id="drawerTopArea" class="levelOneContainer">

        </div>

        <div id="drawerBottomArea" class="levelOneContainer">
          <!-- 
            nav
            search
            list
          -->
        </div>

      </div>

      <div id="interactionWindow">
        
        <div id="interactionNavigation">

        </div>

        <div id="interactionwindow">

        </div>

        <div id="player">


          <div id="playerLeftBar">
            <img id="playerImg" v-bind:src="player_img">
            <div id="playerPlaying" >
               <p>{{ this.player.item.name }}</p>
               <div id="playerArtist">
                <small v-for="(artists, index) in player.item.artists">
                  <small v-if="index != 0 || index == player.item.artists.length">,</small>
                  {{ artists.name }}
                </small>
               </div>
            </div>
            <div id="playerLiked"></div>
          </div>


          <div id="playerCenterBar">

            <div id="playerCenterBarTop">
              <div id="playerShuffle"></div>
              <div id="playerPrevious"></div>
              <div id="playerPlay"></div>
              <div id="playerNext"></div>
              <div id="playerLoop"></div>
            </div>

            <div id="playerCenterBarBottom">
              <div id="playerCurrerntTime"></div>
              <div id="playerProgress">
                <div id="playerProgressCurrent"></div>
              </div>
              <div id="playerTotalTime"></div>
            </div>

          </div>


          <div id="playerRightBar">
            <div id="playerLyrics"></div>
            <div id="playerQue"></div>
            <div id="playerDevices"></div>
            <div id="playerVolume"></div>
          </div>


        </div>
      </div>

    </div>


  </div>

</template>

<style scoped>
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

  .playerButton{
    opacity: 0.9;
  }

  .playerButton:hover{
    opacity: 1;
  }


  .levelOneContainer{
    position: relative;
    background-color: rgba(0, 255, 255, 0.233);
    border-radius: 12px;
  }

  #drawer{
    width: 400px;
    height: 100vh;
    background-color: rgba(255, 0, 0, 0.178);
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

  #drawerBottomArea{
    width: 100%;
    height: calc(100% - 160px);

    bottom: -20px;
  }




  #interactionWindow{
    width: calc(100% - 400px);
    height: 100vh;
    background-color: rgba(51, 255, 0, 0.178);
    position: absolute;
    top: 0;
    right: 0;
    padding: 12px;
    box-sizing: border-box;
  }



  #player{
    position: absolute;
    bottom: 0px;
    left: 0px;
    width: 100%;
    height: 110px;
    background-color: black;
  }

  #playerLeftBar{
    position: absolute;
    width: 400px;
    height: 80px;

    top: 15px;
    left: 15px;

    background-color: rgba(250, 235, 215, 0.26);

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

  #playerArtist{
    line-height: 70%;
    overflow: hidden;
    white-space: nowrap;
  }
  
  /* #playerArtist:hover {  
    overflow:visible;
    animation: scrolling 12s .2s linear 1;
  }


  @keyframes scrolling {
    from { top: 0; transform: translate3d(0, 0, 0); }
    to { transform: translate3d(-100%, 0, 0); }
  } */

  #playerArtist small {
    
  }








  #playerCenterBar{
    position: absolute;
    width: 700px;
    height: 80px;

    top: 15px;
    left: 50%;
    transform: translateX(-50%);

    background-color: rgba(250, 235, 215, 0.26);
  }



  #playerCenterBarTop{
    position: absolute;
    top: 0;
    width: 100%;
    height: 65%;

    background-color: rgba(255, 0, 0, 0.192);
  }


  #playerProgress{
    width: 80%;
    left: 10%;
  }






  #playerCenterBarBottom{
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 35%;

    background-color: rgba(0, 255, 170, 0.192);
  }











  #playerRightBar{
    position: absolute;
    width: 400px;
    height: 80px;

    top: 15px;
    right: 15px;

    background-color: rgba(250, 235, 215, 0.26);
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