const unixExp = localStorage.getItem("token_timer")
var SessionTimer = Math.floor(unixExp - (new Date().getTime() / 1000));



function StartTimer(){
    var _sec = 0;
    var _min = 0;
   

    if(SessionTimer > 0) SessionTimer--;


    var _min = Math.floor(SessionTimer / 60).toString();
    if(_min.length == 1) _min = 0 + _min;
    var _sec = Math.floor(SessionTimer % 60).toString();
    if(_sec.length == 1) _sec = 0 + _sec;
    

    document.getElementById('ct').innerHTML = "remaining session time: " + _min + ":" + _sec;
    RefreshTimer();
}

function RefreshTimer(){
    var refresh=1000; // Refresh rate in milli seconds
    mytime=setTimeout('StartTimer()',refresh)
}