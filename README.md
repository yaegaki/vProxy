vProxy
======

proxy for node.js


node.jsで使用できるHTTPプロキシ  
HTTPSは一応対応(urlでのフィルタリングしかできない)  
リクエスト/レスポンスのログの保存,改変,フィルタリングが簡単にできる  

使い方  
vp.onでsend(HTTPリクエスト)とrecv(HTTPレスポンス)とconnect(相手のサーバへの接続)のイベントを設定する  
vp.start(port)でプロキシをスタートする  

connectではtrueを返すと接続,falaseを返すと切断.  
send/recvでは{headers:headers, body:body}を返す.  


サンプル参照
