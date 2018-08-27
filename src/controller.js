function onOpen(){
  SpreadsheetApp.getUi()
  .createMenu('botControl')
  .addItem('Run bot', 'trigger')
  .addItem('Stop bot', 'delTrigger')
  .addItem('Test order', 'bot')
  .addSeparator()
  .addItem("メニューを開く", "openMenu")
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


function openMenu(){
  // ui instance
  var htmlOutput = HtmlService.createTemplateFromFile("view/index.html").evaluate().setTitle("ストラテジーを追加");  
  SpreadsheetApp.getUi()
  .showSidebar(htmlOutput)
}


function onEdit(){
  setValidateTicker()
}

function setValidateTicker(){
   var ss = SpreadsheetApp.getActive()
   var config = ss.getSheetByName("調整項目")
   var pltsheet = ss.getSheetByName("tradingPlatform")
   var platforms = reduceDim(pltsheet.getRange(2, 2, pltsheet.getLastRow()-1 ).getValues())
   var tickers = getTickers()
   var rules_ticker = {}
   var rules_stoploss
   for(var i=0; i < platforms.length; i++){
     rules_ticker[platforms[i]] = SpreadsheetApp.newDataValidation().requireValueInList(tickers[platforms[i]])
     rules
   }
   var platformConfig = reduceDim(config.getRange(2, 2, config.getLastRow() - 1).getValues())
   var targetCells = config.getRange(2, 10, config.getLastRow() - 1)
   var rulesCell = []
   for(var i=0; i < platformConfig.length; i++){
     rulesCell[i] = [rules[platformConfig[i]]]
   }
   targetCells.setDataValidations(rulesCell)
}

function reduceDim(array){
  output = []
  for(var i=0; i < array.length; i++){
    output.push(array[i][0])
  }
  return output
}


function getTickers(){
  var sheet = SpreadsheetApp.getActive().getSheetByName("tickers");
  var plat_tick = sheet.getRange(2, 2, sheet.getLastRow()-1, 2).getValues();
  var tickers = {};
  for(var j=0; j < plat_tick.length; j++){
    if(tickers[plat_tick[j][0]] == undefined) tickers[plat_tick[j][0]] = [];
    tickers[plat_tick[j][0]].push(plat_tick[j][1])
  }
  return tickers
  Logger.log(tickers)
}