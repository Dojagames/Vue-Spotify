//var redirect_uri = "https://spotify.jonx.dev/callback"; 
var redirect_uri = "http://localhost:5174/callback"; 

const AUTHORIZE = "https://accounts.spotify.com/authorize"
const TOKEN = "https://accounts.spotify.com/api/token";
const USER = 'https://accounts.spotify.com/v1/me'

var access_token = undefined;
var refresh_token = undefined;


let cP = {};


// callApi( "GET", PLAYLISTS, null, handlePlaylistsResponse );



async function fetchWebApi(endpoint, method, body) {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      method,
      body:JSON.stringify(body)
    });
    return await res.json();
}