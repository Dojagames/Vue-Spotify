<script>
export default {

    data(){
        return {
            
        }
    },
    components: {
        
    },
    props: {
        
    },
    methods: {
        OnPageLoad(){
            client_id = localStorage.getItem("client_id");
            client_secret = localStorage.getItem("client_secret");

            if ( window.location.search.length > 0 ){
                this.handleRedirect();
            }
            else{
                access_token = localStorage.getItem("access_token");
                if ( access_token == null ){
                    // localStorage.setItem("login", false);
                    // location.reload();
                } else {
                    this.refreshAccessToken();
                }

                
            }
        },

        handleRedirect(){
            let code = this.getCode();
            this.fetchAccessToken( code );
            window.history.pushState("", "", redirect_uri); // remove param from url
        },

        getCode(){
            let code = null;
            const queryString = window.location.search;
            if ( queryString.length > 0 ){
                const urlParams = new URLSearchParams(queryString);
                code = urlParams.get('code')
            }
            return code;
        },

        fetchAccessToken( code ){
            let body = "grant_type=authorization_code";
            body += "&code=" + code; 
            body += "&redirect_uri=" + encodeURI(redirect_uri);
            body += "&client_id=" + client_id;
            body += "&client_secret=" + client_secret;
            this.callAuthorizationApi(body);
        },

        callAuthorizationApi(body){
            let xhr = new XMLHttpRequest();
            xhr.open("POST", TOKEN, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.setRequestHeader('Authorization', 'Basic ' + btoa(client_id + ":" + client_secret));
            xhr.send(body);

            var tempScope = this;

            xhr.onload = function ()  {
                if ( this.status == 200 ){
                    var data = JSON.parse(this.responseText);
                    tempScope.$emit('response', data);
                    var data = JSON.parse(this.responseText);
                    if ( data.access_token != undefined ){
                        access_token = data.access_token;
                        localStorage.setItem("access_token", access_token); 
                        const unixseconds = Math.round(new Date().getTime() / 1000);
                        localStorage.setItem("token_timer", (unixseconds + data.expires_in));    
                        localStorage.setItem("login", true);
                    }
                    if ( data.refresh_token  != undefined ){
                        refresh_token = data.refresh_token;
                        localStorage.setItem("refresh_token", refresh_token);
                    }
                }
                else {
                    console.log(this.responseText);
                    alert(this.responseText);
                }
            };
        },

        refreshAccessToken(){
            refresh_token = localStorage.getItem("refresh_token");
            let body = "grant_type=refresh_token";
            body += "&refresh_token=" + refresh_token;
            body += "&client_id=" + client_id;
            this.callAuthorizationApi(body);
        },

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



    },
    created() {
        
    },
    mounted(){
        this.OnPageLoad();
    },
    watch: {
        
    },

}
</script>

<template>
    <div></div>
</template>

<style scoped>
    
</style>