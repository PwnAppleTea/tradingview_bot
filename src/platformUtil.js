
function closeOrder(api, config, order){
  order[0] = api.marketCloseOrder(config["ticker"])
  return [order, 0]
}

function dotenOrder(api, config, op, order, statuses){
  order.push(api.marketCloseOrder(config["ticker"]))
  order.push(api.marketOrder(config["ticker"], op, config["ポジションサイズ"]))
  var position = JSON.parse(order[1])
  var stop = stopOrder(api, config, reverseBuySell(op), position["price"])
  if(stop){order.push(stop)}
  status["ピラミッディング数"] = statuses["ピラミッディング数"] + 1
  status["オーダーシリーズ"] = statuses["オーダーシリーズ"] + 1
  return [order, status]
}

function order(api, config, op, order, statuses){
  order.push(api.marketOrder(config["ticker"], op, config["ポジションサイズ"]))
  var position = JSON.parse(order[0])
  var stop = stopOrder(api, config, reverseBuySell(op), position["price"])
  if(stop){order.push(stop)}
  var status = {}
  status["ピラミッディング数"] = statuses["ピラミッディング数"] + 1
  status["オーダーシリーズ"] = statuses["オーダーシリーズ"]
  return [order, status]
}

function startOrder(api, config, op, order, statuses){
  order.push(api.marketOrder(config["ticker"], op, config["ポジションサイズ"]))
  var position = JSON.parse(order[0])
  var stop = stopOrder(api, config, reverseBuySell(op), position["price"])
  if(stop){order.push(stop)}
  status["ピラミッディング数"] = 1
  status["オーダーシリーズ"] = statuses["オーダーシリーズ"] + 1
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
