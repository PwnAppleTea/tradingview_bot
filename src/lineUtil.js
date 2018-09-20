function sendLineNotify(accessToken, message){
    var url = "https://notify-api.line.me/api/notify"
    var payload = "message="  + message
    var params = {
        "method": "POST",
        "headers": {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": 	"Bearer " + token
        },
        "payload": payload
    }
    UrlFetchApp.fetch(url, params)
}