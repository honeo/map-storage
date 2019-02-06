# document

いわゆる製作メモ。


## 実装について

### storage保存内容
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

### storage保存タイミング
適当に setTimeout() でまとめる。
options.saveIntervalで指定できる。


### 他コンテキストとの通信・同期
同じStorage実体から複数のインスタンスを利用した場合、更新の競合で内容に齟齬が出るのを防ぐ。
ContentScriptsの制限に紆余曲折してStorageイベントによる実装に落ち着いた。
* DB内容の変更時、以下の内容で実Storageへ書き込む
```js
await browser.storage.local.set({
	'map-storage': {
		method: 'methodName', // set, delete, clearなど
		type: 'storageType', // Storage実体の種類、local, syncなど
		args: [..any] // methodに引数として渡した値の配列
		random: number // config.random (インスタンス生成時に実行したMath.random()の返り値)
	}
});
```
* storage APIのlistenerで上記の書き込みよって発生したイベントを補足する
	- 自身とrandomの値が違えば、自身に反映する
		- 実体には反映しない。
	    - 通常の MapStorage#method() を使うとループするから別口でやる。
	- 自身とrandomの値が同じなら、storage実体から上記を削除する。



## ファイル構成
* map-storage.js
	- 直接拡張機能に突っ込んで使えるやつ。
	- 開発中は主にこっちを弄る。
* map-storage.mjs
	- ESM.
