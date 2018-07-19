function makeSignature(apiSecret, verb, expires, path, payload){

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