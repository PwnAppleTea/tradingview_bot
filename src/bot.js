function bot() {
  var configs = configration();
  var mail = checkGmailUpdate();
  Logger.log(mail);
  var statuses = getStatus();
  if(!mail){return}
  Logger.log(configs)
  Object.keys(configs).forEach(function(symbol){
    try{
      if(!mail[symbol]){return}
      var op = parseOperation(mail[symbol]["operation"])
      var order = orderBot(configs[symbol], op, statuses[symbol])
      Logger.log(order)
      if(order){
      Logger.log("order")
        setPyramidding(symbol, order[1])
        appendOrder(order[0], op, symbol)
        for(var i=0;i < order[0].length; i++){
          var message = formatSlackMessage(symbol, order[0][i], op, configs[symbol]["テスト"])
          chatMessage(message)
        }
      }
    }catch(e){
      chatMessage(symbol + ":" + e.name + ":" + e.message)
    }
  })
}



function orderBot(config, op, status){
  // var messenger = messaging(); 
  if(config["稼働"]) {
    //threads[0].markRead();  
    var api = new APIInterface()[config["プラットフォーム"]](config["APIkey"], config["APIsecret"])
    var order = orderFlow(api, op, config, status)
    if(order.length == 0){return}
    return order
  }
}

  
function orderFlow(api, op, config, statuses){
  var spreadSheet = SpreadsheetApp.getActive()
  var sheet = spreadSheet.getSheetByName("戦略ステータス")
  //var numPyramidding = sheet.getRange(2,1).getValue()
  var numPyramidding = statuses["ピラミッディング数"]
  if(numPyramidding.isEmpty()){numPyramidding = 0}
  var pyramidding = config["最大ピラミッディング"]
  var response = api.getPosition(config["ticker"])
  var position = JSON.parse(response)
  var currentQty = 0
  
  if(position.length > 0){
    currentQty = position[0]["currentQty"]
  }
  var ord = []
  if(op=="Close"){
    ord = closeOrder(api, config["ticker"], ord);
  }else{
    if(currentQty != 0){
      if(currentQty < 0){
        if(op == "Sell"){
          if(numPyramidding < pyramidding){
            ord = order(api, config, op, ord, numPyramidding)
          }else{Logger.log("ピラミッディング数が上限を超えるので注文しません")}// if over pyramidding then do nothing
        }else{// op == buy
          ord = dotenOrder(api, config, op, ord)
        }
      }else if(currentQty > 0){
        if(op == "Buy"){
          if(numPyramidding < pyramidding){
            ord = order(api, config, op, ord, numPyramidding)
          }else{Logger.log("ピラミッディング数が上限を超えるので注文しません")}// if over pyramidding then do nothing
        }else{// op == Sell
          ord = dotenOrder(api, config, op, ord)
        }
      }
    }else{
      ord = startOrder(api, config, op, ord)
    }
  }
  return ord
}

function closeOrder(api, config, order){
  order[0] = api.marketCloseOrder(config["ticker"])
  return [order, 0]
}

function dotenOrder(api, config, op, order){
  order.push(api.marketCloseOrder(config["ticker"]))
  order.push(api.marketOrder(config["ticker"], op, config["ポジションサイズ"]))
  var position = JSON.parse(order[1])
  stopOrder(api, config, reverseBuySell(op), position["price"])
  var pyramidding = 1
  return [order, pyramidding]
}

function order(api, config, op, order, numPyramidding){
  order[0] = api.marketOrder(config["ticker"], op, config["ポジションサイズ"])
  var position = JSON.parse(order[0])
  stopOrder(api, config, reverseBuySell(op), position["price"])
  var pyramidding = numPyramidding + 1
  return [order, pyramidding]
}

function startOrder(api, config, op, order, numPyramidding){
  order[0] = api.marketOrder(config["ticker"], op, config["ポジションサイズ"])
  var position = JSON.parse(order[0])
  stopOrder(api, config, reverseBuySell(op), position["price"])
  var pyramidding = 1
  return [order, pyramidding]
}

function stopOrder(api, config, op, positionPrice){
  if(["None", ""].indexOf(config["ストップロスタイプ"]) < 0){
    var pegOffset = config["ストップのポジションとの差"]
    if(op == "Sell"){
      pegOffset = -pegOffset
    }
    return api.marketStopOrder(config["ticker"], op, pegOffset, config["ストップロスタイプ"], config["ポジションサイズ"], positionPrice)
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

function setPyramidding(symbol, num){
  ss = SpreadsheetApp.getActive()
  sheet = ss.getSheetByName("戦略ステータス")
  var symbols = reduceDim(sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues())
  for(var i=0; i < symbols.length; i++){
    if(symbols[i] == symbol){
      sheet.getRange(i+1, 2).setValue(num)
    }
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

function appendOrder(order, op, symbol){
  Logger.log(order)
  for(var i=0; i < order.length; i++){
    var orderObj = JSON.parse(order[i])
    var spreadSheet = SpreadsheetApp.getActive()
    var sheet = spreadSheet.getSheetByName("処理結果")
    var h = sheet.getRange(1, 1, 1, 8).getValues()
    var header = h[0]
    sheet.appendRow([symbol, orderObj[header[1]], orderObj[header[2]], orderObj[header[3]], orderObj[header[4]], orderObj[header[5]], orderObj[header[6]], orderObj[header[7]], op])
  }
}

function getStatus(){
  return getSymbolAndData("戦略ステータス")
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

