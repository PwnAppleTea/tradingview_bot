function onOpen(){
    SpreadsheetApp.getUi()
        .createMenu('botControl')
        .addItem('runbot', 'trigger')
        .addItem('stopbot', 'delTrigger')
        .addItem('testrun', 'bot')
    .addToUi()
}

function trigger(){
  var ss = SpreadsheetApp.getActive()
  var sheet = ss.getSheetByName("稼働状況")
  var status = sheet.getRange(2,2)
  if(status.getValue() == "稼働中"){
    throw "botはすでに稼働中です"
  }
  ScriptApp.newTrigger("bot").timeBased().everyMinutes(1).create();
  status.setValue("稼働中")
}

function delTrigger(){
    var triggers = ScriptApp.getProjectTriggers();
    for(var i=0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() == "bot") {
        ScriptApp.deleteTrigger(triggers[i]);
        }
    }
  var ss = SpreadsheetApp.getActive()
  var sheet = ss.getSheetByName("稼働状況")
  var status = sheet.getRange(2,2)
  status.setValue("停止中")
}