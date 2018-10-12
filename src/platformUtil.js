
function closeOrder(api, config, statuses){
  var order = []
  var status = {}
  order[0] = api.marketCloseOrder(config["ticker"])
  status["ピラミッディング数"] = 0
  status["orderSeriesID"] = statuses["orderSeriesID"]
  return [order, status]
}

function dotenOrder(api, config, op, statuses){
  var order = []
  var status = {}
  order.push(api.marketCloseOrder(config["ticker"]))
  order.push(api.marketOrder(config["ticker"], op, config["ポジションサイズ"]))
  var stop = stopOrder(api, config, reverseBuySell(op), order[0]["価格"])
  if(stop){order.push(stop)}
  status["ピラミッディング数"] = 1
  status["orderSeriesID"] = statuses["orderSeriesID"] + 1
  return [order, status]
}

function normalOrder(api, config, op, statuses){
  var order = []
  var status = {}
  order.push(api.marketOrder(config["ticker"], op, config["ポジションサイズ"]))
  var stop = stopOrder(api, config, reverseBuySell(op), order[0]["価格"])
  if(stop){order.push(stop)}
  var status = {}
  status["ピラミッディング数"] = statuses["ピラミッディング数"] + 1
  status["orderSeriesID"] = statuses["orderSeriesID"]
  return [order, status]
}

function startOrder(api, config, op, statuses){
  var order = []
  var status = {}
  order.push(api.marketOrder(config["ticker"], op, config["ポジションサイズ"]))
  var stop = stopOrder(api, config, reverseBuySell(op), order[0]["価格"])
  if(stop){order.push(stop)}
  status["ピラミッディング数"] = 1
  status["orderSeriesID"] = statuses["orderSeriesID"] + 1
  return [order, status]
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

function getOrder(api, config, orderIDs){
  return api.getOrders(config["ticker"], orderIDs)
}


function reverseBuySell(buySell){
  if(buySell == "Buy"){
    return "Sell"
  }else{
    return "Buy"
  }
}
