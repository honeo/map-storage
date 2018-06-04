# document

いわゆる製作メモ。

## コンセプト
* Map APIで拡張機能のStorage APIを扱う。
* 同期処理単位でまとめて自動保存する。


## storage保存内容

```js
/*
	v1.0.2～
*/
object {
	// Map化するもの
	contents: [
		...[key, value]
	],

	// 最終保存時のDate.now()返り値
	lastModified: number
}


/*
	v1.0.0 ~ v1.0.1
		直接Map化する配列が入っていた
*/
// Map化するもの
[
	...[key, value]
]
```


## ファイル構成
* map-storage.js
	- 直接拡張機能に突っ込んで使えるやつ。
	- 開発中は主にこっちを弄る。
* map-storage.mjs
	- ESM.
