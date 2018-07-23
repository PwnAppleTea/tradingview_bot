# Abstract
This bot is system trade bot which demand on tradingview alert system.

# How to use
以下のスプレッドシートと連動して動くので、このシートを読んでください。

https://docs.google.com/spreadsheets/d/1-FSiXgjvg0H528oymUmdb8VBgpWqEMJzFhO3B0EnySc/edit?usp=sharing

なにかエラー起きたらissueを上げていただければ助かります。

一応使い方をまとめますと、
1. 「調整項目」でポジションサイズ, ピラミッディングの設定
2. 「API資格情報」にbitmexのapi key api secretを記述(心配ならtestnetのものを).
3. 上のメニューにbotControlがあるはずなので、runBotを起動(「稼働状況」シートの稼働状況が稼働中になります)
4. 初回起動時は認証がいります。左下の詳細ボタンを押すと認証できるボタンが表示されるので、それで認証してください。
5. 下のフォーマットに従ってTradingViewのアラートメッセージを作成し、本シートを管理しているアカウントと紐づくgmailに送るように設定してください。
6. 一回注文を試したいときはtestrunで試せますので、試してみてください。
7. 問題など発生したらissueの方に投げてください.
