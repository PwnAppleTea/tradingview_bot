/**
 * Author:    TOSUKUi
 * Created:   7.16.2018
 * 
 * (c) Copyright by TOSUKUi.
 **/


function bot() {
  var raw_op= checkGmailUpdate();
  if(raw_op) {
    //threads[0].markRead();
    var api = apiCredential();
    var config = configration();
    var op = parseOperation(raw_op)
    if(op=="Close"){
      var order = marketCloseOrder(api, op)
    }else{
      var order = orderFlow(api, op, config)
    }
    Logger.log(order)
    if(order.length > 0){
      appendOrder(order, op)
    }
  }
}

function orderFlow(api, op, config){
  var spreadSheet = SpreadsheetApp.getActive()
  var sheet = spreadSheet.getSheetByName("稼働状況")
  var numPyramidding = sheet.getRange(2,1).getValue()
  var pyramidding = config["pyramidding"]
  Logger.log("現状ピラミッディング数:" + numPyramidding)
  var response = getPosition(api)
  var position = JSON.parse(response)
  var currentQty = position[0]["currentQty"]
  var order = []
  if(op=="Close"){
    var order = marketCloseOrder(api, op);
    sheet.getRange(2,1).setValue(0)
  }else{
    if(currentQty != 0){
      if(currentQty < 0){
        if(op == "Sell"){
          if(numPyramidding < pyramidding){
            order[0] = marketOrder(api, op, config["orderQty"])
            sheet.getRange(2,1).setValue(numPyramidding + 1)
          }else{Logger.log("ピラミッディング数が上限を超えるので注文しません")}// if over pyramidding then do nothing
        }else{// op == buy
          order[0] = marketCloseOrder(api, op)
          sheet.getRange(2,1).setValue(0)
          order[1] = marketOrder(api, op, config["orderQty"])
        }
      }else if(currentQty > 0){
        if(op == "Buy"){
          if(numPyramidding < pyramidding){
            order[0] = marketOrder(api, op, config["orderQty"])
            sheet.getRange(2,1).setValue(numPyramidding + 1)
          }else{Logger.log("ピラミッディング数が上限を超えるので注文しません")}// if over pyramidding then do nothing
        }else{// op == Sell
          order[0] = marketCloseOrder(api, op)
          sheet.getRange(2,1).setValue(0)
          order[1] = marketOrder(api, op, config["orderQty"])
        }
      }
    }else if(currentQty == 0){
      sheet.getRange(2,1).setValue(numPyramidding + 1)
      order[0] = marketOrder(api, op, config["orderQty"])
    }
  }
  return order
}
 
function checkGmailUpdate(){
  var messages = GmailApp.search("from:noreply@tradingview.com is:unread");
  if(messages.length < 1){return null}
  var new_massage = messages[0].getMessages()
  var message = parseMessage(new_massage[0].getBody())
  messages[0].markRead()
  return message;
}

function parseOperation(op){
  var ops = {"Long": "Buy", "Short": "Sell", "Close": "Close"}
  return ops[op]
}

function parseMessage(message){
  var regexp = /strategy-operation:.*?:strategy-operation/
  var match = regexp.exec(message)
  if(match == null){throw "operation format in the mail is invalid"}
  var operation_part = match[0]
  var operation = operation_part.replace(/strategy-operation:/, "");
  var operation = operation.replace(/:strategy-operation/, "");
  if(!(["Long", "Short", "Close"].indexOf(operation) >= 0)){throw "Operation in the mail is invalid"}
  return operation
}

function configration(){
  var spreadSheet = SpreadsheetApp.getActive()
  var sheet = spreadSheet.getSheetByName("調整項目")
  var config = sheet.getRange(2,1,1,2).getValues()[0]
  return {"orderQty": config[0], "pyramidding": config[1]}
}

function apiCredential(){
  var sheet = SpreadsheetApp.getActive().getSheetByName("API資格情報");
  var values = sheet.getRange(1, 1, 2, 3).getValues();
  if(values[1][1] == "" || values[1][2] == ""){throw "APIキーまたはAPISecretがありません"};
  return {"apiKey": values[1][1], "apiSecret": values[1][2]}
}

function appendOrder(order, op){
  Logger.log(order)
  for(i=0; i < order.length; i++){
    var orderObj = JSON.parse(order[i])
    var spreadSheet = SpreadsheetApp.getActive()
    var sheet = spreadSheet.getSheetByName("処理結果")
    var h = sheet.getRange(1, 1, 1, 8).getValues()
    var header = h[0]
    sheet.appendRow([orderObj[header[0]], orderObj[header[1]], orderObj[header[2]], orderObj[header[3]], orderObj[header[4]], orderObj[header[5]], orderObj[header[6]], op])
  }
}
