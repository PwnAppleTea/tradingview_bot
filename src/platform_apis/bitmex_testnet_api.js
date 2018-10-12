var bitmex_testnet = function(api_key, api_secret){
  this.api_key = api_key
  this.api_secret = api_secret
  this.api_url = "https://testnet.bitmex.com"
}

bitmex_testnet.prototype = new bitmexInterface()
