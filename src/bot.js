function bot() {
  var configs = configration();
  var mail = checkGmailUpdate();
  var statuses = getStatus();
  if(!mail){return}
  Logger.log(Object.keys(configs))
  Object.keys(configs).forEach(function(key){
    orderBot(configs[key], mail[key], key, statuses[key])
  })
}

function orderBot(config, raw_op, symbol){
  // var messenger = messaging(); 
  try{
    if(raw_op && config["稼働"]) {
      //threads[0].markRead();
      var api = {"apiKey": config["APIkey"], "apiSecret": config["APIsecret"]}
      var op = parseOperation(raw_op["operation"])
      var order = orderFlow(api, op, config, status)
      if(order.length > 0){
        appendOrder(order, op, symbol)
        if (config["slackUrl"] != ""){
          for(var i=0;i < order.length; i++){
            var message = formatSlackMessage(symbol, order[i], op, config["テスト"])
            sendSlackNotify(config["slackUrl"], message)
          }
        }
      }
    }
  }catch(e){
    sendSlackNotify(config["slackUrl"], e.name + ":" + e.message)
  }
}


function orderFlow(api, op, config, statuses){
  var spreadSheet = SpreadsheetApp.getActive()
  var sheet = spreadSheet.getSheetByName("稼働状況")
  //var numPyramidding = sheet.getRange(2,1).getValue()
  var numPyramidding = statuses["現状ピラミッディング"]
  var pyramidding = config["最大ピラミッディング"]
  Logger.log("現状ピラミッディング数:" + numPyramidding)
  Logger.log("最大ピラミッディング数:" + pyramidding)
  var response = getPosition(api, config["ticker"], config["テスト"])
  var position = JSON.parse(response)
  var currentQty = 0
  
  if(position.length > 0){
    currentQty = position[0]["currentQty"]
  }
  var ord = []
  if(op=="Close"){
    ord[0] = marketCloseOrder(api, config["ticker"], config["テスト"]);
    sheet.getRange(2,1).setValue(0)
  }else{
    if(currentQty != 0){
      if(currentQty < 0){
        if(op == "Sell"){
          if(numPyramidding < pyramidding){
            ord = order(api, config, op, sheet, ord, numPyramidding)
          }else{Logger.log("ピラミッディング数が上限を超えるので注文しません")}// if over pyramidding then do nothing
        }else{// op == buy
          ord = dotenOrder(api, config, op, sheet, ord)
        }
      }else if(currentQty > 0){
        if(op == "Buy"){
          if(numPyramidding < pyramidding){
            ord = order(api, config, op, sheet, ord, numPyramidding)
          }else{Logger.log("ピラミッディング数が上限を超えるので注文しません")}// if over pyramidding then do nothing
        }else{// op == Sell
          ord = dotenOrder(api, config, op, sheet, ord)
        }
      }
    }else{
      ord = startOrder(api, config, op, sheet, ord)
    }
  }
  return ord
}

function dotenOrder(api, config, op, sheet, order){
  Logger.log(config)
  order[0] = marketCloseOrder(api, config["ticker"], config["テスト"])
  sheet.getRange(2,1).setValue(0)
  order[1] = marketOrder(api, config["ticker"], op, config["ポジションサイズ"], config["テスト"])
  sheet.getRange(2,1).setValue(1)
  stopOrder(api, config, reverseBuySell(op))
  return order
}

function order(api, config, op, sheet, order, numPyramidding){
  order[0] = marketOrder(api, config["ticker"], op, config["ポジションサイズ"], config["テスト"])
  sheet.getRange(2,1).setValue(numPyramidding + 1)
  stopOrder(api, config, reverseBuySell(op))
  return order
}

function startOrder(api, config, op, sheet, order, numPyramidding){
  order[0] = marketOrder(api, config["ticker"], op, config["ポジションサイズ"], config["テスト"])
  sheet.getRange(2,1).setValue(1)
  stopOrder(api, config, reverseBuySell(op))
  return order
}

