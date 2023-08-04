//var redirect_uri = "https://spotify.jonx.dev"; 
var redirect_uri = "http://127.0.0.1:5173/callback"; 

const AUTHORIZE = "https://accounts.spotify.com/authorize"
const TOKEN = "https://accounts.spotify.com/api/token";
const USER = 'https://accounts.spotify.com/v1/me'

let client_id = undefined;
let client_secret = undefined;

var access_token = undefined;
var refresh_token = undefined;


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

