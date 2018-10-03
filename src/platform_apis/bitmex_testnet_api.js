var bitmex_testnet = function(api_key, api_secret){
  this.api_key = api_key
  this.api_secret = api_secret
}

bitmex_testnet.prototype.marketOrder = function(symbol, side, orderQty){
  var path = "/api/v1/order";
  var params = {"symbol": symbol, "side": side, "orderQty": orderQty, "ordType": "Market"};
  var order = this.sendRequest_(params, "POST", path, 0)
  return order
}

bitmex_testnet.prototype.marketCloseOrder = function(symbol){
  var path = "/api/v1/order/closePosition"
  var params = {"symbol": symbol}
  return this.sendRequest_(params, "POST", path, 0)
}

bitmex_testnet.prototype.getPosition = function(symbol){
  var path = "/api/v1/position"
  var params = {"symbol": symbol}
  var position = this.sendRequest_(params, "GET", path, 0)
  return position
}

bitmex_testnet.prototype.marketStopOrder = function(symbol, side, pegOffsetValue, pegPriceType, orderQty, positionPrice){
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
  var position = this.sendRequest_(params, "POST", path, 0, 100000)
  Logger.log(position)
  return position
}


bitmex_testnet.prototype.sendRequest_ = function(params, method, path, numResend){
  if (numResend > 10){throw new HTTPException("Too much resend request")}
  var api_url = "";
  api_url = "https://testnet.bitmex.com";
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
  if(method=="POST"){
    var payload = params
    var signature = makeMexSignature(this.api_secret, method, nonce, path, payload);
    option["headers"]["api-signature"] = signature
    option["payload"] = JSON.stringify(payload)
    var query = path
    }else if(method=="GET"){
      var query = path
      query = path + "?filter=" + encodeURIComponent(JSON.stringify(params))
      var payload = ''
      var signature = makeMexSignature(this.api_secret, method, nonce, query, payload)
      option["headers"]["api-signature"] = signature
    }

  var response = UrlFetchApp.fetch(api_url+query, option)
  if(checkHttpError(response) == "Resend"){
    Utilities.sleep(500)
    return this.sendRequest_(params, method, path, numResend + 1)
  }
  return response
}

function checkHttpError(response){
  res = JSON.parse(response)
  code = response.getResponseCode()
  if(code > 400){
    if(code == 503){
      return "Resend"
    }else{
      throw new HTTPException(res["error"]["message"] + "HTTPCode" + code + ":" + res["error"]["name"])
    }
  }
}

function makeMexSignature(apiSecret, verb, expires, path, payload){
  if(payload == ""){
    var source = verb + path + expires
  }else{
    var s_payload = JSON.stringify(payload)
    var source = verb + path + expires + s_payload
  }
  return hex(Utilities.computeHmacSha256Signature(source, apiSecret))    
}

function hex(signature){
  var sign = signature.reduce(function(str,chr){
    chr = (chr < 0 ? chr + 256 : chr).toString(16);
    return str + (chr.length==1?'0':'') + chr;
  },'');
  return sign
}