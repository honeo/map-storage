# map-storage
* [honeo/map-storage](https://github.com/honeo/map-storage)  
* [map-storage](https://www.npmjs.com/package/map-storage)


## なにこれ
WebExtensionsのstorageをMap APIで扱う。  
自動で永続化する。  


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
// example: CDN, Dynamic import
const {default: MapStorage} = await import('https://cdn.rawgit.com/honeo/map-storage/master/map-storage.mjs');
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
	type: 'local' // or sync, managed
});
```


### MapStorage#bytes()
Storage実体の使用量を数値で取得する。  
取得した数値を引数に解决するpromiseを返す。
```js
const number = await mapstorage.bytes();
```


### MapStorage#lastModified
最終更新時のDateインスタンス。
```js
mapstorage.lastModified; // date
```