function stopOrder(api, config, op){
  if(["None", ""].indexOf(config["ストップロスタイプ"]) >= 0){
    var pegOffset = config["ストップのポジションとの差"]
    if(op == "Sell"){
      pegOffset = -pegOffset
    }
    return marketStopOrder(api, config["ticker"], op, pegOffset, config["ストップロスタイプ"], config["ポジションサイズ"], config["テスト"])
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

function checkStopOrder(config, key){
  
}



function checkGmailUpdate(){
  // return {symbol:{op: }}
  var threads = GmailApp.search("from:noreply@tradingview.com is:unread");
  if(threads.length < 1){return null}
  mails = {}
  threads.forEach(function(thread){
    thread.getMessages().forEach(function(message){
      mail = parseMessage(message.getBody())
      mails[mail["symbol"]] = mail
      message.markRead()
    })    
  })
  return mails;
}

function parseOperation(op){
  var ops = {"Long": "Buy", "Short": "Sell", "Close": "Close"}
  return ops[op]
}

function parseMessage(message, strategySymbol){
  var permit = ["Long", "Short", "Close"]
  var regexpOp = /strategy-operation:.*?:strategy-operation/
  var regexpSymbol = /strategy-symbol:.*?:strategy-symbol/
  var op = regexpOp.exec(message)
  var sym = regexpSymbol.exec(message)
  if(op == null || sym == null){throw new MailError("アラートメールのフォーマットが間違っている可能性があります")}
  var operation_part = op[0]
  var symbol_part = sym[0]
  var operation = operation_part.replace(/strategy-operation:/, "");
  operation = operation.replace(/:strategy-operation/, "");
  var symbol = symbol_part.replace(/strategy-symbol:/, "")
  symbol = symbol.replace(/:strategy-symbol/, "")
  if(strategySymbol == symbol){return null}
  if(permit.indexOf(operation) < 0){throw new MailError("メールのオペレーションが許可されてるものではありません。許可されているものは " + permit + "のみです")}
  return {"operation": operation, "symbol": symbol}
}

function configration(){
  return getSymbolAndData("調整項目")
}

function appendOrder(order, op){
  Logger.log(order)
  for(var i=0; i < order.length; i++){
    var orderObj = JSON.parse(order[i])
    var spreadSheet = SpreadsheetApp.getActive()
    var sheet = spreadSheet.getSheetByName("処理結果")
    var h = sheet.getRange(1, 1, 1, 8).getValues()
    var header = h[0]
    sheet.appendRow([symbol, orderObj[header[0]], orderObj[header[1]], orderObj[header[2]], orderObj[header[3]], orderObj[header[4]], orderObj[header[5]], orderObj[header[6]], op])
  }
}

function getStatus(){
  return getSymbolAndData("ステータス")
}

function formatSlackMessage(strategy, order, op, test){
  var obj = JSON.parse(order)
  var symbol = obj["symbol"]
  var orderQty = obj["orderQty"]
  var price = obj["price"]
  var d = new Date()
  var message = Utilities.formatDate(d,"JST","yyyy/MM/dd") + "[" + test + "]" + "Strategy " + strategy + ":" + op + " in " + symbol + " amount " + orderQty + " price at " + price
  return message
}


function getSymbolAndData(sheetName){
  var spreadSheet = SpreadsheetApp.getActive()
  var sheet = spreadSheet.getSheetByName(sheetName)
  var dataValues = sheet.getRange(1, 1, sheet.getLastRow(),sheet.getLastColumn()).getValues()
  var headers = dataValues[0]
  var dataArray = configValues.slice(1)
  var dataObj = {}
  dataArray.forEach(function(datalist){
    dataBody = datalist.slice(1)
    dataSymbol = datalist[0]
    dataObj[dataSymbol] = {}
    for(var i=0; i<dataBody.length; i++){
      dataObj[dataSymbol][headers[i+1]] = dataBody[i]
    }
  })
  return dataObj
}

