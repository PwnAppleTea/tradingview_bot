function bot() {
  createTableIfNotExist()
  var configs = configration();
  var mail = checkGmailUpdate();
  var statuses = getStatus();
  Object.keys(configs).forEach(function(symbol){
    try{
      if(configs[symbol]["稼働"]) {
        var api = new APIInterface()[configs[symbol]["プラットフォーム"]](configs[symbol]["APIkey"], configs[symbol]["APIsecret"])
        if(mail){
          if(mail[symbol]){
            var op = parseOperation(mail[symbol]["operation"])
            var orders = orderBot(api, configs[symbol], op, statuses[symbol])
            var order = orders[0]
            var cancelOrder = orders[1]
            if(order){
              Logger.log(order)
              setStatus(symbol, order[1])
              appendOrder(order[0], op, configs[symbol]["プラットフォーム"], order[1]["orderSeriesID"], symbol)
              order[0].map(function(ord){return formatMessage(symbol, ord, op, configs[symbol]["プラットフォーム"])}).forEach(chatMessage)
            }
            if(cancelOrder){
              cancelOrder.forEach(updateOrderLog)
            }
          }
        }
        //TODO: stopオーダーがfilledした結果をfusionTableに書き込む
        var filledStopOrders = checkActiveStopLossIsFilled(symbol, configs[symbol], api, statuses[symbol]["orderSeriesID"])
        filledStopOrders.map(function(ord){return formatStopLossExecutedMessage(ord, configs[symbol]["プラットフォーム"], symbol)}).forEach(chatMessage)
        filledStopOrders.forEach(updateOrderLog)
      }
    }catch(e){
      chatMessage(symbol + ":" + e.name + ":" + e.message)
    }
  })
}

function orderBot(api, config, op, status){
  var order = orderFlow(api, op, config, status)
  return order
}

function orderFlow(api, op, config, statuses){
  if(statuses["ピラミッディング数"] == ""){statuses["ピラミッディング数"] = 0}
  if(statuses["orderSeriesID"] == ""){statuses["orderSeriesID"] = 0}
  var numPyramidding = statuses["ピラミッディング数"]
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
        order = normalOrder(api, config, op, statuses)
      }else{Logger.log("ピラミッディング数が上限を超えるので注文しません")}// if over pyramidding then do nothing
    }else if(op=="CloseShort"){
      cancelOrder = api.cancelAllOrder(config["ticker"])
      order = closeOrder(api, config, statuses)
    }else if(op=="Buy"){
      cancelOrder = api.cancelAllOrder(config["ticker"])
      order = dotenOrder(api, config, op, statuses)
    }
  }else if(currentQty > 0){
    if(op == "Buy"){
      if(numPyramidding < pyramidding){
        order = normalOrder(api, config, op, statuses)
      }else{Logger.log("ピラミッディング数が上限を超えるので注文しません")}// if over pyramidding then do nothing
    }else if(op=="CloseLong"){
      cancelOrder = api.cancelAllOrder(config["ticker"])
      order = closeOrder(api, config, statuses)
    }else if(op=="Sell"){
      cancelOrder = api.cancelAllOrder(config["ticker"])
      order = dotenOrder(api, config, op, statuses)
    }
  }else{
    if(op=="Buy" || op=="Sell"){
      Logger.log("startOrder")
      order = startOrder(api, config, op, statuses)
    }
  }
  return [order, cancelOrder]
}

function setStatus(symbol, status){
  ss = SpreadsheetApp.getActive()
  sheet = ss.getSheetByName("戦略ステータス")
  var symbols = reduceDim(sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues())
  for(var i=0; i < symbols.length; i++){
    if(symbols[i] == symbol){
      sheet.getRange(i + 1, 2).setValue(status["ピラミッディング数"])
      sheet.getRange(i + 1, 3).setValue(status["orderSeriesID"])
    }
  }
}

function checkGmailUpdate(){
  // return {symbol:{op: }}
  var threads = GmailApp.search("from:noreply@tradingview.com is:unread");
  if(threads.length < 1){return null}
  mails = {}
  threads.forEach(function(thread){
    try{
    thread.getMessages().forEach(function(message){
      mail = parseMessage(message.getBody())
      mails[mail["symbol"]] = mail
      message.markRead()
    })  
    }catch(e){
      chatMessage(e.name + ":" + e.message)
    }  
  })
  return mails;
}

function parseOperation(op){
  var ops = {"Long": "Buy", "Short": "Sell", "CloseLong": "CloseLong", "CloseShort": "CloseShort"}
  return ops[op]
}

function parseMessage(message){
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
  if(permit.indexOf(operation) < 0){throw new MailError(symbol + " のメールのオペレーション"+ operation +"になっていますが許可されてるものではありません。許可されているものは " + permit.toString() + "のみです")}
  return {"operation": operation, "symbol": symbol}
}

function configration(){
  return getSymbolAndData("調整項目")
}

function appendOrder(order, op, platform, orderSeriesID, symbol){
  for(var i=0; i < order.length; i++){
    appendOrderLog(order[i], op, orderSeriesID, platform, symbol)
  }
}

// ストップロスがfilledされた場合(毎分チェック用)
function checkActiveStopLossIsFilled(symbol, config, api, orderSeriesID){
  var stopLoss = getActiveStopLossByOrderSeries(symbol, orderSeriesID)
  if(stopLoss.rows){
    var orderIDs = stopLoss.rows.map(function(row){return row[stopLoss.columns.indexOf("オーダーID")]})
    var currentOrders = getOrder(api, config, orderIDs)
    return currentOrders.map(function(order){if(order["オーダーステータス"] == "Filled") return order}) 
  }else{
    return []
  }
}

function formatStopLossExecutedMessage(order, platform, strategy){
  if(!order) return ;
  return "[" + Utilities.formatDate(d, "JST","yyyy/MM/dd hh:mm:ss") + "] Strategy " + strategy + " stopLoss is Filled " + order["side"] + " in " +  platform + " ticker " + order["ticker"] + " amount " + order["ポジションサイズ"] + " price at " + order["執行価格"] 
}

function getStatus(){
  return getSymbolAndData("戦略ステータス")
}

function formatMessage(strategy, order, op, platform){
  var symbol = order["ticker"]
  var orderQty = order["ポジションサイズ"]
  var orderType = order["オーダータイプ"]
  var d = new Date()
  if(orderType == "Stop"){
    var price = order["ストップ価格"]
    var message = "[" + Utilities.formatDate(d, "JST","yyyy/MM/dd hh:mm:ss") + "]" + "Strategy " + strategy + " operation is " + op + ": Set "+ order["side"] +" Stop loss in " + platform + " ticker " + symbol + " amount " + orderQty + " trigger at " + price
    return message
  }else{
    var price =order["執行価格"]
    var message = "[" + Utilities.formatDate(d, "JST","yyyy/MM/dd hh:mm:ss") + "]" + "Strategy " + strategy +  " signal is "  + op + " : " + order["side"] + " in " + platform + " ticker " + symbol + " amount " + orderQty + " price at " + price + " order type is " + orderType
    return message
  }
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
