vProxy
======

proxy for node.js


node.jsで使用できるHTTPプロキシ  
HTTPSは未対応  
リクエスト/レスポンスのログの保存,改変,フィルタリングが簡単にできる  

使い方  
vp.onでsend(HTTPリクエスト)とrecv(HTTPレスポンス)のイベントを設定する  
vp.start(port)でプロキシをスタートする  

vp.parseHTTP(data) 受け取ったBufferをヘッダとボディーにパースする  
vp.createHTTP(headers, body) ヘッダとボディーからそれらを結合したBufferを作成する  
headersはヘッダ文字列の配列で,Content-Lengthが含まれているとbodyから自動で設定される  


イベントは目的のサーバに送る前/目的のサーバからのレスポンスをクライアントに送る前に実行される  
第一引数は実際のデータのBuffer  
第二引数はinfomationオブジェクト(infomation.address.hrefでurlをとって来れる)  
第三引数はクライアントのソケット,これに対してwriteするとクライアントに直接データを送信可能  
戻り値は送るデータのBuffer,nullを返すと通信がキャンセルされる  


あとはサンプル参照
