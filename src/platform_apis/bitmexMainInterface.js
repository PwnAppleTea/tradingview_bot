var bitmexInterface = function(){
}
  
bitmexInterface.prototype.marketOrder = function(symbol, side, orderQty){
  var path = "/api/v1/order";
  var params = {"symbol": symbol, "side": side, "orderQty": orderQty, "ordType": "Market"};
  return this.parse_order(this.sendRequest_(params, "POST", path, 0))
  
}

bitmexInterface.prototype.getOrders = function(symbol, orderIDs){
  var path = "/api/v1/order";
  var params = {"symbol": symbol, "orderID": orderIDs};
  return this.parse_orders(this.sendRequest_(params, "GET", path, 0))
}

bitmexInterface.prototype.marketCloseOrder = function(symbol){
  var path = "/api/v1/order/closePosition"
  var params = {"symbol": symbol}
  return this.parse_order(this.sendRequest_(params, "POST", path, 0))
}

bitmexInterface.prototype.getPosition = function(symbol){
  var path = "/api/v1/position"
  var params = {"symbol": symbol}
  var position = this.sendRequest_(params, "GET", path, 0)
  return position
}

/**
 * TODO: add cancel order 
**/
bitmexInterface.prototype.cancelOrder = function(symbol, orderIDs){
  var path = "/api/v1/order"
  var params = {"symbol": symbol, "orderID": orderIDs}
  var method = "DELETE"
  return this.parse_orders(this.sendRequest_(params, method, path, 0))
}

bitmexInterface.prototype.cancelAllOrder = function(symbol){
  var path = "/api/v1/order/all"
  var params = {"symbol": symbol}
  var method = "DELETE"
  return this.parse_orders(this.sendRequest_(params, method, path, 0))
}

bitmexInterface.prototype.marketStopOrder = function(symbol, side, pegOffsetValue, pegPriceType, orderQty, positionPrice){
  var path = "/api/v1/order"
  var params = {}
  if(pegPriceType == "無し"){return}
  if(pegPriceType == "ストップロス"){
    Logger.log(positionPrice)
    Logger.log(pegOffsetValue)
    params = {"symbol": symbol, "side": side, "ordType": "Stop", "stopPx": positionPrice + pegOffsetValue,  "orderQty": orderQty}
  }else if(pegPriceType == "トレーリングストップ"){
    params = {"symbol": symbol, "side": side, "pegOffsetValue": pegOffsetValue, "orderQty": orderQty, "pegPriceType": "TrailingStopPeg"}
  }
  Logger.log(params)
  var position = this.sendRequest_(params, "POST", path, 0)
  Logger.log(position)
  return this.parse_order(position)
}


bitmexInterface.prototype.sendRequest_ = function(params, method, path, numResend){
  if (numResend > 10){throw new HTTPException("Too much resend request")}
  var api_url = "";
  api_url = this.api_url;
  Logger.log(params)
  var path = path;
  d = new Date()
  var nonce = d.getTime().toString()
  var option = {
    "headers": {
      "Content-Type": "application/json", 
      'api-nonce': nonce,
      "api-key": this.api_key, 
    },
    "method": method, 
    "muteHttpExceptions": true
  }
  if(method=="POST" || method=="DELETE"){
    var payload = params
    var signature = this.makeMexSignature(this.api_secret, method, nonce, path, payload);
    option["headers"]["api-signature"] = signature
    option["payload"] = JSON.stringify(payload)
    var query = path
    }else if(method=="GET"){
      var query = path
      query = path + "?filter=" + encodeURIComponent(JSON.stringify(params))
      var payload = ''
      var signature = this.makeMexSignature(this.api_secret, method, nonce, query, payload)
      option["headers"]["api-signature"] = signature
    }

  var response = UrlFetchApp.fetch(api_url+query, option)
  if(this.checkHttpError(response) == "Resend"){
    Utilities.sleep(500)
    return this.sendRequest_(params, method, path, numResend + 1)
  }
  return response
}

bitmexInterface.prototype.checkHttpError = function(response){
  res = JSON.parse(response)
  code = response.getResponseCode()
  if(code >= 400){
    if(code == 503){
      return "Resend"
    }else{
      throw new HTTPException(res["error"]["message"] + "HTTPCode" + code + ":" + res["error"]["name"])
    }
  }
}

bitmexInterface.prototype.makeMexSignature = function(apiSecret, verb, expires, path, payload){
  if(payload == ""){
    var source = verb + path + expires
  }else{
    var s_payload = JSON.stringify(payload)
    var source = verb + path + expires + s_payload
  }
  return this.hex(Utilities.computeHmacSha256Signature(source, apiSecret))    
}

bitmexInterface.prototype.hex = function(signature){
  var sign = signature.reduce(function(str,chr){
    chr = (chr < 0 ? chr + 256 : chr).toString(16);
    return str + (chr.length==1?'0':'') + chr;
  },'');
  return sign
}

bitmexInterface.prototype.parse_order = function(order){
  Logger.log(order)
  var ordOrg = JSON.parse(order)
  return this.formatOrder(ordOrg)
  
}

bitmexInterface.prototype.formatOrder = function(ordOrg){
  return {
    "ticker": ordOrg["symbol"],
    "side": ordOrg["side"],
    "オーダーID": ordOrg["orderID"],
    "ポジションサイズ": ordOrg["orderQty"],
    "ストップ価格": ordOrg["stopPx"],
    "執行価格": ordOrg["avgPx"],
    "価格": ordOrg["price"],
    "オーダーステータス": ordOrg["ordStatus"],
    "執行時刻": ordOrg["transactTime"],
    "timestamp": ordOrg["timestamp"],
    "オーダータイプ": ordOrg["ordType"]
  }
}

bitmexInterface.prototype.parse_orders = function(order){
  var ordOrgs = JSON.parse(order)
  return ordOrgs.map(this.formatOrder)
}