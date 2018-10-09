import "google-apps-script"
function bot() {
  createTableIfNotExist()
  var configs = configration();
  var mail = checkGmailUpdate();
  Logger.log(mail);
  var statuses = getStatus();
  if(!mail){return}
  Object.keys(configs).forEach(function(symbol){
    try{
      var api = new APIInterface()[config[symbol]["プラットフォーム"]](config[symbol]["APIkey"], config[symbol]["APIsecret"])
      if(mail[symbol]){
        var op = parseOperation(mail[symbol]["operation"])
        var orders = orderBot(configs[symbol], op, statuses[symbol])
        var order = orders[0]
        var cancelOrder = orders[1]
        Logger.log(order)
        if(order){
          setStatus(symbol, order[1])
          insertOrder(order[0], op, order[1]["orderSeriesID"], symbol)
          order[0].map(formatMessage(symbol, order[0][i], op, configs[symbol]["プラットフォーム"])).forEach(chatMessage(message))
        }
        if(cancelOrder){
          cancelOrder.forEach(updateOrderLog(cancelOrder))
        }
      }
      //TODO: stopオーダーがfilledした結果をfusionTableに書き込む
      var filledStopOrders = checkActiveStopLossIsFilled(configs[symbol], api, statuses[symbol]["orderSeriesID"])
      filledStopOrders.map(formatStopLossExecutedMessage(filledStopOrder))
      .forEach(chatMessage(message))
      filledStopOrders.forEach(updateOrderLog(filledStopOrder))
    }catch(e){
      chatMessage(symbol + ":" + e.name + ":" + e.message)
    }
  })
}

function orderBot(config, op, status){
  if(config["稼働"]) {
    var order = orderFlow(api, op, config, status)
    if(order.length == 0){return}
    return order
  }
}

function orderFlow(api, op, config, statuses){
  var numPyramidding = statuses["ピラミッディング数"]
  if(!numPyramidding){numPyramidding = 0}
  var pyramidding = config["最大ピラミッディング"]
  var response = api.getPosition(config["ticker"])
  var position = JSON.parse(response)
  var currentQty = 0
  if(position.length > 0){
    currentQty = position[0]["currentQty"]
  }
  var order = undefined
  var cancelOrder = undefined
  if(currentQty < 0){
    if(op == "Sell"){
      if(numPyramidding < pyramidding){
        ord = order(api, config, op, statuses)
      }else{Logger.log("ピラミッディング数が上限を超えるので注文しません")}// if over pyramidding then do nothing
    }else if(op=="CloseShort"){
      ord = closeOrder(api, config, op, statuses)
    }else if(op=="Buy"){
      cancelOrder = api.cancelAllOrder(config["ticker"])
      ord = dotenOrder(api, config, op, ord, statuses)
    }
  }else if(currentQty > 0){
    if(op == "Buy"){
      if(numPyramidding < pyramidding){
        ord = order(api, config, op, statuses)
      }else{Logger.log("ピラミッディング数が上限を超えるので注文しません")}// if over pyramidding then do nothing
    }else if(op=="CloseLong"){
      ord = closeOrder(api, config, op, statuses)
    }else if(op=="Sell"){
      cancelOrder = api.cancelAllOrder(config["ticker"])
      ord = dotenOrder(api, config, op, statuses)
    }
  }else{
    if(op=="Buy" || op=="Sell"){
      ord = startOrder(api, config, op, statuses)
    }
  }
  return [ord, cancelOrder]
}

function setStatus(symbol, status){
  ss = SpreadsheetApp.getActive()
  sheet = ss.getSheetByName("戦略ステータス")
  var symbols = reduceDim(sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues())
  for(var i=0; i < symbols.length; i++){
    if(symbols[i] == symbol){
      sheet.getRange(i + 1, 2).setValue(status["ピラミッディング数"])
      sheet.getRange(i + 1, 2).setValue(status["orderSeriesID"])
    }
  }
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
  var ops = {"Long": "Buy", "Short": "Sell", "CloseLong": "CloseLong", "CloseShort": "CloseShort"}
  return ops[op]
}

function parseMessage(message, strategySymbol){
  var permit = ["Long", "Short", "CloseLong", "CloseShort"]
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

function upsertOrder(order, op, orderSeriesID, symbol){
  Logger.log(order)
  for(var i=0; i < order.length; i++){
    appendOrderLog(order, op, orderSeriesID, symbol)
  }
}

// ストップロスがfilledされた場合(毎分チェック用)
function checkActiveStopLossIsFilled(config, api, orderSeriesID){
  var stopLoss = getActiveStopLossByOrderSeries(orderSeriesID)
  var orderIDs = stopLoss.rows.map(function(row){return row[stopLoss.columns.indexOf("オーダーID")]})
  var currentOrders = getOrder(api, config, orderIDs)
  return currentOrders.map(function(order){if(order["オーダーステータス"] == "Filled") return order}) 
}

function formatStopLossExecutedMessage(order, platform, strategy){
  return "[" + Utilities.formatDate(d, "JST","yyyy/MM/dd hh:mm:ss") + "] Strategy " + strategy + "stopLoss is Filled " + order["side"] + "in" +  platform + "ticker" + order["ticker"] + "amount" + order["ポジションサイズ"] + "price at" + order["価格"] 
}

function getStatus(){
  return getSymbolAndData("戦略ステータス")
}

function formatMessage(strategy, order, op, platform){
  var obj = JSON.parse(order)
  var symbol = obj["ticker"]
  var orderQty = obj["ポジションサイズ"]
  var price = obj["価格"]
  var orderType = obj["オーダータイプ"]
  var d = new Date()
  var message = "[" + Utilities.formatDate(d, "JST","yyyy/MM/dd hh:mm:ss") + "]" + "Strategy " + strategy + " : " + op + " in " + platform + " ticker " + symbol + " amount " + orderQty + " price at " + price + "order type is " + orderType
  return message
}


function getSymbolAndData(sheetName){
  var spreadSheet = SpreadsheetApp.getActive()
  var sheet = spreadSheet.getSheetByName(sheetName)
  var dataValues = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues()
  var headers = dataValues[0]
  var dataArray = dataValues.slice(1)
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
