function bot() {
  var raw_op = checkGmailUpdate();
  if(raw_op) {
    //threads[0].markRead();
    var config = configration();
    var api = apiCredential(config["test"]);
    var op = parseOperation(raw_op)
    
    if(op=="Close"){
      var order = marketCloseOrder(api, config["test"])
      var sheet = SpreadsheetApp.getActive().getSheetByName("稼働状況")
      sheet.getRange(2,1).setValue(0)
    }else{
      var order = orderFlow(api, op, config)
    }

    if(order.length > 0){
      appendOrder(order, op)
      if (config["slackUrl"] != ""){
        for(var i=0;i < order.length; i++){
          var message = formatSlackMessage(order[i], op, config["test"])
          sendSlackNotify(config["slackUrl"], message)
        }
      }
    }
  }
}

function orderFlow(api, op, config){
  var spreadSheet = SpreadsheetApp.getActive()
  var sheet = spreadSheet.getSheetByName("稼働状況")
  var numPyramidding = sheet.getRange(2,1).getValue()
  var pyramidding = config["pyramidding"]
  Logger.log("現状ピラミッディング数:" + numPyramidding)
  var response = getPosition(api, config["test"])
  var position = JSON.parse(response)
  var currentQty = 0
  if(position != []){
    currentQty = position[0]["currentQty"]
  }
  var order = []
  if(op=="Close"){
    order[0] = marketCloseOrder(api, op, config["test"]);
    sheet.getRange(2,1).setValue(0)
  }else{
    if(currentQty != 0){
      if(currentQty < 0){
        if(op == "Sell"){
          if(numPyramidding < pyramidding){
            order = order(api, config, op, sheet, order, numPyramidding)
          }else{Logger.log("ピラミッディング数が上限を超えるので注文しません")}// if over pyramidding then do nothing
        }else{// op == buy
          order = dotenOrder(api, config, op, sheet, order)
        }
      }else if(currentQty > 0){
        if(op == "Buy"){
          if(numPyramidding < pyramidding){
            order = order(api, config, op, sheet, order, numPyramidding)
          }else{Logger.log("ピラミッディング数が上限を超えるので注文しません")}// if over pyramidding then do nothing
        }else{// op == Sell
          order = dotenOrder(api, config, op, sheet, order)
        }
      }
    }else{
      order = order(api, config, op, sheet, order, 0)
    }
  }
  return order
}

function dotenOrder(api, config, op, sheet, order){
  order[0] = marketCloseOrder(api, config["test"])
  sheet.getRange(2,1).setValue(0)
  order[1] = marketOrder(api, op, config["orderQty"], config["test"])
  sheet.getRange(2,1).setValue(1)
  stopOrder(api, config, reverseBuySell(op))
  return order
}

function order(api, config, op, sheet, order, numPyramidding){
  order[0] = marketOrder(api, op, config["orderQty"], config["test"])
  sheet.getRange(2,1).setValue(numPyramidding + 1)
  stopOrder(api, config, reverseBuySell(op))
  return order
}

function stopOrder(api, config, op){
  if(["None", ""].indexOf(config["stopType"]) >= 0){
    var pegOffset = config["stopOffset"]
    if(op == "Sell"){
      pegOffset = -pegOffset
    }
    return marketStopOrder(api, op, pegOffset, config["stopType"], config["orderQty"], config["test"])
  }else{
    return
  }
}

function reverseBuySell(buySell){
  if(buySell == "Buy"){
    return "Sell"
  }else{
    return "Buy"
  }
}


 
function checkGmailUpdate(){
  var messages = GmailApp.search("from:noreply@tradingview.com is:unread");
  if(messages.length < 1){return null}
  messages[0].markRead()
  var new_massage = messages[0].getMessages()
  var message = parseMessage(new_massage[0].getBody())
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
  var config = sheet.getRange(2,1,1,6).getValues()[0]
  if (config.indexOf("") >= 0){throw "some topics were not input to 調整項目"}
  return {"orderQty": config[0], "pyramidding": config[1], "slackUrl": config[2], "test": config[3], "stopType": config[4], "stopOffset": config[5]}
}

function apiCredential(test){
  var sheet = ""
  if(test=="test"){
    sheet = SpreadsheetApp.getActive().getSheetByName("API資格情報_test");
  }else if(test=="main"){
    sheet = SpreadsheetApp.getActive().getSheetByName("API資格情報");
  }
  
  var values = sheet.getRange(1, 1, 2, 3).getValues();
  if(values[1][1] == "" || values[1][2] == ""){throw "APIキーまたはAPISecretがありません"};
  return {"apiKey": values[1][1], "apiSecret": values[1][2]}
}

function appendOrder(order, op){
  Logger.log(order)
  for(var i=0; i < order.length; i++){
    var orderObj = JSON.parse(order[i])
    var spreadSheet = SpreadsheetApp.getActive()
    var sheet = spreadSheet.getSheetByName("処理結果")
    var h = sheet.getRange(1, 1, 1, 8).getValues()
    var header = h[0]
    sheet.appendRow([orderObj[header[0]], orderObj[header[1]], orderObj[header[2]], orderObj[header[3]], orderObj[header[4]], orderObj[header[5]], orderObj[header[6]], op])
  }
}

function formatSlackMessage(order, op, test){
  var obj = JSON.parse(order)
  var symbol = obj["symbol"]
  var orderQty = obj["orderQty"]
  var price = obj["price"]
  var message = test + " " + op + " in " + symbol + " amount " + orderQty + " price at " + price
  return message
}
