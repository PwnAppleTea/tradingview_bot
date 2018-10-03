var APIInterface = function(){
    this.bitmex = function(api_key, api_secret){return new bitmex(api_key, api_secret)}
    this.bitmex_testnet = function(api_key, api_secret){return new bitmex_testnet(api_key, api_secret)}
}