
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
  