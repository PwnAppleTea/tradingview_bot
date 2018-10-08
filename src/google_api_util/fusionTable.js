

function getTableIdFromName(tableName){
  var tables = FusionTables.Table.list()
  var targetTable = deleteUndefinedFromArray(tables["items"].map(function(table){if(table["name"] == "tradingview_bot_sheet v2 development-処理結果") return table}))
  if(!targetTable){return}
  return targetTable["tableId"]
}

function deleteUndefinedFromArray(array){
  for(var i = 0; i < array.length; i++){
    if(array[i]) return array[i];
  }
}

function getActiveStopLossByOrderSeries(symbol, orderSeriesID){
  var tableId = getTableIdFromName("TBOT_処理結果")
  var sql = "SELECT orderSeriesID, 'オーダーID', '戦略シンボル' FROM "+ tableId + "WHERE 'オーダーステータス' = 'New' AND 'orderSeriesID' = " + orderSeriesID + " AND 'オーダータイプ' = 'Stop' AND '戦略シンボル' = " + symbol
  return FusionTables.Query.sqlGet(sql)
}

function appendOrderLog(order, op, orderSeriesID, platform, strategySymbol){
  var tableId = getTableIdFromName("TBOT_処理結果")
  
  var getSQL = "SELECT * FROM " + tableId + " LIMIT = 1"
  var reducer = function(accumulator, currentValue){return accumulator + ", " + currentValue}
  orderKeys = order.keys()
  var row = orderSeriesID + ", " + platform + ", " + strategySymbol + ", "
  var orderRow = ""
  for(var i = 0; i < orderKeys.length ; i ++){orderRow + ", " +  order[orderKeys[i]]}
  row = row + orderRow + ", " + op
  var insertSQL = "INSERT INTO " + tableId + getSQL.columns().reduce(reducer) + "VALUES " + row
  return FusionTables.Query.sql(insertSQL)
}


function updateOrderLog(order){
  var tableId = getTableIdFromName("TBOT_処理結果")
  var getSQL = "SELECT ROWID FROM" +tableId+ "WHERE 'オーダーID' = " + order["オーダーID"]
  var rowId = FusionTables.Query.sqlGet(getSQL).rows[0][0]
  var setSQL = "UPDATE" + tableId + "SET 'オーダーステータス' = "+ order["オーダーステータス"] +", '価格' = "+ order["価格"] + " '執行価格' = " + order["執行価格"] + " '執行時刻' = "+ order["執行時刻"] +" WHERE ROWID =" + rowId
  var response = FusionTables.Query.sqlGet(setSQL)
  return response
}

function createTableIfNotExist(){
  if(!getTableIdFromName("TBOT_処理結果")){
    var resource = {
      "name": "TBOT_orderLog",
      "isExportable": true,
      "kind": "fusiontable#table",
      "columns":[
        {
          "name": "orderSeriesID",
          "type": "NUMBER",
          "kind": "fusiontables#column"
        },
        {
          "name": "プラットフォーム",
          "type": "STRING",
          "kind": "fusiontables#column"
        },
        { 
          "name": "戦略シンボル",
          "type": "STRING",
          "kind": "fusiontables#column"
        },
        {
          "name": "ticker",
          "type": "STRING",
          "kind": "fusiontables#column"
        },
        {
          "name": "side",
          "type": "STRING",
          "kind": "fusiontables#column"
        },
        {
          "name": "オーダーID",
          "type": "STRING",
          "kind": "fusiontables#column"
        },
        {
          "name": "ポジションサイズ",
          "type": "NUMBER",
          "kind": "fusiontables#column"
        },
        {
          "name": "ストップ価格",
          "type": "NUMBER",
          "kind": "fusiontables#column"
        },
        {
          "name": "執行価格",
          "type": "NUMBER",
          "kind": "fusiontables#column"
        },
        {
          "name": "価格",
          "type": "NUMBER",
          "kind": "fusiontables#column"
        },
        {
          "name": "オーダーステータス",
          "type": "STRING",
          "kind": "fusiontables#column"
        },
        {
          "name": "執行時刻",
          "type": "DATE/TIME",
          "kind": "fusiontables#column"
        },
        {
          "name": "timestamp",
          "type": "DATE/TIME",
          "kind": "fusiontables#column"
        },
        {
          "name": "オーダータイプ",
          "type": "STRING",
          "kind": "fusiontables#column"
        },
        {
          "name": "オペレーション",
          "type": "STRING",
          "kind": "fusiontables#column"
        },
      ]
    }
    FusionTables.Table.insert(resource)
  }
}