function chatMessage(message){
    var sheet = SpreadsheetApp.getActive().getSheetByName("メッセージ")
    var messageConfig = sheet.getRange(2, 1, 1, 2).getValues()
    if(messageConfig[0] == "Slack"){
        sendSlackNotify(messageConfig[1], message)
    }else if(messageConfig[0] == "LINE"){
        sendLineNotify(messageConfig[1], message)
    }
}