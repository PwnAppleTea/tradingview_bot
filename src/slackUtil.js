function sendSlackNotify(slackUrl, message){
    
    var params = {"text": message}
    var option = {
        "payload": JSON.stringify(params),
        "method": "POST",
        "header": {
            "Content-type": "application/json"
        }
    }
    return UrlFetchApp.fetch(slackUrl, option)
}
  