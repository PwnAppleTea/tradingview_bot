function marketOrder(api, side, orderQty){
  var path = "/api/v1/order";
  var params = {"symbol": "XBTUSD", "side": side, "orderQty": orderQty, "ordType": "Market"};
  var order = sendRequest(api, params, "POST", path, 0)
  return order
}

function marketCloseOrder(api){
  var path = "/api/v1/order/closePosition"
  var params = {"symbol": "XBTUSD"}
  return sendRequest(api, params, "POST", path, 0)
}

function getPosition(api){
  var path = "/api/v1/position"
  var params = {"symbol": "XBTUSD"}
  var position = sendRequest(api, params, "GET", path, 0)
  return position
}
  

function sendRequest(api, params, method, path, numResend){
    if (numResend > 10){throw "Too much resend request exception, make sure something problem"}
    var api_url = "https://testnet.bitmex.com";
    var path = path;
    d = new Date()
    var nonce = d.getTime().toString()
    var option = {
        "headers": {
        "Content-Type": "application/json", 
        'api-nonce': nonce,
        "api-key": api.apiKey, 
        },
        "method": method, 
        "muteHttpExceptions": false
    }
    if(method=="POST"){
        var payload = params
        var signature = makeSignature(api.apiSecret, method, nonce, path, payload);
        option["headers"]["api-signature"] = signature
        option["payload"] = JSON.stringify(payload)
        var query = path
    }else if(method=="GET"){
        var query = path
        query = path + "?filter=" + encodeURIComponent(JSON.stringify(params))
        var payload = ''
        var signature = makeSignature(api.apiSecret, method, nonce, query, payload)
        option["headers"]["api-signature"] = signature
    }
    try{
        var response = UrlFetchApp.fetch(api_url+query, option)
        return response
    }catch(e){
        Utilities.sleep(10000)
        Logger.log(e)
        return sendRequest(api, params, method, path, numResend+1)
    }
}

