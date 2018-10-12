// TODO: 
// [] 1

function chatMessage(message){
  var sheet = SpreadsheetApp.getActive().getSheetByName("メッセージ")
  var messageConfig = sheet.getRange(2, 1, 1, 2).getValues()
  if(message == "" || !message){return}
  if(messageConfig[0][1] == ""){
    sheet.getRange(2, 2).setValue("ここに値を入力して下さい");
    throw "メッセージの送信に失敗しました"
  }
  if(messageConfig[0][0] == "Slack"){
    sendSlackNotify(messageConfig[0][1], message)
  }else if(messageConfig[0][0] == "LINE"){
    sendLineNotify(messageConfig[0][1], message)
  }
}