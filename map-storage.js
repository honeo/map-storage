/*
	通常版
*/


// 衝突回避
const MapStorage = (function(){

/*
	Var

		_method: function, Map#methodへの参照
			instance.method() としてMap#methodを使おうとすると
			これを継承した他モジュールに上書きされていた場合に機能不全になる
		options_default: object, 標準設定
		weakmap_config: WeakMapインスタンス {
			...MapStorageインスタンス: {
				lastModified: number, 最終更新時のDate.now()返り値
				listener_bind: function, インスタンスでbind済みのlistener関数
				name: "instance名",
				saved: boolean, 変更後に実体へ書込み済みか
				type: string, browser.storage.type,
				random: number, インスタンス生成時に実行したMath.random()の返り値
			}
		}
*/
const _clear = Map.prototype.clear;
const _delete = Map.prototype.delete;
const _get = Map.prototype.get;
const _has = Map.prototype.has;
const _set = Map.prototype.set;
const options_default = {
	type: 'local',
	saveInterval: 0
}
const weakmap_config = new WeakMap(); // instance: configObject{}


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
		const {type, saveInterval} = Object.assign({}, options_default, _options);
		const listener_bind = listener.bind(this);

		// storage種類に応じてイベント設定
		if( getStorageType(type)==='storage API' ){
			browser.storage.onChanged.addListener(listener_bind);
		}


		return browser.storage[type].get({
			[name]: []
		}).then( async (obj)=>{
			// storageから読み込み、旧仕様の配列なら変換してから渡す
			const {contents, lastModified} = Array.isArray(obj[name]) ?
				legacyConvert(obj[name]):
				obj[name];
			// super()による初期化（new Map(iterable)相当）だとMapStorage#setが使われてしまうため
			contents.forEach( ([key, value])=>{
				Map.prototype.set.call(this, key, value);
			});
			// configObject
			weakmap_config.set(this, {
				lastModified,
				listener_bind,
				name,
				random: Math.random(),
				saved: true,
				saveInterval,
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
		sync.call(this, 'clear');
		save(this);
	}


	/*
		Map#delete + 削除に成功すればstorage実体に書込み
	*/
	delete(key){
		const bool = _delete.call(this, key);
		if( bool ){
			sync.call(this, 'delete', [key]);
			save(this);
		}
		return bool;
	}


	/*
		同期終了
			listenerのthisを拘束しているため、これを踏まないとGCされない。
			後々何かを待ってから終了扱いにしたくなったときを考えてpromiseを返している。

			引数
				なし
			返り値
				promise
					終了後に解決する
	*/
	async disconnect(){
		const config = weakmap_config.get(this);
		// storage種類に応じてイベント解除
		if( getStorageType(config.type)==='storage API' ){
			browser.storage.onChanged.removeListener(config.listener_bind);
			config.listener_bind = null;
		}
	}


	/*
		移行用
			自身の内容をオブジェクトで返す。

			引数
				なし
			返り値
				object{..key:value}
	*/
	toJSON(){
		const obj = {}
		for(let [key, value] of this){
			obj[key] = value;
		}
		return obj;
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
			sync.call(this, 'set', [key, value]);
			save(this);
			return this;
		}

		const value_old = _get.call(this, key);
		if( typeof value_old==='object' ){
			const str_oldValue = JSON.stringify(value_old);
			const str_newValue = JSON.stringify(value);
			if( str_oldValue!==str_newValue ){
				_set.call(this, key, value);
				sync.call(this, 'set', [key, value]);
				save(this);
			}
		}else{
			if( value_old!==value ){
				_set.call(this, key, value);
				sync.call(this, 'set', [key, value]);
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
		const config = weakmap_config.get(this);
		return browser.storage[config.type].getBytesInUse(config.name);
	}


	/*
		最終更新時のDateインスタンスを返す
	*/
	get lastModified(){
		const config = weakmap_config.get(this);
		return new Date(config.lastModified);
	}
}




/*
	非同期でいい感じに間引いて実体に保存する
		内容の変更時はこれを実行しとけばOK.
*/
function save(instance){
	const config = weakmap_config.get(instance);
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
				lastModified: config.lastModified
			}
		});
	}, config.saveInterval);
}


/*
	同期用
		自身の値を変更したらインスタンスをthisに実行する
		ついでにlastModifiedを更新する。

		引数
			1: string
				変更した際のmethod名
			2: op, any
				変更した値
		返り値
			なし
*/
function sync(method, args){
	const config = weakmap_config.get(this);
	config.lastModified = Date.now();

	browser.storage.local.set({
		'_map-storage-sync': Object.assign({method, args}, config)
	});
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


/*
	Storage名に対するStorage種類を返す
		引数
			1: string
		返り値
			string
*/
function getStorageType(string){
	return /^(local|sync|managed)$/.test(string) ?
		'storage API':
			/^(local|session)Storage$/.test(string) ?
				'WebStorage':
				undefined;
}


/*
	同期用
		インスタンスをthisとしてbindして使う。
		Schemeか型チェックライブラリですっきり書きたいが
*/
function listener(obj, type){
	// 別Storageのイベントなら終了
	const storage = obj['_map-storage-sync'];
	if( !storage ){
		return;
	}

	// 関係ないイベントだったら終了
	const isRemoveEvent = !storage.newValue;
	if( isRemoveEvent || type!=='local'){
		return;
	}

	const data = storage.newValue;
	const config = weakmap_config.get(this);

	// 自身の出したイベントなら削除して終了
	if( data.random===config.random ){
		browser.storage.local.remove('_map-storage-sync');
		return;
	}

	// それ以外なら自身に反映
	switch(data.method){
		case 'clear': {
			_clear.call(this);
			break;
		}
		case 'set': {
			_set.call(this, ...data.args);
			break;
		}
		case 'delete': {
			_delete.call(this, ...data.args);
			break;
		}
		default: {
			throw new Error(`Invalid method: ${data.method}`);
		}
	}
	config.lastModified = Date.now();
}


return MapStorage;
}()); // 衝突回避
