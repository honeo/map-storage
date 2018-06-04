/*
	通常版
*/


// 衝突回避
const MapStorage = (function(){

/*
	Var

		_method: Map#methodへの参照
		options_default: 標準設定
		weakmap {
			...MapStorageインスタンス: {
				name: "instance名",
				saved: boolean, 変更後に実体へ書込み済みか
				type: string, browser.storage.type
			}
		}
*/
const _clear = Map.prototype.clear;
const _delete = Map.prototype.delete;
const _get = Map.prototype.get;
const _has = Map.prototype.has;
const _set = Map.prototype.set;
const options_default = {
	type: 'local'
}
const weakmap = new WeakMap(); // instance: configObject{}


/*
	本体
*/
class MapStorage extends Map {

	/*
		引数
			1: string
				固有のデータベース名。
			2: op, object
				設定。
		返り値
			promise
				インスタンスを引数に解决する
	*/
	constructor(name, _options={}){
		if( typeof name!=='string' ){
			throw new TypeError('Invalid arguments');
		}
		super();
		const options = Object.assign({}, options_default, _options);
		const type = options.type;

		return browser.storage[type].get({
			[name]: []
		}).then( async (obj)=>{
			// storageから読み込み、配列ならv~1.0.1までの仕様なら変換してから渡す
			const {contents, lastModified} = Array.isArray(obj[name]) ?
				legacyConvert(obj[name]):
				obj[name];
			// super()による初期化（new Map(iterable)相当）だとMapStorage#setが使われてしまうため
			contents.forEach( ([key, value])=>{
				Map.prototype.set.call(this, key, value);
			});
			// configObject
			weakmap.set(this, {
				lastModified,
				name,
				saved: true,
				type
			});
			return this;
		});
	}


	/*
		オブジェクトの種類表記を変更する
			[object MapStorage] みたいになる
	*/
	get [Symbol.toStringTag]() {
		return 'MapStorage';
	}

	/*
		本来のMap#clear()との違い
			自身と対になるstorage実体も初期化する。
	*/
	clear(){
		_clear.call(this);
		save(this);
	}


	/*
		Map#delete + 削除後のstorage書込み
			あれば削除してstorage書込み
			なければスルー
	*/
	delete(key){
		if( _has.call(this, key) ){
			_delete.call(this, key);
			save(this);
			return true;
		}else{
			return false;
		}
	}


	/*
		Map#setとの違い
			同内容時のSkip
				現在の値と新しい値が違えば上書き
				同じならスルー
			保存後のstorage書込み
				上記上書き時に関数呼ぶだけ

			引数
				1: any
					mapのkeyとなるJSON化できる値。
				2: any
					keyに対するvalueとなるJSON化できる値。
			返り値
				this
					本家Map#setに倣っている。
	*/
	set(key, value){
		// なければ追加して終了
		if( !_has.call(this, key) ){
			_set.call(this, key, value);
			save(this);
			return this;
		}

		const value_old = _get.call(this, key);
		if( typeof value_old==='object' ){
			const str_oldValue = JSON.stringify(value_old);
			const str_newValue = JSON.stringify(value);
			if( str_oldValue!==str_newValue ){
				_set.call(this, key, value);
				save(this);
			}
		}else{
			if( value_old!==value ){
				_set.call(this, key, value);
				save(this);
			}
		}
		return this;
	}

	/*
		実体のbyte数を取得
			#method()ではこれだけpromise

			返り値
				promise
					storage使用byte量の数値を引数に解决する。
	*/
	async bytes(){
		const config = weakmap.get(this);
		return browser.storage[config.type].getBytesInUse(config.name);
	}


	/*
		最終更新時のDateインスタンスを返す
	*/
	get lastModified(){
		const config = weakmap.get(this);
		return new Date(config.lastModified);
	}
}




/*
	非同期でいい感じに間引いて実体に保存する
		内容の変更時はこれを実行しとけばOK.
*/
function save(instance){
	const config = weakmap.get(instance);
	config.saved = false;
	setTimeout( ()=>{
		if( config.saved ){
			return;
		}

		config.saved = true;
		const contents = [...instance.entries()];
		browser.storage[config.type].set({
			[config.name]: {
				contents,
				lastModified: Date.now()
			}
		});
	}, 0);
}


/*
	旧仕様のstorage実体を現仕様に変換して返す
		引数
			1: array
		返り値
			object {
				contents: array
				lastModified: number // UTC経過ms
			}
*/
function legacyConvert(contents){
	return {
		contents,
		lastModified: Date.now()
	}
}


return MapStorage;
}()); // 衝突回避
