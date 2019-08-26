# map-storage
* [honeo/map-storage](https://github.com/honeo/map-storage)  
* [map-storage](https://www.npmjs.com/package/map-storage)


## なにこれ
WebExtensionsのstorageをMap APIで扱う。  
* 自動同期
	- 同じstorage実体から生成したインスタンス間で同期する。
* 自動永続化
	- よしなにstorage実体へ永続化する。


## 使い方
```bash
$ npm i map-storage
```
map-storage.jsを読み込む。  
ChromeExtensionsでは別途[mozilla/webextension-polyfill](https://github.com/mozilla/webextension-polyfill)が必要。
```js
// manifest.json
{

	// example: ContentScripts
	"content_scripts": [
		"matches": ["<all_urls>"],
        "js": [
            "map-storage.js",
			"content-scripts.js"
        ],
        "run_at": "document_start"
    ]

	// example: Background page
	"background": {
		"page": "background.html"
	},

	"permissions": [
		"storage",
		"unlimitedStorage", // or
	]
}
```
```html
<!-- example: background.html -->
<script src="./map-storage.js"></script>
<script src="./background.js"></script>
```
global.MapStorageから扱う。
```js
// background.js
const mapstorage = await new MapStorage('foobar');

mapstorage.set('key', {value: true});
```
```js
// content-scripts.js
const mapstorage = await new MapStorage('foobar');

mapstorage.get('key'); // {value: true}
```
あるいは
```js
// for Bundle
import MapStorage from 'map-storage';


// Dynamic import & CDN
const {default: MapStorage} = await import('https://rawcdn.githack.com/honeo/map-storage/d519a64e613e0f9a594745a468a2d19a992a3ddd/map-storage.mjs');
```


## API
[Map - JavaScript | MDN](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Map)を継承している。


### MapStorage(name [, options])
引数1文字列の名でインスタンスを作成する。  
既に同名のStorage実体があれば内容を読み込む。  
インスタンスを引数に解决するpromiseを返す。
```js
const mapstorage = await new MapStorage('hoge');

// options
const mapstorage = await new MapStorage('fuga', {
	saveInterval: 0, // 実体に保存する間隔
	type: 'local' // or sync, managed
});
```


### MapStorage#bytes()
Storage実体の使用量を数値で取得する。  
取得した数値を引数に解决するpromiseを返す。
```js
const number = await mapstorage.bytes();
```


### MapStorage#disconnect()
同じStorage実体から生成されたインスタンス間の同期を終了する。  
同期の終了後に解決するpromiseを返す。  
__＊同期中のインスタンスはGCの対象にならない__
```js
const bool = await mapstorage.disconnect();
```


### MapStorage#toJSON()
自身の内容をオブジェクトで返す。
```js
const obj = mapstorage.toJSON();
```


### MapStorage#lastModified
最終更新時のDateインスタンス。
```js
mapstorage.lastModified; // date
```
