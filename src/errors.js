function Exception(name, message){
    this.name = name
    this.message = message
}

function MailError(message){
    return new Exception("MailError", message)
}

function HTTPException(message){
    return new Exception("HTTPException", message)
}