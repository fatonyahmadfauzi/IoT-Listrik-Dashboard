import{r as e,a as t,g as n,R as s}from"./vendor-d7b881bb.js";!function(){const e=document.createElement("link").relList;if(!(e&&e.supports&&e.supports("modulepreload"))){for(const e of document.querySelectorAll('link[rel="modulepreload"]'))t(e);new MutationObserver(e=>{for(const n of e)if("childList"===n.type)for(const e of n.addedNodes)"LINK"===e.tagName&&"modulepreload"===e.rel&&t(e)}).observe(document,{childList:!0,subtree:!0})}function t(e){if(e.ep)return;e.ep=!0;const t=function(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),"use-credentials"===e.crossOrigin?t.credentials="include":"anonymous"===e.crossOrigin?t.credentials="omit":t.credentials="same-origin",t}(e);fetch(e.href,t)}}();var r={exports:{}},i={},o=e,a=Symbol.for("react.element"),l=Symbol.for("react.fragment"),c=Object.prototype.hasOwnProperty,h=o.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,u={key:!0,ref:!0,__self:!0,__source:!0};function d(e,t,n){var s,r={},i=null,o=null;for(s in void 0!==n&&(i=""+n),void 0!==t.key&&(i=""+t.key),void 0!==t.ref&&(o=t.ref),t)c.call(t,s)&&!u.hasOwnProperty(s)&&(r[s]=t[s]);if(e&&e.defaultProps)for(s in t=e.defaultProps)void 0===r[s]&&(r[s]=t[s]);return{$$typeof:a,type:e,key:i,ref:o,props:r,_owner:h.current}}i.Fragment=l,i.jsx=d,i.jsxs=d,r.exports=i;var p=r.exports,g={},f=t;g.createRoot=f.createRoot,g.hydrateRoot=f.hydrateRoot;const m=e=>{let t;const n=new Set,s=(e,s)=>{const r="function"==typeof e?e(t):e;if(!Object.is(r,t)){const e=t;t=(null!=s?s:"object"!=typeof r||null===r)?r:Object.assign({},t,r),n.forEach(n=>n(t,e))}},r=()=>t,i={setState:s,getState:r,getInitialState:()=>o,subscribe:e=>(n.add(e),()=>n.delete(e)),destroy:()=>{n.clear()}},o=t=e(s,r,i);return i};var _={exports:{}},y={},v={exports:{}},b={},w=e;var x="function"==typeof Object.is?Object.is:function(e,t){return e===t&&(0!==e||1/e==1/t)||e!=e&&t!=t},k=w.useState,C=w.useEffect,I=w.useLayoutEffect,T=w.useDebugValue;function E(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!x(e,n)}catch(s){return!0}}var N="undefined"==typeof window||void 0===window.document||void 0===window.document.createElement?function(e,t){return t()}:function(e,t){var n=t(),s=k({inst:{value:n,getSnapshot:t}}),r=s[0].inst,i=s[1];return I(function(){r.value=n,r.getSnapshot=t,E(r)&&i({inst:r})},[e,n,t]),C(function(){return E(r)&&i({inst:r}),e(function(){E(r)&&i({inst:r})})},[e]),T(n),n};b.useSyncExternalStore=void 0!==w.useSyncExternalStore?w.useSyncExternalStore:N,v.exports=b;var S=v.exports,P=e,R=S;
/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var A="function"==typeof Object.is?Object.is:function(e,t){return e===t&&(0!==e||1/e==1/t)||e!=e&&t!=t},O=R.useSyncExternalStore,D=P.useRef,L=P.useEffect,j=P.useMemo,M=P.useDebugValue;y.useSyncExternalStoreWithSelector=function(e,t,n,s,r){var i=D(null);if(null===i.current){var o={hasValue:!1,value:null};i.current=o}else o=i.current;i=j(function(){function e(e){if(!l){if(l=!0,i=e,e=s(e),void 0!==r&&o.hasValue){var t=o.value;if(r(t,e))return a=t}return a=e}if(t=a,A(i,e))return t;var n=s(e);return void 0!==r&&r(t,n)?(i=e,t):(i=e,a=n)}var i,a,l=!1,c=void 0===n?null:n;return[function(){return e(t())},null===c?void 0:function(){return e(c())}]},[t,n,s,r]);var a=O(e,i[0],i[1]);return L(function(){o.hasValue=!0,o.value=a},[a]),M(a),a},_.exports=y;const F=n(_.exports),{useDebugValue:U}=s,{useSyncExternalStoreWithSelector:q}=F;const W=e=>e;const V=e=>{const t="function"==typeof e?(e=>e?m(e):m)(e):e,n=(e,n)=>function(e,t=W,n){const s=q(e.subscribe,e.getState,e.getServerState||e.getInitialState,t,n);return U(s),s}(t,e,n);return Object.assign(n,t),n},H=e=>e?V(e):V,z=H(e=>({theme:"light",toggleTheme:()=>e(e=>({theme:"light"===e.theme?"dark":"light"})),notifications:!0,toggleNotifications:()=>e(e=>({notifications:!e.notifications}))})),B=!1,$="${JSCORE_VERSION}",K=function(e,t){if(!e)throw G(t)},G=function(e){return new Error("Firebase Database ("+$+") INTERNAL ASSERT FAILED: "+e)},Y=function(e){const t=[];let n=0;for(let s=0;s<e.length;s++){let r=e.charCodeAt(s);r<128?t[n++]=r:r<2048?(t[n++]=r>>6|192,t[n++]=63&r|128):55296==(64512&r)&&s+1<e.length&&56320==(64512&e.charCodeAt(s+1))?(r=65536+((1023&r)<<10)+(1023&e.charCodeAt(++s)),t[n++]=r>>18|240,t[n++]=r>>12&63|128,t[n++]=r>>6&63|128,t[n++]=63&r|128):(t[n++]=r>>12|224,t[n++]=r>>6&63|128,t[n++]=63&r|128)}return t},J={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:"function"==typeof atob,encodeByteArray(e,t){if(!Array.isArray(e))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=t?this.byteToCharMapWebSafe_:this.byteToCharMap_,s=[];for(let r=0;r<e.length;r+=3){const t=e[r],i=r+1<e.length,o=i?e[r+1]:0,a=r+2<e.length,l=a?e[r+2]:0,c=t>>2,h=(3&t)<<4|o>>4;let u=(15&o)<<2|l>>6,d=63&l;a||(d=64,i||(u=64)),s.push(n[c],n[h],n[u],n[d])}return s.join("")},encodeString(e,t){return this.HAS_NATIVE_SUPPORT&&!t?btoa(e):this.encodeByteArray(Y(e),t)},decodeString(e,t){return this.HAS_NATIVE_SUPPORT&&!t?atob(e):function(e){const t=[];let n=0,s=0;for(;n<e.length;){const r=e[n++];if(r<128)t[s++]=String.fromCharCode(r);else if(r>191&&r<224){const i=e[n++];t[s++]=String.fromCharCode((31&r)<<6|63&i)}else if(r>239&&r<365){const i=((7&r)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++])-65536;t[s++]=String.fromCharCode(55296+(i>>10)),t[s++]=String.fromCharCode(56320+(1023&i))}else{const i=e[n++],o=e[n++];t[s++]=String.fromCharCode((15&r)<<12|(63&i)<<6|63&o)}}return t.join("")}(this.decodeStringToByteArray(e,t))},decodeStringToByteArray(e,t){this.init_();const n=t?this.charToByteMapWebSafe_:this.charToByteMap_,s=[];for(let r=0;r<e.length;){const t=n[e.charAt(r++)],i=r<e.length?n[e.charAt(r)]:0;++r;const o=r<e.length?n[e.charAt(r)]:64;++r;const a=r<e.length?n[e.charAt(r)]:64;if(++r,null==t||null==i||null==o||null==a)throw new Q;const l=t<<2|i>>4;if(s.push(l),64!==o){const e=i<<4&240|o>>2;if(s.push(e),64!==a){const e=o<<6&192|a;s.push(e)}}}return s},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let e=0;e<this.ENCODED_VALS.length;e++)this.byteToCharMap_[e]=this.ENCODED_VALS.charAt(e),this.charToByteMap_[this.byteToCharMap_[e]]=e,this.byteToCharMapWebSafe_[e]=this.ENCODED_VALS_WEBSAFE.charAt(e),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]]=e,e>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)]=e,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)]=e)}}};class Q extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const X=function(e){const t=Y(e);return J.encodeByteArray(t,!0)},Z=function(e){return X(e).replace(/\./g,"")},ee=function(e){try{return J.decodeString(e,!0)}catch(t){console.error("base64Decode failed: ",t)}return null};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function te(e){return ne(void 0,e)}function ne(e,t){if(!(t instanceof Object))return t;switch(t.constructor){case Date:return new Date(t.getTime());case Object:void 0===e&&(e={});break;case Array:e=[];break;default:return t}for(const n in t)t.hasOwnProperty(n)&&se(n)&&(e[n]=ne(e[n],t[n]));return e}function se(e){return"__proto__"!==e}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const re=()=>function(){if("undefined"!=typeof self)return self;if("undefined"!=typeof window)return window;if("undefined"!=typeof global)return global;throw new Error("Unable to locate global object.")}().__FIREBASE_DEFAULTS__,ie=()=>{try{return re()||(()=>{if("undefined"==typeof process||void 0===process.env)return;const e={}.__FIREBASE_DEFAULTS__;return e?JSON.parse(e):void 0})()||(()=>{if("undefined"==typeof document)return;let e;try{e=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch(n){return}const t=e&&ee(e[1]);return t&&JSON.parse(t)})()}catch(e){return void console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`)}},oe=e=>{var t,n;return null==(n=null==(t=ie())?void 0:t.emulatorHosts)?void 0:n[e]},ae=e=>{const t=oe(e);if(!t)return;const n=t.lastIndexOf(":");if(n<=0||n+1===t.length)throw new Error(`Invalid host ${t} with no separate hostname and port!`);const s=parseInt(t.substring(n+1),10);return"["===t[0]?[t.substring(1,n-1),s]:[t.substring(0,n),s]},le=()=>{var e;return null==(e=ie())?void 0:e.config},ce=e=>{var t;return null==(t=ie())?void 0:t[`_${e}`]};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class he{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,n)=>{t?this.reject(t):this.resolve(n),"function"==typeof e&&(this.promise.catch(()=>{}),1===e.length?e(t):e(t,n))}}}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function ue(){return"undefined"!=typeof navigator&&"string"==typeof navigator.userAgent?navigator.userAgent:""}function de(){return"undefined"!=typeof window&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(ue())}function pe(){return"object"==typeof navigator&&"ReactNative"===navigator.product}function ge(){return!0===B}class fe extends Error{constructor(e,t,n){super(t),this.code=e,this.customData=n,this.name="FirebaseError",Object.setPrototypeOf(this,fe.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,me.prototype.create)}}class me{constructor(e,t,n){this.service=e,this.serviceName=t,this.errors=n}create(e,...t){const n=t[0]||{},s=`${this.service}/${e}`,r=this.errors[e],i=r?function(e,t){return e.replace(_e,(e,n)=>{const s=t[n];return null!=s?String(s):`<${n}?>`})}(r,n):"Error",o=`${this.serviceName}: ${i} (${s}).`;return new fe(s,o,n)}}const _e=/\{\$([^}]+)}/g;
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ye(e){return JSON.parse(e)}function ve(e){return JSON.stringify(e)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const be=function(e){let t={},n={},s={},r="";try{const i=e.split(".");t=ye(ee(i[0])||""),n=ye(ee(i[1])||""),r=i[2],s=n.d||{},delete n.d}catch(i){}return{header:t,claims:n,data:s,signature:r}};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function we(e,t){return Object.prototype.hasOwnProperty.call(e,t)}function xe(e,t){return Object.prototype.hasOwnProperty.call(e,t)?e[t]:void 0}function ke(e){for(const t in e)if(Object.prototype.hasOwnProperty.call(e,t))return!1;return!0}function Ce(e,t,n){const s={};for(const r in e)Object.prototype.hasOwnProperty.call(e,r)&&(s[r]=t.call(n,e[r],r,e));return s}function Ie(e,t){if(e===t)return!0;const n=Object.keys(e),s=Object.keys(t);for(const r of n){if(!s.includes(r))return!1;const n=e[r],i=t[r];if(Te(n)&&Te(i)){if(!Ie(n,i))return!1}else if(n!==i)return!1}for(const r of s)if(!n.includes(r))return!1;return!0}function Te(e){return null!==e&&"object"==typeof e}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ee(e){const t=[];for(const[n,s]of Object.entries(e))Array.isArray(s)?s.forEach(e=>{t.push(encodeURIComponent(n)+"="+encodeURIComponent(e))}):t.push(encodeURIComponent(n)+"="+encodeURIComponent(s));return t.length?"&"+t.join("&"):""}function Ne(e){const t={};return e.replace(/^\?/,"").split("&").forEach(e=>{if(e){const[n,s]=e.split("=");t[decodeURIComponent(n)]=decodeURIComponent(s)}}),t}function Se(e){const t=e.indexOf("?");if(!t)return"";const n=e.indexOf("#",t);return e.substring(t,n>0?n:void 0)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pe{constructor(){this.chain_=[],this.buf_=[],this.W_=[],this.pad_=[],this.inbuf_=0,this.total_=0,this.blockSize=64,this.pad_[0]=128;for(let e=1;e<this.blockSize;++e)this.pad_[e]=0;this.reset()}reset(){this.chain_[0]=1732584193,this.chain_[1]=4023233417,this.chain_[2]=2562383102,this.chain_[3]=271733878,this.chain_[4]=3285377520,this.inbuf_=0,this.total_=0}compress_(e,t){t||(t=0);const n=this.W_;if("string"==typeof e)for(let h=0;h<16;h++)n[h]=e.charCodeAt(t)<<24|e.charCodeAt(t+1)<<16|e.charCodeAt(t+2)<<8|e.charCodeAt(t+3),t+=4;else for(let h=0;h<16;h++)n[h]=e[t]<<24|e[t+1]<<16|e[t+2]<<8|e[t+3],t+=4;for(let h=16;h<80;h++){const e=n[h-3]^n[h-8]^n[h-14]^n[h-16];n[h]=4294967295&(e<<1|e>>>31)}let s,r,i=this.chain_[0],o=this.chain_[1],a=this.chain_[2],l=this.chain_[3],c=this.chain_[4];for(let h=0;h<80;h++){h<40?h<20?(s=l^o&(a^l),r=1518500249):(s=o^a^l,r=1859775393):h<60?(s=o&a|l&(o|a),r=2400959708):(s=o^a^l,r=3395469782);const e=(i<<5|i>>>27)+s+c+r+n[h]&4294967295;c=l,l=a,a=4294967295&(o<<30|o>>>2),o=i,i=e}this.chain_[0]=this.chain_[0]+i&4294967295,this.chain_[1]=this.chain_[1]+o&4294967295,this.chain_[2]=this.chain_[2]+a&4294967295,this.chain_[3]=this.chain_[3]+l&4294967295,this.chain_[4]=this.chain_[4]+c&4294967295}update(e,t){if(null==e)return;void 0===t&&(t=e.length);const n=t-this.blockSize;let s=0;const r=this.buf_;let i=this.inbuf_;for(;s<t;){if(0===i)for(;s<=n;)this.compress_(e,s),s+=this.blockSize;if("string"==typeof e){for(;s<t;)if(r[i]=e.charCodeAt(s),++i,++s,i===this.blockSize){this.compress_(r),i=0;break}}else for(;s<t;)if(r[i]=e[s],++i,++s,i===this.blockSize){this.compress_(r),i=0;break}}this.inbuf_=i,this.total_+=t}digest(){const e=[];let t=8*this.total_;this.inbuf_<56?this.update(this.pad_,56-this.inbuf_):this.update(this.pad_,this.blockSize-(this.inbuf_-56));for(let s=this.blockSize-1;s>=56;s--)this.buf_[s]=255&t,t/=256;this.compress_(this.buf_);let n=0;for(let s=0;s<5;s++)for(let t=24;t>=0;t-=8)e[n]=this.chain_[s]>>t&255,++n;return e}}class Re{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(e=>{this.error(e)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,n){let s;if(void 0===e&&void 0===t&&void 0===n)throw new Error("Missing Observer.");s=function(e,t){if("object"!=typeof e||null===e)return!1;for(const n of t)if(n in e&&"function"==typeof e[n])return!0;return!1}(e,["next","error","complete"])?e:{next:e,error:t,complete:n},void 0===s.next&&(s.next=Ae),void 0===s.error&&(s.error=Ae),void 0===s.complete&&(s.complete=Ae);const r=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?s.error(this.finalError):s.complete()}catch(e){}}),this.observers.push(s),r}unsubscribeOne(e){void 0!==this.observers&&void 0!==this.observers[e]&&(delete this.observers[e],this.observerCount-=1,0===this.observerCount&&void 0!==this.onNoObservers&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(void 0!==this.observers&&void 0!==this.observers[e])try{t(this.observers[e])}catch(n){"undefined"!=typeof console&&console.error&&console.error(n)}})}close(e){this.finalized||(this.finalized=!0,void 0!==e&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function Ae(){}function Oe(e,t){return`${e} failed: ${t} argument `}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const De=function(e){let t=0;for(let n=0;n<e.length;n++){const s=e.charCodeAt(n);s<128?t++:s<2048?t+=2:s>=55296&&s<=56319?(t+=4,n++):t+=3}return t};
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function Le(e){return e&&e._delegate?e._delegate:e}
/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function je(e){try{return(e.startsWith("http://")||e.startsWith("https://")?new URL(e).hostname:e).endsWith(".cloudworkstations.dev")}catch{return!1}}async function Me(e){return(await fetch(e,{credentials:"include"})).ok}class Fe{constructor(e,t,n){this.name=e,this.instanceFactory=t,this.type=n,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ue="[DEFAULT]";
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qe{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const e=new he;if(this.instancesDeferred.set(t,e),this.isInitialized(t)||this.shouldAutoInitialize())try{const n=this.getOrInitializeService({instanceIdentifier:t});n&&e.resolve(n)}catch(n){}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(null==e?void 0:e.identifier),n=(null==e?void 0:e.optional)??!1;if(!this.isInitialized(t)&&!this.shouldAutoInitialize()){if(n)return null;throw Error(`Service ${this.name} is not available`)}try{return this.getOrInitializeService({instanceIdentifier:t})}catch(s){if(n)return null;throw s}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,this.shouldAutoInitialize()){if(function(e){return"EAGER"===e.instantiationMode}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e))try{this.getOrInitializeService({instanceIdentifier:Ue})}catch(t){}for(const[e,n]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(e);try{const e=this.getOrInitializeService({instanceIdentifier:s});n.resolve(e)}catch(t){}}}}clearInstance(e=Ue){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(e=>"INTERNAL"in e).map(e=>e.INTERNAL.delete()),...e.filter(e=>"_delete"in e).map(e=>e._delete())])}isComponentSet(){return null!=this.component}isInitialized(e=Ue){return this.instances.has(e)}getOptions(e=Ue){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,n=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(n))throw Error(`${this.name}(${n}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:n,options:t});for(const[r,i]of this.instancesDeferred.entries()){n===this.normalizeInstanceIdentifier(r)&&i.resolve(s)}return s}onInit(e,t){const n=this.normalizeInstanceIdentifier(t),s=this.onInitCallbacks.get(n)??new Set;s.add(e),this.onInitCallbacks.set(n,s);const r=this.instances.get(n);return r&&e(r,n),()=>{s.delete(e)}}invokeOnInitCallbacks(e,t){const n=this.onInitCallbacks.get(t);if(n)for(const s of n)try{s(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let n=this.instances.get(e);if(!n&&this.component&&(n=this.component.instanceFactory(this.container,{instanceIdentifier:(s=e,s===Ue?void 0:s),options:t}),this.instances.set(e,n),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(n,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,n)}catch{}var s;return n||null}normalizeInstanceIdentifier(e=Ue){return this.component?this.component.multipleInstances?e:Ue:e}shouldAutoInitialize(){return!!this.component&&"EXPLICIT"!==this.component.instantiationMode}}class We{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new qe(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Ve,He;(He=Ve||(Ve={}))[He.DEBUG=0]="DEBUG",He[He.VERBOSE=1]="VERBOSE",He[He.INFO=2]="INFO",He[He.WARN=3]="WARN",He[He.ERROR=4]="ERROR",He[He.SILENT=5]="SILENT";const ze={debug:Ve.DEBUG,verbose:Ve.VERBOSE,info:Ve.INFO,warn:Ve.WARN,error:Ve.ERROR,silent:Ve.SILENT},Be=Ve.INFO,$e={[Ve.DEBUG]:"log",[Ve.VERBOSE]:"log",[Ve.INFO]:"info",[Ve.WARN]:"warn",[Ve.ERROR]:"error"},Ke=(e,t,...n)=>{if(t<e.logLevel)return;const s=(new Date).toISOString(),r=$e[t];if(!r)throw new Error(`Attempted to log a message with an invalid logType (value: ${t})`);console[r](`[${s}]  ${e.name}:`,...n)};class Ge{constructor(e){this.name=e,this._logLevel=Be,this._logHandler=Ke,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in Ve))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel="string"==typeof e?ze[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if("function"!=typeof e)throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,Ve.DEBUG,...e),this._logHandler(this,Ve.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,Ve.VERBOSE,...e),this._logHandler(this,Ve.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,Ve.INFO,...e),this._logHandler(this,Ve.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,Ve.WARN,...e),this._logHandler(this,Ve.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,Ve.ERROR,...e),this._logHandler(this,Ve.ERROR,...e)}}let Ye,Je;const Qe=new WeakMap,Xe=new WeakMap,Ze=new WeakMap,et=new WeakMap,tt=new WeakMap;let nt={get(e,t,n){if(e instanceof IDBTransaction){if("done"===t)return Xe.get(e);if("objectStoreNames"===t)return e.objectStoreNames||Ze.get(e);if("store"===t)return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return it(e[t])},set:(e,t,n)=>(e[t]=n,!0),has:(e,t)=>e instanceof IDBTransaction&&("done"===t||"store"===t)||t in e};function st(e){return e!==IDBDatabase.prototype.transaction||"objectStoreNames"in IDBTransaction.prototype?(Je||(Je=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])).includes(e)?function(...t){return e.apply(ot(this),t),it(Qe.get(this))}:function(...t){return it(e.apply(ot(this),t))}:function(t,...n){const s=e.call(ot(this),t,...n);return Ze.set(s,t.sort?t.sort():[t]),it(s)}}function rt(e){return"function"==typeof e?st(e):(e instanceof IDBTransaction&&function(e){if(Xe.has(e))return;const t=new Promise((t,n)=>{const s=()=>{e.removeEventListener("complete",r),e.removeEventListener("error",i),e.removeEventListener("abort",i)},r=()=>{t(),s()},i=()=>{n(e.error||new DOMException("AbortError","AbortError")),s()};e.addEventListener("complete",r),e.addEventListener("error",i),e.addEventListener("abort",i)});Xe.set(e,t)}(e),t=e,(Ye||(Ye=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])).some(e=>t instanceof e)?new Proxy(e,nt):e);var t}function it(e){if(e instanceof IDBRequest)return function(e){const t=new Promise((t,n)=>{const s=()=>{e.removeEventListener("success",r),e.removeEventListener("error",i)},r=()=>{t(it(e.result)),s()},i=()=>{n(e.error),s()};e.addEventListener("success",r),e.addEventListener("error",i)});return t.then(t=>{t instanceof IDBCursor&&Qe.set(t,e)}).catch(()=>{}),tt.set(t,e),t}(e);if(et.has(e))return et.get(e);const t=rt(e);return t!==e&&(et.set(e,t),tt.set(t,e)),t}const ot=e=>tt.get(e);const at=["get","getKey","getAll","getAllKeys","count"],lt=["put","add","delete","clear"],ct=new Map;function ht(e,t){if(!(e instanceof IDBDatabase)||t in e||"string"!=typeof t)return;if(ct.get(t))return ct.get(t);const n=t.replace(/FromIndex$/,""),s=t!==n,r=lt.includes(n);if(!(n in(s?IDBIndex:IDBObjectStore).prototype)||!r&&!at.includes(n))return;const i=async function(e,...t){const i=this.transaction(e,r?"readwrite":"readonly");let o=i.store;return s&&(o=o.index(t.shift())),(await Promise.all([o[n](...t),r&&i.done]))[0]};return ct.set(t,i),i}nt=(e=>({...e,get:(t,n,s)=>ht(t,n)||e.get(t,n,s),has:(t,n)=>!!ht(t,n)||e.has(t,n)}))(nt);
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class ut{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(e=>{if(function(e){const t=e.getComponent();return"VERSION"===(null==t?void 0:t.type)}(e)){const t=e.getImmediate();return`${t.library}/${t.version}`}return null}).filter(e=>e).join(" ")}}const dt="@firebase/app",pt="0.14.10",gt=new Ge("@firebase/app"),ft="@firebase/app-compat",mt="@firebase/analytics-compat",_t="@firebase/analytics",yt="@firebase/app-check-compat",vt="@firebase/app-check",bt="@firebase/auth",wt="@firebase/auth-compat",xt="@firebase/database",kt="@firebase/data-connect",Ct="@firebase/database-compat",It="@firebase/functions",Tt="@firebase/functions-compat",Et="@firebase/installations",Nt="@firebase/installations-compat",St="@firebase/messaging",Pt="@firebase/messaging-compat",Rt="@firebase/performance",At="@firebase/performance-compat",Ot="@firebase/remote-config",Dt="@firebase/remote-config-compat",Lt="@firebase/storage",jt="@firebase/storage-compat",Mt="@firebase/firestore",Ft="@firebase/ai",Ut="@firebase/firestore-compat",qt="firebase",Wt="[DEFAULT]",Vt={[dt]:"fire-core",[ft]:"fire-core-compat",[_t]:"fire-analytics",[mt]:"fire-analytics-compat",[vt]:"fire-app-check",[yt]:"fire-app-check-compat",[bt]:"fire-auth",[wt]:"fire-auth-compat",[xt]:"fire-rtdb",[kt]:"fire-data-connect",[Ct]:"fire-rtdb-compat",[It]:"fire-fn",[Tt]:"fire-fn-compat",[Et]:"fire-iid",[Nt]:"fire-iid-compat",[St]:"fire-fcm",[Pt]:"fire-fcm-compat",[Rt]:"fire-perf",[At]:"fire-perf-compat",[Ot]:"fire-rc",[Dt]:"fire-rc-compat",[Lt]:"fire-gcs",[jt]:"fire-gcs-compat",[Mt]:"fire-fst",[Ut]:"fire-fst-compat",[Ft]:"fire-vertex","fire-js":"fire-js",[qt]:"fire-js-all"},Ht=new Map,zt=new Map,Bt=new Map;function $t(e,t){try{e.container.addComponent(t)}catch(n){gt.debug(`Component ${t.name} failed to register with FirebaseApp ${e.name}`,n)}}function Kt(e){const t=e.name;if(Bt.has(t))return gt.debug(`There were multiple attempts to register component ${t}.`),!1;Bt.set(t,e);for(const n of Ht.values())$t(n,e);for(const n of zt.values())$t(n,e);return!0}function Gt(e,t){const n=e.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),e.container.getProvider(t)}function Yt(e){return null!=e&&void 0!==e.settings}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Jt=new me("app","Firebase",{"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."});
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Qt{constructor(e,t,n){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=n,this.container.addComponent(new Fe("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw Jt.create("app-deleted",{appName:this._name})}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xt="12.11.0";function Zt(e,t={}){let n=e;if("object"!=typeof t){t={name:t}}const s={name:Wt,automaticDataCollectionEnabled:!0,...t},r=s.name;if("string"!=typeof r||!r)throw Jt.create("bad-app-name",{appName:String(r)});if(n||(n=le()),!n)throw Jt.create("no-options");const i=Ht.get(r);if(i){if(Ie(n,i.options)&&Ie(s,i.config))return i;throw Jt.create("duplicate-app",{appName:r})}const o=new We(r);for(const l of Bt.values())o.addComponent(l);const a=new Qt(n,s,o);return Ht.set(r,a),a}function en(e=Wt){const t=Ht.get(e);if(!t&&e===Wt&&le())return Zt();if(!t)throw Jt.create("no-app",{appName:e});return t}function tn(e,t,n){let s=Vt[e]??e;n&&(s+=`-${n}`);const r=s.match(/\s|\//),i=t.match(/\s|\//);if(r||i){const e=[`Unable to register library "${s}" with version "${t}":`];return r&&e.push(`library name "${s}" contains illegal characters (whitespace or "/")`),r&&i&&e.push("and"),i&&e.push(`version name "${t}" contains illegal characters (whitespace or "/")`),void gt.warn(e.join(" "))}Kt(new Fe(`${s}-version`,()=>({library:s,version:t}),"VERSION"))}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nn="firebase-heartbeat-store";let sn=null;function rn(){return sn||(sn=function(e,t,{blocked:n,upgrade:s,blocking:r,terminated:i}={}){const o=indexedDB.open(e,t),a=it(o);return s&&o.addEventListener("upgradeneeded",e=>{s(it(o.result),e.oldVersion,e.newVersion,it(o.transaction),e)}),n&&o.addEventListener("blocked",e=>n(e.oldVersion,e.newVersion,e)),a.then(e=>{i&&e.addEventListener("close",()=>i()),r&&e.addEventListener("versionchange",e=>r(e.oldVersion,e.newVersion,e))}).catch(()=>{}),a}("firebase-heartbeat-database",1,{upgrade:(e,t)=>{if(0===t)try{e.createObjectStore(nn)}catch(n){console.warn(n)}}}).catch(e=>{throw Jt.create("idb-open",{originalErrorMessage:e.message})})),sn}async function on(e,t){try{const n=(await rn()).transaction(nn,"readwrite"),s=n.objectStore(nn);await s.put(t,an(e)),await n.done}catch(n){if(n instanceof fe)gt.warn(n.message);else{const e=Jt.create("idb-set",{originalErrorMessage:null==n?void 0:n.message});gt.warn(e.message)}}}function an(e){return`${e.name}!${e.options.appId}`}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ln{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new hn(t),this._heartbeatsCachePromise=this._storage.read().then(e=>(this._heartbeatsCache=e,e))}async triggerHeartbeat(){var e,t;try{const n=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=cn();if(null==(null==(e=this._heartbeatsCache)?void 0:e.heartbeats)&&(this._heartbeatsCache=await this._heartbeatsCachePromise,null==(null==(t=this._heartbeatsCache)?void 0:t.heartbeats)))return;if(this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(e=>e.date===s))return;if(this._heartbeatsCache.heartbeats.push({date:s,agent:n}),this._heartbeatsCache.heartbeats.length>30){const e=function(e){if(0===e.length)return-1;let t=0,n=e[0].date;for(let s=1;s<e.length;s++)e[s].date<n&&(n=e[s].date,t=s);return t}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(e,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(n){gt.warn(n)}}async getHeartbeatsHeader(){var e;try{if(null===this._heartbeatsCache&&await this._heartbeatsCachePromise,null==(null==(e=this._heartbeatsCache)?void 0:e.heartbeats)||0===this._heartbeatsCache.heartbeats.length)return"";const t=cn(),{heartbeatsToSend:n,unsentEntries:s}=function(e,t=1024){const n=[];let s=e.slice();for(const r of e){const e=n.find(e=>e.agent===r.agent);if(e){if(e.dates.push(r.date),un(n)>t){e.dates.pop();break}}else if(n.push({agent:r.agent,dates:[r.date]}),un(n)>t){n.pop();break}s=s.slice(1)}return{heartbeatsToSend:n,unsentEntries:s}}(this._heartbeatsCache.heartbeats),r=Z(JSON.stringify({version:2,heartbeats:n}));return this._heartbeatsCache.lastSentHeartbeatDate=t,s.length>0?(this._heartbeatsCache.heartbeats=s,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),r}catch(t){return gt.warn(t),""}}}function cn(){return(new Date).toISOString().substring(0,10)}class hn{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return!!function(){try{return"object"==typeof indexedDB}catch(e){return!1}}()&&new Promise((e,t)=>{try{let n=!0;const s="validate-browser-context-for-indexeddb-analytics-module",r=self.indexedDB.open(s);r.onsuccess=()=>{r.result.close(),n||self.indexedDB.deleteDatabase(s),e(!0)},r.onupgradeneeded=()=>{n=!1},r.onerror=()=>{var e;t((null==(e=r.error)?void 0:e.message)||"")}}catch(n){t(n)}}).then(()=>!0).catch(()=>!1)}async read(){if(await this._canUseIndexedDBPromise){const e=await async function(e){try{const t=(await rn()).transaction(nn),n=await t.objectStore(nn).get(an(e));return await t.done,n}catch(t){if(t instanceof fe)gt.warn(t.message);else{const e=Jt.create("idb-get",{originalErrorMessage:null==t?void 0:t.message});gt.warn(e.message)}}}(this.app);return(null==e?void 0:e.heartbeats)?e:{heartbeats:[]}}return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const t=await this.read();return on(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??t.lastSentHeartbeatDate,heartbeats:e.heartbeats})}}async add(e){if(await this._canUseIndexedDBPromise){const t=await this.read();return on(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??t.lastSentHeartbeatDate,heartbeats:[...t.heartbeats,...e.heartbeats]})}}}function un(e){return Z(JSON.stringify({version:2,heartbeats:e})).length}var dn;dn="",Kt(new Fe("platform-logger",e=>new ut(e),"PRIVATE")),Kt(new Fe("heartbeat",e=>new ln(e),"PRIVATE")),tn(dt,pt,dn),tn(dt,pt,"esm2020"),tn("fire-js","");function pn(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
tn("firebase","12.11.0","app");const gn=pn,fn=new me("auth","Firebase",{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}),mn=new Ge("@firebase/auth");function _n(e,...t){mn.logLevel<=Ve.ERROR&&mn.error(`Auth (${Xt}): ${e}`,...t)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yn(e,...t){throw xn(e,...t)}function vn(e,...t){return xn(e,...t)}function bn(e,t,n){const s={...gn(),[t]:n};return new me("auth","Firebase",s).create(t,{appName:e.name})}function wn(e){return bn(e,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function xn(e,...t){if("string"!=typeof e){const n=t[0],s=[...t.slice(1)];return s[0]&&(s[0].appName=e.name),e._errorFactory.create(n,...s)}return fn.create(e,...t)}function kn(e,t,...n){if(!e)throw xn(t,...n)}function Cn(e){const t="INTERNAL ASSERTION FAILED: "+e;throw _n(t),new Error(t)}function In(e,t){e||Cn(t)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Tn(){var e;return"undefined"!=typeof self&&(null==(e=self.location)?void 0:e.href)||""}function En(){var e;return"undefined"!=typeof self&&(null==(e=self.location)?void 0:e.protocol)||null}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Nn(){return"undefined"==typeof navigator||!navigator||!("onLine"in navigator)||"boolean"!=typeof navigator.onLine||"http:"!==En()&&"https:"!==En()&&!function(){const e="object"==typeof chrome?chrome.runtime:"object"==typeof browser?browser.runtime:void 0;return"object"==typeof e&&void 0!==e.id}()&&!("connection"in navigator)||navigator.onLine}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Sn{constructor(e,t){this.shortDelay=e,this.longDelay=t,In(t>e,"Short delay should be less than long delay!"),this.isMobile=de()||pe()}get(){return Nn()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pn(e,t){In(e.emulator,"Emulator should always be set here");const{url:n}=e.emulator;return t?`${n}${t.startsWith("/")?t.slice(1):t}`:n}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rn{static initialize(e,t,n){this.fetchImpl=e,t&&(this.headersImpl=t),n&&(this.responseImpl=n)}static fetch(){return this.fetchImpl?this.fetchImpl:"undefined"!=typeof self&&"fetch"in self?self.fetch:"undefined"!=typeof globalThis&&globalThis.fetch?globalThis.fetch:"undefined"!=typeof fetch?fetch:void Cn("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){return this.headersImpl?this.headersImpl:"undefined"!=typeof self&&"Headers"in self?self.Headers:"undefined"!=typeof globalThis&&globalThis.Headers?globalThis.Headers:"undefined"!=typeof Headers?Headers:void Cn("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){return this.responseImpl?this.responseImpl:"undefined"!=typeof self&&"Response"in self?self.Response:"undefined"!=typeof globalThis&&globalThis.Response?globalThis.Response:"undefined"!=typeof Response?Response:void Cn("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const An={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"},On=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],Dn=new Sn(3e4,6e4);
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ln(e,t){return e.tenantId&&!t.tenantId?{...t,tenantId:e.tenantId}:t}async function jn(e,t,n,s,r={}){return Mn(e,r,async()=>{let r={},i={};s&&("GET"===t?i=s:r={body:JSON.stringify(s)});const o=Ee({key:e.config.apiKey,...i}).slice(1),a=await e._getAdditionalHeaders();a["Content-Type"]="application/json",e.languageCode&&(a["X-Firebase-Locale"]=e.languageCode);const l={method:t,headers:a,...r};return"undefined"!=typeof navigator&&"Cloudflare-Workers"===navigator.userAgent||(l.referrerPolicy="no-referrer"),e.emulatorConfig&&je(e.emulatorConfig.host)&&(l.credentials="include"),Rn.fetch()(await Un(e,e.config.apiHost,n,o),l)})}async function Mn(e,t,n){e._canInitEmulator=!1;const s={...An,...t};try{const t=new Wn(e),r=await Promise.race([n(),t.promise]);t.clearNetworkTimeout();const i=await r.json();if("needConfirmation"in i)throw Vn(e,"account-exists-with-different-credential",i);if(r.ok&&!("errorMessage"in i))return i;{const t=r.ok?i.errorMessage:i.error.message,[n,o]=t.split(" : ");if("FEDERATED_USER_ID_ALREADY_LINKED"===n)throw Vn(e,"credential-already-in-use",i);if("EMAIL_EXISTS"===n)throw Vn(e,"email-already-in-use",i);if("USER_DISABLED"===n)throw Vn(e,"user-disabled",i);const a=s[n]||n.toLowerCase().replace(/[_\s]+/g,"-");if(o)throw bn(e,a,o);yn(e,a)}}catch(r){if(r instanceof fe)throw r;yn(e,"network-request-failed",{message:String(r)})}}async function Fn(e,t,n,s,r={}){const i=await jn(e,t,n,s,r);return"mfaPendingCredential"in i&&yn(e,"multi-factor-auth-required",{_serverResponse:i}),i}async function Un(e,t,n,s){const r=`${t}${n}?${s}`,i=e,o=i.config.emulator?Pn(e.config,r):`${e.config.apiScheme}://${r}`;if(On.includes(n)&&(await i._persistenceManagerAvailable,"COOKIE"===i._getPersistenceType())){return i._getPersistence()._getFinalTarget(o).toString()}return o}function qn(e){switch(e){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class Wn{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((e,t)=>{this.timer=setTimeout(()=>t(vn(this.auth,"network-request-failed")),Dn.get())})}}function Vn(e,t,n){const s={appName:e.name};n.email&&(s.email=n.email),n.phoneNumber&&(s.phoneNumber=n.phoneNumber);const r=vn(e,t,s);return r.customData._tokenResponse=n,r}function Hn(e){return void 0!==e&&void 0!==e.enterprise}class zn{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],void 0===e.recaptchaKey)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||0===this.recaptchaEnforcementState.length)return null;for(const t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return qn(t.enforcementState);return null}isProviderEnabled(e){return"ENFORCE"===this.getProviderEnforcementState(e)||"AUDIT"===this.getProviderEnforcementState(e)}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}async function Bn(e,t){return jn(e,"POST","/v1/accounts:lookup",t)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $n(e){if(e)try{const t=new Date(Number(e));if(!isNaN(t.getTime()))return t.toUTCString()}catch(t){}}function Kn(e){return 1e3*Number(e)}function Gn(e){const[t,n,s]=e.split(".");if(void 0===t||void 0===n||void 0===s)return _n("JWT malformed, contained fewer than 3 sections"),null;try{const e=ee(n);return e?JSON.parse(e):(_n("Failed to decode base64 JWT payload"),null)}catch(r){return _n("Caught error parsing JWT payload as JSON",null==r?void 0:r.toString()),null}}function Yn(e){const t=Gn(e);return kn(t,"internal-error"),kn(void 0!==t.exp,"internal-error"),kn(void 0!==t.iat,"internal-error"),Number(t.exp)-Number(t.iat)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Jn(e,t,n=!1){if(n)return t;try{return await t}catch(s){throw s instanceof fe&&function({code:e}){return"auth/user-disabled"===e||"auth/user-token-expired"===e}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(s)&&e.auth.currentUser===e&&await e.auth.signOut(),s}}class Qn{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,null!==this.timerId&&clearTimeout(this.timerId))}getInterval(e){if(e){const e=this.errorBackoff;return this.errorBackoff=Math.min(2*this.errorBackoff,96e4),e}{this.errorBackoff=3e4;const e=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,e)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){return void("auth/network-request-failed"===(null==e?void 0:e.code)&&this.schedule(!0))}this.schedule()}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xn{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=$n(this.lastLoginAt),this.creationTime=$n(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Zn(e){var t;const n=e.auth,s=await e.getIdToken(),r=await Jn(e,Bn(n,{idToken:s}));kn(null==r?void 0:r.users.length,n,"internal-error");const i=r.users[0];e._notifyReloadListener(i);const o=(null==(t=i.providerUserInfo)?void 0:t.length)?es(i.providerUserInfo):[],a=(l=e.providerData,c=o,[...l.filter(e=>!c.some(t=>t.providerId===e.providerId)),...c]);var l,c;const h=e.isAnonymous,u=!(e.email&&i.passwordHash||(null==a?void 0:a.length)),d=!!h&&u,p={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:a,metadata:new Xn(i.createdAt,i.lastLoginAt),isAnonymous:d};Object.assign(e,p)}function es(e){return e.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class ts{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){kn(e.idToken,"internal-error"),kn(void 0!==e.idToken,"internal-error"),kn(void 0!==e.refreshToken,"internal-error");const t="expiresIn"in e&&void 0!==e.expiresIn?Number(e.expiresIn):Yn(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){kn(0!==e.length,"internal-error");const t=Yn(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return t||!this.accessToken||this.isExpired?(kn(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null):this.accessToken}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:n,refreshToken:s,expiresIn:r}=await async function(e,t){const n=await Mn(e,{},async()=>{const n=Ee({grant_type:"refresh_token",refresh_token:t}).slice(1),{tokenApiHost:s,apiKey:r}=e.config,i=await Un(e,s,"/v1/token",`key=${r}`),o=await e._getAdditionalHeaders();o["Content-Type"]="application/x-www-form-urlencoded";const a={method:"POST",headers:o,body:n};return e.emulatorConfig&&je(e.emulatorConfig.host)&&(a.credentials="include"),Rn.fetch()(i,a)});return{accessToken:n.access_token,expiresIn:n.expires_in,refreshToken:n.refresh_token}}(e,t);this.updateTokensAndExpiration(n,s,Number(r))}updateTokensAndExpiration(e,t,n){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+1e3*n}static fromJSON(e,t){const{refreshToken:n,accessToken:s,expirationTime:r}=t,i=new ts;return n&&(kn("string"==typeof n,"internal-error",{appName:e}),i.refreshToken=n),s&&(kn("string"==typeof s,"internal-error",{appName:e}),i.accessToken=s),r&&(kn("number"==typeof r,"internal-error",{appName:e}),i.expirationTime=r),i}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new ts,this.toJSON())}_performRefresh(){return Cn("not implemented")}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ns(e,t){kn("string"==typeof e||void 0===e,"internal-error",{appName:t})}class ss{constructor({uid:e,auth:t,stsTokenManager:n,...s}){this.providerId="firebase",this.proactiveRefresh=new Qn(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=n,this.accessToken=n.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new Xn(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){const t=await Jn(this,this.stsTokenManager.getToken(this.auth,e));return kn(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return async function(e,t=!1){const n=Le(e),s=await n.getIdToken(t),r=Gn(s);kn(r&&r.exp&&r.auth_time&&r.iat,n.auth,"internal-error");const i="object"==typeof r.firebase?r.firebase:void 0,o=null==i?void 0:i.sign_in_provider;return{claims:r,token:s,authTime:$n(Kn(r.auth_time)),issuedAtTime:$n(Kn(r.iat)),expirationTime:$n(Kn(r.exp)),signInProvider:o||null,signInSecondFactor:(null==i?void 0:i.sign_in_second_factor)||null}}(this,e)}reload(){return async function(e){const t=Le(e);await Zn(t),await t.auth._persistUserIfCurrent(t),t.auth._notifyListenersIfCurrent(t)}(this)}_assign(e){this!==e&&(kn(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(e=>({...e})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new ss({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){kn(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let n=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),n=!0),t&&await Zn(this),await this.auth._persistUserIfCurrent(this),n&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(Yt(this.auth.app))return Promise.reject(wn(this.auth));const e=await this.getIdToken();return await Jn(this,
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
async function(e,t){return jn(e,"POST","/v1/accounts:delete",t)}(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const n=t.displayName??void 0,s=t.email??void 0,r=t.phoneNumber??void 0,i=t.photoURL??void 0,o=t.tenantId??void 0,a=t._redirectEventId??void 0,l=t.createdAt??void 0,c=t.lastLoginAt??void 0,{uid:h,emailVerified:u,isAnonymous:d,providerData:p,stsTokenManager:g}=t;kn(h&&g,e,"internal-error");const f=ts.fromJSON(this.name,g);kn("string"==typeof h,e,"internal-error"),ns(n,e.name),ns(s,e.name),kn("boolean"==typeof u,e,"internal-error"),kn("boolean"==typeof d,e,"internal-error"),ns(r,e.name),ns(i,e.name),ns(o,e.name),ns(a,e.name),ns(l,e.name),ns(c,e.name);const m=new ss({uid:h,auth:e,email:s,emailVerified:u,displayName:n,isAnonymous:d,photoURL:i,phoneNumber:r,tenantId:o,stsTokenManager:f,createdAt:l,lastLoginAt:c});return p&&Array.isArray(p)&&(m.providerData=p.map(e=>({...e}))),a&&(m._redirectEventId=a),m}static async _fromIdTokenResponse(e,t,n=!1){const s=new ts;s.updateFromServerResponse(t);const r=new ss({uid:t.localId,auth:e,stsTokenManager:s,isAnonymous:n});return await Zn(r),r}static async _fromGetAccountInfoResponse(e,t,n){const s=t.users[0];kn(void 0!==s.localId,"internal-error");const r=void 0!==s.providerUserInfo?es(s.providerUserInfo):[],i=!(s.email&&s.passwordHash||(null==r?void 0:r.length)),o=new ts;o.updateFromIdToken(n);const a=new ss({uid:s.localId,auth:e,stsTokenManager:o,isAnonymous:i}),l={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:r,metadata:new Xn(s.createdAt,s.lastLoginAt),isAnonymous:!(s.email&&s.passwordHash||(null==r?void 0:r.length))};return Object.assign(a,l),a}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const rs=new Map;function is(e){In(e instanceof Function,"Expected a class definition");let t=rs.get(e);return t?(In(t instanceof e,"Instance stored in cache mismatched with class"),t):(t=new e,rs.set(e,t),t)}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class os{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return void 0===t?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}os.type="NONE";const as=os;
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ls(e,t,n){return`firebase:${e}:${t}:${n}`}class cs{constructor(e,t,n){this.persistence=e,this.auth=t,this.userKey=n;const{config:s,name:r}=this.auth;this.fullUserKey=ls(this.userKey,s.apiKey,r),this.fullPersistenceKey=ls("persistence",s.apiKey,r),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if("string"==typeof e){const t=await Bn(this.auth,{idToken:e}).catch(()=>{});return t?ss._fromGetAccountInfoResponse(this.auth,t,e):null}return ss._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();return await this.removeCurrentUser(),this.persistence=e,t?this.setCurrentUser(t):void 0}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,n="authUser"){if(!t.length)return new cs(is(as),e,n);const s=(await Promise.all(t.map(async e=>{if(await e._isAvailable())return e}))).filter(e=>e);let r=s[0]||is(as);const i=ls(n,e.config.apiKey,e.name);let o=null;for(const l of t)try{const t=await l._get(i);if(t){let n;if("string"==typeof t){const s=await Bn(e,{idToken:t}).catch(()=>{});if(!s)break;n=await ss._fromGetAccountInfoResponse(e,s,t)}else n=ss._fromJSON(e,t);l!==r&&(o=n),r=l;break}}catch{}const a=s.filter(e=>e._shouldAllowMigration);return r._shouldAllowMigration&&a.length?(r=a[0],o&&await r._set(i,o.toJSON()),await Promise.all(t.map(async e=>{if(e!==r)try{await e._remove(i)}catch{}})),new cs(r,e,n)):new cs(r,e,n)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hs(e){const t=e.toLowerCase();if(t.includes("opera/")||t.includes("opr/")||t.includes("opios/"))return"Opera";if(gs(t))return"IEMobile";if(t.includes("msie")||t.includes("trident/"))return"IE";if(t.includes("edge/"))return"Edge";if(us(t))return"Firefox";if(t.includes("silk/"))return"Silk";if(ms(t))return"Blackberry";if(_s(t))return"Webos";if(ds(t))return"Safari";if((t.includes("chrome/")||ps(t))&&!t.includes("edge/"))return"Chrome";if(fs(t))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,n=e.match(t);if(2===(null==n?void 0:n.length))return n[1]}return"Other"}function us(e=ue()){return/firefox\//i.test(e)}function ds(e=ue()){const t=e.toLowerCase();return t.includes("safari/")&&!t.includes("chrome/")&&!t.includes("crios/")&&!t.includes("android")}function ps(e=ue()){return/crios\//i.test(e)}function gs(e=ue()){return/iemobile/i.test(e)}function fs(e=ue()){return/android/i.test(e)}function ms(e=ue()){return/blackberry/i.test(e)}function _s(e=ue()){return/webos/i.test(e)}function ys(e=ue()){return/iphone|ipad|ipod/i.test(e)||/macintosh/i.test(e)&&/mobile/i.test(e)}function vs(){return function(){const e=ue();return e.indexOf("MSIE ")>=0||e.indexOf("Trident/")>=0}()&&10===document.documentMode}function bs(e=ue()){return ys(e)||fs(e)||_s(e)||ms(e)||/windows phone/i.test(e)||gs(e)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ws(e,t=[]){let n;switch(e){case"Browser":n=hs(ue());break;case"Worker":n=`${hs(ue())}-${e}`;break;default:n=e}const s=t.length?t.join(","):"FirebaseCore-web";return`${n}/JsCore/${Xt}/${s}`}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xs{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const n=t=>new Promise((n,s)=>{try{n(e(t))}catch(r){s(r)}});n.onAbort=t,this.queue.push(n);const s=this.queue.length-1;return()=>{this.queue[s]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const n of this.queue)await n(e),n.onAbort&&t.push(n.onAbort)}catch(n){t.reverse();for(const e of t)try{e()}catch(s){}throw this.auth._errorFactory.create("login-blocked",{originalMessage:null==n?void 0:n.message})}}}
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ks{constructor(e){var t;const n=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=n.minPasswordLength??6,n.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=n.maxPasswordLength),void 0!==n.containsLowercaseCharacter&&(this.customStrengthOptions.containsLowercaseLetter=n.containsLowercaseCharacter),void 0!==n.containsUppercaseCharacter&&(this.customStrengthOptions.containsUppercaseLetter=n.containsUppercaseCharacter),void 0!==n.containsNumericCharacter&&(this.customStrengthOptions.containsNumericCharacter=n.containsNumericCharacter),void 0!==n.containsNonAlphanumericCharacter&&(this.customStrengthOptions.containsNonAlphanumericCharacter=n.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,"ENFORCEMENT_STATE_UNSPECIFIED"===this.enforcementState&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=(null==(t=e.allowedNonAlphanumericCharacters)?void 0:t.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const n=this.customStrengthOptions.minPasswordLength,s=this.customStrengthOptions.maxPasswordLength;n&&(t.meetsMinPasswordLength=e.length>=n),s&&(t.meetsMaxPasswordLength=e.length<=s)}validatePasswordCharacterOptions(e,t){let n;this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);for(let s=0;s<e.length;s++)n=e.charAt(s),this.updatePasswordCharacterOptionsStatuses(t,n>="a"&&n<="z",n>="A"&&n<="Z",n>="0"&&n<="9",this.allowedNonAlphanumericCharacters.includes(n))}updatePasswordCharacterOptionsStatuses(e,t,n,s,r){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=n)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=s)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=r))}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cs{constructor(e,t,n,s){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=n,this.config=s,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Ts(this),this.idTokenSubscription=new Ts(this),this.beforeStateQueue=new xs(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=fn,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=s.sdkClientVersion,this._persistenceManagerAvailable=new Promise(e=>this._resolvePersistenceManagerAvailable=e)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=is(t)),this._initializationPromise=this.queue(async()=>{var n,s,r;if(!this._deleted&&(this.persistenceManager=await cs.create(this,e),null==(n=this._resolvePersistenceManagerAvailable)||n.call(this),!this._deleted)){if(null==(s=this._popupRedirectResolver)?void 0:s._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch(i){}await this.initializeCurrentUser(t),this.lastNotifiedUid=(null==(r=this.currentUser)?void 0:r.uid)||null,this._deleted||(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();return this.currentUser||e?this.currentUser&&e&&this.currentUser.uid===e.uid?(this._currentUser._assign(e),void(await this.currentUser.getIdToken())):void(await this._updateCurrentUser(e,!0)):void 0}async initializeCurrentUserFromIdToken(e){try{const t=await Bn(this,{idToken:e}),n=await ss._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(n)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var t;if(Yt(this.app)){const e=this.app.settings.authIdToken;return e?new Promise(t=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(e).then(t,t))}):this.directlySetCurrentUser(null)}const n=await this.assertedPersistence.getCurrentUser();let s=n,r=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const n=null==(t=this.redirectUser)?void 0:t._redirectEventId,i=null==s?void 0:s._redirectEventId,o=await this.tryRedirectSignIn(e);n&&n!==i||!(null==o?void 0:o.user)||(s=o.user,r=!0)}if(!s)return this.directlySetCurrentUser(null);if(!s._redirectEventId){if(r)try{await this.beforeStateQueue.runMiddleware(s)}catch(i){s=n,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(i))}return s?this.reloadAndSetCurrentUserOrClear(s):this.directlySetCurrentUser(null)}return kn(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===s._redirectEventId?this.directlySetCurrentUser(s):this.reloadAndSetCurrentUserOrClear(s)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch(n){await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await Zn(e)}catch(t){if("auth/network-request-failed"!==(null==t?void 0:t.code))return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=function(){if("undefined"==typeof navigator)return null;const e=navigator;return e.languages&&e.languages[0]||e.language||null}()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(Yt(this.app))return Promise.reject(wn(this));const t=e?Le(e):null;return t&&kn(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&kn(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return Yt(this.app)?Promise.reject(wn(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return Yt(this.app)?Promise.reject(wn(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(is(e))})}_getRecaptchaConfig(){return null==this.tenantId?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return null===this.tenantId?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await async function(e,t={}){return jn(e,"GET","/v2/passwordPolicy",Ln(e,t))}
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(this),t=new ks(e);null===this.tenantId?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new me("auth","Firebase",e())}onAuthStateChanged(e,t,n){return this.registerStateListener(this.authStateSubscription,e,t,n)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,n){return this.registerStateListener(this.idTokenSubscription,e,t,n)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const n=this.onAuthStateChanged(()=>{n(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:await this.currentUser.getIdToken()};null!=this.tenantId&&(t.tenantId=this.tenantId),await async function(e,t){return jn(e,"POST","/v2/accounts:revokeToken",Ln(e,t))}(this,t)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:null==(e=this._currentUser)?void 0:e.toJSON()}}async _setRedirectUser(e,t){const n=await this.getOrInitRedirectPersistenceManager(t);return null===e?n.removeCurrentUser():n.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&is(e)||this._popupRedirectResolver;kn(t,this,"argument-error"),this.redirectPersistenceManager=await cs.create(this,[is(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,n;return this._isInitialized&&await this.queue(async()=>{}),(null==(t=this._currentUser)?void 0:t._redirectEventId)===e?this._currentUser:(null==(n=this.redirectUser)?void 0:n._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var e;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const t=(null==(e=this.currentUser)?void 0:e.uid)??null;this.lastNotifiedUid!==t&&(this.lastNotifiedUid=t,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,n,s){if(this._deleted)return()=>{};const r="function"==typeof t?t:t.next.bind(t);let i=!1;const o=this._isInitialized?Promise.resolve():this._initializationPromise;if(kn(o,this,"internal-error"),o.then(()=>{i||r(this.currentUser)}),"function"==typeof t){const r=e.addObserver(t,n,s);return()=>{i=!0,r()}}{const n=e.addObserver(t);return()=>{i=!0,n()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return kn(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){e&&!this.frameworks.includes(e)&&(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=ws(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var e;const t={"X-Client-Version":this.clientVersion};this.app.options.appId&&(t["X-Firebase-gmpid"]=this.app.options.appId);const n=await(null==(e=this.heartbeatServiceProvider.getImmediate({optional:!0}))?void 0:e.getHeartbeatsHeader());n&&(t["X-Firebase-Client"]=n);const s=await this._getAppCheckToken();return s&&(t["X-Firebase-AppCheck"]=s),t}async _getAppCheckToken(){var e;if(Yt(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const t=await(null==(e=this.appCheckServiceProvider.getImmediate({optional:!0}))?void 0:e.getToken());return(null==t?void 0:t.error)&&function(e,...t){mn.logLevel<=Ve.WARN&&mn.warn(`Auth (${Xt}): ${e}`,...t)}(`Error while retrieving App Check token: ${t.error}`),null==t?void 0:t.token}}function Is(e){return Le(e)}class Ts{constructor(e){this.auth=e,this.observer=null,this.addObserver=function(e,t){const n=new Re(e,t);return n.subscribe.bind(n)}(e=>this.observer=e)}get next(){return kn(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Es={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function Ns(e){return Es.loadJS(e)}class Ss{constructor(){this.enterprise=new Ps}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class Ps{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}const Rs="NO_RECAPTCHA";class As{constructor(e){this.type="recaptcha-enterprise",this.auth=Is(e)}async verify(e="verify",t=!1){async function n(e){if(!t){if(null==e.tenantId&&null!=e._agentRecaptchaConfig)return e._agentRecaptchaConfig.siteKey;if(null!=e.tenantId&&void 0!==e._tenantRecaptchaConfigs[e.tenantId])return e._tenantRecaptchaConfigs[e.tenantId].siteKey}return new Promise(async(t,n)=>{(async function(e,t){return jn(e,"GET","/v2/recaptchaConfig",Ln(e,t))})(e,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(s=>{if(void 0!==s.recaptchaKey){const n=new zn(s);return null==e.tenantId?e._agentRecaptchaConfig=n:e._tenantRecaptchaConfigs[e.tenantId]=n,t(n.siteKey)}n(new Error("recaptcha Enterprise site key undefined"))}).catch(e=>{n(e)})})}function s(t,n,s){const r=window.grecaptcha;Hn(r)?r.enterprise.ready(()=>{r.enterprise.execute(t,{action:e}).then(e=>{n(e)}).catch(()=>{n(Rs)})}):s(Error("No reCAPTCHA enterprise script loaded."))}if(this.auth.settings.appVerificationDisabledForTesting){return(new Ss).execute("siteKey",{action:"verify"})}return new Promise((e,r)=>{n(this.auth).then(n=>{if(!t&&Hn(window.grecaptcha))s(n,e,r);else{if("undefined"==typeof window)return void r(new Error("RecaptchaVerifier is only supported in browser"));let t=Es.recaptchaEnterpriseScript;0!==t.length&&(t+=n),Ns(t).then(()=>{s(n,e,r)}).catch(e=>{r(e)})}}).catch(e=>{r(e)})})}}async function Os(e,t,n,s=!1,r=!1){const i=new As(e);let o;if(r)o=Rs;else try{o=await i.verify(n)}catch(l){o=await i.verify(n,!0)}const a={...t};if("mfaSmsEnrollment"===n||"mfaSmsSignIn"===n){if("phoneEnrollmentInfo"in a){const e=a.phoneEnrollmentInfo.phoneNumber,t=a.phoneEnrollmentInfo.recaptchaToken;Object.assign(a,{phoneEnrollmentInfo:{phoneNumber:e,recaptchaToken:t,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in a){const e=a.phoneSignInInfo.recaptchaToken;Object.assign(a,{phoneSignInInfo:{recaptchaToken:e,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return a}return s?Object.assign(a,{captchaResp:o}):Object.assign(a,{captchaResponse:o}),Object.assign(a,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(a,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),a}async function Ds(e,t,n,s,r){var i,o;if("EMAIL_PASSWORD_PROVIDER"===r){if(null==(i=e._getRecaptchaConfig())?void 0:i.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const r=await Os(e,t,n,"getOobCode"===n);return s(e,r)}return s(e,t).catch(async r=>{if("auth/missing-recaptcha-token"===r.code){console.log(`${n} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const r=await Os(e,t,n,"getOobCode"===n);return s(e,r)}return Promise.reject(r)})}if("PHONE_PROVIDER"===r){if(null==(o=e._getRecaptchaConfig())?void 0:o.isProviderEnabled("PHONE_PROVIDER")){const r=await Os(e,t,n);return s(e,r).catch(async r=>{var i;if("AUDIT"===(null==(i=e._getRecaptchaConfig())?void 0:i.getProviderEnforcementState("PHONE_PROVIDER"))&&("auth/missing-recaptcha-token"===r.code||"auth/invalid-app-credential"===r.code)){console.log(`Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow to complete the ${n} flow.`);const r=await Os(e,t,n,!1,!0);return s(e,r)}return Promise.reject(r)})}{const r=await Os(e,t,n,!1,!0);return s(e,r)}}return Promise.reject(r+" provider is not supported.")}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ls(e,t,n){const s=Is(e);kn(/^https?:\/\//.test(t),s,"invalid-emulator-scheme");const r=!!(null==n?void 0:n.disableWarnings),i=js(t),{host:o,port:a}=function(e){const t=js(e),n=/(\/\/)?([^?#/]+)/.exec(e.substr(t.length));if(!n)return{host:"",port:null};const s=n[2].split("@").pop()||"",r=/^(\[[^\]]+\])(:|$)/.exec(s);if(r){const e=r[1];return{host:e,port:Ms(s.substr(e.length+1))}}{const[e,t]=s.split(":");return{host:e,port:Ms(t)}}}(t),l=null===a?"":`:${a}`,c={url:`${i}//${o}${l}/`},h=Object.freeze({host:o,port:a,protocol:i.replace(":",""),options:Object.freeze({disableWarnings:r})});if(!s._canInitEmulator)return kn(s.config.emulator&&s.emulatorConfig,s,"emulator-config-failed"),void kn(Ie(c,s.config.emulator)&&Ie(h,s.emulatorConfig),s,"emulator-config-failed");s.config.emulator=c,s.emulatorConfig=h,s.settings.appVerificationDisabledForTesting=!0,je(o)?Me(`${i}//${o}${l}`):r||function(){function e(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}"undefined"!=typeof console&&"function"==typeof console.info&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials.");"undefined"!=typeof window&&"undefined"!=typeof document&&("loading"===document.readyState?window.addEventListener("DOMContentLoaded",e):e())}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */()}function js(e){const t=e.indexOf(":");return t<0?"":e.substr(0,t+1)}function Ms(e){if(!e)return null;const t=Number(e);return isNaN(t)?null:t}class Fs{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return Cn("not implemented")}_getIdTokenResponse(e){return Cn("not implemented")}_linkToIdToken(e,t){return Cn("not implemented")}_getReauthenticationResolver(e){return Cn("not implemented")}}async function Us(e,t){return jn(e,"POST","/v1/accounts:signUp",t)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function qs(e,t){return Fn(e,"POST","/v1/accounts:signInWithPassword",Ln(e,t))}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Ws extends Fs{constructor(e,t,n,s=null){super("password",n),this._email=e,this._password=t,this._tenantId=s}static _fromEmailAndPassword(e,t){return new Ws(e,t,"password")}static _fromEmailAndCode(e,t,n=null){return new Ws(e,t,"emailLink",n)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const t="string"==typeof e?JSON.parse(e):e;if((null==t?void 0:t.email)&&(null==t?void 0:t.password)){if("password"===t.signInMethod)return this._fromEmailAndPassword(t.email,t.password);if("emailLink"===t.signInMethod)return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":return Ds(e,{returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"},"signInWithPassword",qs,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return async function(e,t){return Fn(e,"POST","/v1/accounts:signInWithEmailLink",Ln(e,t))}(e,{email:this._email,oobCode:this._password});default:yn(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":return Ds(e,{idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",Us,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return async function(e,t){return Fn(e,"POST","/v1/accounts:signInWithEmailLink",Ln(e,t))}(e,{idToken:t,email:this._email,oobCode:this._password});default:yn(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Vs(e,t){return Fn(e,"POST","/v1/accounts:signInWithIdp",Ln(e,t))}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hs extends Fs{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new Hs(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):yn("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t="string"==typeof e?JSON.parse(e):e,{providerId:n,signInMethod:s,...r}=t;if(!n||!s)return null;const i=new Hs(n,s);return i.idToken=r.idToken||void 0,i.accessToken=r.accessToken||void 0,i.secret=r.secret,i.nonce=r.nonce,i.pendingToken=r.pendingToken||null,i}_getIdTokenResponse(e){return Vs(e,this.buildRequest())}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,Vs(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,Vs(e,t)}buildRequest(){const e={requestUri:"http://localhost",returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=Ee(t)}return e}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zs{constructor(e){const t=Ne(Se(e)),n=t.apiKey??null,s=t.oobCode??null,r=function(e){switch(e){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}(t.mode??null);kn(n&&s&&r,"argument-error"),this.apiKey=n,this.operation=r,this.code=s,this.continueUrl=t.continueUrl??null,this.languageCode=t.lang??null,this.tenantId=t.tenantId??null}static parseLink(e){const t=function(e){const t=Ne(Se(e)).link,n=t?Ne(Se(t)).deep_link_id:null,s=Ne(Se(e)).deep_link_id;return(s?Ne(Se(s)).link:null)||s||n||t||e}(e);try{return new zs(t)}catch{return null}}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bs{constructor(){this.providerId=Bs.PROVIDER_ID}static credential(e,t){return Ws._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){const n=zs.parseLink(t);return kn(n,"argument-error"),Ws._fromEmailAndCode(e,n.code,n.tenantId)}}Bs.PROVIDER_ID="password",Bs.EMAIL_PASSWORD_SIGN_IN_METHOD="password",Bs.EMAIL_LINK_SIGN_IN_METHOD="emailLink";
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class $s{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ks extends $s{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gs extends Ks{constructor(){super("facebook.com")}static credential(e){return Hs._fromParams({providerId:Gs.PROVIDER_ID,signInMethod:Gs.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Gs.credentialFromTaggedObject(e)}static credentialFromError(e){return Gs.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e))return null;if(!e.oauthAccessToken)return null;try{return Gs.credential(e.oauthAccessToken)}catch{return null}}}Gs.FACEBOOK_SIGN_IN_METHOD="facebook.com",Gs.PROVIDER_ID="facebook.com";
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Ys extends Ks{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Hs._fromParams({providerId:Ys.PROVIDER_ID,signInMethod:Ys.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return Ys.credentialFromTaggedObject(e)}static credentialFromError(e){return Ys.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n}=e;if(!t&&!n)return null;try{return Ys.credential(t,n)}catch{return null}}}Ys.GOOGLE_SIGN_IN_METHOD="google.com",Ys.PROVIDER_ID="google.com";
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Js extends Ks{constructor(){super("github.com")}static credential(e){return Hs._fromParams({providerId:Js.PROVIDER_ID,signInMethod:Js.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Js.credentialFromTaggedObject(e)}static credentialFromError(e){return Js.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e))return null;if(!e.oauthAccessToken)return null;try{return Js.credential(e.oauthAccessToken)}catch{return null}}}Js.GITHUB_SIGN_IN_METHOD="github.com",Js.PROVIDER_ID="github.com";
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Qs extends Ks{constructor(){super("twitter.com")}static credential(e,t){return Hs._fromParams({providerId:Qs.PROVIDER_ID,signInMethod:Qs.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return Qs.credentialFromTaggedObject(e)}static credentialFromError(e){return Qs.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:n}=e;if(!t||!n)return null;try{return Qs.credential(t,n)}catch{return null}}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
async function Xs(e,t){return Fn(e,"POST","/v1/accounts:signUp",Ln(e,t))}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Qs.TWITTER_SIGN_IN_METHOD="twitter.com",Qs.PROVIDER_ID="twitter.com";class Zs{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,n,s=!1){const r=await ss._fromIdTokenResponse(e,n,s),i=er(n);return new Zs({user:r,providerId:i,_tokenResponse:n,operationType:t})}static async _forOperation(e,t,n){await e._updateTokensIfNecessary(n,!0);const s=er(n);return new Zs({user:e,providerId:s,_tokenResponse:n,operationType:t})}}function er(e){return e.providerId?e.providerId:"phoneNumber"in e?"phone":null}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tr extends fe{constructor(e,t,n,s){super(t.code,t.message),this.operationType=n,this.user=s,Object.setPrototypeOf(this,tr.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:n}}static _fromErrorAndOperation(e,t,n,s){return new tr(e,t,n,s)}}function nr(e,t,n,s){return("reauthenticate"===t?n._getReauthenticationResolver(e):n._getIdTokenResponse(e)).catch(n=>{if("auth/multi-factor-auth-required"===n.code)throw tr._fromErrorAndOperation(e,n,t,s);throw n})}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
async function sr(e,t,n=!1){if(Yt(e.app))return Promise.reject(wn(e));const s="signIn",r=await nr(e,s,t),i=await Zs._fromIdTokenResponse(e,s,r);return n||await e._updateCurrentUser(i.user),i}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
async function rr(e){const t=Is(e);t._getPasswordPolicyInternal()&&await t._updatePasswordPolicy()}function ir(e,t,n){return Yt(e.app)?Promise.reject(wn(e)):async function(e,t){return sr(Is(e),t)}(Le(e),Bs.credential(t,n)).catch(async t=>{throw"auth/password-does-not-meet-requirements"===t.code&&rr(e),t})}const or="__sak";
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ar{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(or,"1"),this.storage.removeItem(or),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lr extends ar{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=bs(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const n=this.storage.getItem(t),s=this.localCache[t];n!==s&&e(t,s,n)}}onStorageEvent(e,t=!1){if(!e.key)return void this.forAllChangedKeys((e,t,n)=>{this.notifyListeners(e,n)});const n=e.key;t?this.detachListener():this.stopPolling();const s=()=>{const e=this.storage.getItem(n);(t||this.localCache[n]!==e)&&this.notifyListeners(n,e)},r=this.storage.getItem(n);vs()&&r!==e.newValue&&e.newValue!==e.oldValue?setTimeout(s,10):s()}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const s of Array.from(n))s(t?JSON.parse(t):t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,n)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:n}),!0)})},1e3)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){0===Object.keys(this.listeners).length&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),0===this.listeners[e].size&&delete this.listeners[e]),0===Object.keys(this.listeners).length&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}lr.type="LOCAL";const cr=lr;
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hr extends ar{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}hr.type="SESSION";const ur=hr;
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class dr{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(t=>t.isListeningto(e));if(t)return t;const n=new dr(e);return this.receivers.push(n),n}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:n,eventType:s,data:r}=t.data,i=this.handlersMap[s];if(!(null==i?void 0:i.size))return;t.ports[0].postMessage({status:"ack",eventId:n,eventType:s});const o=Array.from(i).map(async e=>e(t.origin,r)),a=await function(e){return Promise.all(e.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}(o);t.ports[0].postMessage({status:"done",eventId:n,eventType:s,response:a})}_subscribe(e,t){0===Object.keys(this.handlersMap).length&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),t&&0!==this.handlersMap[e].size||delete this.handlersMap[e],0===Object.keys(this.handlersMap).length&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function pr(e="",t=10){let n="";for(let s=0;s<t;s++)n+=Math.floor(10*Math.random());return e+n}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */dr.receivers=[];class gr{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,n=50){const s="undefined"!=typeof MessageChannel?new MessageChannel:null;if(!s)throw new Error("connection_unavailable");let r,i;return new Promise((o,a)=>{const l=pr("",20);s.port1.start();const c=setTimeout(()=>{a(new Error("unsupported_event"))},n);i={messageChannel:s,onMessage(e){const t=e;if(t.data.eventId===l)switch(t.data.status){case"ack":clearTimeout(c),r=setTimeout(()=>{a(new Error("timeout"))},3e3);break;case"done":clearTimeout(r),o(t.data.response);break;default:clearTimeout(c),clearTimeout(r),a(new Error("invalid_response"))}}},this.handlers.add(i),s.port1.addEventListener("message",i.onMessage),this.target.postMessage({eventType:e,eventId:l,data:t},[s.port2])}).finally(()=>{i&&this.removeMessageHandler(i)})}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function fr(){return window}
/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function mr(){return void 0!==fr().WorkerGlobalScope&&"function"==typeof fr().importScripts}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const _r="firebaseLocalStorageDb",yr="firebaseLocalStorage",vr="fbase_key";class br{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function wr(e,t){return e.transaction([yr],t?"readwrite":"readonly").objectStore(yr)}function xr(){const e=indexedDB.open(_r,1);return new Promise((t,n)=>{e.addEventListener("error",()=>{n(e.error)}),e.addEventListener("upgradeneeded",()=>{const t=e.result;try{t.createObjectStore(yr,{keyPath:vr})}catch(s){n(s)}}),e.addEventListener("success",async()=>{const n=e.result;n.objectStoreNames.contains(yr)?t(n):(n.close(),await function(){const e=indexedDB.deleteDatabase(_r);return new br(e).toPromise()}(),t(await xr()))})})}async function kr(e,t,n){const s=wr(e,!0).put({[vr]:t,value:n});return new br(s).toPromise()}function Cr(e,t){const n=wr(e,!0).delete(t);return new br(n).toPromise()}class Ir{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db||(this.db=await xr()),this.db}async _withRetries(e){let t=0;for(;;)try{const t=await this._openDb();return await e(t)}catch(n){if(t++>3)throw n;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return mr()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=dr._getInstance(mr()?self:null),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var e,t;if(this.activeServiceWorker=await async function(){if(!(null==navigator?void 0:navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}(),!this.activeServiceWorker)return;this.sender=new gr(this.activeServiceWorker);const n=await this.sender._send("ping",{},800);n&&(null==(e=n[0])?void 0:e.fulfilled)&&(null==(t=n[0])?void 0:t.value.includes("keyChanged"))&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){var t;if(this.sender&&this.activeServiceWorker&&((null==(t=null==navigator?void 0:navigator.serviceWorker)?void 0:t.controller)||null)===this.activeServiceWorker)try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await xr();return await kr(e,or,"1"),await Cr(e,or),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(n=>kr(n,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(t=>async function(e,t){const n=wr(e,!1).get(t),s=await new br(n).toPromise();return void 0===s?null:s.value}(t,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>Cr(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(e=>{const t=wr(e,!1).getAll();return new br(t).toPromise()});if(!e)return[];if(0!==this.pendingWrites)return[];const t=[],n=new Set;if(0!==e.length)for(const{fbase_key:s,value:r}of e)n.add(s),JSON.stringify(this.localCache[s])!==JSON.stringify(r)&&(this.notifyListeners(s,r),t.push(s));for(const s of Object.keys(this.localCache))this.localCache[s]&&!n.has(s)&&(this.notifyListeners(s,null),t.push(s));return t}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const s of Array.from(n))s(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),800)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){0===Object.keys(this.listeners).length&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),0===this.listeners[e].size&&delete this.listeners[e]),0===Object.keys(this.listeners).length&&this.stopPolling()}}Ir.type="LOCAL";const Tr=Ir;new Sn(3e4,6e4);
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Er extends Fs{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return Vs(e,this._buildIdpRequest())}_linkToIdToken(e,t){return Vs(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return Vs(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function Nr(e){return sr(e.auth,new Er(e),e.bypassAuthState)}function Sr(e){const{auth:t,user:n}=e;return kn(n,t,"internal-error"),
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
async function(e,t,n=!1){const{auth:s}=e;if(Yt(s.app))return Promise.reject(wn(s));const r="reauthenticate";try{const i=await Jn(e,nr(s,r,t,e),n);kn(i.idToken,s,"internal-error");const o=Gn(i.idToken);kn(o,s,"internal-error");const{sub:a}=o;return kn(e.uid===a,s,"user-mismatch"),Zs._forOperation(e,r,i)}catch(i){throw"auth/user-not-found"===(null==i?void 0:i.code)&&yn(s,"user-mismatch"),i}}(n,new Er(e),e.bypassAuthState)}async function Pr(e){const{auth:t,user:n}=e;return kn(n,t,"internal-error"),async function(e,t,n=!1){const s=await Jn(e,t._linkToIdToken(e.auth,await e.getIdToken()),n);return Zs._forOperation(e,"link",s)}(n,new Er(e),e.bypassAuthState)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rr{constructor(e,t,n,s,r=!1){this.auth=e,this.resolver=n,this.user=s,this.bypassAuthState=r,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(n){this.reject(n)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:n,postBody:s,tenantId:r,error:i,type:o}=e;if(i)return void this.reject(i);const a={auth:this.auth,requestUri:t,sessionId:n,tenantId:r||void 0,postBody:s||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(o)(a))}catch(l){this.reject(l)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return Nr;case"linkViaPopup":case"linkViaRedirect":return Pr;case"reauthViaPopup":case"reauthViaRedirect":return Sr;default:yn(this.auth,"internal-error")}}resolve(e){In(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){In(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ar=new Sn(2e3,1e4);class Or extends Rr{constructor(e,t,n,s,r){super(e,t,s,r),this.provider=n,this.authWindow=null,this.pollId=null,Or.currentPopupAction&&Or.currentPopupAction.cancel(),Or.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return kn(e,this.auth,"internal-error"),e}async onExecution(){In(1===this.filter.length,"Popup operations only handle one event");const e=pr();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(e=>{this.reject(e)}),this.resolver._isIframeWebStorageSupported(this.auth,e=>{e||this.reject(vn(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return(null==(e=this.authWindow)?void 0:e.associatedEvent)||null}cancel(){this.reject(vn(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,Or.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,n;(null==(n=null==(t=this.authWindow)?void 0:t.window)?void 0:n.closed)?this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(vn(this.auth,"popup-closed-by-user"))},8e3):this.pollId=window.setTimeout(e,Ar.get())};e()}}Or.currentPopupAction=null;
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const Dr="pendingRedirect",Lr=new Map;class jr extends Rr{constructor(e,t,n=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,n),this.eventId=null}async execute(){let e=Lr.get(this.auth._key());if(!e){try{const t=await async function(e,t){const n=function(e){return ls(Dr,e.config.apiKey,e.name)}(t),s=function(e){return is(e._redirectPersistence)}(e);if(!(await s._isAvailable()))return!1;const r="true"===await s._get(n);return await s._remove(n),r}(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(t)}catch(t){e=()=>Promise.reject(t)}Lr.set(this.auth._key(),e)}return this.bypassAuthState||Lr.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if("signInViaRedirect"===e.type)return super.onAuthEvent(e);if("unknown"!==e.type){if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}else this.resolve(null)}async onExecution(){}cleanUp(){}}function Mr(e,t){Lr.set(e._key(),t)}async function Fr(e,t,n=!1){if(Yt(e.app))return Promise.reject(wn(e));const s=Is(e),r=
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function(e,t){return t?is(t):(kn(e._popupRedirectResolver,e,"argument-error"),e._popupRedirectResolver)}(s,t),i=new jr(s,r,n),o=await i.execute();return o&&!n&&(delete o.user._redirectEventId,await s._persistUserIfCurrent(o.user),await s._setRedirectUser(null,t)),o}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ur{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(n=>{this.isEventForConsumer(e,n)&&(t=!0,this.sendToConsumer(e,n),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!function(e){switch(e.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return Wr(e);default:return!1}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var n;if(e.error&&!Wr(e)){const s=(null==(n=e.error.code)?void 0:n.split("auth/")[1])||"internal-error";t.onError(vn(this.auth,s))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const n=null===t.eventId||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&n}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=6e5&&this.cachedEventUids.clear(),this.cachedEventUids.has(qr(e))}saveEventToCache(e){this.cachedEventUids.add(qr(e)),this.lastProcessedEventTime=Date.now()}}function qr(e){return[e.type,e.eventId,e.sessionId,e.tenantId].filter(e=>e).join("-")}function Wr({type:e,error:t}){return"unknown"===e&&"auth/no-auth-event"===(null==t?void 0:t.code)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const Vr=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,Hr=/^https?/;async function zr(e){if(e.config.emulator)return;const{authorizedDomains:t}=await async function(e,t={}){return jn(e,"GET","/v1/projects",t)}(e);for(const n of t)try{if(Br(n))return}catch{}yn(e,"unauthorized-domain")}function Br(e){const t=Tn(),{protocol:n,hostname:s}=new URL(t);if(e.startsWith("chrome-extension://")){const r=new URL(e);return""===r.hostname&&""===s?"chrome-extension:"===n&&e.replace("chrome-extension://","")===t.replace("chrome-extension://",""):"chrome-extension:"===n&&r.hostname===s}if(!Hr.test(n))return!1;if(Vr.test(e))return s===e;const r=e.replace(/\./g,"\\.");return new RegExp("^(.+\\."+r+"|"+r+")$","i").test(s)}
/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $r=new Sn(3e4,6e4);function Kr(){const e=fr().___jsl;if(null==e?void 0:e.H)for(const t of Object.keys(e.H))if(e.H[t].r=e.H[t].r||[],e.H[t].L=e.H[t].L||[],e.H[t].r=[...e.H[t].L],e.CP)for(let n=0;n<e.CP.length;n++)e.CP[n]=null}function Gr(e){return new Promise((t,n)=>{var s,r,i;function o(){Kr(),gapi.load("gapi.iframes",{callback:()=>{t(gapi.iframes.getContext())},ontimeout:()=>{Kr(),n(vn(e,"network-request-failed"))},timeout:$r.get()})}if(null==(r=null==(s=fr().gapi)?void 0:s.iframes)?void 0:r.Iframe)t(gapi.iframes.getContext());else{if(!(null==(i=fr().gapi)?void 0:i.load)){const t=`__${"iframefcb"}${Math.floor(1e6*Math.random())}`;return fr()[t]=()=>{gapi.load?o():n(vn(e,"network-request-failed"))},Ns(`${Es.gapiScript}?onload=${t}`).catch(e=>n(e))}o()}}).catch(e=>{throw Yr=null,e})}let Yr=null;
/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const Jr=new Sn(5e3,15e3),Qr={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},Xr=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function Zr(e){const t=e.config;kn(t.authDomain,e,"auth-domain-config-required");const n=t.emulator?Pn(t,"emulator/auth/iframe"):`https://${e.config.authDomain}/__/auth/iframe`,s={apiKey:t.apiKey,appName:e.name,v:Xt},r=Xr.get(e.config.apiHost);r&&(s.eid=r);const i=e._getFrameworks();return i.length&&(s.fw=i.join(",")),`${n}?${Ee(s).slice(1)}`}async function ei(e){const t=await function(e){return Yr=Yr||Gr(e),Yr}(e),n=fr().gapi;return kn(n,e,"internal-error"),t.open({where:document.body,url:Zr(e),messageHandlersFilter:n.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:Qr,dontclear:!0},t=>new Promise(async(n,s)=>{await t.restyle({setHideOnLeave:!1});const r=vn(e,"network-request-failed"),i=fr().setTimeout(()=>{s(r)},Jr.get());function o(){fr().clearTimeout(i),n(t)}t.ping(o).then(o,()=>{s(r)})}))}
/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ti={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"};class ni{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch(e){}}}function si(e,t,n,s=500,r=600){const i=Math.max((window.screen.availHeight-r)/2,0).toString(),o=Math.max((window.screen.availWidth-s)/2,0).toString();let a="";const l={...ti,width:s.toString(),height:r.toString(),top:i,left:o},c=ue().toLowerCase();n&&(a=ps(c)?"_blank":n),us(c)&&(t=t||"http://localhost",l.scrollbars="yes");const h=Object.entries(l).reduce((e,[t,n])=>`${e}${t}=${n},`,"");if(function(e=ue()){var t;return ys(e)&&!!(null==(t=window.navigator)?void 0:t.standalone)}(c)&&"_self"!==a)return function(e,t){const n=document.createElement("a");n.href=e,n.target=t;const s=document.createEvent("MouseEvent");s.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),n.dispatchEvent(s)}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(t||"",a),new ni(null);const u=window.open(t||"",a,h);kn(u,e,"popup-blocked");try{u.focus()}catch(d){}return new ni(u)}const ri="__/auth/handler",ii="emulator/auth/handler",oi=encodeURIComponent("fac");async function ai(e,t,n,s,r,i){kn(e.config.authDomain,e,"auth-domain-config-required"),kn(e.config.apiKey,e,"invalid-api-key");const o={apiKey:e.config.apiKey,appName:e.name,authType:n,redirectUrl:s,v:Xt,eventId:r};if(t instanceof $s){t.setDefaultLanguage(e.languageCode),o.providerId=t.providerId||"",ke(t.getCustomParameters())||(o.customParameters=JSON.stringify(t.getCustomParameters()));for(const[e,t]of Object.entries(i||{}))o[e]=t}if(t instanceof Ks){const e=t.getScopes().filter(e=>""!==e);e.length>0&&(o.scopes=e.join(","))}e.tenantId&&(o.tid=e.tenantId);const a=o;for(const h of Object.keys(a))void 0===a[h]&&delete a[h];const l=await e._getAppCheckToken(),c=l?`#${oi}=${encodeURIComponent(l)}`:"";return`${function({config:e}){if(!e.emulator)return`https://${e.authDomain}/${ri}`;return Pn(e,ii)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e)}?${Ee(a).slice(1)}${c}`}const li="webStorageSupport";const ci=class{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=ur,this._completeRedirectFn=Fr,this._overrideRedirectResult=Mr}async _openPopup(e,t,n,s){var r;In(null==(r=this.eventManagers[e._key()])?void 0:r.manager,"_initialize() not called before _openPopup()");return si(e,await ai(e,t,n,Tn(),s),pr())}async _openRedirect(e,t,n,s){await this._originValidation(e);return function(e){fr().location.href=e}(await ai(e,t,n,Tn(),s)),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:e,promise:n}=this.eventManagers[t];return e?Promise.resolve(e):(In(n,"If manager is not set, promise should be"),n)}const n=this.initAndGetManager(e);return this.eventManagers[t]={promise:n},n.catch(()=>{delete this.eventManagers[t]}),n}async initAndGetManager(e){const t=await ei(e),n=new Ur(e);return t.register("authEvent",t=>{kn(null==t?void 0:t.authEvent,e,"invalid-auth-event");return{status:n.onEvent(t.authEvent)?"ACK":"ERROR"}},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:n},this.iframes[e._key()]=t,n}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(li,{type:li},n=>{var s;const r=null==(s=null==n?void 0:n[0])?void 0:s[li];void 0!==r&&t(!!r),yn(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=zr(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return bs()||ds()||ys()}};var hi="@firebase/auth",ui="1.12.2";
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class di{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),(null==(e=this.auth.currentUser)?void 0:e.uid)||null}async getToken(e){if(this.assertAuthConfigured(),await this.auth._initializationPromise,!this.auth.currentUser)return null;return{accessToken:await this.auth.currentUser.getIdToken(e)}}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(t=>{e((null==t?void 0:t.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){kn(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const pi=ce("authIdTokenMaxAge")||300;let gi=null;var fi;Es={loadJS:e=>new Promise((t,n)=>{const s=document.createElement("script");var r;s.setAttribute("src",e),s.onload=t,s.onerror=e=>{const t=vn("internal-error");t.customData=e,n(t)},s.type="text/javascript",s.charset="UTF-8",((null==(r=document.getElementsByTagName("head"))?void 0:r[0])??document).appendChild(s)}),gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="},fi="Browser",Kt(new Fe("auth",(e,{options:t})=>{const n=e.getProvider("app").getImmediate(),s=e.getProvider("heartbeat"),r=e.getProvider("app-check-internal"),{apiKey:i,authDomain:o}=n.options;kn(i&&!i.includes(":"),"invalid-api-key",{appName:n.name});const a={apiKey:i,authDomain:o,clientPlatform:fi,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:ws(fi)},l=new Cs(n,s,r,a);return function(e,t){const n=(null==t?void 0:t.persistence)||[],s=(Array.isArray(n)?n:[n]).map(is);(null==t?void 0:t.errorMap)&&e._updateErrorMap(t.errorMap),e._initializeWithPersistence(s,null==t?void 0:t.popupRedirectResolver)}(l,t),l},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,n)=>{e.getProvider("auth-internal").initialize()})),Kt(new Fe("auth-internal",e=>{const t=Is(e.getProvider("auth").getImmediate());return new di(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),tn(hi,ui,function(e){switch(e){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}(fi)),tn(hi,ui,"esm2020");const mi="@firebase/database",_i="1.1.2";
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
let yi="";
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class vi{constructor(e){this.domStorage_=e,this.prefix_="firebase:"}set(e,t){null==t?this.domStorage_.removeItem(this.prefixedName_(e)):this.domStorage_.setItem(this.prefixedName_(e),ve(t))}get(e){const t=this.domStorage_.getItem(this.prefixedName_(e));return null==t?null:ye(t)}remove(e){this.domStorage_.removeItem(this.prefixedName_(e))}prefixedName_(e){return this.prefix_+e}toString(){return this.domStorage_.toString()}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bi{constructor(){this.cache_={},this.isInMemoryStorage=!0}set(e,t){null==t?delete this.cache_[e]:this.cache_[e]=t}get(e){return we(this.cache_,e)?this.cache_[e]:null}remove(e){delete this.cache_[e]}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wi=function(e){try{if("undefined"!=typeof window&&void 0!==window[e]){const t=window[e];return t.setItem("firebase:sentinel","cache"),t.removeItem("firebase:sentinel"),new vi(t)}}catch(t){}return new bi},xi=wi("localStorage"),ki=wi("sessionStorage"),Ci=new Ge("@firebase/database"),Ii=function(){let e=1;return function(){return e++}}(),Ti=function(e){const t=function(e){const t=[];let n=0;for(let s=0;s<e.length;s++){let r=e.charCodeAt(s);if(r>=55296&&r<=56319){const t=r-55296;s++,K(s<e.length,"Surrogate pair missing trail surrogate."),r=65536+(t<<10)+(e.charCodeAt(s)-56320)}r<128?t[n++]=r:r<2048?(t[n++]=r>>6|192,t[n++]=63&r|128):r<65536?(t[n++]=r>>12|224,t[n++]=r>>6&63|128,t[n++]=63&r|128):(t[n++]=r>>18|240,t[n++]=r>>12&63|128,t[n++]=r>>6&63|128,t[n++]=63&r|128)}return t}(e),n=new Pe;n.update(t);const s=n.digest();return J.encodeByteArray(s)},Ei=function(...e){let t="";for(let n=0;n<e.length;n++){const s=e[n];Array.isArray(s)||s&&"object"==typeof s&&"number"==typeof s.length?t+=Ei.apply(null,s):t+="object"==typeof s?ve(s):s,t+=" "}return t};let Ni=null,Si=!0;const Pi=function(...e){var t,n;if(!0===Si&&(Si=!1,null===Ni&&!0===ki.get("logging_enabled")&&(t=!0,K(!n||!0===t||!1===t,"Can't turn on custom loggers persistently."),!0===t?(Ci.logLevel=Ve.VERBOSE,Ni=Ci.log.bind(Ci),n&&ki.set("logging_enabled",!0)):"function"==typeof t?Ni=t:(Ni=null,ki.remove("logging_enabled")))),Ni){const t=Ei.apply(null,e);Ni(t)}},Ri=function(e){return function(...t){Pi(e,...t)}},Ai=function(...e){const t="FIREBASE INTERNAL ERROR: "+Ei(...e);Ci.error(t)},Oi=function(...e){const t=`FIREBASE FATAL ERROR: ${Ei(...e)}`;throw Ci.error(t),new Error(t)},Di=function(...e){const t="FIREBASE WARNING: "+Ei(...e);Ci.warn(t)},Li=function(e){return"number"==typeof e&&(e!=e||e===Number.POSITIVE_INFINITY||e===Number.NEGATIVE_INFINITY)},ji="[MIN_NAME]",Mi="[MAX_NAME]",Fi=function(e,t){if(e===t)return 0;if(e===ji||t===Mi)return-1;if(t===ji||e===Mi)return 1;{const n=$i(e),s=$i(t);return null!==n?null!==s?n-s===0?e.length-t.length:n-s:-1:null!==s?1:e<t?-1:1}},Ui=function(e,t){return e===t?0:e<t?-1:1},qi=function(e,t){if(t&&e in t)return t[e];throw new Error("Missing required key ("+e+") in object: "+ve(t))},Wi=function(e){if("object"!=typeof e||null===e)return ve(e);const t=[];for(const s in e)t.push(s);t.sort();let n="{";for(let s=0;s<t.length;s++)0!==s&&(n+=","),n+=ve(t[s]),n+=":",n+=Wi(e[t[s]]);return n+="}",n},Vi=function(e,t){const n=e.length;if(n<=t)return[e];const s=[];for(let r=0;r<n;r+=t)r+t>n?s.push(e.substring(r,n)):s.push(e.substring(r,r+t));return s};function Hi(e,t){for(const n in e)e.hasOwnProperty(n)&&t(n,e[n])}const zi=function(e){K(!Li(e),"Invalid JSON number");const t=1023;let n,s,r,i,o;0===e?(s=0,r=0,n=1/e==-1/0?1:0):(n=e<0,(e=Math.abs(e))>=Math.pow(2,-1022)?(i=Math.min(Math.floor(Math.log(e)/Math.LN2),t),s=i+t,r=Math.round(e*Math.pow(2,52-i)-Math.pow(2,52))):(s=0,r=Math.round(e/Math.pow(2,-1074))));const a=[];for(o=52;o;o-=1)a.push(r%2?1:0),r=Math.floor(r/2);for(o=11;o;o-=1)a.push(s%2?1:0),s=Math.floor(s/2);a.push(n?1:0),a.reverse();const l=a.join("");let c="";for(o=0;o<64;o+=8){let e=parseInt(l.substr(o,8),2).toString(16);1===e.length&&(e="0"+e),c+=e}return c.toLowerCase()};const Bi=new RegExp("^-?(0*)\\d{1,10}$"),$i=function(e){if(Bi.test(e)){const t=Number(e);if(t>=-2147483648&&t<=2147483647)return t}return null},Ki=function(e){try{e()}catch(t){setTimeout(()=>{const e=t.stack||"";throw Di("Exception was thrown by user callback.",e),t},Math.floor(0))}},Gi=function(e,t){const n=setTimeout(e,t);return"number"==typeof n&&"undefined"!=typeof Deno&&Deno.unrefTimer?Deno.unrefTimer(n):"object"==typeof n&&n.unref&&n.unref(),n};
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Yi{constructor(e,t){this.appCheckProvider=t,this.appName=e.name,Yt(e)&&e.settings.appCheckToken&&(this.serverAppAppCheckToken=e.settings.appCheckToken),this.appCheck=null==t?void 0:t.getImmediate({optional:!0}),this.appCheck||null==t||t.get().then(e=>this.appCheck=e)}getToken(e){if(this.serverAppAppCheckToken){if(e)throw new Error("Attempted reuse of `FirebaseServerApp.appCheckToken` after previous usage failed.");return Promise.resolve({token:this.serverAppAppCheckToken})}return this.appCheck?this.appCheck.getToken(e):new Promise((t,n)=>{setTimeout(()=>{this.appCheck?this.getToken(e).then(t,n):t(null)},0)})}addTokenChangeListener(e){var t;null==(t=this.appCheckProvider)||t.get().then(t=>t.addTokenListener(e))}notifyForInvalidToken(){Di(`Provided AppCheck credentials for the app named "${this.appName}" are invalid. This usually indicates your app was not initialized correctly.`)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ji{constructor(e,t,n){this.appName_=e,this.firebaseOptions_=t,this.authProvider_=n,this.auth_=null,this.auth_=n.getImmediate({optional:!0}),this.auth_||n.onInit(e=>this.auth_=e)}getToken(e){return this.auth_?this.auth_.getToken(e).catch(e=>e&&"auth/token-not-initialized"===e.code?(Pi("Got auth/token-not-initialized error.  Treating as null token."),null):Promise.reject(e)):new Promise((t,n)=>{setTimeout(()=>{this.auth_?this.getToken(e).then(t,n):t(null)},0)})}addTokenChangeListener(e){this.auth_?this.auth_.addAuthTokenListener(e):this.authProvider_.get().then(t=>t.addAuthTokenListener(e))}removeTokenChangeListener(e){this.authProvider_.get().then(t=>t.removeAuthTokenListener(e))}notifyForInvalidToken(){let e='Provided authentication credentials for the app named "'+this.appName_+'" are invalid. This usually indicates your app was not initialized correctly. ';"credential"in this.firebaseOptions_?e+='Make sure the "credential" property provided to initializeApp() is authorized to access the specified "databaseURL" and is from the correct project.':"serviceAccount"in this.firebaseOptions_?e+='Make sure the "serviceAccount" property provided to initializeApp() is authorized to access the specified "databaseURL" and is from the correct project.':e+='Make sure the "apiKey" and "databaseURL" properties provided to initializeApp() match the values provided for your app at https://console.firebase.google.com/.',Di(e)}}class Qi{constructor(e){this.accessToken=e}getToken(e){return Promise.resolve({accessToken:this.accessToken})}addTokenChangeListener(e){e(this.accessToken)}removeTokenChangeListener(e){}notifyForInvalidToken(){}}Qi.OWNER="owner";
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const Xi=/(console\.firebase|firebase-console-\w+\.corp|firebase\.corp)\.google\.com/,Zi="ac",eo="websocket",to="long_polling";
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class no{constructor(e,t,n,s,r=!1,i="",o=!1,a=!1,l=null){this.secure=t,this.namespace=n,this.webSocketOnly=s,this.nodeAdmin=r,this.persistenceKey=i,this.includeNamespaceInQueryParams=o,this.isUsingEmulator=a,this.emulatorOptions=l,this._host=e.toLowerCase(),this._domain=this._host.substr(this._host.indexOf(".")+1),this.internalHost=xi.get("host:"+e)||this._host}isCacheableHost(){return"s-"===this.internalHost.substr(0,2)}isCustomHost(){return"firebaseio.com"!==this._domain&&"firebaseio-demo.com"!==this._domain}get host(){return this._host}set host(e){e!==this.internalHost&&(this.internalHost=e,this.isCacheableHost()&&xi.set("host:"+this._host,this.internalHost))}toString(){let e=this.toURLString();return this.persistenceKey&&(e+="<"+this.persistenceKey+">"),e}toURLString(){const e=this.secure?"https://":"http://",t=this.includeNamespaceInQueryParams?`?ns=${this.namespace}`:"";return`${e}${this.host}/${t}`}}function so(e,t,n){let s;if(K("string"==typeof t,"typeof type must == string"),K("object"==typeof n,"typeof params must == object"),t===eo)s=(e.secure?"wss://":"ws://")+e.internalHost+"/.ws?";else{if(t!==to)throw new Error("Unknown connection type: "+t);s=(e.secure?"https://":"http://")+e.internalHost+"/.lp?"}(function(e){return e.host!==e.internalHost||e.isCustomHost()||e.includeNamespaceInQueryParams})(e)&&(n.ns=e.namespace);const r=[];return Hi(n,(e,t)=>{r.push(e+"="+t)}),s+r.join("&")}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ro{constructor(){this.counters_={}}incrementCounter(e,t=1){we(this.counters_,e)||(this.counters_[e]=0),this.counters_[e]+=t}get(){return te(this.counters_)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const io={},oo={};function ao(e){const t=e.toString();return io[t]||(io[t]=new ro),io[t]}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class lo{constructor(e){this.onMessage_=e,this.pendingResponses=[],this.currentResponseNum=0,this.closeAfterResponse=-1,this.onClose=null}closeAfter(e,t){this.closeAfterResponse=e,this.onClose=t,this.closeAfterResponse<this.currentResponseNum&&(this.onClose(),this.onClose=null)}handleResponse(e,t){for(this.pendingResponses[e]=t;this.pendingResponses[this.currentResponseNum];){const e=this.pendingResponses[this.currentResponseNum];delete this.pendingResponses[this.currentResponseNum];for(let t=0;t<e.length;++t)e[t]&&Ki(()=>{this.onMessage_(e[t])});if(this.currentResponseNum===this.closeAfterResponse){this.onClose&&(this.onClose(),this.onClose=null);break}this.currentResponseNum++}}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const co="start";class ho{constructor(e,t,n,s,r,i,o){this.connId=e,this.repoInfo=t,this.applicationId=n,this.appCheckToken=s,this.authToken=r,this.transportSessionId=i,this.lastSessionId=o,this.bytesSent=0,this.bytesReceived=0,this.everConnected_=!1,this.log_=Ri(e),this.stats_=ao(t),this.urlFn=e=>(this.appCheckToken&&(e[Zi]=this.appCheckToken),so(t,to,e))}open(e,t){this.curSegmentNum=0,this.onDisconnect_=t,this.myPacketOrderer=new lo(e),this.isClosed_=!1,this.connectTimeoutTimer_=setTimeout(()=>{this.log_("Timed out trying to connect."),this.onClosed_(),this.connectTimeoutTimer_=null},Math.floor(3e4)),function(e){if("complete"===document.readyState)e();else{let t=!1;const n=function(){document.body?t||(t=!0,e()):setTimeout(n,Math.floor(10))};document.addEventListener?(document.addEventListener("DOMContentLoaded",n,!1),window.addEventListener("load",n,!1)):document.attachEvent&&(document.attachEvent("onreadystatechange",()=>{"complete"===document.readyState&&n()}),window.attachEvent("onload",n))}}(()=>{if(this.isClosed_)return;this.scriptTagHolder=new uo((...e)=>{const[t,n,s,r,i]=e;if(this.incrementIncomingBytes_(e),this.scriptTagHolder)if(this.connectTimeoutTimer_&&(clearTimeout(this.connectTimeoutTimer_),this.connectTimeoutTimer_=null),this.everConnected_=!0,t===co)this.id=n,this.password=s;else{if("close"!==t)throw new Error("Unrecognized command received: "+t);n?(this.scriptTagHolder.sendNewPolls=!1,this.myPacketOrderer.closeAfter(n,()=>{this.onClosed_()})):this.onClosed_()}},(...e)=>{const[t,n]=e;this.incrementIncomingBytes_(e),this.myPacketOrderer.handleResponse(t,n)},()=>{this.onClosed_()},this.urlFn);const e={};e[co]="t",e.ser=Math.floor(1e8*Math.random()),this.scriptTagHolder.uniqueCallbackIdentifier&&(e.cb=this.scriptTagHolder.uniqueCallbackIdentifier),e.v="5",this.transportSessionId&&(e.s=this.transportSessionId),this.lastSessionId&&(e.ls=this.lastSessionId),this.applicationId&&(e.p=this.applicationId),this.appCheckToken&&(e[Zi]=this.appCheckToken),"undefined"!=typeof location&&location.hostname&&Xi.test(location.hostname)&&(e.r="f");const t=this.urlFn(e);this.log_("Connecting via long-poll to "+t),this.scriptTagHolder.addTag(t,()=>{})})}start(){this.scriptTagHolder.startLongPoll(this.id,this.password),this.addDisconnectPingFrame(this.id,this.password)}static forceAllow(){ho.forceAllow_=!0}static forceDisallow(){ho.forceDisallow_=!0}static isAvailable(){return!!ho.forceAllow_||!(ho.forceDisallow_||"undefined"==typeof document||null==document.createElement||"object"==typeof window&&window.chrome&&window.chrome.extension&&!/^chrome/.test(window.location.href)||"object"==typeof Windows&&"object"==typeof Windows.UI)}markConnectionHealthy(){}shutdown_(){this.isClosed_=!0,this.scriptTagHolder&&(this.scriptTagHolder.close(),this.scriptTagHolder=null),this.myDisconnFrame&&(document.body.removeChild(this.myDisconnFrame),this.myDisconnFrame=null),this.connectTimeoutTimer_&&(clearTimeout(this.connectTimeoutTimer_),this.connectTimeoutTimer_=null)}onClosed_(){this.isClosed_||(this.log_("Longpoll is closing itself"),this.shutdown_(),this.onDisconnect_&&(this.onDisconnect_(this.everConnected_),this.onDisconnect_=null))}close(){this.isClosed_||(this.log_("Longpoll is being closed."),this.shutdown_())}send(e){const t=ve(e);this.bytesSent+=t.length,this.stats_.incrementCounter("bytes_sent",t.length);const n=X(t),s=Vi(n,1840);for(let r=0;r<s.length;r++)this.scriptTagHolder.enqueueSegment(this.curSegmentNum,s.length,s[r]),this.curSegmentNum++}addDisconnectPingFrame(e,t){this.myDisconnFrame=document.createElement("iframe");const n={dframe:"t"};n.id=e,n.pw=t,this.myDisconnFrame.src=this.urlFn(n),this.myDisconnFrame.style.display="none",document.body.appendChild(this.myDisconnFrame)}incrementIncomingBytes_(e){const t=ve(e).length;this.bytesReceived+=t,this.stats_.incrementCounter("bytes_received",t)}}class uo{constructor(e,t,n,s){this.onDisconnect=n,this.urlFn=s,this.outstandingRequests=new Set,this.pendingSegs=[],this.currentSerial=Math.floor(1e8*Math.random()),this.sendNewPolls=!0;{this.uniqueCallbackIdentifier=Ii(),window["pLPCommand"+this.uniqueCallbackIdentifier]=e,window["pRTLPCB"+this.uniqueCallbackIdentifier]=t,this.myIFrame=uo.createIFrame_();let n="";if(this.myIFrame.src&&"javascript:"===this.myIFrame.src.substr(0,11)){n='<script>document.domain="'+document.domain+'";<\/script>'}const s="<html><body>"+n+"</body></html>";try{this.myIFrame.doc.open(),this.myIFrame.doc.write(s),this.myIFrame.doc.close()}catch(r){Pi("frame writing exception"),r.stack&&Pi(r.stack),Pi(r)}}}static createIFrame_(){const e=document.createElement("iframe");if(e.style.display="none",!document.body)throw"Document body has not initialized. Wait to initialize Firebase until after the document is ready.";document.body.appendChild(e);try{e.contentWindow.document||Pi("No IE domain setting required")}catch(t){const n=document.domain;e.src="javascript:void((function(){document.open();document.domain='"+n+"';document.close();})())"}return e.contentDocument?e.doc=e.contentDocument:e.contentWindow?e.doc=e.contentWindow.document:e.document&&(e.doc=e.document),e}close(){this.alive=!1,this.myIFrame&&(this.myIFrame.doc.body.textContent="",setTimeout(()=>{null!==this.myIFrame&&(document.body.removeChild(this.myIFrame),this.myIFrame=null)},Math.floor(0)));const e=this.onDisconnect;e&&(this.onDisconnect=null,e())}startLongPoll(e,t){for(this.myID=e,this.myPW=t,this.alive=!0;this.newRequest_(););}newRequest_(){if(this.alive&&this.sendNewPolls&&this.outstandingRequests.size<(this.pendingSegs.length>0?2:1)){this.currentSerial++;const e={};e.id=this.myID,e.pw=this.myPW,e.ser=this.currentSerial;let t=this.urlFn(e),n="",s=0;for(;this.pendingSegs.length>0;){if(!(this.pendingSegs[0].d.length+30+n.length<=1870))break;{const e=this.pendingSegs.shift();n=n+"&seg"+s+"="+e.seg+"&ts"+s+"="+e.ts+"&d"+s+"="+e.d,s++}}return t+=n,this.addLongPollTag_(t,this.currentSerial),!0}return!1}enqueueSegment(e,t,n){this.pendingSegs.push({seg:e,ts:t,d:n}),this.alive&&this.newRequest_()}addLongPollTag_(e,t){this.outstandingRequests.add(t);const n=()=>{this.outstandingRequests.delete(t),this.newRequest_()},s=setTimeout(n,Math.floor(25e3));this.addTag(e,()=>{clearTimeout(s),n()})}addTag(e,t){setTimeout(()=>{try{if(!this.sendNewPolls)return;const n=this.myIFrame.doc.createElement("script");n.type="text/javascript",n.async=!0,n.src=e,n.onload=n.onreadystatechange=function(){const e=n.readyState;e&&"loaded"!==e&&"complete"!==e||(n.onload=n.onreadystatechange=null,n.parentNode&&n.parentNode.removeChild(n),t())},n.onerror=()=>{Pi("Long-poll script failed to load: "+e),this.sendNewPolls=!1,this.close()},this.myIFrame.doc.body.appendChild(n)}catch(n){}},Math.floor(1))}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let po=null;"undefined"!=typeof MozWebSocket?po=MozWebSocket:"undefined"!=typeof WebSocket&&(po=WebSocket);class go{constructor(e,t,n,s,r,i,o){this.connId=e,this.applicationId=n,this.appCheckToken=s,this.authToken=r,this.keepaliveTimer=null,this.frames=null,this.totalFrames=0,this.bytesSent=0,this.bytesReceived=0,this.log_=Ri(this.connId),this.stats_=ao(t),this.connURL=go.connectionURL_(t,i,o,s,n),this.nodeAdmin=t.nodeAdmin}static connectionURL_(e,t,n,s,r){const i={v:"5"};return"undefined"!=typeof location&&location.hostname&&Xi.test(location.hostname)&&(i.r="f"),t&&(i.s=t),n&&(i.ls=n),s&&(i[Zi]=s),r&&(i.p=r),so(e,eo,i)}open(e,t){this.onDisconnect=t,this.onMessage=e,this.log_("Websocket connecting to "+this.connURL),this.everConnected_=!1,xi.set("previous_websocket_failure",!0);try{let e;ge(),this.mySock=new po(this.connURL,[],e)}catch(n){this.log_("Error instantiating WebSocket.");const e=n.message||n.data;return e&&this.log_(e),void this.onClosed_()}this.mySock.onopen=()=>{this.log_("Websocket connected."),this.everConnected_=!0},this.mySock.onclose=()=>{this.log_("Websocket connection was disconnected."),this.mySock=null,this.onClosed_()},this.mySock.onmessage=e=>{this.handleIncomingFrame(e)},this.mySock.onerror=e=>{this.log_("WebSocket error.  Closing connection.");const t=e.message||e.data;t&&this.log_(t),this.onClosed_()}}start(){}static forceDisallow(){go.forceDisallow_=!0}static isAvailable(){let e=!1;if("undefined"!=typeof navigator&&navigator.userAgent){const t=/Android ([0-9]{0,}\.[0-9]{0,})/,n=navigator.userAgent.match(t);n&&n.length>1&&parseFloat(n[1])<4.4&&(e=!0)}return!e&&null!==po&&!go.forceDisallow_}static previouslyFailed(){return xi.isInMemoryStorage||!0===xi.get("previous_websocket_failure")}markConnectionHealthy(){xi.remove("previous_websocket_failure")}appendFrame_(e){if(this.frames.push(e),this.frames.length===this.totalFrames){const e=this.frames.join("");this.frames=null;const t=ye(e);this.onMessage(t)}}handleNewFrameCount_(e){this.totalFrames=e,this.frames=[]}extractFrameCount_(e){if(K(null===this.frames,"We already have a frame buffer"),e.length<=6){const t=Number(e);if(!isNaN(t))return this.handleNewFrameCount_(t),null}return this.handleNewFrameCount_(1),e}handleIncomingFrame(e){if(null===this.mySock)return;const t=e.data;if(this.bytesReceived+=t.length,this.stats_.incrementCounter("bytes_received",t.length),this.resetKeepAlive(),null!==this.frames)this.appendFrame_(t);else{const e=this.extractFrameCount_(t);null!==e&&this.appendFrame_(e)}}send(e){this.resetKeepAlive();const t=ve(e);this.bytesSent+=t.length,this.stats_.incrementCounter("bytes_sent",t.length);const n=Vi(t,16384);n.length>1&&this.sendString_(String(n.length));for(let s=0;s<n.length;s++)this.sendString_(n[s])}shutdown_(){this.isClosed_=!0,this.keepaliveTimer&&(clearInterval(this.keepaliveTimer),this.keepaliveTimer=null),this.mySock&&(this.mySock.close(),this.mySock=null)}onClosed_(){this.isClosed_||(this.log_("WebSocket is closing itself"),this.shutdown_(),this.onDisconnect&&(this.onDisconnect(this.everConnected_),this.onDisconnect=null))}close(){this.isClosed_||(this.log_("WebSocket is being closed"),this.shutdown_())}resetKeepAlive(){clearInterval(this.keepaliveTimer),this.keepaliveTimer=setInterval(()=>{this.mySock&&this.sendString_("0"),this.resetKeepAlive()},Math.floor(45e3))}sendString_(e){try{this.mySock.send(e)}catch(t){this.log_("Exception thrown from WebSocket.send():",t.message||t.data,"Closing connection."),setTimeout(this.onClosed_.bind(this),0)}}}go.responsesRequiredToBeHealthy=2,go.healthyTimeout=3e4;
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class fo{static get ALL_TRANSPORTS(){return[ho,go]}static get IS_TRANSPORT_INITIALIZED(){return this.globalTransportInitialized_}constructor(e){this.initTransports_(e)}initTransports_(e){const t=go&&go.isAvailable();let n=t&&!go.previouslyFailed();if(e.webSocketOnly&&(t||Di("wss:// URL used, but browser isn't known to support websockets.  Trying anyway."),n=!0),n)this.transports_=[go];else{const e=this.transports_=[];for(const t of fo.ALL_TRANSPORTS)t&&t.isAvailable()&&e.push(t);fo.globalTransportInitialized_=!0}}initialTransport(){if(this.transports_.length>0)return this.transports_[0];throw new Error("No transports available")}upgradeTransport(){return this.transports_.length>1?this.transports_[1]:null}}fo.globalTransportInitialized_=!1;class mo{constructor(e,t,n,s,r,i,o,a,l,c){this.id=e,this.repoInfo_=t,this.applicationId_=n,this.appCheckToken_=s,this.authToken_=r,this.onMessage_=i,this.onReady_=o,this.onDisconnect_=a,this.onKill_=l,this.lastSessionId=c,this.connectionCount=0,this.pendingDataMessages=[],this.state_=0,this.log_=Ri("c:"+this.id+":"),this.transportManager_=new fo(t),this.log_("Connection created"),this.start_()}start_(){const e=this.transportManager_.initialTransport();this.conn_=new e(this.nextTransportId_(),this.repoInfo_,this.applicationId_,this.appCheckToken_,this.authToken_,null,this.lastSessionId),this.primaryResponsesRequired_=e.responsesRequiredToBeHealthy||0;const t=this.connReceiver_(this.conn_),n=this.disconnReceiver_(this.conn_);this.tx_=this.conn_,this.rx_=this.conn_,this.secondaryConn_=null,this.isHealthy_=!1,setTimeout(()=>{this.conn_&&this.conn_.open(t,n)},Math.floor(0));const s=e.healthyTimeout||0;s>0&&(this.healthyTimeout_=Gi(()=>{this.healthyTimeout_=null,this.isHealthy_||(this.conn_&&this.conn_.bytesReceived>102400?(this.log_("Connection exceeded healthy timeout but has received "+this.conn_.bytesReceived+" bytes.  Marking connection healthy."),this.isHealthy_=!0,this.conn_.markConnectionHealthy()):this.conn_&&this.conn_.bytesSent>10240?this.log_("Connection exceeded healthy timeout but has sent "+this.conn_.bytesSent+" bytes.  Leaving connection alive."):(this.log_("Closing unhealthy connection after timeout."),this.close()))},Math.floor(s)))}nextTransportId_(){return"c:"+this.id+":"+this.connectionCount++}disconnReceiver_(e){return t=>{e===this.conn_?this.onConnectionLost_(t):e===this.secondaryConn_?(this.log_("Secondary connection lost."),this.onSecondaryConnectionLost_()):this.log_("closing an old connection")}}connReceiver_(e){return t=>{2!==this.state_&&(e===this.rx_?this.onPrimaryMessageReceived_(t):e===this.secondaryConn_?this.onSecondaryMessageReceived_(t):this.log_("message on old connection"))}}sendRequest(e){const t={t:"d",d:e};this.sendData_(t)}tryCleanupConnection(){this.tx_===this.secondaryConn_&&this.rx_===this.secondaryConn_&&(this.log_("cleaning up and promoting a connection: "+this.secondaryConn_.connId),this.conn_=this.secondaryConn_,this.secondaryConn_=null)}onSecondaryControl_(e){if("t"in e){const t=e.t;"a"===t?this.upgradeIfSecondaryHealthy_():"r"===t?(this.log_("Got a reset on secondary, closing it"),this.secondaryConn_.close(),this.tx_!==this.secondaryConn_&&this.rx_!==this.secondaryConn_||this.close()):"o"===t&&(this.log_("got pong on secondary."),this.secondaryResponsesRequired_--,this.upgradeIfSecondaryHealthy_())}}onSecondaryMessageReceived_(e){const t=qi("t",e),n=qi("d",e);if("c"===t)this.onSecondaryControl_(n);else{if("d"!==t)throw new Error("Unknown protocol layer: "+t);this.pendingDataMessages.push(n)}}upgradeIfSecondaryHealthy_(){this.secondaryResponsesRequired_<=0?(this.log_("Secondary connection is healthy."),this.isHealthy_=!0,this.secondaryConn_.markConnectionHealthy(),this.proceedWithUpgrade_()):(this.log_("sending ping on secondary."),this.secondaryConn_.send({t:"c",d:{t:"p",d:{}}}))}proceedWithUpgrade_(){this.secondaryConn_.start(),this.log_("sending client ack on secondary"),this.secondaryConn_.send({t:"c",d:{t:"a",d:{}}}),this.log_("Ending transmission on primary"),this.conn_.send({t:"c",d:{t:"n",d:{}}}),this.tx_=this.secondaryConn_,this.tryCleanupConnection()}onPrimaryMessageReceived_(e){const t=qi("t",e),n=qi("d",e);"c"===t?this.onControl_(n):"d"===t&&this.onDataMessage_(n)}onDataMessage_(e){this.onPrimaryResponse_(),this.onMessage_(e)}onPrimaryResponse_(){this.isHealthy_||(this.primaryResponsesRequired_--,this.primaryResponsesRequired_<=0&&(this.log_("Primary connection is healthy."),this.isHealthy_=!0,this.conn_.markConnectionHealthy()))}onControl_(e){const t=qi("t",e);if("d"in e){const n=e.d;if("h"===t){const e={...n};this.repoInfo_.isUsingEmulator&&(e.h=this.repoInfo_.host),this.onHandshake_(e)}else if("n"===t){this.log_("recvd end transmission on primary"),this.rx_=this.secondaryConn_;for(let e=0;e<this.pendingDataMessages.length;++e)this.onDataMessage_(this.pendingDataMessages[e]);this.pendingDataMessages=[],this.tryCleanupConnection()}else"s"===t?this.onConnectionShutdown_(n):"r"===t?this.onReset_(n):"e"===t?Ai("Server Error: "+n):"o"===t?(this.log_("got pong on primary."),this.onPrimaryResponse_(),this.sendPingOnPrimaryIfNecessary_()):Ai("Unknown control packet command: "+t)}}onHandshake_(e){const t=e.ts,n=e.v,s=e.h;this.sessionId=e.s,this.repoInfo_.host=s,0===this.state_&&(this.conn_.start(),this.onConnectionEstablished_(this.conn_,t),"5"!==n&&Di("Protocol version mismatch detected"),this.tryStartUpgrade_())}tryStartUpgrade_(){const e=this.transportManager_.upgradeTransport();e&&this.startUpgrade_(e)}startUpgrade_(e){this.secondaryConn_=new e(this.nextTransportId_(),this.repoInfo_,this.applicationId_,this.appCheckToken_,this.authToken_,this.sessionId),this.secondaryResponsesRequired_=e.responsesRequiredToBeHealthy||0;const t=this.connReceiver_(this.secondaryConn_),n=this.disconnReceiver_(this.secondaryConn_);this.secondaryConn_.open(t,n),Gi(()=>{this.secondaryConn_&&(this.log_("Timed out trying to upgrade."),this.secondaryConn_.close())},Math.floor(6e4))}onReset_(e){this.log_("Reset packet received.  New host: "+e),this.repoInfo_.host=e,1===this.state_?this.close():(this.closeConnections_(),this.start_())}onConnectionEstablished_(e,t){this.log_("Realtime connection established."),this.conn_=e,this.state_=1,this.onReady_&&(this.onReady_(t,this.sessionId),this.onReady_=null),0===this.primaryResponsesRequired_?(this.log_("Primary connection is healthy."),this.isHealthy_=!0):Gi(()=>{this.sendPingOnPrimaryIfNecessary_()},Math.floor(5e3))}sendPingOnPrimaryIfNecessary_(){this.isHealthy_||1!==this.state_||(this.log_("sending ping on primary."),this.sendData_({t:"c",d:{t:"p",d:{}}}))}onSecondaryConnectionLost_(){const e=this.secondaryConn_;this.secondaryConn_=null,this.tx_!==e&&this.rx_!==e||this.close()}onConnectionLost_(e){this.conn_=null,e||0!==this.state_?1===this.state_&&this.log_("Realtime connection lost."):(this.log_("Realtime connection failed."),this.repoInfo_.isCacheableHost()&&(xi.remove("host:"+this.repoInfo_.host),this.repoInfo_.internalHost=this.repoInfo_.host)),this.close()}onConnectionShutdown_(e){this.log_("Connection shutdown command received. Shutting down..."),this.onKill_&&(this.onKill_(e),this.onKill_=null),this.onDisconnect_=null,this.close()}sendData_(e){if(1!==this.state_)throw"Connection is not connected";this.tx_.send(e)}close(){2!==this.state_&&(this.log_("Closing realtime connection."),this.state_=2,this.closeConnections_(),this.onDisconnect_&&(this.onDisconnect_(),this.onDisconnect_=null))}closeConnections_(){this.log_("Shutting down all connections"),this.conn_&&(this.conn_.close(),this.conn_=null),this.secondaryConn_&&(this.secondaryConn_.close(),this.secondaryConn_=null),this.healthyTimeout_&&(clearTimeout(this.healthyTimeout_),this.healthyTimeout_=null)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _o{put(e,t,n,s){}merge(e,t,n,s){}refreshAuthToken(e){}refreshAppCheckToken(e){}onDisconnectPut(e,t,n){}onDisconnectMerge(e,t,n){}onDisconnectCancel(e,t){}reportStats(e){}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yo{constructor(e){this.allowedEvents_=e,this.listeners_={},K(Array.isArray(e)&&e.length>0,"Requires a non-empty array")}trigger(e,...t){if(Array.isArray(this.listeners_[e])){const n=[...this.listeners_[e]];for(let e=0;e<n.length;e++)n[e].callback.apply(n[e].context,t)}}on(e,t,n){this.validateEventType_(e),this.listeners_[e]=this.listeners_[e]||[],this.listeners_[e].push({callback:t,context:n});const s=this.getInitialEvent(e);s&&t.apply(n,s)}off(e,t,n){this.validateEventType_(e);const s=this.listeners_[e]||[];for(let r=0;r<s.length;r++)if(s[r].callback===t&&(!n||n===s[r].context))return void s.splice(r,1)}validateEventType_(e){K(this.allowedEvents_.find(t=>t===e),"Unknown event: "+e)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vo extends yo{static getInstance(){return new vo}constructor(){super(["online"]),this.online_=!0,"undefined"==typeof window||void 0===window.addEventListener||de()||(window.addEventListener("online",()=>{this.online_||(this.online_=!0,this.trigger("online",!0))},!1),window.addEventListener("offline",()=>{this.online_&&(this.online_=!1,this.trigger("online",!1))},!1))}getInitialEvent(e){return K("online"===e,"Unknown event type: "+e),[this.online_]}currentlyOnline(){return this.online_}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bo{constructor(e,t){if(void 0===t){this.pieces_=e.split("/");let t=0;for(let e=0;e<this.pieces_.length;e++)this.pieces_[e].length>0&&(this.pieces_[t]=this.pieces_[e],t++);this.pieces_.length=t,this.pieceNum_=0}else this.pieces_=e,this.pieceNum_=t}toString(){let e="";for(let t=this.pieceNum_;t<this.pieces_.length;t++)""!==this.pieces_[t]&&(e+="/"+this.pieces_[t]);return e||"/"}}function wo(){return new bo("")}function xo(e){return e.pieceNum_>=e.pieces_.length?null:e.pieces_[e.pieceNum_]}function ko(e){return e.pieces_.length-e.pieceNum_}function Co(e){let t=e.pieceNum_;return t<e.pieces_.length&&t++,new bo(e.pieces_,t)}function Io(e){return e.pieceNum_<e.pieces_.length?e.pieces_[e.pieces_.length-1]:null}function To(e,t=0){return e.pieces_.slice(e.pieceNum_+t)}function Eo(e){if(e.pieceNum_>=e.pieces_.length)return null;const t=[];for(let n=e.pieceNum_;n<e.pieces_.length-1;n++)t.push(e.pieces_[n]);return new bo(t,0)}function No(e,t){const n=[];for(let s=e.pieceNum_;s<e.pieces_.length;s++)n.push(e.pieces_[s]);if(t instanceof bo)for(let s=t.pieceNum_;s<t.pieces_.length;s++)n.push(t.pieces_[s]);else{const e=t.split("/");for(let t=0;t<e.length;t++)e[t].length>0&&n.push(e[t])}return new bo(n,0)}function So(e){return e.pieceNum_>=e.pieces_.length}function Po(e,t){const n=xo(e),s=xo(t);if(null===n)return t;if(n===s)return Po(Co(e),Co(t));throw new Error("INTERNAL ERROR: innerPath ("+t+") is not within outerPath ("+e+")")}function Ro(e,t){const n=To(e,0),s=To(t,0);for(let r=0;r<n.length&&r<s.length;r++){const e=Fi(n[r],s[r]);if(0!==e)return e}return n.length===s.length?0:n.length<s.length?-1:1}function Ao(e,t){if(ko(e)!==ko(t))return!1;for(let n=e.pieceNum_,s=t.pieceNum_;n<=e.pieces_.length;n++,s++)if(e.pieces_[n]!==t.pieces_[s])return!1;return!0}function Oo(e,t){let n=e.pieceNum_,s=t.pieceNum_;if(ko(e)>ko(t))return!1;for(;n<e.pieces_.length;){if(e.pieces_[n]!==t.pieces_[s])return!1;++n,++s}return!0}class Do{constructor(e,t){this.errorPrefix_=t,this.parts_=To(e,0),this.byteLength_=Math.max(1,this.parts_.length);for(let n=0;n<this.parts_.length;n++)this.byteLength_+=De(this.parts_[n]);Lo(this)}}function Lo(e){if(e.byteLength_>768)throw new Error(e.errorPrefix_+"has a key path longer than 768 bytes ("+e.byteLength_+").");if(e.parts_.length>32)throw new Error(e.errorPrefix_+"path specified exceeds the maximum depth that can be written (32) or object contains a cycle "+jo(e))}function jo(e){return 0===e.parts_.length?"":"in property '"+e.parts_.join(".")+"'"}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mo extends yo{static getInstance(){return new Mo}constructor(){let e,t;super(["visible"]),"undefined"!=typeof document&&void 0!==document.addEventListener&&(void 0!==document.hidden?(t="visibilitychange",e="hidden"):void 0!==document.mozHidden?(t="mozvisibilitychange",e="mozHidden"):void 0!==document.msHidden?(t="msvisibilitychange",e="msHidden"):void 0!==document.webkitHidden&&(t="webkitvisibilitychange",e="webkitHidden")),this.visible_=!0,t&&document.addEventListener(t,()=>{const t=!document[e];t!==this.visible_&&(this.visible_=t,this.trigger("visible",t))},!1)}getInitialEvent(e){return K("visible"===e,"Unknown event type: "+e),[this.visible_]}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fo=1e3;class Uo extends _o{constructor(e,t,n,s,r,i,o,a){if(super(),this.repoInfo_=e,this.applicationId_=t,this.onDataUpdate_=n,this.onConnectStatus_=s,this.onServerInfoUpdate_=r,this.authTokenProvider_=i,this.appCheckTokenProvider_=o,this.authOverride_=a,this.id=Uo.nextPersistentConnectionId_++,this.log_=Ri("p:"+this.id+":"),this.interruptReasons_={},this.listens=new Map,this.outstandingPuts_=[],this.outstandingGets_=[],this.outstandingPutCount_=0,this.outstandingGetCount_=0,this.onDisconnectRequestQueue_=[],this.connected_=!1,this.reconnectDelay_=Fo,this.maxReconnectDelay_=3e5,this.securityDebugCallback_=null,this.lastSessionId=null,this.establishConnectionTimer_=null,this.visible_=!1,this.requestCBHash_={},this.requestNumber_=0,this.realtime_=null,this.authToken_=null,this.appCheckToken_=null,this.forceTokenRefresh_=!1,this.invalidAuthTokenCount_=0,this.invalidAppCheckTokenCount_=0,this.firstConnection_=!0,this.lastConnectionAttemptTime_=null,this.lastConnectionEstablishedTime_=null,a&&!ge())throw new Error("Auth override specified in options, but not supported on non Node.js platforms");Mo.getInstance().on("visible",this.onVisible_,this),-1===e.host.indexOf("fblocal")&&vo.getInstance().on("online",this.onOnline_,this)}sendRequest(e,t,n){const s=++this.requestNumber_,r={r:s,a:e,b:t};this.log_(ve(r)),K(this.connected_,"sendRequest call when we're not connected not allowed."),this.realtime_.sendRequest(r),n&&(this.requestCBHash_[s]=n)}get(e){this.initConnection_();const t=new he,n={action:"g",request:{p:e._path.toString(),q:e._queryObject},onComplete:e=>{const n=e.d;"ok"===e.s?t.resolve(n):t.reject(n)}};this.outstandingGets_.push(n),this.outstandingGetCount_++;const s=this.outstandingGets_.length-1;return this.connected_&&this.sendGet_(s),t.promise}listen(e,t,n,s){this.initConnection_();const r=e._queryIdentifier,i=e._path.toString();this.log_("Listen called for "+i+" "+r),this.listens.has(i)||this.listens.set(i,new Map),K(e._queryParams.isDefault()||!e._queryParams.loadsAllData(),"listen() called for non-default but complete query"),K(!this.listens.get(i).has(r),"listen() called twice for same path/queryId.");const o={onComplete:s,hashFn:t,query:e,tag:n};this.listens.get(i).set(r,o),this.connected_&&this.sendListen_(o)}sendGet_(e){const t=this.outstandingGets_[e];this.sendRequest("g",t.request,n=>{delete this.outstandingGets_[e],this.outstandingGetCount_--,0===this.outstandingGetCount_&&(this.outstandingGets_=[]),t.onComplete&&t.onComplete(n)})}sendListen_(e){const t=e.query,n=t._path.toString(),s=t._queryIdentifier;this.log_("Listen on "+n+" for "+s);const r={p:n};e.tag&&(r.q=t._queryObject,r.t=e.tag),r.h=e.hashFn(),this.sendRequest("q",r,r=>{const i=r.d,o=r.s;Uo.warnOnListenWarnings_(i,t);(this.listens.get(n)&&this.listens.get(n).get(s))===e&&(this.log_("listen response",r),"ok"!==o&&this.removeListen_(n,s),e.onComplete&&e.onComplete(o,i))})}static warnOnListenWarnings_(e,t){if(e&&"object"==typeof e&&we(e,"w")){const n=xe(e,"w");if(Array.isArray(n)&&~n.indexOf("no_index")){const e='".indexOn": "'+t._queryParams.getIndex().toString()+'"',n=t._path.toString();Di(`Using an unspecified index. Your data will be downloaded and filtered on the client. Consider adding ${e} at ${n} to your security rules for better performance.`)}}}refreshAuthToken(e){this.authToken_=e,this.log_("Auth token refreshed"),this.authToken_?this.tryAuth():this.connected_&&this.sendRequest("unauth",{},()=>{}),this.reduceReconnectDelayIfAdminCredential_(e)}reduceReconnectDelayIfAdminCredential_(e){(e&&40===e.length||function(e){const t=be(e).claims;return"object"==typeof t&&!0===t.admin}(e))&&(this.log_("Admin auth credential detected.  Reducing max reconnect time."),this.maxReconnectDelay_=3e4)}refreshAppCheckToken(e){this.appCheckToken_=e,this.log_("App check token refreshed"),this.appCheckToken_?this.tryAppCheck():this.connected_&&this.sendRequest("unappeck",{},()=>{})}tryAuth(){if(this.connected_&&this.authToken_){const e=this.authToken_,t=function(e){const t=be(e).claims;return!!t&&"object"==typeof t&&t.hasOwnProperty("iat")}(e)?"auth":"gauth",n={cred:e};null===this.authOverride_?n.noauth=!0:"object"==typeof this.authOverride_&&(n.authvar=this.authOverride_),this.sendRequest(t,n,t=>{const n=t.s,s=t.d||"error";this.authToken_===e&&("ok"===n?this.invalidAuthTokenCount_=0:this.onAuthRevoked_(n,s))})}}tryAppCheck(){this.connected_&&this.appCheckToken_&&this.sendRequest("appcheck",{token:this.appCheckToken_},e=>{const t=e.s,n=e.d||"error";"ok"===t?this.invalidAppCheckTokenCount_=0:this.onAppCheckRevoked_(t,n)})}unlisten(e,t){const n=e._path.toString(),s=e._queryIdentifier;this.log_("Unlisten called for "+n+" "+s),K(e._queryParams.isDefault()||!e._queryParams.loadsAllData(),"unlisten() called for non-default but complete query");this.removeListen_(n,s)&&this.connected_&&this.sendUnlisten_(n,s,e._queryObject,t)}sendUnlisten_(e,t,n,s){this.log_("Unlisten on "+e+" for "+t);const r={p:e};s&&(r.q=n,r.t=s),this.sendRequest("n",r)}onDisconnectPut(e,t,n){this.initConnection_(),this.connected_?this.sendOnDisconnect_("o",e,t,n):this.onDisconnectRequestQueue_.push({pathString:e,action:"o",data:t,onComplete:n})}onDisconnectMerge(e,t,n){this.initConnection_(),this.connected_?this.sendOnDisconnect_("om",e,t,n):this.onDisconnectRequestQueue_.push({pathString:e,action:"om",data:t,onComplete:n})}onDisconnectCancel(e,t){this.initConnection_(),this.connected_?this.sendOnDisconnect_("oc",e,null,t):this.onDisconnectRequestQueue_.push({pathString:e,action:"oc",data:null,onComplete:t})}sendOnDisconnect_(e,t,n,s){const r={p:t,d:n};this.log_("onDisconnect "+e,r),this.sendRequest(e,r,e=>{s&&setTimeout(()=>{s(e.s,e.d)},Math.floor(0))})}put(e,t,n,s){this.putInternal("p",e,t,n,s)}merge(e,t,n,s){this.putInternal("m",e,t,n,s)}putInternal(e,t,n,s,r){this.initConnection_();const i={p:t,d:n};void 0!==r&&(i.h=r),this.outstandingPuts_.push({action:e,request:i,onComplete:s}),this.outstandingPutCount_++;const o=this.outstandingPuts_.length-1;this.connected_?this.sendPut_(o):this.log_("Buffering put: "+t)}sendPut_(e){const t=this.outstandingPuts_[e].action,n=this.outstandingPuts_[e].request,s=this.outstandingPuts_[e].onComplete;this.outstandingPuts_[e].queued=this.connected_,this.sendRequest(t,n,n=>{this.log_(t+" response",n),delete this.outstandingPuts_[e],this.outstandingPutCount_--,0===this.outstandingPutCount_&&(this.outstandingPuts_=[]),s&&s(n.s,n.d)})}reportStats(e){if(this.connected_){const t={c:e};this.log_("reportStats",t),this.sendRequest("s",t,e=>{if("ok"!==e.s){const t=e.d;this.log_("reportStats","Error sending stats: "+t)}})}}onDataMessage_(e){if("r"in e){this.log_("from server: "+ve(e));const t=e.r,n=this.requestCBHash_[t];n&&(delete this.requestCBHash_[t],n(e.b))}else{if("error"in e)throw"A server-side error has occurred: "+e.error;"a"in e&&this.onDataPush_(e.a,e.b)}}onDataPush_(e,t){this.log_("handleServerMessage",e,t),"d"===e?this.onDataUpdate_(t.p,t.d,!1,t.t):"m"===e?this.onDataUpdate_(t.p,t.d,!0,t.t):"c"===e?this.onListenRevoked_(t.p,t.q):"ac"===e?this.onAuthRevoked_(t.s,t.d):"apc"===e?this.onAppCheckRevoked_(t.s,t.d):"sd"===e?this.onSecurityDebugPacket_(t):Ai("Unrecognized action received from server: "+ve(e)+"\nAre you using the latest client?")}onReady_(e,t){this.log_("connection ready"),this.connected_=!0,this.lastConnectionEstablishedTime_=(new Date).getTime(),this.handleTimestamp_(e),this.lastSessionId=t,this.firstConnection_&&this.sendConnectStats_(),this.restoreState_(),this.firstConnection_=!1,this.onConnectStatus_(!0)}scheduleConnect_(e){K(!this.realtime_,"Scheduling a connect when we're already connected/ing?"),this.establishConnectionTimer_&&clearTimeout(this.establishConnectionTimer_),this.establishConnectionTimer_=setTimeout(()=>{this.establishConnectionTimer_=null,this.establishConnection_()},Math.floor(e))}initConnection_(){!this.realtime_&&this.firstConnection_&&this.scheduleConnect_(0)}onVisible_(e){e&&!this.visible_&&this.reconnectDelay_===this.maxReconnectDelay_&&(this.log_("Window became visible.  Reducing delay."),this.reconnectDelay_=Fo,this.realtime_||this.scheduleConnect_(0)),this.visible_=e}onOnline_(e){e?(this.log_("Browser went online."),this.reconnectDelay_=Fo,this.realtime_||this.scheduleConnect_(0)):(this.log_("Browser went offline.  Killing connection."),this.realtime_&&this.realtime_.close())}onRealtimeDisconnect_(){if(this.log_("data client disconnected"),this.connected_=!1,this.realtime_=null,this.cancelSentTransactions_(),this.requestCBHash_={},this.shouldReconnect_()){if(this.visible_){if(this.lastConnectionEstablishedTime_){(new Date).getTime()-this.lastConnectionEstablishedTime_>3e4&&(this.reconnectDelay_=Fo),this.lastConnectionEstablishedTime_=null}}else this.log_("Window isn't visible.  Delaying reconnect."),this.reconnectDelay_=this.maxReconnectDelay_,this.lastConnectionAttemptTime_=(new Date).getTime();const e=Math.max(0,(new Date).getTime()-this.lastConnectionAttemptTime_);let t=Math.max(0,this.reconnectDelay_-e);t=Math.random()*t,this.log_("Trying to reconnect in "+t+"ms"),this.scheduleConnect_(t),this.reconnectDelay_=Math.min(this.maxReconnectDelay_,1.3*this.reconnectDelay_)}this.onConnectStatus_(!1)}async establishConnection_(){if(this.shouldReconnect_()){this.log_("Making a connection attempt"),this.lastConnectionAttemptTime_=(new Date).getTime(),this.lastConnectionEstablishedTime_=null;const t=this.onDataMessage_.bind(this),n=this.onReady_.bind(this),s=this.onRealtimeDisconnect_.bind(this),r=this.id+":"+Uo.nextConnectionId_++,i=this.lastSessionId;let o=!1,a=null;const l=function(){a?a.close():(o=!0,s())},c=function(e){K(a,"sendRequest call when we're not connected not allowed."),a.sendRequest(e)};this.realtime_={close:l,sendRequest:c};const h=this.forceTokenRefresh_;this.forceTokenRefresh_=!1;try{const[e,l]=await Promise.all([this.authTokenProvider_.getToken(h),this.appCheckTokenProvider_.getToken(h)]);o?Pi("getToken() completed but was canceled"):(Pi("getToken() completed. Creating connection."),this.authToken_=e&&e.accessToken,this.appCheckToken_=l&&l.token,a=new mo(r,this.repoInfo_,this.applicationId_,this.appCheckToken_,this.authToken_,t,n,s,e=>{Di(e+" ("+this.repoInfo_.toString()+")"),this.interrupt("server_kill")},i))}catch(e){this.log_("Failed to get token: "+e),o||(this.repoInfo_.nodeAdmin&&Di(e),l())}}}interrupt(e){Pi("Interrupting connection for reason: "+e),this.interruptReasons_[e]=!0,this.realtime_?this.realtime_.close():(this.establishConnectionTimer_&&(clearTimeout(this.establishConnectionTimer_),this.establishConnectionTimer_=null),this.connected_&&this.onRealtimeDisconnect_())}resume(e){Pi("Resuming connection for reason: "+e),delete this.interruptReasons_[e],ke(this.interruptReasons_)&&(this.reconnectDelay_=Fo,this.realtime_||this.scheduleConnect_(0))}handleTimestamp_(e){const t=e-(new Date).getTime();this.onServerInfoUpdate_({serverTimeOffset:t})}cancelSentTransactions_(){for(let e=0;e<this.outstandingPuts_.length;e++){const t=this.outstandingPuts_[e];t&&"h"in t.request&&t.queued&&(t.onComplete&&t.onComplete("disconnect"),delete this.outstandingPuts_[e],this.outstandingPutCount_--)}0===this.outstandingPutCount_&&(this.outstandingPuts_=[])}onListenRevoked_(e,t){let n;n=t?t.map(e=>Wi(e)).join("$"):"default";const s=this.removeListen_(e,n);s&&s.onComplete&&s.onComplete("permission_denied")}removeListen_(e,t){const n=new bo(e).toString();let s;if(this.listens.has(n)){const e=this.listens.get(n);s=e.get(t),e.delete(t),0===e.size&&this.listens.delete(n)}else s=void 0;return s}onAuthRevoked_(e,t){Pi("Auth token revoked: "+e+"/"+t),this.authToken_=null,this.forceTokenRefresh_=!0,this.realtime_.close(),"invalid_token"!==e&&"permission_denied"!==e||(this.invalidAuthTokenCount_++,this.invalidAuthTokenCount_>=3&&(this.reconnectDelay_=3e4,this.authTokenProvider_.notifyForInvalidToken()))}onAppCheckRevoked_(e,t){Pi("App check token revoked: "+e+"/"+t),this.appCheckToken_=null,this.forceTokenRefresh_=!0,"invalid_token"!==e&&"permission_denied"!==e||(this.invalidAppCheckTokenCount_++,this.invalidAppCheckTokenCount_>=3&&this.appCheckTokenProvider_.notifyForInvalidToken())}onSecurityDebugPacket_(e){this.securityDebugCallback_?this.securityDebugCallback_(e):"msg"in e&&console.log("FIREBASE: "+e.msg.replace("\n","\nFIREBASE: "))}restoreState_(){this.tryAuth(),this.tryAppCheck();for(const e of this.listens.values())for(const t of e.values())this.sendListen_(t);for(let e=0;e<this.outstandingPuts_.length;e++)this.outstandingPuts_[e]&&this.sendPut_(e);for(;this.onDisconnectRequestQueue_.length;){const e=this.onDisconnectRequestQueue_.shift();this.sendOnDisconnect_(e.action,e.pathString,e.data,e.onComplete)}for(let e=0;e<this.outstandingGets_.length;e++)this.outstandingGets_[e]&&this.sendGet_(e)}sendConnectStats_(){const e={};e["sdk.js."+yi.replace(/\./g,"-")]=1,de()?e["framework.cordova"]=1:pe()&&(e["framework.reactnative"]=1),this.reportStats(e)}shouldReconnect_(){const e=vo.getInstance().currentlyOnline();return ke(this.interruptReasons_)&&e}}Uo.nextPersistentConnectionId_=0,Uo.nextConnectionId_=0;
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class qo{constructor(e,t){this.name=e,this.node=t}static Wrap(e,t){return new qo(e,t)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wo{getCompare(){return this.compare.bind(this)}indexedValueChanged(e,t){const n=new qo(ji,e),s=new qo(ji,t);return 0!==this.compare(n,s)}minPost(){return qo.MIN}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Vo;class Ho extends Wo{static get __EMPTY_NODE(){return Vo}static set __EMPTY_NODE(e){Vo=e}compare(e,t){return Fi(e.name,t.name)}isDefinedOn(e){throw G("KeyIndex.isDefinedOn not expected to be called.")}indexedValueChanged(e,t){return!1}minPost(){return qo.MIN}maxPost(){return new qo(Mi,Vo)}makePost(e,t){return K("string"==typeof e,"KeyIndex indexValue must always be a string."),new qo(e,Vo)}toString(){return".key"}}const zo=new Ho;
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bo{constructor(e,t,n,s,r=null){this.isReverse_=s,this.resultGenerator_=r,this.nodeStack_=[];let i=1;for(;!e.isEmpty();)if(i=t?n(e.key,t):1,s&&(i*=-1),i<0)e=this.isReverse_?e.left:e.right;else{if(0===i){this.nodeStack_.push(e);break}this.nodeStack_.push(e),e=this.isReverse_?e.right:e.left}}getNext(){if(0===this.nodeStack_.length)return null;let e,t=this.nodeStack_.pop();if(e=this.resultGenerator_?this.resultGenerator_(t.key,t.value):{key:t.key,value:t.value},this.isReverse_)for(t=t.left;!t.isEmpty();)this.nodeStack_.push(t),t=t.right;else for(t=t.right;!t.isEmpty();)this.nodeStack_.push(t),t=t.left;return e}hasNext(){return this.nodeStack_.length>0}peek(){if(0===this.nodeStack_.length)return null;const e=this.nodeStack_[this.nodeStack_.length-1];return this.resultGenerator_?this.resultGenerator_(e.key,e.value):{key:e.key,value:e.value}}}class $o{constructor(e,t,n,s,r){this.key=e,this.value=t,this.color=null!=n?n:$o.RED,this.left=null!=s?s:Ko.EMPTY_NODE,this.right=null!=r?r:Ko.EMPTY_NODE}copy(e,t,n,s,r){return new $o(null!=e?e:this.key,null!=t?t:this.value,null!=n?n:this.color,null!=s?s:this.left,null!=r?r:this.right)}count(){return this.left.count()+1+this.right.count()}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||!!e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min_(){return this.left.isEmpty()?this:this.left.min_()}minKey(){return this.min_().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,n){let s=this;const r=n(e,s.key);return s=r<0?s.copy(null,null,null,s.left.insert(e,t,n),null):0===r?s.copy(null,t,null,null,null):s.copy(null,null,null,null,s.right.insert(e,t,n)),s.fixUp_()}removeMin_(){if(this.left.isEmpty())return Ko.EMPTY_NODE;let e=this;return e.left.isRed_()||e.left.left.isRed_()||(e=e.moveRedLeft_()),e=e.copy(null,null,null,e.left.removeMin_(),null),e.fixUp_()}remove(e,t){let n,s;if(n=this,t(e,n.key)<0)n.left.isEmpty()||n.left.isRed_()||n.left.left.isRed_()||(n=n.moveRedLeft_()),n=n.copy(null,null,null,n.left.remove(e,t),null);else{if(n.left.isRed_()&&(n=n.rotateRight_()),n.right.isEmpty()||n.right.isRed_()||n.right.left.isRed_()||(n=n.moveRedRight_()),0===t(e,n.key)){if(n.right.isEmpty())return Ko.EMPTY_NODE;s=n.right.min_(),n=n.copy(s.key,s.value,null,null,n.right.removeMin_())}n=n.copy(null,null,null,null,n.right.remove(e,t))}return n.fixUp_()}isRed_(){return this.color}fixUp_(){let e=this;return e.right.isRed_()&&!e.left.isRed_()&&(e=e.rotateLeft_()),e.left.isRed_()&&e.left.left.isRed_()&&(e=e.rotateRight_()),e.left.isRed_()&&e.right.isRed_()&&(e=e.colorFlip_()),e}moveRedLeft_(){let e=this.colorFlip_();return e.right.left.isRed_()&&(e=e.copy(null,null,null,null,e.right.rotateRight_()),e=e.rotateLeft_(),e=e.colorFlip_()),e}moveRedRight_(){let e=this.colorFlip_();return e.left.left.isRed_()&&(e=e.rotateRight_(),e=e.colorFlip_()),e}rotateLeft_(){const e=this.copy(null,null,$o.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight_(){const e=this.copy(null,null,$o.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip_(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth_(){const e=this.check_();return Math.pow(2,e)<=this.count()+1}check_(){if(this.isRed_()&&this.left.isRed_())throw new Error("Red node has red child("+this.key+","+this.value+")");if(this.right.isRed_())throw new Error("Right child of ("+this.key+","+this.value+") is red");const e=this.left.check_();if(e!==this.right.check_())throw new Error("Black depths differ");return e+(this.isRed_()?0:1)}}$o.RED=!0,$o.BLACK=!1;class Ko{constructor(e,t=Ko.EMPTY_NODE){this.comparator_=e,this.root_=t}insert(e,t){return new Ko(this.comparator_,this.root_.insert(e,t,this.comparator_).copy(null,null,$o.BLACK,null,null))}remove(e){return new Ko(this.comparator_,this.root_.remove(e,this.comparator_).copy(null,null,$o.BLACK,null,null))}get(e){let t,n=this.root_;for(;!n.isEmpty();){if(t=this.comparator_(e,n.key),0===t)return n.value;t<0?n=n.left:t>0&&(n=n.right)}return null}getPredecessorKey(e){let t,n=this.root_,s=null;for(;!n.isEmpty();){if(t=this.comparator_(e,n.key),0===t){if(n.left.isEmpty())return s?s.key:null;for(n=n.left;!n.right.isEmpty();)n=n.right;return n.key}t<0?n=n.left:t>0&&(s=n,n=n.right)}throw new Error("Attempted to find predecessor key for a nonexistent key.  What gives?")}isEmpty(){return this.root_.isEmpty()}count(){return this.root_.count()}minKey(){return this.root_.minKey()}maxKey(){return this.root_.maxKey()}inorderTraversal(e){return this.root_.inorderTraversal(e)}reverseTraversal(e){return this.root_.reverseTraversal(e)}getIterator(e){return new Bo(this.root_,null,this.comparator_,!1,e)}getIteratorFrom(e,t){return new Bo(this.root_,e,this.comparator_,!1,t)}getReverseIteratorFrom(e,t){return new Bo(this.root_,e,this.comparator_,!0,t)}getReverseIterator(e){return new Bo(this.root_,null,this.comparator_,!0,e)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function Go(e,t){return Fi(e.name,t.name)}function Yo(e,t){return Fi(e,t)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Jo;Ko.EMPTY_NODE=new class{copy(e,t,n,s,r){return this}insert(e,t,n){return new $o(e,t,null)}remove(e,t){return this}count(){return 0}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}check_(){return 0}isRed_(){return!1}};const Qo=function(e){return"number"==typeof e?"number:"+zi(e):"string:"+e},Xo=function(e){if(e.isLeafNode()){const t=e.val();K("string"==typeof t||"number"==typeof t||"object"==typeof t&&we(t,".sv"),"Priority must be a string or number.")}else K(e===Jo||e.isEmpty(),"priority of unexpected type.");K(e===Jo||e.getPriority().isEmpty(),"Priority nodes can't have a priority of their own.")};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
let Zo,ea,ta;class na{static set __childrenNodeConstructor(e){Zo=e}static get __childrenNodeConstructor(){return Zo}constructor(e,t=na.__childrenNodeConstructor.EMPTY_NODE){this.value_=e,this.priorityNode_=t,this.lazyHash_=null,K(void 0!==this.value_&&null!==this.value_,"LeafNode shouldn't be created with null/undefined value."),Xo(this.priorityNode_)}isLeafNode(){return!0}getPriority(){return this.priorityNode_}updatePriority(e){return new na(this.value_,e)}getImmediateChild(e){return".priority"===e?this.priorityNode_:na.__childrenNodeConstructor.EMPTY_NODE}getChild(e){return So(e)?this:".priority"===xo(e)?this.priorityNode_:na.__childrenNodeConstructor.EMPTY_NODE}hasChild(){return!1}getPredecessorChildName(e,t){return null}updateImmediateChild(e,t){return".priority"===e?this.updatePriority(t):t.isEmpty()&&".priority"!==e?this:na.__childrenNodeConstructor.EMPTY_NODE.updateImmediateChild(e,t).updatePriority(this.priorityNode_)}updateChild(e,t){const n=xo(e);return null===n?t:t.isEmpty()&&".priority"!==n?this:(K(".priority"!==n||1===ko(e),".priority must be the last token in a path"),this.updateImmediateChild(n,na.__childrenNodeConstructor.EMPTY_NODE.updateChild(Co(e),t)))}isEmpty(){return!1}numChildren(){return 0}forEachChild(e,t){return!1}val(e){return e&&!this.getPriority().isEmpty()?{".value":this.getValue(),".priority":this.getPriority().val()}:this.getValue()}hash(){if(null===this.lazyHash_){let e="";this.priorityNode_.isEmpty()||(e+="priority:"+Qo(this.priorityNode_.val())+":");const t=typeof this.value_;e+=t+":",e+="number"===t?zi(this.value_):this.value_,this.lazyHash_=Ti(e)}return this.lazyHash_}getValue(){return this.value_}compareTo(e){return e===na.__childrenNodeConstructor.EMPTY_NODE?1:e instanceof na.__childrenNodeConstructor?-1:(K(e.isLeafNode(),"Unknown node type"),this.compareToLeafNode_(e))}compareToLeafNode_(e){const t=typeof e.value_,n=typeof this.value_,s=na.VALUE_TYPE_ORDER.indexOf(t),r=na.VALUE_TYPE_ORDER.indexOf(n);return K(s>=0,"Unknown leaf type: "+t),K(r>=0,"Unknown leaf type: "+n),s===r?"object"===n?0:this.value_<e.value_?-1:this.value_===e.value_?0:1:r-s}withIndex(){return this}isIndexed(){return!0}equals(e){if(e===this)return!0;if(e.isLeafNode()){const t=e;return this.value_===t.value_&&this.priorityNode_.equals(t.priorityNode_)}return!1}}na.VALUE_TYPE_ORDER=["object","boolean","number","string"];const sa=new class extends Wo{compare(e,t){const n=e.node.getPriority(),s=t.node.getPriority(),r=n.compareTo(s);return 0===r?Fi(e.name,t.name):r}isDefinedOn(e){return!e.getPriority().isEmpty()}indexedValueChanged(e,t){return!e.getPriority().equals(t.getPriority())}minPost(){return qo.MIN}maxPost(){return new qo(Mi,new na("[PRIORITY-POST]",ta))}makePost(e,t){const n=ea(e);return new qo(t,new na("[PRIORITY-POST]",n))}toString(){return".priority"}},ra=Math.log(2);
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ia{constructor(e){var t;this.count=(t=e+1,parseInt(Math.log(t)/ra,10)),this.current_=this.count-1;const n=(s=this.count,parseInt(Array(s+1).join("1"),2));var s;this.bits_=e+1&n}nextBitIsOne(){const e=!(this.bits_&1<<this.current_);return this.current_--,e}}const oa=function(e,t,n,s){e.sort(t);const r=function(t,s){const i=s-t;let o,a;if(0===i)return null;if(1===i)return o=e[t],a=n?n(o):o,new $o(a,o.node,$o.BLACK,null,null);{const l=parseInt(i/2,10)+t,c=r(t,l),h=r(l+1,s);return o=e[l],a=n?n(o):o,new $o(a,o.node,$o.BLACK,c,h)}},i=function(t){let s=null,i=null,o=e.length;const a=function(t,s){const i=o-t,a=o;o-=t;const c=r(i+1,a),h=e[i],u=n?n(h):h;l(new $o(u,h.node,s,null,c))},l=function(e){s?(s.left=e,s=e):(i=e,s=e)};for(let e=0;e<t.count;++e){const n=t.nextBitIsOne(),s=Math.pow(2,t.count-(e+1));n?a(s,$o.BLACK):(a(s,$o.BLACK),a(s,$o.RED))}return i}(new ia(e.length));return new Ko(s||t,i)};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let aa;const la={};class ca{static get Default(){return K(la&&sa,"ChildrenNode.ts has not been loaded"),aa=aa||new ca({".priority":la},{".priority":sa}),aa}constructor(e,t){this.indexes_=e,this.indexSet_=t}get(e){const t=xe(this.indexes_,e);if(!t)throw new Error("No index defined for "+e);return t instanceof Ko?t:null}hasIndex(e){return we(this.indexSet_,e.toString())}addIndex(e,t){K(e!==zo,"KeyIndex always exists and isn't meant to be added to the IndexMap.");const n=[];let s=!1;const r=t.getIterator(qo.Wrap);let i,o=r.getNext();for(;o;)s=s||e.isDefinedOn(o.node),n.push(o),o=r.getNext();i=s?oa(n,e.getCompare()):la;const a=e.toString(),l={...this.indexSet_};l[a]=e;const c={...this.indexes_};return c[a]=i,new ca(c,l)}addToIndexes(e,t){const n=Ce(this.indexes_,(n,s)=>{const r=xe(this.indexSet_,s);if(K(r,"Missing index implementation for "+s),n===la){if(r.isDefinedOn(e.node)){const n=[],s=t.getIterator(qo.Wrap);let i=s.getNext();for(;i;)i.name!==e.name&&n.push(i),i=s.getNext();return n.push(e),oa(n,r.getCompare())}return la}{const s=t.get(e.name);let r=n;return s&&(r=r.remove(new qo(e.name,s))),r.insert(e,e.node)}});return new ca(n,this.indexSet_)}removeFromIndexes(e,t){const n=Ce(this.indexes_,n=>{if(n===la)return n;{const s=t.get(e.name);return s?n.remove(new qo(e.name,s)):n}});return new ca(n,this.indexSet_)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ha;class ua{static get EMPTY_NODE(){return ha||(ha=new ua(new Ko(Yo),null,ca.Default))}constructor(e,t,n){this.children_=e,this.priorityNode_=t,this.indexMap_=n,this.lazyHash_=null,this.priorityNode_&&Xo(this.priorityNode_),this.children_.isEmpty()&&K(!this.priorityNode_||this.priorityNode_.isEmpty(),"An empty node cannot have a priority")}isLeafNode(){return!1}getPriority(){return this.priorityNode_||ha}updatePriority(e){return this.children_.isEmpty()?this:new ua(this.children_,e,this.indexMap_)}getImmediateChild(e){if(".priority"===e)return this.getPriority();{const t=this.children_.get(e);return null===t?ha:t}}getChild(e){const t=xo(e);return null===t?this:this.getImmediateChild(t).getChild(Co(e))}hasChild(e){return null!==this.children_.get(e)}updateImmediateChild(e,t){if(K(t,"We should always be passing snapshot nodes"),".priority"===e)return this.updatePriority(t);{const n=new qo(e,t);let s,r;t.isEmpty()?(s=this.children_.remove(e),r=this.indexMap_.removeFromIndexes(n,this.children_)):(s=this.children_.insert(e,t),r=this.indexMap_.addToIndexes(n,this.children_));const i=s.isEmpty()?ha:this.priorityNode_;return new ua(s,i,r)}}updateChild(e,t){const n=xo(e);if(null===n)return t;{K(".priority"!==xo(e)||1===ko(e),".priority must be the last token in a path");const s=this.getImmediateChild(n).updateChild(Co(e),t);return this.updateImmediateChild(n,s)}}isEmpty(){return this.children_.isEmpty()}numChildren(){return this.children_.count()}val(e){if(this.isEmpty())return null;const t={};let n=0,s=0,r=!0;if(this.forEachChild(sa,(i,o)=>{t[i]=o.val(e),n++,r&&ua.INTEGER_REGEXP_.test(i)?s=Math.max(s,Number(i)):r=!1}),!e&&r&&s<2*n){const e=[];for(const n in t)e[n]=t[n];return e}return e&&!this.getPriority().isEmpty()&&(t[".priority"]=this.getPriority().val()),t}hash(){if(null===this.lazyHash_){let e="";this.getPriority().isEmpty()||(e+="priority:"+Qo(this.getPriority().val())+":"),this.forEachChild(sa,(t,n)=>{const s=n.hash();""!==s&&(e+=":"+t+":"+s)}),this.lazyHash_=""===e?"":Ti(e)}return this.lazyHash_}getPredecessorChildName(e,t,n){const s=this.resolveIndex_(n);if(s){const n=s.getPredecessorKey(new qo(e,t));return n?n.name:null}return this.children_.getPredecessorKey(e)}getFirstChildName(e){const t=this.resolveIndex_(e);if(t){const e=t.minKey();return e&&e.name}return this.children_.minKey()}getFirstChild(e){const t=this.getFirstChildName(e);return t?new qo(t,this.children_.get(t)):null}getLastChildName(e){const t=this.resolveIndex_(e);if(t){const e=t.maxKey();return e&&e.name}return this.children_.maxKey()}getLastChild(e){const t=this.getLastChildName(e);return t?new qo(t,this.children_.get(t)):null}forEachChild(e,t){const n=this.resolveIndex_(e);return n?n.inorderTraversal(e=>t(e.name,e.node)):this.children_.inorderTraversal(t)}getIterator(e){return this.getIteratorFrom(e.minPost(),e)}getIteratorFrom(e,t){const n=this.resolveIndex_(t);if(n)return n.getIteratorFrom(e,e=>e);{const n=this.children_.getIteratorFrom(e.name,qo.Wrap);let s=n.peek();for(;null!=s&&t.compare(s,e)<0;)n.getNext(),s=n.peek();return n}}getReverseIterator(e){return this.getReverseIteratorFrom(e.maxPost(),e)}getReverseIteratorFrom(e,t){const n=this.resolveIndex_(t);if(n)return n.getReverseIteratorFrom(e,e=>e);{const n=this.children_.getReverseIteratorFrom(e.name,qo.Wrap);let s=n.peek();for(;null!=s&&t.compare(s,e)>0;)n.getNext(),s=n.peek();return n}}compareTo(e){return this.isEmpty()?e.isEmpty()?0:-1:e.isLeafNode()||e.isEmpty()?1:e===da?-1:0}withIndex(e){if(e===zo||this.indexMap_.hasIndex(e))return this;{const t=this.indexMap_.addIndex(e,this.children_);return new ua(this.children_,this.priorityNode_,t)}}isIndexed(e){return e===zo||this.indexMap_.hasIndex(e)}equals(e){if(e===this)return!0;if(e.isLeafNode())return!1;{const t=e;if(this.getPriority().equals(t.getPriority())){if(this.children_.count()===t.children_.count()){const e=this.getIterator(sa),n=t.getIterator(sa);let s=e.getNext(),r=n.getNext();for(;s&&r;){if(s.name!==r.name||!s.node.equals(r.node))return!1;s=e.getNext(),r=n.getNext()}return null===s&&null===r}return!1}return!1}}resolveIndex_(e){return e===zo?null:this.indexMap_.get(e.toString())}}ua.INTEGER_REGEXP_=/^(0|[1-9]\d*)$/;const da=new class extends ua{constructor(){super(new Ko(Yo),ua.EMPTY_NODE,ca.Default)}compareTo(e){return e===this?0:1}equals(e){return e===this}getPriority(){return this}getImmediateChild(e){return ua.EMPTY_NODE}isEmpty(){return!1}};Object.defineProperties(qo,{MIN:{value:new qo(ji,ua.EMPTY_NODE)},MAX:{value:new qo(Mi,da)}}),Ho.__EMPTY_NODE=ua.EMPTY_NODE,na.__childrenNodeConstructor=ua,Jo=da,function(e){ta=e}(da);function pa(e,t=null){if(null===e)return ua.EMPTY_NODE;if("object"==typeof e&&".priority"in e&&(t=e[".priority"]),K(null===t||"string"==typeof t||"number"==typeof t||"object"==typeof t&&".sv"in t,"Invalid priority type found: "+typeof t),"object"==typeof e&&".value"in e&&null!==e[".value"]&&(e=e[".value"]),"object"!=typeof e||".sv"in e){return new na(e,pa(t))}if(e instanceof Array){let n=ua.EMPTY_NODE;return Hi(e,(t,s)=>{if(we(e,t)&&"."!==t.substring(0,1)){const e=pa(s);!e.isLeafNode()&&e.isEmpty()||(n=n.updateImmediateChild(t,e))}}),n.updatePriority(pa(t))}{const n=[];let s=!1;if(Hi(e,(e,t)=>{if("."!==e.substring(0,1)){const r=pa(t);r.isEmpty()||(s=s||!r.getPriority().isEmpty(),n.push(new qo(e,r)))}}),0===n.length)return ua.EMPTY_NODE;const r=oa(n,Go,e=>e.name,Yo);if(s){const e=oa(n,sa.getCompare());return new ua(r,pa(t),new ca({".priority":e},{".priority":sa}))}return new ua(r,pa(t),ca.Default)}}!function(e){ea=e}(pa);
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class ga extends Wo{constructor(e){super(),this.indexPath_=e,K(!So(e)&&".priority"!==xo(e),"Can't create PathIndex with empty path or .priority key")}extractChild(e){return e.getChild(this.indexPath_)}isDefinedOn(e){return!e.getChild(this.indexPath_).isEmpty()}compare(e,t){const n=this.extractChild(e.node),s=this.extractChild(t.node),r=n.compareTo(s);return 0===r?Fi(e.name,t.name):r}makePost(e,t){const n=pa(e),s=ua.EMPTY_NODE.updateChild(this.indexPath_,n);return new qo(t,s)}maxPost(){const e=ua.EMPTY_NODE.updateChild(this.indexPath_,da);return new qo(Mi,e)}toString(){return To(this.indexPath_,0).join("/")}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fa=new class extends Wo{compare(e,t){const n=e.node.compareTo(t.node);return 0===n?Fi(e.name,t.name):n}isDefinedOn(e){return!0}indexedValueChanged(e,t){return!e.equals(t)}minPost(){return qo.MIN}maxPost(){return qo.MAX}makePost(e,t){const n=pa(e);return new qo(t,n)}toString(){return".value"}};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ma(e){return{type:"value",snapshotNode:e}}function _a(e,t){return{type:"child_added",snapshotNode:t,childName:e}}function ya(e,t){return{type:"child_removed",snapshotNode:t,childName:e}}function va(e,t,n){return{type:"child_changed",snapshotNode:t,childName:e,oldSnap:n}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class ba{constructor(e){this.index_=e}updateChild(e,t,n,s,r,i){K(e.isIndexed(this.index_),"A node must be indexed if only a child is updated");const o=e.getImmediateChild(t);return o.getChild(s).equals(n.getChild(s))&&o.isEmpty()===n.isEmpty()?e:(null!=i&&(n.isEmpty()?e.hasChild(t)?i.trackChildChange(ya(t,o)):K(e.isLeafNode(),"A child remove without an old child only makes sense on a leaf node"):o.isEmpty()?i.trackChildChange(_a(t,n)):i.trackChildChange(va(t,n,o))),e.isLeafNode()&&n.isEmpty()?e:e.updateImmediateChild(t,n).withIndex(this.index_))}updateFullNode(e,t,n){return null!=n&&(e.isLeafNode()||e.forEachChild(sa,(e,s)=>{t.hasChild(e)||n.trackChildChange(ya(e,s))}),t.isLeafNode()||t.forEachChild(sa,(t,s)=>{if(e.hasChild(t)){const r=e.getImmediateChild(t);r.equals(s)||n.trackChildChange(va(t,s,r))}else n.trackChildChange(_a(t,s))})),t.withIndex(this.index_)}updatePriority(e,t){return e.isEmpty()?ua.EMPTY_NODE:e.updatePriority(t)}filtersNodes(){return!1}getIndexedFilter(){return this}getIndex(){return this.index_}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wa{constructor(e){this.indexedFilter_=new ba(e.getIndex()),this.index_=e.getIndex(),this.startPost_=wa.getStartPost_(e),this.endPost_=wa.getEndPost_(e),this.startIsInclusive_=!e.startAfterSet_,this.endIsInclusive_=!e.endBeforeSet_}getStartPost(){return this.startPost_}getEndPost(){return this.endPost_}matches(e){const t=this.startIsInclusive_?this.index_.compare(this.getStartPost(),e)<=0:this.index_.compare(this.getStartPost(),e)<0,n=this.endIsInclusive_?this.index_.compare(e,this.getEndPost())<=0:this.index_.compare(e,this.getEndPost())<0;return t&&n}updateChild(e,t,n,s,r,i){return this.matches(new qo(t,n))||(n=ua.EMPTY_NODE),this.indexedFilter_.updateChild(e,t,n,s,r,i)}updateFullNode(e,t,n){t.isLeafNode()&&(t=ua.EMPTY_NODE);let s=t.withIndex(this.index_);s=s.updatePriority(ua.EMPTY_NODE);const r=this;return t.forEachChild(sa,(e,t)=>{r.matches(new qo(e,t))||(s=s.updateImmediateChild(e,ua.EMPTY_NODE))}),this.indexedFilter_.updateFullNode(e,s,n)}updatePriority(e,t){return e}filtersNodes(){return!0}getIndexedFilter(){return this.indexedFilter_}getIndex(){return this.index_}static getStartPost_(e){if(e.hasStart()){const t=e.getIndexStartName();return e.getIndex().makePost(e.getIndexStartValue(),t)}return e.getIndex().minPost()}static getEndPost_(e){if(e.hasEnd()){const t=e.getIndexEndName();return e.getIndex().makePost(e.getIndexEndValue(),t)}return e.getIndex().maxPost()}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xa{constructor(e){this.withinDirectionalStart=e=>this.reverse_?this.withinEndPost(e):this.withinStartPost(e),this.withinDirectionalEnd=e=>this.reverse_?this.withinStartPost(e):this.withinEndPost(e),this.withinStartPost=e=>{const t=this.index_.compare(this.rangedFilter_.getStartPost(),e);return this.startIsInclusive_?t<=0:t<0},this.withinEndPost=e=>{const t=this.index_.compare(e,this.rangedFilter_.getEndPost());return this.endIsInclusive_?t<=0:t<0},this.rangedFilter_=new wa(e),this.index_=e.getIndex(),this.limit_=e.getLimit(),this.reverse_=!e.isViewFromLeft(),this.startIsInclusive_=!e.startAfterSet_,this.endIsInclusive_=!e.endBeforeSet_}updateChild(e,t,n,s,r,i){return this.rangedFilter_.matches(new qo(t,n))||(n=ua.EMPTY_NODE),e.getImmediateChild(t).equals(n)?e:e.numChildren()<this.limit_?this.rangedFilter_.getIndexedFilter().updateChild(e,t,n,s,r,i):this.fullLimitUpdateChild_(e,t,n,r,i)}updateFullNode(e,t,n){let s;if(t.isLeafNode()||t.isEmpty())s=ua.EMPTY_NODE.withIndex(this.index_);else if(2*this.limit_<t.numChildren()&&t.isIndexed(this.index_)){let e;s=ua.EMPTY_NODE.withIndex(this.index_),e=this.reverse_?t.getReverseIteratorFrom(this.rangedFilter_.getEndPost(),this.index_):t.getIteratorFrom(this.rangedFilter_.getStartPost(),this.index_);let n=0;for(;e.hasNext()&&n<this.limit_;){const t=e.getNext();if(this.withinDirectionalStart(t)){if(!this.withinDirectionalEnd(t))break;s=s.updateImmediateChild(t.name,t.node),n++}}}else{let e;s=t.withIndex(this.index_),s=s.updatePriority(ua.EMPTY_NODE),e=this.reverse_?s.getReverseIterator(this.index_):s.getIterator(this.index_);let n=0;for(;e.hasNext();){const t=e.getNext();n<this.limit_&&this.withinDirectionalStart(t)&&this.withinDirectionalEnd(t)?n++:s=s.updateImmediateChild(t.name,ua.EMPTY_NODE)}}return this.rangedFilter_.getIndexedFilter().updateFullNode(e,s,n)}updatePriority(e,t){return e}filtersNodes(){return!0}getIndexedFilter(){return this.rangedFilter_.getIndexedFilter()}getIndex(){return this.index_}fullLimitUpdateChild_(e,t,n,s,r){let i;if(this.reverse_){const e=this.index_.getCompare();i=(t,n)=>e(n,t)}else i=this.index_.getCompare();const o=e;K(o.numChildren()===this.limit_,"");const a=new qo(t,n),l=this.reverse_?o.getFirstChild(this.index_):o.getLastChild(this.index_),c=this.rangedFilter_.matches(a);if(o.hasChild(t)){const e=o.getImmediateChild(t);let h=s.getChildAfterChild(this.index_,l,this.reverse_);for(;null!=h&&(h.name===t||o.hasChild(h.name));)h=s.getChildAfterChild(this.index_,h,this.reverse_);const u=null==h?1:i(h,a);if(c&&!n.isEmpty()&&u>=0)return null!=r&&r.trackChildChange(va(t,n,e)),o.updateImmediateChild(t,n);{null!=r&&r.trackChildChange(ya(t,e));const n=o.updateImmediateChild(t,ua.EMPTY_NODE);return null!=h&&this.rangedFilter_.matches(h)?(null!=r&&r.trackChildChange(_a(h.name,h.node)),n.updateImmediateChild(h.name,h.node)):n}}return n.isEmpty()?e:c&&i(l,a)>=0?(null!=r&&(r.trackChildChange(ya(l.name,l.node)),r.trackChildChange(_a(t,n))),o.updateImmediateChild(t,n).updateImmediateChild(l.name,ua.EMPTY_NODE)):e}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ka{constructor(){this.limitSet_=!1,this.startSet_=!1,this.startNameSet_=!1,this.startAfterSet_=!1,this.endSet_=!1,this.endNameSet_=!1,this.endBeforeSet_=!1,this.limit_=0,this.viewFrom_="",this.indexStartValue_=null,this.indexStartName_="",this.indexEndValue_=null,this.indexEndName_="",this.index_=sa}hasStart(){return this.startSet_}isViewFromLeft(){return""===this.viewFrom_?this.startSet_:"l"===this.viewFrom_}getIndexStartValue(){return K(this.startSet_,"Only valid if start has been set"),this.indexStartValue_}getIndexStartName(){return K(this.startSet_,"Only valid if start has been set"),this.startNameSet_?this.indexStartName_:ji}hasEnd(){return this.endSet_}getIndexEndValue(){return K(this.endSet_,"Only valid if end has been set"),this.indexEndValue_}getIndexEndName(){return K(this.endSet_,"Only valid if end has been set"),this.endNameSet_?this.indexEndName_:Mi}hasLimit(){return this.limitSet_}hasAnchoredLimit(){return this.limitSet_&&""!==this.viewFrom_}getLimit(){return K(this.limitSet_,"Only valid if limit has been set"),this.limit_}getIndex(){return this.index_}loadsAllData(){return!(this.startSet_||this.endSet_||this.limitSet_)}isDefault(){return this.loadsAllData()&&this.index_===sa}copy(){const e=new ka;return e.limitSet_=this.limitSet_,e.limit_=this.limit_,e.startSet_=this.startSet_,e.startAfterSet_=this.startAfterSet_,e.indexStartValue_=this.indexStartValue_,e.startNameSet_=this.startNameSet_,e.indexStartName_=this.indexStartName_,e.endSet_=this.endSet_,e.endBeforeSet_=this.endBeforeSet_,e.indexEndValue_=this.indexEndValue_,e.endNameSet_=this.endNameSet_,e.indexEndName_=this.indexEndName_,e.index_=this.index_,e.viewFrom_=this.viewFrom_,e}}function Ca(e){const t={};if(e.isDefault())return t;let n;if(e.index_===sa?n="$priority":e.index_===fa?n="$value":e.index_===zo?n="$key":(K(e.index_ instanceof ga,"Unrecognized index type!"),n=e.index_.toString()),t.orderBy=ve(n),e.startSet_){const n=e.startAfterSet_?"startAfter":"startAt";t[n]=ve(e.indexStartValue_),e.startNameSet_&&(t[n]+=","+ve(e.indexStartName_))}if(e.endSet_){const n=e.endBeforeSet_?"endBefore":"endAt";t[n]=ve(e.indexEndValue_),e.endNameSet_&&(t[n]+=","+ve(e.indexEndName_))}return e.limitSet_&&(e.isViewFromLeft()?t.limitToFirst=e.limit_:t.limitToLast=e.limit_),t}function Ia(e){const t={};if(e.startSet_&&(t.sp=e.indexStartValue_,e.startNameSet_&&(t.sn=e.indexStartName_),t.sin=!e.startAfterSet_),e.endSet_&&(t.ep=e.indexEndValue_,e.endNameSet_&&(t.en=e.indexEndName_),t.ein=!e.endBeforeSet_),e.limitSet_){t.l=e.limit_;let n=e.viewFrom_;""===n&&(n=e.isViewFromLeft()?"l":"r"),t.vf=n}return e.index_!==sa&&(t.i=e.index_.toString()),t}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ta extends _o{reportStats(e){throw new Error("Method not implemented.")}static getListenId_(e,t){return void 0!==t?"tag$"+t:(K(e._queryParams.isDefault(),"should have a tag if it's not a default query."),e._path.toString())}constructor(e,t,n,s){super(),this.repoInfo_=e,this.onDataUpdate_=t,this.authTokenProvider_=n,this.appCheckTokenProvider_=s,this.log_=Ri("p:rest:"),this.listens_={}}listen(e,t,n,s){const r=e._path.toString();this.log_("Listen called for "+r+" "+e._queryIdentifier);const i=Ta.getListenId_(e,n),o={};this.listens_[i]=o;const a=Ca(e._queryParams);this.restRequest_(r+".json",a,(e,t)=>{let a=t;if(404===e&&(a=null,e=null),null===e&&this.onDataUpdate_(r,a,!1,n),xe(this.listens_,i)===o){let t;t=e?401===e?"permission_denied":"rest_error:"+e:"ok",s(t,null)}})}unlisten(e,t){const n=Ta.getListenId_(e,t);delete this.listens_[n]}get(e){const t=Ca(e._queryParams),n=e._path.toString(),s=new he;return this.restRequest_(n+".json",t,(e,t)=>{let r=t;404===e&&(r=null,e=null),null===e?(this.onDataUpdate_(n,r,!1,null),s.resolve(r)):s.reject(new Error(r))}),s.promise}refreshAuthToken(e){}restRequest_(e,t={},n){return t.format="export",Promise.all([this.authTokenProvider_.getToken(!1),this.appCheckTokenProvider_.getToken(!1)]).then(([s,r])=>{s&&s.accessToken&&(t.auth=s.accessToken),r&&r.token&&(t.ac=r.token);const i=(this.repoInfo_.secure?"https://":"http://")+this.repoInfo_.host+e+"?ns="+this.repoInfo_.namespace+Ee(t);this.log_("Sending REST request for "+i);const o=new XMLHttpRequest;o.onreadystatechange=()=>{if(n&&4===o.readyState){this.log_("REST Response for "+i+" received. status:",o.status,"response:",o.responseText);let t=null;if(o.status>=200&&o.status<300){try{t=ye(o.responseText)}catch(e){Di("Failed to parse JSON response for "+i+": "+o.responseText)}n(null,t)}else 401!==o.status&&404!==o.status&&Di("Got unsuccessful REST response for "+i+" Status: "+o.status),n(o.status);n=null}},o.open("GET",i,!0),o.send()})}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ea{constructor(){this.rootNode_=ua.EMPTY_NODE}getNode(e){return this.rootNode_.getChild(e)}updateSnapshot(e,t){this.rootNode_=this.rootNode_.updateChild(e,t)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Na(){return{value:null,children:new Map}}function Sa(e,t,n){if(So(t))e.value=n,e.children.clear();else if(null!==e.value)e.value=e.value.updateChild(t,n);else{const s=xo(t);e.children.has(s)||e.children.set(s,Na());Sa(e.children.get(s),t=Co(t),n)}}function Pa(e,t,n){null!==e.value?n(t,e.value):function(e,t){e.children.forEach((e,n)=>{t(n,e)})}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e,(e,s)=>{Pa(s,new bo(t.toString()+"/"+e),n)})}class Ra{constructor(e){this.collection_=e,this.last_=null}get(){const e=this.collection_.get(),t={...e};return this.last_&&Hi(this.last_,(e,n)=>{t[e]=t[e]-n}),this.last_=e,t}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Aa{constructor(e,t){this.server_=t,this.statsToReport_={},this.statsListener_=new Ra(e);const n=1e4+2e4*Math.random();Gi(this.reportStats_.bind(this),Math.floor(n))}reportStats_(){const e=this.statsListener_.get(),t={};let n=!1;Hi(e,(e,s)=>{s>0&&we(this.statsToReport_,e)&&(t[e]=s,n=!0)}),n&&this.server_.reportStats(t),Gi(this.reportStats_.bind(this),Math.floor(2*Math.random()*3e5))}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Oa,Da;function La(e){return{fromUser:!1,fromServer:!0,queryId:e,tagged:!0}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(Da=Oa||(Oa={}))[Da.OVERWRITE=0]="OVERWRITE",Da[Da.MERGE=1]="MERGE",Da[Da.ACK_USER_WRITE=2]="ACK_USER_WRITE",Da[Da.LISTEN_COMPLETE=3]="LISTEN_COMPLETE";class ja{constructor(e,t,n){this.path=e,this.affectedTree=t,this.revert=n,this.type=Oa.ACK_USER_WRITE,this.source={fromUser:!0,fromServer:!1,queryId:null,tagged:!1}}operationForChild(e){if(So(this.path)){if(null!=this.affectedTree.value)return K(this.affectedTree.children.isEmpty(),"affectedTree should not have overlapping affected paths."),this;{const t=this.affectedTree.subtree(new bo(e));return new ja(wo(),t,this.revert)}}return K(xo(this.path)===e,"operationForChild called for unrelated child."),new ja(Co(this.path),this.affectedTree,this.revert)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ma{constructor(e,t){this.source=e,this.path=t,this.type=Oa.LISTEN_COMPLETE}operationForChild(e){return So(this.path)?new Ma(this.source,wo()):new Ma(this.source,Co(this.path))}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fa{constructor(e,t,n){this.source=e,this.path=t,this.snap=n,this.type=Oa.OVERWRITE}operationForChild(e){return So(this.path)?new Fa(this.source,wo(),this.snap.getImmediateChild(e)):new Fa(this.source,Co(this.path),this.snap)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ua{constructor(e,t,n){this.source=e,this.path=t,this.children=n,this.type=Oa.MERGE}operationForChild(e){if(So(this.path)){const t=this.children.subtree(new bo(e));return t.isEmpty()?null:t.value?new Fa(this.source,wo(),t.value):new Ua(this.source,wo(),t)}return K(xo(this.path)===e,"Can't get a merge for a child not on the path of the operation"),new Ua(this.source,Co(this.path),this.children)}toString(){return"Operation("+this.path+": "+this.source.toString()+" merge: "+this.children.toString()+")"}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qa{constructor(e,t,n){this.node_=e,this.fullyInitialized_=t,this.filtered_=n}isFullyInitialized(){return this.fullyInitialized_}isFiltered(){return this.filtered_}isCompleteForPath(e){if(So(e))return this.isFullyInitialized()&&!this.filtered_;const t=xo(e);return this.isCompleteForChild(t)}isCompleteForChild(e){return this.isFullyInitialized()&&!this.filtered_||this.node_.hasChild(e)}getNode(){return this.node_}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wa{constructor(e){this.query_=e,this.index_=this.query_._queryParams.getIndex()}}function Va(e,t,n,s,r,i){const o=s.filter(e=>e.type===n);o.sort((t,n)=>function(e,t,n){if(null==t.childName||null==n.childName)throw G("Should only compare child_ events.");const s=new qo(t.childName,t.snapshotNode),r=new qo(n.childName,n.snapshotNode);return e.index_.compare(s,r)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e,t,n)),o.forEach(n=>{const s=function(e,t,n){return"value"===t.type||"child_removed"===t.type||(t.prevName=n.getPredecessorChildName(t.childName,t.snapshotNode,e.index_)),t}(e,n,i);r.forEach(r=>{r.respondsTo(n.type)&&t.push(r.createEvent(s,e.query_))})})}function Ha(e,t){return{eventCache:e,serverCache:t}}function za(e,t,n,s){return Ha(new qa(t,n,s),e.serverCache)}function Ba(e,t,n,s){return Ha(e.eventCache,new qa(t,n,s))}function $a(e){return e.eventCache.isFullyInitialized()?e.eventCache.getNode():null}function Ka(e){return e.serverCache.isFullyInitialized()?e.serverCache.getNode():null}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Ga;class Ya{static fromObject(e){let t=new Ya(null);return Hi(e,(e,n)=>{t=t.set(new bo(e),n)}),t}constructor(e,t=(()=>(Ga||(Ga=new Ko(Ui)),Ga))()){this.value=e,this.children=t}isEmpty(){return null===this.value&&this.children.isEmpty()}findRootMostMatchingPathAndValue(e,t){if(null!=this.value&&t(this.value))return{path:wo(),value:this.value};if(So(e))return null;{const n=xo(e),s=this.children.get(n);if(null!==s){const r=s.findRootMostMatchingPathAndValue(Co(e),t);if(null!=r){return{path:No(new bo(n),r.path),value:r.value}}return null}return null}}findRootMostValueAndPath(e){return this.findRootMostMatchingPathAndValue(e,()=>!0)}subtree(e){if(So(e))return this;{const t=xo(e),n=this.children.get(t);return null!==n?n.subtree(Co(e)):new Ya(null)}}set(e,t){if(So(e))return new Ya(t,this.children);{const n=xo(e),s=(this.children.get(n)||new Ya(null)).set(Co(e),t),r=this.children.insert(n,s);return new Ya(this.value,r)}}remove(e){if(So(e))return this.children.isEmpty()?new Ya(null):new Ya(null,this.children);{const t=xo(e),n=this.children.get(t);if(n){const s=n.remove(Co(e));let r;return r=s.isEmpty()?this.children.remove(t):this.children.insert(t,s),null===this.value&&r.isEmpty()?new Ya(null):new Ya(this.value,r)}return this}}get(e){if(So(e))return this.value;{const t=xo(e),n=this.children.get(t);return n?n.get(Co(e)):null}}setTree(e,t){if(So(e))return t;{const n=xo(e),s=(this.children.get(n)||new Ya(null)).setTree(Co(e),t);let r;return r=s.isEmpty()?this.children.remove(n):this.children.insert(n,s),new Ya(this.value,r)}}fold(e){return this.fold_(wo(),e)}fold_(e,t){const n={};return this.children.inorderTraversal((s,r)=>{n[s]=r.fold_(No(e,s),t)}),t(e,this.value,n)}findOnPath(e,t){return this.findOnPath_(e,wo(),t)}findOnPath_(e,t,n){const s=!!this.value&&n(t,this.value);if(s)return s;if(So(e))return null;{const s=xo(e),r=this.children.get(s);return r?r.findOnPath_(Co(e),No(t,s),n):null}}foreachOnPath(e,t){return this.foreachOnPath_(e,wo(),t)}foreachOnPath_(e,t,n){if(So(e))return this;{this.value&&n(t,this.value);const s=xo(e),r=this.children.get(s);return r?r.foreachOnPath_(Co(e),No(t,s),n):new Ya(null)}}foreach(e){this.foreach_(wo(),e)}foreach_(e,t){this.children.inorderTraversal((n,s)=>{s.foreach_(No(e,n),t)}),this.value&&t(e,this.value)}foreachChild(e){this.children.inorderTraversal((t,n)=>{n.value&&e(t,n.value)})}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ja{constructor(e){this.writeTree_=e}static empty(){return new Ja(new Ya(null))}}function Qa(e,t,n){if(So(t))return new Ja(new Ya(n));{const s=e.writeTree_.findRootMostValueAndPath(t);if(null!=s){const r=s.path;let i=s.value;const o=Po(r,t);return i=i.updateChild(o,n),new Ja(e.writeTree_.set(r,i))}{const s=new Ya(n),r=e.writeTree_.setTree(t,s);return new Ja(r)}}}function Xa(e,t,n){let s=e;return Hi(n,(e,n)=>{s=Qa(s,No(t,e),n)}),s}function Za(e,t){if(So(t))return Ja.empty();{const n=e.writeTree_.setTree(t,new Ya(null));return new Ja(n)}}function el(e,t){return null!=tl(e,t)}function tl(e,t){const n=e.writeTree_.findRootMostValueAndPath(t);return null!=n?e.writeTree_.get(n.path).getChild(Po(n.path,t)):null}function nl(e){const t=[],n=e.writeTree_.value;return null!=n?n.isLeafNode()||n.forEachChild(sa,(e,n)=>{t.push(new qo(e,n))}):e.writeTree_.children.inorderTraversal((e,n)=>{null!=n.value&&t.push(new qo(e,n.value))}),t}function sl(e,t){if(So(t))return e;{const n=tl(e,t);return new Ja(null!=n?new Ya(n):e.writeTree_.subtree(t))}}function rl(e){return e.writeTree_.isEmpty()}function il(e,t){return ol(wo(),e.writeTree_,t)}function ol(e,t,n){if(null!=t.value)return n.updateChild(e,t.value);{let s=null;return t.children.inorderTraversal((t,r)=>{".priority"===t?(K(null!==r.value,"Priority writes must always be leaf nodes"),s=r.value):n=ol(No(e,t),r,n)}),n.getChild(e).isEmpty()||null===s||(n=n.updateChild(No(e,".priority"),s)),n}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function al(e,t){return bl(t,e)}function ll(e,t){const n=e.allWrites.findIndex(e=>e.writeId===t);K(n>=0,"removeWrite called with nonexistent writeId.");const s=e.allWrites[n];e.allWrites.splice(n,1);let r=s.visible,i=!1,o=e.allWrites.length-1;for(;r&&o>=0;){const t=e.allWrites[o];t.visible&&(o>=n&&cl(t,s.path)?r=!1:Oo(s.path,t.path)&&(i=!0)),o--}if(r){if(i)return function(e){e.visibleWrites=ul(e.allWrites,hl,wo()),e.allWrites.length>0?e.lastWriteId=e.allWrites[e.allWrites.length-1].writeId:e.lastWriteId=-1}(e),!0;if(s.snap)e.visibleWrites=Za(e.visibleWrites,s.path);else{Hi(s.children,t=>{e.visibleWrites=Za(e.visibleWrites,No(s.path,t))})}return!0}return!1}function cl(e,t){if(e.snap)return Oo(e.path,t);for(const n in e.children)if(e.children.hasOwnProperty(n)&&Oo(No(e.path,n),t))return!0;return!1}function hl(e){return e.visible}function ul(e,t,n){let s=Ja.empty();for(let r=0;r<e.length;++r){const i=e[r];if(t(i)){const e=i.path;let t;if(i.snap)Oo(n,e)?(t=Po(n,e),s=Qa(s,t,i.snap)):Oo(e,n)&&(t=Po(e,n),s=Qa(s,wo(),i.snap.getChild(t)));else{if(!i.children)throw G("WriteRecord should have .snap or .children");if(Oo(n,e))t=Po(n,e),s=Xa(s,t,i.children);else if(Oo(e,n))if(t=Po(e,n),So(t))s=Xa(s,wo(),i.children);else{const e=xe(i.children,xo(t));if(e){const n=e.getChild(Co(t));s=Qa(s,wo(),n)}}}}}return s}function dl(e,t,n,s,r){if(s||r){const i=sl(e.visibleWrites,t);if(!r&&rl(i))return n;if(r||null!=n||el(i,wo())){const i=function(e){return(e.visible||r)&&(!s||!~s.indexOf(e.writeId))&&(Oo(e.path,t)||Oo(t,e.path))};return il(ul(e.allWrites,i,t),n||ua.EMPTY_NODE)}return null}{const s=tl(e.visibleWrites,t);if(null!=s)return s;{const s=sl(e.visibleWrites,t);if(rl(s))return n;if(null!=n||el(s,wo())){return il(s,n||ua.EMPTY_NODE)}return null}}}function pl(e,t,n,s){return dl(e.writeTree,e.treePath,t,n,s)}function gl(e,t){return function(e,t,n){let s=ua.EMPTY_NODE;const r=tl(e.visibleWrites,t);if(r)return r.isLeafNode()||r.forEachChild(sa,(e,t)=>{s=s.updateImmediateChild(e,t)}),s;if(n){const r=sl(e.visibleWrites,t);return n.forEachChild(sa,(e,t)=>{const n=il(sl(r,new bo(e)),t);s=s.updateImmediateChild(e,n)}),nl(r).forEach(e=>{s=s.updateImmediateChild(e.name,e.node)}),s}return nl(sl(e.visibleWrites,t)).forEach(e=>{s=s.updateImmediateChild(e.name,e.node)}),s}(e.writeTree,e.treePath,t)}function fl(e,t,n,s){return function(e,t,n,s,r){K(s||r,"Either existingEventSnap or existingServerSnap must exist");const i=No(t,n);if(el(e.visibleWrites,i))return null;{const t=sl(e.visibleWrites,i);return rl(t)?r.getChild(n):il(t,r.getChild(n))}}(e.writeTree,e.treePath,t,n,s)}function ml(e,t){return function(e,t){return tl(e.visibleWrites,t)}(e.writeTree,No(e.treePath,t))}function _l(e,t,n,s,r,i){return function(e,t,n,s,r,i,o){let a;const l=sl(e.visibleWrites,t),c=tl(l,wo());if(null!=c)a=c;else{if(null==n)return[];a=il(l,n)}if(a=a.withIndex(o),a.isEmpty()||a.isLeafNode())return[];{const e=[],t=o.getCompare(),n=i?a.getReverseIteratorFrom(s,o):a.getIteratorFrom(s,o);let l=n.getNext();for(;l&&e.length<r;)0!==t(l,s)&&e.push(l),l=n.getNext();return e}}(e.writeTree,e.treePath,t,n,s,r,i)}function yl(e,t,n){return function(e,t,n,s){const r=No(t,n),i=tl(e.visibleWrites,r);if(null!=i)return i;if(s.isCompleteForChild(n))return il(sl(e.visibleWrites,r),s.getNode().getImmediateChild(n));return null}(e.writeTree,e.treePath,t,n)}function vl(e,t){return bl(No(e.treePath,t),e.writeTree)}function bl(e,t){return{treePath:e,writeTree:t}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wl{constructor(){this.changeMap=new Map}trackChildChange(e){const t=e.type,n=e.childName;K("child_added"===t||"child_changed"===t||"child_removed"===t,"Only child changes supported for tracking"),K(".priority"!==n,"Only non-priority child changes can be tracked.");const s=this.changeMap.get(n);if(s){const r=s.type;if("child_added"===t&&"child_removed"===r)this.changeMap.set(n,va(n,e.snapshotNode,s.snapshotNode));else if("child_removed"===t&&"child_added"===r)this.changeMap.delete(n);else if("child_removed"===t&&"child_changed"===r)this.changeMap.set(n,ya(n,s.oldSnap));else if("child_changed"===t&&"child_added"===r)this.changeMap.set(n,_a(n,e.snapshotNode));else{if("child_changed"!==t||"child_changed"!==r)throw G("Illegal combination of changes: "+e+" occurred after "+s);this.changeMap.set(n,va(n,e.snapshotNode,s.oldSnap))}}else this.changeMap.set(n,e)}getChanges(){return Array.from(this.changeMap.values())}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xl=new class{getCompleteChild(e){return null}getChildAfterChild(e,t,n){return null}};class kl{constructor(e,t,n=null){this.writes_=e,this.viewCache_=t,this.optCompleteServerCache_=n}getCompleteChild(e){const t=this.viewCache_.eventCache;if(t.isCompleteForChild(e))return t.getNode().getImmediateChild(e);{const t=null!=this.optCompleteServerCache_?new qa(this.optCompleteServerCache_,!0,!1):this.viewCache_.serverCache;return yl(this.writes_,e,t)}}getChildAfterChild(e,t,n){const s=null!=this.optCompleteServerCache_?this.optCompleteServerCache_:Ka(this.viewCache_),r=_l(this.writes_,s,t,1,n,e);return 0===r.length?null:r[0]}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Cl(e,t,n,s,r){const i=new wl;let o,a;if(n.type===Oa.OVERWRITE){const l=n;l.source.fromUser?o=El(e,t,l.path,l.snap,s,r,i):(K(l.source.fromServer,"Unknown source."),a=l.source.tagged||t.serverCache.isFiltered()&&!So(l.path),o=Tl(e,t,l.path,l.snap,s,r,a,i))}else if(n.type===Oa.MERGE){const l=n;l.source.fromUser?o=function(e,t,n,s,r,i,o){let a=t;return s.foreach((s,l)=>{const c=No(n,s);Nl(t,xo(c))&&(a=El(e,a,c,l,r,i,o))}),s.foreach((s,l)=>{const c=No(n,s);Nl(t,xo(c))||(a=El(e,a,c,l,r,i,o))}),a}(e,t,l.path,l.children,s,r,i):(K(l.source.fromServer,"Unknown source."),a=l.source.tagged||t.serverCache.isFiltered(),o=Pl(e,t,l.path,l.children,s,r,a,i))}else if(n.type===Oa.ACK_USER_WRITE){const a=n;o=a.revert?function(e,t,n,s,r,i){let o;if(null!=ml(s,n))return t;{const a=new kl(s,t,r),l=t.eventCache.getNode();let c;if(So(n)||".priority"===xo(n)){let n;if(t.serverCache.isFullyInitialized())n=pl(s,Ka(t));else{const e=t.serverCache.getNode();K(e instanceof ua,"serverChildren would be complete if leaf node"),n=gl(s,e)}c=e.filter.updateFullNode(l,n,i)}else{const r=xo(n);let h=yl(s,r,t.serverCache);null==h&&t.serverCache.isCompleteForChild(r)&&(h=l.getImmediateChild(r)),c=null!=h?e.filter.updateChild(l,r,h,Co(n),a,i):t.eventCache.getNode().hasChild(r)?e.filter.updateChild(l,r,ua.EMPTY_NODE,Co(n),a,i):l,c.isEmpty()&&t.serverCache.isFullyInitialized()&&(o=pl(s,Ka(t)),o.isLeafNode()&&(c=e.filter.updateFullNode(c,o,i)))}return o=t.serverCache.isFullyInitialized()||null!=ml(s,wo()),za(t,c,o,e.filter.filtersNodes())}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e,t,a.path,s,r,i):function(e,t,n,s,r,i,o){if(null!=ml(r,n))return t;const a=t.serverCache.isFiltered(),l=t.serverCache;if(null!=s.value){if(So(n)&&l.isFullyInitialized()||l.isCompleteForPath(n))return Tl(e,t,n,l.getNode().getChild(n),r,i,a,o);if(So(n)){let s=new Ya(null);return l.getNode().forEachChild(zo,(e,t)=>{s=s.set(new bo(e),t)}),Pl(e,t,n,s,r,i,a,o)}return t}{let c=new Ya(null);return s.foreach((e,t)=>{const s=No(n,e);l.isCompleteForPath(s)&&(c=c.set(e,l.getNode().getChild(s)))}),Pl(e,t,n,c,r,i,a,o)}}(e,t,a.path,a.affectedTree,s,r,i)}else{if(n.type!==Oa.LISTEN_COMPLETE)throw G("Unknown operation type: "+n.type);o=function(e,t,n,s,r){const i=t.serverCache,o=Ba(t,i.getNode(),i.isFullyInitialized()||So(n),i.isFiltered());return Il(e,o,n,s,xl,r)}(e,t,n.path,s,i)}const l=i.getChanges();return function(e,t,n){const s=t.eventCache;if(s.isFullyInitialized()){const r=s.getNode().isLeafNode()||s.getNode().isEmpty(),i=$a(e);(n.length>0||!e.eventCache.isFullyInitialized()||r&&!s.getNode().equals(i)||!s.getNode().getPriority().equals(i.getPriority()))&&n.push(ma($a(t)))}}(t,o,l),{viewCache:o,changes:l}}function Il(e,t,n,s,r,i){const o=t.eventCache;if(null!=ml(s,n))return t;{let a,l;if(So(n))if(K(t.serverCache.isFullyInitialized(),"If change path is empty, we must have complete server data"),t.serverCache.isFiltered()){const n=Ka(t),r=gl(s,n instanceof ua?n:ua.EMPTY_NODE);a=e.filter.updateFullNode(t.eventCache.getNode(),r,i)}else{const n=pl(s,Ka(t));a=e.filter.updateFullNode(t.eventCache.getNode(),n,i)}else{const c=xo(n);if(".priority"===c){K(1===ko(n),"Can't have a priority with additional path components");const r=o.getNode();l=t.serverCache.getNode();const i=fl(s,n,r,l);a=null!=i?e.filter.updatePriority(r,i):o.getNode()}else{const h=Co(n);let u;if(o.isCompleteForChild(c)){l=t.serverCache.getNode();const e=fl(s,n,o.getNode(),l);u=null!=e?o.getNode().getImmediateChild(c).updateChild(h,e):o.getNode().getImmediateChild(c)}else u=yl(s,c,t.serverCache);a=null!=u?e.filter.updateChild(o.getNode(),c,u,h,r,i):o.getNode()}}return za(t,a,o.isFullyInitialized()||So(n),e.filter.filtersNodes())}}function Tl(e,t,n,s,r,i,o,a){const l=t.serverCache;let c;const h=o?e.filter:e.filter.getIndexedFilter();if(So(n))c=h.updateFullNode(l.getNode(),s,null);else if(h.filtersNodes()&&!l.isFiltered()){const e=l.getNode().updateChild(n,s);c=h.updateFullNode(l.getNode(),e,null)}else{const e=xo(n);if(!l.isCompleteForPath(n)&&ko(n)>1)return t;const r=Co(n),i=l.getNode().getImmediateChild(e).updateChild(r,s);c=".priority"===e?h.updatePriority(l.getNode(),i):h.updateChild(l.getNode(),e,i,r,xl,null)}const u=Ba(t,c,l.isFullyInitialized()||So(n),h.filtersNodes());return Il(e,u,n,r,new kl(r,u,i),a)}function El(e,t,n,s,r,i,o){const a=t.eventCache;let l,c;const h=new kl(r,t,i);if(So(n))c=e.filter.updateFullNode(t.eventCache.getNode(),s,o),l=za(t,c,!0,e.filter.filtersNodes());else{const r=xo(n);if(".priority"===r)c=e.filter.updatePriority(t.eventCache.getNode(),s),l=za(t,c,a.isFullyInitialized(),a.isFiltered());else{const i=Co(n),c=a.getNode().getImmediateChild(r);let u;if(So(i))u=s;else{const e=h.getCompleteChild(r);u=null!=e?".priority"===Io(i)&&e.getChild(Eo(i)).isEmpty()?e:e.updateChild(i,s):ua.EMPTY_NODE}if(c.equals(u))l=t;else{l=za(t,e.filter.updateChild(a.getNode(),r,u,i,h,o),a.isFullyInitialized(),e.filter.filtersNodes())}}}return l}function Nl(e,t){return e.eventCache.isCompleteForChild(t)}function Sl(e,t,n){return n.foreach((e,n)=>{t=t.updateChild(e,n)}),t}function Pl(e,t,n,s,r,i,o,a){if(t.serverCache.getNode().isEmpty()&&!t.serverCache.isFullyInitialized())return t;let l,c=t;l=So(n)?s:new Ya(null).setTree(n,s);const h=t.serverCache.getNode();return l.children.inorderTraversal((n,s)=>{if(h.hasChild(n)){const l=Sl(0,t.serverCache.getNode().getImmediateChild(n),s);c=Tl(e,c,new bo(n),l,r,i,o,a)}}),l.children.inorderTraversal((n,s)=>{const l=!t.serverCache.isCompleteForChild(n)&&null===s.value;if(!h.hasChild(n)&&!l){const l=Sl(0,t.serverCache.getNode().getImmediateChild(n),s);c=Tl(e,c,new bo(n),l,r,i,o,a)}}),c}class Rl{constructor(e,t){this.query_=e,this.eventRegistrations_=[];const n=this.query_._queryParams,s=new ba(n.getIndex()),r=(i=n).loadsAllData()?new ba(i.getIndex()):i.hasLimit()?new xa(i):new wa(i);var i;this.processor_=function(e){return{filter:e}}(r);const o=t.serverCache,a=t.eventCache,l=s.updateFullNode(ua.EMPTY_NODE,o.getNode(),null),c=r.updateFullNode(ua.EMPTY_NODE,a.getNode(),null),h=new qa(l,o.isFullyInitialized(),s.filtersNodes()),u=new qa(c,a.isFullyInitialized(),r.filtersNodes());this.viewCache_=Ha(u,h),this.eventGenerator_=new Wa(this.query_)}get query(){return this.query_}}function Al(e,t){const n=Ka(e.viewCache_);return n&&(e.query._queryParams.loadsAllData()||!So(t)&&!n.getImmediateChild(xo(t)).isEmpty())?n.getChild(t):null}function Ol(e){return 0===e.eventRegistrations_.length}function Dl(e,t,n){const s=[];if(n){K(null==t,"A cancel should cancel all event registrations.");const r=e.query._path;e.eventRegistrations_.forEach(e=>{const t=e.createCancelEvent(n,r);t&&s.push(t)})}if(t){let n=[];for(let s=0;s<e.eventRegistrations_.length;++s){const r=e.eventRegistrations_[s];if(r.matches(t)){if(t.hasAnyCallback()){n=n.concat(e.eventRegistrations_.slice(s+1));break}}else n.push(r)}e.eventRegistrations_=n}else e.eventRegistrations_=[];return s}function Ll(e,t,n,s){t.type===Oa.MERGE&&null!==t.source.queryId&&(K(Ka(e.viewCache_),"We should always have a full cache before handling merges"),K($a(e.viewCache_),"Missing event cache, even though we have a server cache"));const r=e.viewCache_,i=Cl(e.processor_,r,t,n,s);var o,a;return o=e.processor_,a=i.viewCache,K(a.eventCache.getNode().isIndexed(o.filter.getIndex()),"Event snap not indexed"),K(a.serverCache.getNode().isIndexed(o.filter.getIndex()),"Server snap not indexed"),K(i.viewCache.serverCache.isFullyInitialized()||!r.serverCache.isFullyInitialized(),"Once a server snap is complete, it should never go back"),e.viewCache_=i.viewCache,jl(e,i.changes,i.viewCache.eventCache.getNode(),null)}function jl(e,t,n,s){const r=s?[s]:e.eventRegistrations_;return function(e,t,n,s){const r=[],i=[];return t.forEach(t=>{var n;"child_changed"===t.type&&e.index_.indexedValueChanged(t.oldSnap,t.snapshotNode)&&i.push((n=t.childName,{type:"child_moved",snapshotNode:t.snapshotNode,childName:n}))}),Va(e,r,"child_removed",t,s,n),Va(e,r,"child_added",t,s,n),Va(e,r,"child_moved",i,s,n),Va(e,r,"child_changed",t,s,n),Va(e,r,"value",t,s,n),r}(e.eventGenerator_,t,n,r)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Ml,Fl;class Ul{constructor(){this.views=new Map}}function ql(e,t,n,s){const r=t.source.queryId;if(null!==r){const i=e.views.get(r);return K(null!=i,"SyncTree gave us an op for an invalid query."),Ll(i,t,n,s)}{let r=[];for(const i of e.views.values())r=r.concat(Ll(i,t,n,s));return r}}function Wl(e,t,n,s,r,i){const o=function(e,t,n,s,r){const i=t._queryIdentifier,o=e.views.get(i);if(!o){let e=pl(n,r?s:null),i=!1;e?i=!0:s instanceof ua?(e=gl(n,s),i=!1):(e=ua.EMPTY_NODE,i=!1);const o=Ha(new qa(e,i,!1),new qa(s,r,!1));return new Rl(t,o)}return o}(e,t,s,r,i);return e.views.has(t._queryIdentifier)||e.views.set(t._queryIdentifier,o),function(e,t){e.eventRegistrations_.push(t)}(o,n),function(e,t){const n=e.viewCache_.eventCache,s=[];n.getNode().isLeafNode()||n.getNode().forEachChild(sa,(e,t)=>{s.push(_a(e,t))});return n.isFullyInitialized()&&s.push(ma(n.getNode())),jl(e,s,n.getNode(),t)}(o,n)}function Vl(e,t,n,s){const r=t._queryIdentifier,i=[];let o=[];const a=Kl(e);if("default"===r)for(const[l,c]of e.views.entries())o=o.concat(Dl(c,n,s)),Ol(c)&&(e.views.delete(l),c.query._queryParams.loadsAllData()||i.push(c.query));else{const t=e.views.get(r);t&&(o=o.concat(Dl(t,n,s)),Ol(t)&&(e.views.delete(r),t.query._queryParams.loadsAllData()||i.push(t.query)))}return a&&!Kl(e)&&i.push(new(K(Ml,"Reference.ts has not been loaded"),Ml)(t._repo,t._path)),{removed:i,events:o}}function Hl(e){const t=[];for(const n of e.views.values())n.query._queryParams.loadsAllData()||t.push(n);return t}function zl(e,t){let n=null;for(const s of e.views.values())n=n||Al(s,t);return n}function Bl(e,t){if(t._queryParams.loadsAllData())return Gl(e);{const n=t._queryIdentifier;return e.views.get(n)}}function $l(e,t){return null!=Bl(e,t)}function Kl(e){return null!=Gl(e)}function Gl(e){for(const t of e.views.values())if(t.query._queryParams.loadsAllData())return t;return null}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Yl=1;class Jl{constructor(e){this.listenProvider_=e,this.syncPointTree_=new Ya(null),this.pendingWriteTree_={visibleWrites:Ja.empty(),allWrites:[],lastWriteId:-1},this.tagToQueryMap=new Map,this.queryToTagMap=new Map}}function Ql(e,t,n,s,r){return function(e,t,n,s,r){K(s>e.lastWriteId,"Stacking an older write on top of newer ones"),void 0===r&&(r=!0),e.allWrites.push({path:t,snap:n,writeId:s,visible:r}),r&&(e.visibleWrites=Qa(e.visibleWrites,t,n)),e.lastWriteId=s}(e.pendingWriteTree_,t,n,s,r),r?rc(e,new Fa({fromUser:!0,fromServer:!1,queryId:null,tagged:!1},t,n)):[]}function Xl(e,t,n,s){!function(e,t,n,s){K(s>e.lastWriteId,"Stacking an older merge on top of newer ones"),e.allWrites.push({path:t,children:n,writeId:s,visible:!0}),e.visibleWrites=Xa(e.visibleWrites,t,n),e.lastWriteId=s}(e.pendingWriteTree_,t,n,s);const r=Ya.fromObject(n);return rc(e,new Ua({fromUser:!0,fromServer:!1,queryId:null,tagged:!1},t,r))}function Zl(e,t,n=!1){const s=function(e,t){for(let n=0;n<e.allWrites.length;n++){const s=e.allWrites[n];if(s.writeId===t)return s}return null}(e.pendingWriteTree_,t);if(ll(e.pendingWriteTree_,t)){let t=new Ya(null);return null!=s.snap?t=t.set(wo(),!0):Hi(s.children,e=>{t=t.set(new bo(e),!0)}),rc(e,new ja(s.path,t,n))}return[]}function ec(e,t,n){return rc(e,new Fa({fromUser:!1,fromServer:!0,queryId:null,tagged:!1},t,n))}function tc(e,t,n,s,r=!1){const i=t._path,o=e.syncPointTree_.get(i);let a=[];if(o&&("default"===t._queryIdentifier||$l(o,t))){const l=Vl(o,t,n,s);0===o.views.size&&(e.syncPointTree_=e.syncPointTree_.remove(i));const c=l.removed;if(a=l.events,!r){const n=-1!==c.findIndex(e=>e._queryParams.loadsAllData()),r=e.syncPointTree_.findOnPath(i,(e,t)=>Kl(t));if(n&&!r){const t=e.syncPointTree_.subtree(i);if(!t.isEmpty()){const n=function(e){return e.fold((e,t,n)=>{if(t&&Kl(t)){return[Gl(t)]}{let e=[];return t&&(e=Hl(t)),Hi(n,(t,n)=>{e=e.concat(n)}),e}})}(t);for(let t=0;t<n.length;++t){const s=n[t],r=s.query,i=ac(e,s);e.listenProvider_.startListening(pc(r),lc(e,r),i.hashFn,i.onComplete)}}}if(!r&&c.length>0&&!s)if(n){const n=null;e.listenProvider_.stopListening(pc(t),n)}else c.forEach(t=>{const n=e.queryToTagMap.get(cc(t));e.listenProvider_.stopListening(pc(t),n)})}!function(e,t){for(let n=0;n<t.length;++n){const s=t[n];if(!s._queryParams.loadsAllData()){const t=cc(s),n=e.queryToTagMap.get(t);e.queryToTagMap.delete(t),e.tagToQueryMap.delete(n)}}}(e,c)}return a}function nc(e,t,n,s=!1){const r=t._path;let i=null,o=!1;e.syncPointTree_.foreachOnPath(r,(e,t)=>{const n=Po(e,r);i=i||zl(t,n),o=o||Kl(t)});let a,l=e.syncPointTree_.get(r);if(l?(o=o||Kl(l),i=i||zl(l,wo())):(l=new Ul,e.syncPointTree_=e.syncPointTree_.set(r,l)),null!=i)a=!0;else{a=!1,i=ua.EMPTY_NODE;e.syncPointTree_.subtree(r).foreachChild((e,t)=>{const n=zl(t,wo());n&&(i=i.updateImmediateChild(e,n))})}const c=$l(l,t);if(!c&&!t._queryParams.loadsAllData()){const n=cc(t);K(!e.queryToTagMap.has(n),"View does not exist, but we have a tag");const s=Yl++;e.queryToTagMap.set(n,s),e.tagToQueryMap.set(s,n)}let h=Wl(l,t,n,al(e.pendingWriteTree_,r),i,a);if(!c&&!o&&!s){const n=Bl(l,t);h=h.concat(function(e,t,n){const s=t._path,r=lc(e,t),i=ac(e,n),o=e.listenProvider_.startListening(pc(t),r,i.hashFn,i.onComplete),a=e.syncPointTree_.subtree(s);if(r)K(!Kl(a.value),"If we're adding a query, it shouldn't be shadowed");else{const t=a.fold((e,t,n)=>{if(!So(e)&&t&&Kl(t))return[Gl(t).query];{let e=[];return t&&(e=e.concat(Hl(t).map(e=>e.query))),Hi(n,(t,n)=>{e=e.concat(n)}),e}});for(let n=0;n<t.length;++n){const s=t[n];e.listenProvider_.stopListening(pc(s),lc(e,s))}}return o}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e,t,n))}return h}function sc(e,t,n){const s=e.pendingWriteTree_,r=e.syncPointTree_.findOnPath(t,(e,n)=>{const s=zl(n,Po(e,t));if(s)return s});return dl(s,t,r,n,!0)}function rc(e,t){return ic(t,e.syncPointTree_,null,al(e.pendingWriteTree_,wo()))}function ic(e,t,n,s){if(So(e.path))return oc(e,t,n,s);{const r=t.get(wo());null==n&&null!=r&&(n=zl(r,wo()));let i=[];const o=xo(e.path),a=e.operationForChild(o),l=t.children.get(o);if(l&&a){const e=n?n.getImmediateChild(o):null,t=vl(s,o);i=i.concat(ic(a,l,e,t))}return r&&(i=i.concat(ql(r,e,s,n))),i}}function oc(e,t,n,s){const r=t.get(wo());null==n&&null!=r&&(n=zl(r,wo()));let i=[];return t.children.inorderTraversal((t,r)=>{const o=n?n.getImmediateChild(t):null,a=vl(s,t),l=e.operationForChild(t);l&&(i=i.concat(oc(l,r,o,a)))}),r&&(i=i.concat(ql(r,e,s,n))),i}function ac(e,t){const n=t.query,s=lc(e,n);return{hashFn:()=>{const e=function(e){return e.viewCache_.serverCache.getNode()}(t)||ua.EMPTY_NODE;return e.hash()},onComplete:t=>{if("ok"===t)return s?function(e,t,n){const s=hc(e,n);if(s){const n=uc(s),r=n.path,i=n.queryId,o=Po(r,t);return dc(e,r,new Ma(La(i),o))}return[]}(e,n._path,s):function(e,t){return rc(e,new Ma({fromUser:!1,fromServer:!0,queryId:null,tagged:!1},t))}(e,n._path);{const s=function(e,t){let n="Unknown Error";"too_big"===e?n="The data requested exceeds the maximum size that can be accessed with a single request.":"permission_denied"===e?n="Client doesn't have permission to access the desired data.":"unavailable"===e&&(n="The service is unavailable");const s=new Error(e+" at "+t._path.toString()+": "+n);return s.code=e.toUpperCase(),s}(t,n);return tc(e,n,null,s)}}}}function lc(e,t){const n=cc(t);return e.queryToTagMap.get(n)}function cc(e){return e._path.toString()+"$"+e._queryIdentifier}function hc(e,t){return e.tagToQueryMap.get(t)}function uc(e){const t=e.indexOf("$");return K(-1!==t&&t<e.length-1,"Bad queryKey."),{queryId:e.substr(t+1),path:new bo(e.substr(0,t))}}function dc(e,t,n){const s=e.syncPointTree_.get(t);K(s,"Missing sync point for query tag that we're tracking");return ql(s,n,al(e.pendingWriteTree_,t),null)}function pc(e){return e._queryParams.loadsAllData()&&!e._queryParams.isDefault()?new(K(Fl,"Reference.ts has not been loaded"),Fl)(e._repo,e._path):e}class gc{constructor(e){this.node_=e}getImmediateChild(e){const t=this.node_.getImmediateChild(e);return new gc(t)}node(){return this.node_}}class fc{constructor(e,t){this.syncTree_=e,this.path_=t}getImmediateChild(e){const t=No(this.path_,e);return new fc(this.syncTree_,t)}node(){return sc(this.syncTree_,this.path_)}}const mc=function(e,t,n){return e&&"object"==typeof e?(K(".sv"in e,"Unexpected leaf node or priority contents"),"string"==typeof e[".sv"]?_c(e[".sv"],t,n):"object"==typeof e[".sv"]?yc(e[".sv"],t):void K(!1,"Unexpected server value: "+JSON.stringify(e,null,2))):e},_c=function(e,t,n){if("timestamp"===e)return n.timestamp;K(!1,"Unexpected server value: "+e)},yc=function(e,t,n){e.hasOwnProperty("increment")||K(!1,"Unexpected server value: "+JSON.stringify(e,null,2));const s=e.increment;"number"!=typeof s&&K(!1,"Unexpected increment value: "+s);const r=t.node();if(K(null!=r,"Expected ChildrenNode.EMPTY_NODE for nulls"),!r.isLeafNode())return s;const i=r.getValue();return"number"!=typeof i?s:i+s},vc=function(e,t,n,s){return wc(t,new fc(n,e),s)},bc=function(e,t,n){return wc(e,new gc(t),n)};function wc(e,t,n){const s=e.getPriority().val(),r=mc(s,t.getImmediateChild(".priority"),n);let i;if(e.isLeafNode()){const s=e,i=mc(s.getValue(),t,n);return i!==s.getValue()||r!==s.getPriority().val()?new na(i,pa(r)):e}{const s=e;return i=s,r!==s.getPriority().val()&&(i=i.updatePriority(new na(r))),s.forEachChild(sa,(e,s)=>{const r=wc(s,t.getImmediateChild(e),n);r!==s&&(i=i.updateImmediateChild(e,r))}),i}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xc{constructor(e="",t=null,n={children:{},childCount:0}){this.name=e,this.parent=t,this.node=n}}function kc(e,t){let n=t instanceof bo?t:new bo(t),s=e,r=xo(n);for(;null!==r;){const e=xe(s.node.children,r)||{children:{},childCount:0};s=new xc(r,s,e),n=Co(n),r=xo(n)}return s}function Cc(e){return e.node.value}function Ic(e,t){e.node.value=t,Pc(e)}function Tc(e){return e.node.childCount>0}function Ec(e,t){Hi(e.node.children,(n,s)=>{t(new xc(n,e,s))})}function Nc(e,t,n,s){n&&!s&&t(e),Ec(e,e=>{Nc(e,t,!0,s)}),n&&s&&t(e)}function Sc(e){return new bo(null===e.parent?e.name:Sc(e.parent)+"/"+e.name)}function Pc(e){null!==e.parent&&function(e,t,n){const s=function(e){return void 0===Cc(e)&&!Tc(e)}(n),r=we(e.node.children,t);s&&r?(delete e.node.children[t],e.node.childCount--,Pc(e)):s||r||(e.node.children[t]=n.node,e.node.childCount++,Pc(e))}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e.parent,e.name,e)}const Rc=/[\[\].#$\/\u0000-\u001F\u007F]/,Ac=/[\[\].#$\u0000-\u001F\u007F]/,Oc=10485760,Dc=function(e){return"string"==typeof e&&0!==e.length&&!Rc.test(e)},Lc=function(e){return"string"==typeof e&&0!==e.length&&!Ac.test(e)},jc=function(e,t,n){const s=n instanceof bo?new Do(n,e):n;if(void 0===t)throw new Error(e+"contains undefined "+jo(s));if("function"==typeof t)throw new Error(e+"contains a function "+jo(s)+" with contents = "+t.toString());if(Li(t))throw new Error(e+"contains "+t.toString()+" "+jo(s));if("string"==typeof t&&t.length>Oc/3&&De(t)>Oc)throw new Error(e+"contains a string greater than "+Oc+" utf8 bytes "+jo(s)+" ('"+t.substring(0,50)+"...')");if(t&&"object"==typeof t){let n=!1,r=!1;if(Hi(t,(t,i)=>{if(".value"===t)n=!0;else if(".priority"!==t&&".sv"!==t&&(r=!0,!Dc(t)))throw new Error(e+" contains an invalid key ("+t+") "+jo(s)+'.  Keys must be non-empty strings and can\'t contain ".", "#", "$", "/", "[", or "]"');var o,a;a=t,(o=s).parts_.length>0&&(o.byteLength_+=1),o.parts_.push(a),o.byteLength_+=De(a),Lo(o),jc(e,i,s),function(e){const t=e.parts_.pop();e.byteLength_-=De(t),e.parts_.length>0&&(e.byteLength_-=1)}(s)}),n&&r)throw new Error(e+' contains ".value" child '+jo(s)+" in addition to actual children.")}},Mc=function(e,t,n,s){if(s&&void 0===t)return;const r=Oe(e,"values");if(!t||"object"!=typeof t||Array.isArray(t))throw new Error(r+" must be an object containing the children to replace.");const i=[];Hi(t,(e,t)=>{const s=new bo(e);if(jc(r,t,No(n,s)),".priority"===Io(s)&&!(null===(o=t)||"string"==typeof o||"number"==typeof o&&!Li(o)||o&&"object"==typeof o&&we(o,".sv")))throw new Error(r+"contains an invalid value for '"+s.toString()+"', which must be a valid Firebase priority (a string, finite number, server value, or null).");var o;i.push(s)}),function(e,t){let n,s;for(n=0;n<t.length;n++){s=t[n];const r=To(s);for(let t=0;t<r.length;t++)if(".priority"===r[t]&&t===r.length-1);else if(!Dc(r[t]))throw new Error(e+"contains an invalid key ("+r[t]+") in path "+s.toString()+'. Keys must be non-empty strings and can\'t contain ".", "#", "$", "/", "[", or "]"')}t.sort(Ro);let r=null;for(n=0;n<t.length;n++){if(s=t[n],null!==r&&Oo(r,s))throw new Error(e+"contains a path "+r.toString()+" that is ancestor of another path "+s.toString());r=s}}(r,i)},Fc=function(e,t,n,s){if(!(s&&void 0===n||Lc(n)))throw new Error(Oe(e,t)+'was an invalid path = "'+n+'". Paths must be non-empty strings and can\'t contain ".", "#", "$", "[", or "]"')},Uc=function(e,t){if(".info"===xo(t))throw new Error(e+" failed = Can't modify data under /.info/")},qc=function(e,t){const n=t.path.toString();if("string"!=typeof t.repoInfo.host||0===t.repoInfo.host.length||!Dc(t.repoInfo.namespace)&&"localhost"!==t.repoInfo.host.split(":")[0]||0!==n.length&&!function(e){return e&&(e=e.replace(/^\/*\.info(\/|$)/,"/")),Lc(e)}(n))throw new Error(Oe(e,"url")+'must be a valid firebase URL and the path can\'t contain ".", "#", "$", "[", or "]".')};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Wc{constructor(){this.eventLists_=[],this.recursionDepth_=0}}function Vc(e,t){let n=null;for(let s=0;s<t.length;s++){const r=t[s],i=r.getPath();null===n||Ao(i,n.path)||(e.eventLists_.push(n),n=null),null===n&&(n={events:[],path:i}),n.events.push(r)}n&&e.eventLists_.push(n)}function Hc(e,t,n){Vc(e,n),Bc(e,e=>Ao(e,t))}function zc(e,t,n){Vc(e,n),Bc(e,e=>Oo(e,t)||Oo(t,e))}function Bc(e,t){e.recursionDepth_++;let n=!0;for(let s=0;s<e.eventLists_.length;s++){const r=e.eventLists_[s];if(r){t(r.path)?($c(e.eventLists_[s]),e.eventLists_[s]=null):n=!1}}n&&(e.eventLists_=[]),e.recursionDepth_--}function $c(e){for(let t=0;t<e.events.length;t++){const n=e.events[t];if(null!==n){e.events[t]=null;const s=n.getEventRunner();Ni&&Pi("event: "+n.toString()),Ki(s)}}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kc{constructor(e,t,n,s){this.repoInfo_=e,this.forceRestClient_=t,this.authTokenProvider_=n,this.appCheckProvider_=s,this.dataUpdateCount=0,this.statsListener_=null,this.eventQueue_=new Wc,this.nextWriteId_=1,this.interceptServerDataCallback_=null,this.onDisconnect_=Na(),this.transactionQueueTree_=new xc,this.persistentConnection_=null,this.key=this.repoInfo_.toURLString()}toString(){return(this.repoInfo_.secure?"https://":"http://")+this.repoInfo_.host}}function Gc(e,t,n){if(e.stats_=ao(e.repoInfo_),e.forceRestClient_||("object"==typeof window&&window.navigator&&window.navigator.userAgent||"").search(/googlebot|google webmaster tools|bingbot|yahoo! slurp|baiduspider|yandexbot|duckduckbot/i)>=0)e.server_=new Ta(e.repoInfo_,(t,n,s,r)=>{Qc(e,t,n,s,r)},e.authTokenProvider_,e.appCheckProvider_),setTimeout(()=>Xc(e,!0),0);else{if(null!=n){if("object"!=typeof n)throw new Error("Only objects are supported for option databaseAuthVariableOverride");try{ve(n)}catch(s){throw new Error("Invalid authOverride provided: "+s)}}e.persistentConnection_=new Uo(e.repoInfo_,t,(t,n,s,r)=>{Qc(e,t,n,s,r)},t=>{Xc(e,t)},t=>{!function(e,t){Hi(t,(t,n)=>{Zc(e,t,n)})}(e,t)},e.authTokenProvider_,e.appCheckProvider_,n),e.server_=e.persistentConnection_}e.authTokenProvider_.addTokenChangeListener(t=>{e.server_.refreshAuthToken(t)}),e.appCheckProvider_.addTokenChangeListener(t=>{e.server_.refreshAppCheckToken(t.token)}),e.statsReporter_=function(e,t){const n=e.toString();return oo[n]||(oo[n]=t()),oo[n]}(e.repoInfo_,()=>new Aa(e.stats_,e.server_)),e.infoData_=new Ea,e.infoSyncTree_=new Jl({startListening:(t,n,s,r)=>{let i=[];const o=e.infoData_.getNode(t._path);return o.isEmpty()||(i=ec(e.infoSyncTree_,t._path,o),setTimeout(()=>{r("ok")},0)),i},stopListening:()=>{}}),Zc(e,"connected",!1),e.serverSyncTree_=new Jl({startListening:(t,n,s,r)=>(e.server_.listen(t,s,n,(n,s)=>{const i=r(n,s);zc(e.eventQueue_,t._path,i)}),[]),stopListening:(t,n)=>{e.server_.unlisten(t,n)}})}function Yc(e){const t=e.infoData_.getNode(new bo(".info/serverTimeOffset")).val()||0;return(new Date).getTime()+t}function Jc(e){return(t=(t={timestamp:Yc(e)})||{}).timestamp=t.timestamp||(new Date).getTime(),t;var t}function Qc(e,t,n,s,r){e.dataUpdateCount++;const i=new bo(t);n=e.interceptServerDataCallback_?e.interceptServerDataCallback_(t,n):n;let o=[];if(r)if(s){const t=Ce(n,e=>pa(e));o=function(e,t,n,s){const r=hc(e,s);if(r){const s=uc(r),i=s.path,o=s.queryId,a=Po(i,t),l=Ya.fromObject(n);return dc(e,i,new Ua(La(o),a,l))}return[]}(e.serverSyncTree_,i,t,r)}else{const t=pa(n);o=function(e,t,n,s){const r=hc(e,s);if(null!=r){const s=uc(r),i=s.path,o=s.queryId,a=Po(i,t);return dc(e,i,new Fa(La(o),a,n))}return[]}(e.serverSyncTree_,i,t,r)}else if(s){const t=Ce(n,e=>pa(e));o=function(e,t,n){const s=Ya.fromObject(n);return rc(e,new Ua({fromUser:!1,fromServer:!0,queryId:null,tagged:!1},t,s))}(e.serverSyncTree_,i,t)}else{const t=pa(n);o=ec(e.serverSyncTree_,i,t)}let a=i;o.length>0&&(a=oh(e,i)),zc(e.eventQueue_,a,o)}function Xc(e,t){Zc(e,"connected",t),!1===t&&function(e){nh(e,"onDisconnectEvents");const t=Jc(e),n=Na();Pa(e.onDisconnect_,wo(),(s,r)=>{const i=vc(s,r,e.serverSyncTree_,t);Sa(n,s,i)});let s=[];Pa(n,wo(),(t,n)=>{s=s.concat(ec(e.serverSyncTree_,t,n));const r=uh(e,t);oh(e,r)}),e.onDisconnect_=Na(),zc(e.eventQueue_,wo(),s)}(e)}function Zc(e,t,n){const s=new bo("/.info/"+t),r=pa(n);e.infoData_.updateSnapshot(s,r);const i=ec(e.infoSyncTree_,s,r);zc(e.eventQueue_,s,i)}function eh(e){return e.nextWriteId_++}function th(e,t,n){let s;s=".info"===xo(t._path)?tc(e.infoSyncTree_,t,n):tc(e.serverSyncTree_,t,n),Hc(e.eventQueue_,t._path,s)}function nh(e,...t){let n="";e.persistentConnection_&&(n=e.persistentConnection_.id+":"),Pi(n,...t)}function sh(e,t,n,s){t&&Ki(()=>{if("ok"===n)t(null);else{const e=(n||"error").toUpperCase();let r=e;s&&(r+=": "+s);const i=new Error(r);i.code=e,t(i)}})}function rh(e,t,n){return sc(e.serverSyncTree_,t,n)||ua.EMPTY_NODE}function ih(e,t=e.transactionQueueTree_){if(t||hh(e,t),Cc(t)){const n=lh(e,t);K(n.length>0,"Sending zero length transaction queue");n.every(e=>0===e.status)&&function(e,t,n){const s=n.map(e=>e.currentWriteId),r=rh(e,t,s);let i=r;const o=r.hash();for(let c=0;c<n.length;c++){const e=n[c];K(0===e.status,"tryToSendTransactionQueue_: items in queue should all be run."),e.status=1,e.retryCount++;const s=Po(t,e.path);i=i.updateChild(s,e.currentOutputSnapshotRaw)}const a=i.val(!0),l=t;e.server_.put(l.toString(),a,s=>{nh(e,"transaction put response",{path:l.toString(),status:s});let r=[];if("ok"===s){const s=[];for(let t=0;t<n.length;t++)n[t].status=2,r=r.concat(Zl(e.serverSyncTree_,n[t].currentWriteId)),n[t].onComplete&&s.push(()=>n[t].onComplete(null,!0,n[t].currentOutputSnapshotResolved)),n[t].unwatcher();hh(e,kc(e.transactionQueueTree_,t)),ih(e,e.transactionQueueTree_),zc(e.eventQueue_,t,r);for(let e=0;e<s.length;e++)Ki(s[e])}else{if("datastale"===s)for(let e=0;e<n.length;e++)3===n[e].status?n[e].status=4:n[e].status=0;else{Di("transaction at "+l.toString()+" failed: "+s);for(let e=0;e<n.length;e++)n[e].status=4,n[e].abortReason=s}oh(e,t)}},o)}(e,Sc(t),n)}else Tc(t)&&Ec(t,t=>{ih(e,t)})}function oh(e,t){const n=ah(e,t),s=Sc(n);return function(e,t,n){if(0===t.length)return;const s=[];let r=[];const i=t.filter(e=>0===e.status),o=i.map(e=>e.currentWriteId);for(let a=0;a<t.length;a++){const i=t[a],l=Po(n,i.path);let c,h=!1;if(K(null!==l,"rerunTransactionsUnderNode_: relativePath should not be null."),4===i.status)h=!0,c=i.abortReason,r=r.concat(Zl(e.serverSyncTree_,i.currentWriteId,!0));else if(0===i.status)if(i.retryCount>=25)h=!0,c="maxretry",r=r.concat(Zl(e.serverSyncTree_,i.currentWriteId,!0));else{const n=rh(e,i.path,o);i.currentInputSnapshot=n;const s=t[a].update(n.val());if(void 0!==s){jc("transaction failed: Data returned ",s,i.path);let t=pa(s);"object"==typeof s&&null!=s&&we(s,".priority")||(t=t.updatePriority(n.getPriority()));const a=i.currentWriteId,l=Jc(e),c=bc(t,n,l);i.currentOutputSnapshotRaw=t,i.currentOutputSnapshotResolved=c,i.currentWriteId=eh(e),o.splice(o.indexOf(a),1),r=r.concat(Ql(e.serverSyncTree_,i.path,c,i.currentWriteId,i.applyLocally)),r=r.concat(Zl(e.serverSyncTree_,a,!0))}else h=!0,c="nodata",r=r.concat(Zl(e.serverSyncTree_,i.currentWriteId,!0))}zc(e.eventQueue_,n,r),r=[],h&&(t[a].status=2,function(e){setTimeout(e,Math.floor(0))}(t[a].unwatcher),t[a].onComplete&&("nodata"===c?s.push(()=>t[a].onComplete(null,!1,t[a].currentInputSnapshot)):s.push(()=>t[a].onComplete(new Error(c),!1,null))))}hh(e,e.transactionQueueTree_);for(let a=0;a<s.length;a++)Ki(s[a]);ih(e,e.transactionQueueTree_)}(e,lh(e,n),s),s}function ah(e,t){let n,s=e.transactionQueueTree_;for(n=xo(t);null!==n&&void 0===Cc(s);)s=kc(s,n),n=xo(t=Co(t));return s}function lh(e,t){const n=[];return ch(e,t,n),n.sort((e,t)=>e.order-t.order),n}function ch(e,t,n){const s=Cc(t);if(s)for(let r=0;r<s.length;r++)n.push(s[r]);Ec(t,t=>{ch(e,t,n)})}function hh(e,t){const n=Cc(t);if(n){let e=0;for(let t=0;t<n.length;t++)2!==n[t].status&&(n[e]=n[t],e++);n.length=e,Ic(t,n.length>0?n:void 0)}Ec(t,t=>{hh(e,t)})}function uh(e,t){const n=Sc(ah(e,t)),s=kc(e.transactionQueueTree_,t);return function(e,t,n){let s=n?e:e.parent;for(;null!==s;){if(t(s))return!0;s=s.parent}}(s,t=>{dh(e,t)}),dh(e,s),Nc(s,t=>{dh(e,t)}),n}function dh(e,t){const n=Cc(t);if(n){const s=[];let r=[],i=-1;for(let t=0;t<n.length;t++)3===n[t].status||(1===n[t].status?(K(i===t-1,"All SENT items should be at beginning of queue."),i=t,n[t].status=3,n[t].abortReason="set"):(K(0===n[t].status,"Unexpected transaction status in abort"),n[t].unwatcher(),r=r.concat(Zl(e.serverSyncTree_,n[t].currentWriteId,!0)),n[t].onComplete&&s.push(n[t].onComplete.bind(null,new Error("set"),!1,null))));-1===i?Ic(t,void 0):n.length=i+1,zc(e.eventQueue_,Sc(t),r);for(let e=0;e<s.length;e++)Ki(s[e])}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ph=function(e,t){const n=gh(e),s=n.namespace;"firebase.com"===n.domain&&Oi(n.host+" is no longer supported. Please use <YOUR FIREBASE>.firebaseio.com instead"),s&&"undefined"!==s||"localhost"===n.domain||Oi("Cannot parse Firebase url. Please use https://<YOUR FIREBASE>.firebaseio.com"),n.secure||"undefined"!=typeof window&&window.location&&window.location.protocol&&-1!==window.location.protocol.indexOf("https:")&&Di("Insecure Firebase access from a secure page. Please use https in calls to new Firebase().");const r="ws"===n.scheme||"wss"===n.scheme;return{repoInfo:new no(n.host,n.secure,s,r,t,"",s!==n.subdomain),path:new bo(n.pathString)}},gh=function(e){let t="",n="",s="",r="",i="",o=!0,a="https",l=443;if("string"==typeof e){let c=e.indexOf("//");c>=0&&(a=e.substring(0,c-1),e=e.substring(c+2));let h=e.indexOf("/");-1===h&&(h=e.length);let u=e.indexOf("?");-1===u&&(u=e.length),t=e.substring(0,Math.min(h,u)),h<u&&(r=function(e){let t="";const n=e.split("/");for(let r=0;r<n.length;r++)if(n[r].length>0){let e=n[r];try{e=decodeURIComponent(e.replace(/\+/g," "))}catch(s){}t+="/"+e}return t}(e.substring(h,u)));const d=function(e){const t={};"?"===e.charAt(0)&&(e=e.substring(1));for(const n of e.split("&")){if(0===n.length)continue;const s=n.split("=");2===s.length?t[decodeURIComponent(s[0])]=decodeURIComponent(s[1]):Di(`Invalid query segment '${n}' in query '${e}'`)}return t}(e.substring(Math.min(e.length,u)));c=t.indexOf(":"),c>=0?(o="https"===a||"wss"===a,l=parseInt(t.substring(c+1),10)):c=t.length;const p=t.slice(0,c);if("localhost"===p.toLowerCase())n="localhost";else if(p.split(".").length<=2)n=p;else{const e=t.indexOf(".");s=t.substring(0,e).toLowerCase(),n=t.substring(e+1),i=s}"ns"in d&&(i=d.ns)}return{host:t,port:l,domain:n,subdomain:s,secure:o,scheme:a,pathString:r,namespace:i}};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class fh{constructor(e,t,n,s){this.eventType=e,this.eventRegistration=t,this.snapshot=n,this.prevName=s}getPath(){const e=this.snapshot.ref;return"value"===this.eventType?e._path:e.parent._path}getEventType(){return this.eventType}getEventRunner(){return this.eventRegistration.getEventRunner(this)}toString(){return this.getPath().toString()+":"+this.eventType+":"+ve(this.snapshot.exportVal())}}class mh{constructor(e,t,n){this.eventRegistration=e,this.error=t,this.path=n}getPath(){return this.path}getEventType(){return"cancel"}getEventRunner(){return this.eventRegistration.getEventRunner(this)}toString(){return this.path.toString()+":cancel"}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _h{constructor(e,t){this.snapshotCallback=e,this.cancelCallback=t}onValue(e,t){this.snapshotCallback.call(null,e,t)}onCancel(e){return K(this.hasCancelCallback,"Raising a cancel event on a listener with no cancel callback"),this.cancelCallback.call(null,e)}get hasCancelCallback(){return!!this.cancelCallback}matches(e){return this.snapshotCallback===e.snapshotCallback||void 0!==this.snapshotCallback.userCallback&&this.snapshotCallback.userCallback===e.snapshotCallback.userCallback&&this.snapshotCallback.context===e.snapshotCallback.context}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yh{constructor(e,t,n,s){this._repo=e,this._path=t,this._queryParams=n,this._orderByCalled=s}get key(){return So(this._path)?null:Io(this._path)}get ref(){return new vh(this._repo,this._path)}get _queryIdentifier(){const e=Ia(this._queryParams),t=Wi(e);return"{}"===t?"default":t}get _queryObject(){return Ia(this._queryParams)}isEqual(e){if(!((e=Le(e))instanceof yh))return!1;const t=this._repo===e._repo,n=Ao(this._path,e._path),s=this._queryIdentifier===e._queryIdentifier;return t&&n&&s}toJSON(){return this.toString()}toString(){return this._repo.toString()+function(e){let t="";for(let n=e.pieceNum_;n<e.pieces_.length;n++)""!==e.pieces_[n]&&(t+="/"+encodeURIComponent(String(e.pieces_[n])));return t||"/"}(this._path)}}class vh extends yh{constructor(e,t){super(e,t,new ka,!1)}get parent(){const e=Eo(this._path);return null===e?null:new vh(this._repo,e)}get root(){let e=this;for(;null!==e.parent;)e=e.parent;return e}}class bh{constructor(e,t,n){this._node=e,this.ref=t,this._index=n}get priority(){return this._node.getPriority().val()}get key(){return this.ref.key}get size(){return this._node.numChildren()}child(e){const t=new bo(e),n=xh(this.ref,e);return new bh(this._node.getChild(t),n,sa)}exists(){return!this._node.isEmpty()}exportVal(){return this._node.val(!0)}forEach(e){if(this._node.isLeafNode())return!1;return!!this._node.forEachChild(this._index,(t,n)=>e(new bh(n,xh(this.ref,t),sa)))}hasChild(e){const t=new bo(e);return!this._node.getChild(t).isEmpty()}hasChildren(){return!this._node.isLeafNode()&&!this._node.isEmpty()}toJSON(){return this.exportVal()}val(){return this._node.val()}}function wh(e,t){return(e=Le(e))._checkNotDeleted("ref"),void 0!==t?xh(e._root,t):e._root}function xh(e,t){var n,s,r,i;return null===xo((e=Le(e))._path)?(n="child",s="path",i=!1,(r=t)&&(r=r.replace(/^\/*\.info(\/|$)/,"/")),Fc(n,s,r,i)):Fc("child","path",t,!1),new vh(e._repo,No(e._path,t))}function kh(e,t){e=Le(e),Uc("set",e._path),function(e,t,n,s){s&&void 0===t||jc(Oe(e,"value"),t,n)}("set",t,e._path,!1);const n=new he;return function(e,t,n,s,r){nh(e,"set",{path:t.toString(),value:n,priority:s});const i=Jc(e),o=pa(n,s),a=sc(e.serverSyncTree_,t),l=bc(o,a,i),c=eh(e),h=Ql(e.serverSyncTree_,t,l,c,!0);Vc(e.eventQueue_,h),e.server_.put(t.toString(),o.val(!0),(n,s)=>{const i="ok"===n;i||Di("set at "+t+" failed: "+n);const o=Zl(e.serverSyncTree_,c,!i);zc(e.eventQueue_,t,o),sh(0,r,n,s)});const u=uh(e,t);oh(e,u),zc(e.eventQueue_,u,[])}(e._repo,e._path,t,null,n.wrapCallback(()=>{})),n.promise}function Ch(e,t){Mc("update",t,e._path,!1);const n=new he;return function(e,t,n,s){nh(e,"update",{path:t.toString(),value:n});let r=!0;const i=Jc(e),o={};if(Hi(n,(n,s)=>{r=!1,o[n]=vc(No(t,n),pa(s),e.serverSyncTree_,i)}),r)Pi("update() called with empty data.  Don't do anything."),sh(0,s,"ok",void 0);else{const r=eh(e),i=Xl(e.serverSyncTree_,t,o,r);Vc(e.eventQueue_,i),e.server_.merge(t.toString(),n,(n,i)=>{const o="ok"===n;o||Di("update at "+t+" failed: "+n);const a=Zl(e.serverSyncTree_,r,!o),l=a.length>0?oh(e,t):t;zc(e.eventQueue_,l,a),sh(0,s,n,i)}),Hi(n,n=>{const s=uh(e,No(t,n));oh(e,s)}),zc(e.eventQueue_,t,[])}}(e._repo,e._path,t,n.wrapCallback(()=>{})),n.promise}class Ih{constructor(e){this.callbackContext=e}respondsTo(e){return"value"===e}createEvent(e,t){const n=t._queryParams.getIndex();return new fh("value",this,new bh(e.snapshotNode,new vh(t._repo,t._path),n))}getEventRunner(e){return"cancel"===e.getEventType()?()=>this.callbackContext.onCancel(e.error):()=>this.callbackContext.onValue(e.snapshot,null)}createCancelEvent(e,t){return this.callbackContext.hasCancelCallback?new mh(this,e,t):null}matches(e){return e instanceof Ih&&(!e.callbackContext||!this.callbackContext||e.callbackContext.matches(this.callbackContext))}hasAnyCallback(){return null!==this.callbackContext}}class Th{constructor(e,t){this.eventType=e,this.callbackContext=t}respondsTo(e){let t="children_added"===e?"child_added":e;return t="children_removed"===t?"child_removed":t,this.eventType===t}createCancelEvent(e,t){return this.callbackContext.hasCancelCallback?new mh(this,e,t):null}createEvent(e,t){K(null!=e.childName,"Child events should have a childName.");const n=xh(new vh(t._repo,t._path),e.childName),s=t._queryParams.getIndex();return new fh(e.type,this,new bh(e.snapshotNode,n,s),e.prevName)}getEventRunner(e){return"cancel"===e.getEventType()?()=>this.callbackContext.onCancel(e.error):()=>this.callbackContext.onValue(e.snapshot,e.prevName)}matches(e){return e instanceof Th&&(this.eventType===e.eventType&&(!this.callbackContext||!e.callbackContext||this.callbackContext.matches(e.callbackContext)))}hasAnyCallback(){return!!this.callbackContext}}function Eh(e,t,n,s,r){let i;if("object"==typeof s&&(i=void 0,r=s),"function"==typeof s&&(i=s),r&&r.onlyOnce){const t=n,s=(n,s)=>{th(e._repo,e,a),t(n,s)};s.userCallback=n.userCallback,s.context=n.context,n=s}const o=new _h(n,i||void 0),a="value"===t?new Ih(o):new Th(t,o);return function(e,t,n){let s;s=".info"===xo(t._path)?nc(e.infoSyncTree_,t,n):nc(e.serverSyncTree_,t,n),Hc(e.eventQueue_,t._path,s)}(e._repo,e,a),()=>th(e._repo,e,a)}function Nh(e,t,n,s){return Eh(e,"value",t,n,s)}function Sh(e,t,n){let s=null;const r=n?new _h(n):null;"value"===t?s=new Ih(r):t&&(s=new Th(t,r)),th(e._repo,e,s)}!function(e){K(!Ml,"__referenceConstructor has already been defined"),Ml=e}(vh),function(e){K(!Fl,"__referenceConstructor has already been defined"),Fl=e}(vh);
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const Ph={};let Rh=!1;function Ah(e,t,n,s,r){let i=s||e.options.databaseURL;void 0===i&&(e.options.projectId||Oi("Can't determine Firebase Database URL. Be sure to include  a Project ID when calling firebase.initializeApp()."),Pi("Using default host for project ",e.options.projectId),i=`${e.options.projectId}-default-rtdb.firebaseio.com`);let o,a,l=ph(i,r),c=l.repoInfo;"undefined"!=typeof process&&process.env&&(a=process.env.FIREBASE_DATABASE_EMULATOR_HOST),a?(o=!0,i=`http://${a}?ns=${c.namespace}`,l=ph(i,r),c=l.repoInfo):o=!l.repoInfo.secure;const h=r&&o?new Qi(Qi.OWNER):new Ji(e.name,e.options,t);qc("Invalid Firebase Database URL",l),So(l.path)||Oi("Database URL must point to the root of a Firebase Database (not including a child path).");const u=function(e,t,n,s){let r=Ph[t.name];r||(r={},Ph[t.name]=r);let i=r[e.toURLString()];i&&Oi("Database initialized multiple times. Please make sure the format of the database URL matches with each database() call.");return i=new Kc(e,Rh,n,s),r[e.toURLString()]=i,i}(c,e,h,new Yi(e,n));return new Oh(u,e)}class Oh{constructor(e,t){this._repoInternal=e,this.app=t,this.type="database",this._instanceStarted=!1}get _repo(){return this._instanceStarted||(Gc(this._repoInternal,this.app.options.appId,this.app.options.databaseAuthVariableOverride),this._instanceStarted=!0),this._repoInternal}get _root(){return this._rootInternal||(this._rootInternal=new vh(this._repo,wo())),this._rootInternal}_delete(){return null!==this._rootInternal&&(!function(e,t){const n=Ph[t];n&&n[e.key]===e||Oi(`Database ${t}(${e.repoInfo_}) has already been deleted.`),function(e){e.persistentConnection_&&e.persistentConnection_.interrupt("repo_interrupt")}(e),delete n[e.key]}(this._repo,this.app.name),this._repoInternal=null,this._rootInternal=null),Promise.resolve()}_checkNotDeleted(e){null===this._rootInternal&&Oi("Cannot call "+e+" on a deleted database.")}}Uo.prototype.simpleListen=function(e,t){this.sendRequest("q",{p:e},t)},Uo.prototype.echo=function(e,t){this.sendRequest("echo",{d:e},t)},
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function(e){yi=Xt,Kt(new Fe("database",(e,{instanceIdentifier:t})=>Ah(e.getProvider("app").getImmediate(),e.getProvider("auth-internal"),e.getProvider("app-check-internal"),t),"PUBLIC").setMultipleInstances(!0)),tn(mi,_i,e),tn(mi,_i,"esm2020")}();
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const Dh="functions";
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lh{constructor(e,t,n,s){this.app=e,this.auth=null,this.messaging=null,this.appCheck=null,this.serverAppAppCheckToken=null,Yt(e)&&e.settings.appCheckToken&&(this.serverAppAppCheckToken=e.settings.appCheckToken),this.auth=t.getImmediate({optional:!0}),this.messaging=n.getImmediate({optional:!0}),this.auth||t.get().then(e=>this.auth=e,()=>{}),this.messaging||n.get().then(e=>this.messaging=e,()=>{}),this.appCheck||null==s||s.get().then(e=>this.appCheck=e,()=>{})}async getAuthToken(){if(this.auth)try{const e=await this.auth.getToken();return null==e?void 0:e.accessToken}catch(e){return}}async getMessagingToken(){if(this.messaging&&"Notification"in self&&"granted"===Notification.permission)try{return await this.messaging.getToken()}catch(e){return}}async getAppCheckToken(e){if(this.serverAppAppCheckToken)return this.serverAppAppCheckToken;if(this.appCheck){const t=e?await this.appCheck.getLimitedUseToken():await this.appCheck.getToken();return t.error?null:t.token}return null}async getContext(e){return{authToken:await this.getAuthToken(),messagingToken:await this.getMessagingToken(),appCheckToken:await this.getAppCheckToken(e)}}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const jh="us-central1";class Mh{constructor(e,t,n,s,r=jh,i=(...e)=>fetch(...e)){this.app=e,this.fetchImpl=i,this.emulatorOrigin=null,this.contextProvider=new Lh(e,t,n,s),this.cancelAllRequests=new Promise(e=>{this.deleteService=()=>Promise.resolve(e())});try{const e=new URL(r);this.customDomain=e.origin+("/"===e.pathname?"":e.pathname),this.region=jh}catch(o){this.customDomain=null,this.region=r}}_delete(){return this.deleteService()}_url(e){const t=this.app.options.projectId;if(null!==this.emulatorOrigin){return`${this.emulatorOrigin}/${t}/${this.region}/${e}`}return null!==this.customDomain?`${this.customDomain}/${e}`:`https://${this.region}-${t}.cloudfunctions.net/${e}`}}const Fh="@firebase/functions",Uh="0.13.3";!function(e){Kt(new Fe(Dh,(e,{instanceIdentifier:t})=>{const n=e.getProvider("app").getImmediate(),s=e.getProvider("auth-internal"),r=e.getProvider("messaging-internal"),i=e.getProvider("app-check-internal");return new Mh(n,s,r,i,t)},"PUBLIC").setMultipleInstances(!0)),tn(Fh,Uh,e),tn(Fh,Uh,"esm2020")}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */();const qh=Zt({apiKey:"AIzaSyD99N-FQdkTPNnNGY-fof6ijskxg0bzARc",authDomain:"monitoring-listrik-719b1.firebaseapp.com",databaseURL:"https://monitoring-listrik-719b1-default-rtdb.asia-southeast1.firebasedatabase.app",projectId:"monitoring-listrik-719b1",storageBucket:"monitoring-listrik-719b1.firebasestorage.app",messagingSenderId:"115654600721",appId:"1:115654600721:web:6b971ee1c19be7e045a9b0"}),Wh=function(e=en()){const t=Gt(e,"auth");if(t.isInitialized())return t.getImmediate();const n=function(e,t){const n=Gt(e,"auth");if(n.isInitialized()){const e=n.getImmediate();if(Ie(n.getOptions(),t??{}))return e;yn(e,"already-initialized")}return n.initialize({options:t})}(e,{popupRedirectResolver:ci,persistence:[Tr,cr,ur]}),s=ce("authTokenSyncURL");if(s&&"boolean"==typeof isSecureContext&&isSecureContext){const e=new URL(s,location.origin);if(location.origin===e.origin){const t=(r=e.toString(),async e=>{const t=e&&await e.getIdTokenResult(),n=t&&((new Date).getTime()-Date.parse(t.issuedAtTime))/1e3;if(n&&n>pi)return;const s=null==t?void 0:t.token;gi!==s&&(gi=s,await fetch(r,{method:s?"POST":"DELETE",headers:s?{Authorization:`Bearer ${s}`}:{}}))});!function(e,t,n){Le(e).beforeAuthStateChanged(t,n)}(n,t,()=>t(n.currentUser)),function(e,t,n,s){Le(e).onIdTokenChanged(t,n,s)}(n,e=>t(e))}}var r;const i=oe("auth");return i&&Ls(n,`http://${i}`),n}(qh),Vh=function(e=en(),t){const n=Gt(e,"database").getImmediate({identifier:t});if(!n._instanceStarted){const e=ae("database");e&&function(e,t,n,s={}){e=Le(e),e._checkNotDeleted("useEmulator");const r=`${t}:${n}`,i=e._repoInternal;if(e._instanceStarted){if(r===e._repoInternal.repoInfo_.host&&Ie(s,i.repoInfo_.emulatorOptions))return;Oi("connectDatabaseEmulator() cannot initialize or alter the emulator configuration after the database instance has started.")}let o;if(i.repoInfo_.nodeAdmin)s.mockUserToken&&Oi('mockUserToken is not supported by the Admin SDK. For client access with mock users, please use the "firebase" package instead of "firebase-admin".'),o=new Qi(Qi.OWNER);else if(s.mockUserToken){const t="string"==typeof s.mockUserToken?s.mockUserToken:function(e,t){if(e.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const n=t||"demo-project",s=e.iat||0,r=e.sub||e.user_id;if(!r)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const i={iss:`https://securetoken.google.com/${n}`,aud:n,iat:s,exp:s+3600,auth_time:s,sub:r,user_id:r,firebase:{sign_in_provider:"custom",identities:{}},...e};return[Z(JSON.stringify({alg:"none",type:"JWT"})),Z(JSON.stringify(i)),""].join(".")}(s.mockUserToken,e.app.options.projectId);o=new Qi(t)}je(t)&&Me(t);!function(e,t,n,s){const r=t.lastIndexOf(":"),i=je(t.substring(0,r));e.repoInfo_=new no(t,i,e.repoInfo_.namespace,e.repoInfo_.webSocketOnly,e.repoInfo_.nodeAdmin,e.repoInfo_.persistenceKey,e.repoInfo_.includeNamespaceInQueryParams,!0,n),s&&(e.authTokenProvider_=s)}(i,r,s,o)}(n,...e)}return n}(qh);!function(e=en(),t=jh){const n=Gt(Le(e),Dh).getImmediate({identifier:t}),s=ae("functions");s&&function(e,t,n){!function(e,t,n){const s=je(t);e.emulatorOrigin=`http${s?"s":""}://${t}:${n}`,s&&Me(e.emulatorOrigin+"/backends")}(Le(e),t,n)}(n,...s)}(qh,"asia-southeast1");const Hh=H(e=>{let t=null,n=null;return{user:null,role:null,loading:!0,error:null,initAuth:()=>{var s,r,i;t&&t(),n&&n(),s=async t=>{if(e({user:t,error:null}),t){const s=wh(Vh,`users/${t.uid}/role`);n=Nh(s,t=>{const n=t.val()||"user";e({role:n,loading:!1})},t=>{console.error("Error fetching role:",t),e({role:"user",loading:!1})})}else e({role:null,loading:!1})},t=Le(Wh).onAuthStateChanged(s,r,i)},logout:async()=>{try{await(t=Wh,Le(t).signOut()),e({user:null,role:null,error:null}),n&&(n(),n=null)}catch(s){e({error:s instanceof Error?s.message:"Logout failed"})}var t}}}),zh=H(e=>{const t=[];return{currentData:null,logs:[],settings:null,users:[],loading:!0,unsubscribeAll:()=>{t.forEach(e=>e()),t.length=0},subscribeToData:()=>{const n=wh(Vh,"listrik");Nh(n,t=>{const n=t.val();e({currentData:n||null,loading:!1})},t=>{console.error("Error fetching data:",t),e({loading:!1})}),t.push(()=>Sh(n))},subscribeLogs:(n=100)=>{const s=wh(Vh,"logs");Nh(s,t=>{const s=t.val(),r=s?Object.entries(s).map(([e,t])=>({id:e,...t})).sort((e,t)=>(t.timestamp||0)-(e.timestamp||0)).slice(0,n):[];e({logs:r,loading:!1})},t=>{console.error("Error fetching logs:",t),e({loading:!1})}),t.push(()=>Sh(s))},subscribeSettings:()=>{const n=wh(Vh,"settings");Nh(n,t=>{const n=t.val();e({settings:n||null})},e=>{console.error("Error fetching settings:",e)}),t.push(()=>Sh(n))},subscribeUsers:()=>{const n=wh(Vh,"users");Nh(n,t=>{const n=t.val(),s=n?Object.entries(n).map(([e,t])=>({uid:e,...t})):[];e({users:s})},e=>{console.error("Error fetching users:",e)}),t.push(()=>Sh(n))}}});
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var Bh={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $h=(t,n)=>{const s=e.forwardRef(({color:s="currentColor",size:r=24,strokeWidth:i=2,absoluteStrokeWidth:o,className:a="",children:l,...c},h)=>{return e.createElement("svg",{ref:h,...Bh,width:r,height:r,stroke:s,strokeWidth:o?24*Number(i)/Number(r):i,className:["lucide",`lucide-${u=t,u.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase().trim()}`,a].join(" "),...c},[...n.map(([t,n])=>e.createElement(t,n)),...Array.isArray(l)?l:[l]]);var u});return s.displayName=`${t}`,s},Kh=$h("BarChart3",[["path",{d:"M3 3v18h18",key:"1s2lah"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]),Gh=$h("Bell",[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9",key:"1qo2s2"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0",key:"qgo35s"}]]),Yh=$h("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]),Jh=$h("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]),Qh=$h("Home",[["path",{d:"m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"y5dka4"}],["polyline",{points:"9 22 9 12 15 12 15 22",key:"e2us08"}]]),Xh=$h("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]),Zh=$h("Moon",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]]),eu=$h("Settings",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]),tu=$h("Sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);function nu({activePage:e,onNavigate:t}){const n=[{key:"dashboard",label:"Dashboard",icon:Qh},{key:"history",label:"History",icon:Yh},{key:"analytics",label:"Analytics",icon:Kh},{key:"settings",label:"Settings",icon:eu}];return p.jsxs("aside",{className:"w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700",children:[p.jsx("div",{className:"p-6",children:p.jsx("h1",{className:"text-xl font-bold text-gray-900 dark:text-white",children:"IoT Dashboard"})}),p.jsx("nav",{className:"px-4",children:p.jsx("ul",{className:"space-y-2",children:n.map(n=>{const s=n.icon,r=e===n.key;return p.jsx("li",{children:p.jsxs("button",{type:"button",onClick:()=>t(n.key),className:"flex items-center w-full px-4 py-2 rounded-lg text-left transition "+(r?"bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300":"text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"),children:[p.jsx(s,{className:"w-5 h-5 mr-3"}),n.label]})},n.key)})})})]})}function su({title:e}){const{theme:t,toggleTheme:n}=z();return p.jsxs("header",{className:"h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6",children:[p.jsx("h2",{className:"text-lg font-semibold text-gray-900 dark:text-white",children:e}),p.jsxs("div",{className:"flex items-center space-x-4",children:[p.jsx("button",{onClick:()=>{window.electronAPI&&window.electronAPI.showNotification("Test Notification","This is a test notification from the app!")},className:"p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",children:p.jsx(Gh,{className:"w-5 h-5"})}),p.jsx("button",{onClick:n,className:"p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",children:"light"===t?p.jsx(Zh,{className:"w-5 h-5"}):p.jsx(tu,{className:"w-5 h-5"})})]})]})}function ru(){var t,n,s;const{currentData:r,logs:i}=zh(),{role:o}=Hh(),[a,l]=e.useState(!1),c=e=>{switch(e){case"NORMAL":return"text-green-600";case"WARNING":return"text-yellow-600";case"LEAKAGE":return"text-orange-600";case"DANGER":return"text-red-600";default:return"text-gray-600"}},h=e=>{if(!e)return"-";return new Date(e).toLocaleString("id-ID")};return p.jsxs("div",{className:"space-y-6",children:[p.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",children:[p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow",children:[p.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mb-2",children:"Arus"}),p.jsxs("p",{className:"text-3xl font-bold text-blue-600",children:[(null==(t=null==r?void 0:r.arus)?void 0:t.toFixed(2))||"0.00"," ",p.jsx("span",{className:"text-lg",children:"A"})]})]}),p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow",children:[p.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mb-2",children:"Tegangan"}),p.jsxs("p",{className:"text-3xl font-bold text-green-600",children:[(null==(n=null==r?void 0:r.tegangan)?void 0:n.toFixed(2))||"0.00"," ",p.jsx("span",{className:"text-lg",children:"V"})]})]}),p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow",children:[p.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mb-2",children:"Daya Semu"}),p.jsxs("p",{className:"text-3xl font-bold text-purple-600",children:[(null==(s=null==r?void 0:r.apparent_power)?void 0:s.toFixed(2))||"0.00"," ",p.jsx("span",{className:"text-lg",children:"VA"})]})]}),p.jsxs("div",{className:`${(e=>{switch(e){case"NORMAL":return"bg-green-100 dark:bg-green-900";case"WARNING":return"bg-yellow-100 dark:bg-yellow-900";case"LEAKAGE":return"bg-orange-100 dark:bg-orange-900";case"DANGER":return"bg-red-100 dark:bg-red-900";default:return"bg-gray-100 dark:bg-gray-800"}})(null==r?void 0:r.status)} p-6 rounded-lg shadow`,children:[p.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mb-2",children:"Status"}),p.jsx("p",{className:`text-2xl font-bold ${c(null==r?void 0:r.status)}`,children:(null==r?void 0:r.status)||"UNKNOWN"})]})]}),p.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow",children:[p.jsxs("div",{className:"flex items-center justify-between",children:[p.jsxs("div",{children:[p.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mb-2",children:"Relay Status"}),p.jsx("p",{className:"text-xl font-bold "+((null==r?void 0:r.relay)?"text-green-600":"text-red-600"),children:(null==r?void 0:r.relay)?"ON":"OFF"})]}),"admin"===o&&p.jsx("button",{onClick:async()=>{if("admin"===o){l(!0);try{await Ch(wh(Vh,"listrik"),{relay:!(null==r?void 0:r.relay)})}catch(e){console.error("Error toggling relay:",e)}finally{l(!1)}}},disabled:a,className:"px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition",children:a?"Loading...":"Toggle"})]}),p.jsxs("p",{className:"text-xs text-gray-500 dark:text-gray-400 mt-2",children:["Updated: ",h(null==r?void 0:r.updated_at)]})]}),p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow",children:[p.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mb-4",children:"System Info"}),p.jsxs("div",{className:"space-y-2 text-sm",children:[p.jsxs("div",{className:"flex justify-between",children:[p.jsx("span",{className:"text-gray-600 dark:text-gray-400",children:"Status:"}),p.jsx("span",{className:"font-semibold text-gray-900 dark:text-white",children:r?"Online":"Offline"})]}),p.jsxs("div",{className:"flex justify-between",children:[p.jsx("span",{className:"text-gray-600 dark:text-gray-400",children:"Role:"}),p.jsx("span",{className:"font-semibold text-gray-900 dark:text-white capitalize",children:o||"User"})]})]})]})]}),p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow",children:[p.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mb-4",children:"Recent Activity"}),p.jsx("div",{className:"space-y-3",children:i.length>0?i.slice(0,5).map(e=>{var t,n;return p.jsxs("div",{className:"flex justify-between items-start py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0",children:[p.jsxs("div",{children:[p.jsxs("p",{className:"text-gray-700 dark:text-gray-300",children:["Status: ",p.jsx("span",{className:`font-semibold ${c(e.status)}`,children:e.status})]}),p.jsxs("p",{className:"text-xs text-gray-500 dark:text-gray-400",children:["Arus: ",(null==(t=e.arus)?void 0:t.toFixed(2))||"0"," A | Tegangan: ",(null==(n=e.tegangan)?void 0:n.toFixed(2))||"0"," V"]})]}),p.jsx("span",{className:"text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2",children:h(e.timestamp)})]},e.id)}):p.jsx("p",{className:"text-gray-500 dark:text-gray-400",children:"No activity yet"})})]})]})}function iu(){const{logs:t}=zh(),[n,s]=e.useState(""),r=n?t.filter(e=>e.status===n):t,i=e=>{switch(e){case"NORMAL":return"text-green-600";case"WARNING":return"text-yellow-600";case"LEAKAGE":return"text-orange-600";case"DANGER":return"text-red-600";default:return"text-gray-600"}},o=e=>{switch(e){case"NORMAL":return"bg-green-100 dark:bg-green-900";case"WARNING":return"bg-yellow-100 dark:bg-yellow-900";case"LEAKAGE":return"bg-orange-100 dark:bg-orange-900";case"DANGER":return"bg-red-100 dark:bg-red-900";default:return"bg-gray-100 dark:bg-gray-800"}},a=e=>{if(!e)return"-";return new Date(e).toLocaleString("id-ID")};return p.jsxs("div",{className:"space-y-6",children:[p.jsxs("div",{className:"flex justify-between items-center",children:[p.jsxs("div",{children:[p.jsx("h2",{className:"text-2xl font-bold text-gray-900 dark:text-white",children:"History"}),p.jsxs("p",{className:"text-gray-600 dark:text-gray-400",children:["Last ",r.length," entries"]})]}),p.jsxs("button",{onClick:()=>{const e=[["Time","Arus (A)","Tegangan (V)","Daya (VA)","Status","Relay","Source"],...r.map(e=>{var t,n,s;return[a(e.timestamp),(null==(t=e.arus)?void 0:t.toFixed(2))||"0",(null==(n=e.tegangan)?void 0:n.toFixed(2))||"0",(null==(s=e.apparent_power)?void 0:s.toFixed(2))||"0",e.status,e.relay?"ON":"OFF",e.source||"ESP32"]})].map(e=>e.join(",")).join("\n"),t=new Blob([e],{type:"text/csv"}),n=window.URL.createObjectURL(t),s=document.createElement("a");s.href=n,s.download=`logs-${(new Date).toISOString().split("T")[0]}.csv`,s.click(),window.URL.revokeObjectURL(n)},className:"flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition",children:[p.jsx(Jh,{className:"w-4 h-4"}),p.jsx("span",{children:"Export CSV"})]})]}),p.jsxs("div",{className:"flex space-x-2",children:[p.jsx("button",{onClick:()=>s(""),className:"px-4 py-2 rounded-lg font-semibold transition "+(""===n?"bg-blue-600 text-white":"bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"),children:"All"}),["NORMAL","WARNING","LEAKAGE","DANGER"].map(e=>p.jsx("button",{onClick:()=>s(e),className:"px-4 py-2 rounded-lg font-semibold transition capitalize "+(n===e?`${o(e)} ${i(e)}`:"bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"),children:e},e))]}),p.jsx("div",{className:"bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto",children:p.jsxs("table",{className:"w-full",children:[p.jsx("thead",{children:p.jsxs("tr",{className:"border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900",children:[p.jsx("th",{className:"text-left py-3 px-4 text-xs font-semibold text-gray-900 dark:text-white",children:"Time"}),p.jsx("th",{className:"text-left py-3 px-4 text-xs font-semibold text-gray-900 dark:text-white",children:"Arus (A)"}),p.jsx("th",{className:"text-left py-3 px-4 text-xs font-semibold text-gray-900 dark:text-white",children:"Tegangan (V)"}),p.jsx("th",{className:"text-left py-3 px-4 text-xs font-semibold text-gray-900 dark:text-white",children:"Daya (VA)"}),p.jsx("th",{className:"text-left py-3 px-4 text-xs font-semibold text-gray-900 dark:text-white",children:"Status"}),p.jsx("th",{className:"text-left py-3 px-4 text-xs font-semibold text-gray-900 dark:text-white",children:"Relay"}),p.jsx("th",{className:"text-left py-3 px-4 text-xs font-semibold text-gray-900 dark:text-white",children:"Source"})]})}),p.jsx("tbody",{children:r.length>0?r.map(e=>{var t,n,s;return p.jsxs("tr",{className:"border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",children:[p.jsx("td",{className:"py-3 px-4 text-sm text-gray-700 dark:text-gray-300",children:a(e.timestamp)}),p.jsx("td",{className:"py-3 px-4 text-sm text-gray-700 dark:text-gray-300",children:(null==(t=e.arus)?void 0:t.toFixed(2))||"0.00"}),p.jsx("td",{className:"py-3 px-4 text-sm text-gray-700 dark:text-gray-300",children:(null==(n=e.tegangan)?void 0:n.toFixed(2))||"0.00"}),p.jsx("td",{className:"py-3 px-4 text-sm text-gray-700 dark:text-gray-300",children:(null==(s=e.apparent_power)?void 0:s.toFixed(2))||"0.00"}),p.jsx("td",{className:`py-3 px-4 text-sm font-semibold ${i(e.status)}`,children:e.status}),p.jsx("td",{className:"py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300",children:e.relay?"ON":"OFF"}),p.jsx("td",{className:"py-3 px-4 text-sm text-gray-600 dark:text-gray-400",children:e.source||"ESP32"})]},e.id)}):p.jsx("tr",{children:p.jsx("td",{colSpan:7,className:"py-8 px-4 text-center text-gray-500 dark:text-gray-400",children:"No logs found"})})})]})})]})}function ou(){var e,t,n;const{logs:s,currentData:r}=zh(),i={avgCurrent:s.length>0?(s.reduce((e,t)=>e+(t.arus||0),0)/s.length).toFixed(2):"0.00",maxCurrent:s.length>0?Math.max(...s.map(e=>e.arus||0)).toFixed(2):"0.00",minCurrent:s.length>0?Math.min(...s.map(e=>e.arus||0)).toFixed(2):"0.00",avgVoltage:s.length>0?(s.reduce((e,t)=>e+(t.tegangan||0),0)/s.length).toFixed(2):"0.00",maxVoltage:s.length>0?Math.max(...s.map(e=>e.tegangan||0)).toFixed(2):"0.00",minVoltage:s.length>0?Math.min(...s.map(e=>e.tegangan||0)).toFixed(2):"0.00",warningCount:s.filter(e=>"WARNING"===e.status).length,leakageCount:s.filter(e=>"LEAKAGE"===e.status).length,dangerCount:s.filter(e=>"DANGER"===e.status).length,normalCount:s.filter(e=>"NORMAL"===e.status).length},o=s.length>0?(s.reduce((e,t)=>e+(t.apparent_power||0),0)/s.length).toFixed(2):"0.00",a=s.length>0?Math.max(...s.map(e=>e.apparent_power||0)).toFixed(2):"0.00",l=(24*parseFloat(o)/1e3).toFixed(2);return p.jsxs("div",{className:"space-y-6",children:[p.jsx("h2",{className:"text-2xl font-bold text-gray-900 dark:text-white",children:"Analytics Overview"}),p.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",children:[p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow",children:[p.jsx("h4",{className:"text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2",children:"Avg Current"}),p.jsxs("p",{className:"text-3xl font-bold text-blue-600",children:[i.avgCurrent," ",p.jsx("span",{className:"text-lg",children:"A"})]}),p.jsxs("p",{className:"text-xs text-gray-500 dark:text-gray-400 mt-2",children:["Max: ",i.maxCurrent," A | Min: ",i.minCurrent," A"]})]}),p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow",children:[p.jsx("h4",{className:"text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2",children:"Avg Voltage"}),p.jsxs("p",{className:"text-3xl font-bold text-green-600",children:[i.avgVoltage," ",p.jsx("span",{className:"text-lg",children:"V"})]}),p.jsxs("p",{className:"text-xs text-gray-500 dark:text-gray-400 mt-2",children:["Max: ",i.maxVoltage," V | Min: ",i.minVoltage," V"]})]}),p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow",children:[p.jsx("h4",{className:"text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2",children:"Peak Power"}),p.jsxs("p",{className:"text-3xl font-bold text-purple-600",children:[a," ",p.jsx("span",{className:"text-lg",children:"VA"})]}),p.jsxs("p",{className:"text-xs text-gray-500 dark:text-gray-400 mt-2",children:["Avg: ",o," VA"]})]}),p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow",children:[p.jsx("h4",{className:"text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2",children:"Est. Daily Usage"}),p.jsxs("p",{className:"text-3xl font-bold text-orange-600",children:[l," ",p.jsx("span",{className:"text-lg",children:"kWh"})]}),p.jsxs("p",{className:"text-xs text-gray-500 dark:text-gray-400 mt-2",children:["Based on ",s.length," log entries"]})]})]}),p.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow",children:[p.jsxs("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mb-4",children:["Status Distribution (Last ",s.length," entries)"]}),p.jsxs("div",{className:"space-y-3",children:[p.jsxs("div",{className:"flex items-center justify-between",children:[p.jsxs("div",{className:"flex items-center space-x-2",children:[p.jsx("div",{className:"w-3 h-3 rounded-full bg-green-600"}),p.jsx("span",{className:"text-gray-700 dark:text-gray-300",children:"Normal"})]}),p.jsx("span",{className:"font-semibold text-gray-900 dark:text-white",children:i.normalCount})]}),p.jsxs("div",{className:"flex items-center justify-between",children:[p.jsxs("div",{className:"flex items-center space-x-2",children:[p.jsx("div",{className:"w-3 h-3 rounded-full bg-yellow-600"}),p.jsx("span",{className:"text-gray-700 dark:text-gray-300",children:"Warning"})]}),p.jsx("span",{className:"font-semibold text-gray-900 dark:text-white",children:i.warningCount})]}),p.jsxs("div",{className:"flex items-center justify-between",children:[p.jsxs("div",{className:"flex items-center space-x-2",children:[p.jsx("div",{className:"w-3 h-3 rounded-full bg-orange-600"}),p.jsx("span",{className:"text-gray-700 dark:text-gray-300",children:"Leakage"})]}),p.jsx("span",{className:"font-semibold text-gray-900 dark:text-white",children:i.leakageCount})]}),p.jsxs("div",{className:"flex items-center justify-between",children:[p.jsxs("div",{className:"flex items-center space-x-2",children:[p.jsx("div",{className:"w-3 h-3 rounded-full bg-red-600"}),p.jsx("span",{className:"text-gray-700 dark:text-gray-300",children:"Danger"})]}),p.jsx("span",{className:"font-semibold text-gray-900 dark:text-white",children:i.dangerCount})]})]})]}),p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow",children:[p.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mb-4",children:"Current Status"}),p.jsxs("div",{className:"space-y-3",children:[p.jsxs("div",{className:"flex justify-between items-center py-2",children:[p.jsx("span",{className:"text-gray-700 dark:text-gray-300",children:"Current Reading"}),p.jsxs("span",{className:"font-semibold text-blue-600",children:[(null==(e=null==r?void 0:r.arus)?void 0:e.toFixed(2))||"0.00"," A"]})]}),p.jsxs("div",{className:"flex justify-between items-center py-2",children:[p.jsx("span",{className:"text-gray-700 dark:text-gray-300",children:"Voltage Reading"}),p.jsxs("span",{className:"font-semibold text-green-600",children:[(null==(t=null==r?void 0:r.tegangan)?void 0:t.toFixed(2))||"0.00"," V"]})]}),p.jsxs("div",{className:"flex justify-between items-center py-2",children:[p.jsx("span",{className:"text-gray-700 dark:text-gray-300",children:"Power Reading"}),p.jsxs("span",{className:"font-semibold text-purple-600",children:[(null==(n=null==r?void 0:r.apparent_power)?void 0:n.toFixed(2))||"0.00"," VA"]})]}),p.jsxs("div",{className:"flex justify-between items-center py-2",children:[p.jsx("span",{className:"text-gray-700 dark:text-gray-300",children:"Relay Status"}),p.jsx("span",{className:"font-semibold "+((null==r?void 0:r.relay)?"text-green-600":"text-red-600"),children:(null==r?void 0:r.relay)?"ON":"OFF"})]})]})]})]})]})}function au({onLogout:t}){var n,s,r,i;const{settings:o,users:a}=zh(),{role:l,user:c}=Hh(),[h,u]=e.useState("system"),[d,g]=e.useState(!1),[f,m]=e.useState((null==o?void 0:o.threshold)||5),[_,y]=e.useState((null==o?void 0:o.send_interval)||60),[v,b]=e.useState((null==o?void 0:o.buzzer_enabled)||!0),[w,x]=e.useState((null==o?void 0:o.auto_cutoff)||!1),[k,C]=e.useState((null==(n=null==o?void 0:o.calibration)?void 0:n.arus)||1),[I,T]=e.useState((null==(s=null==o?void 0:o.calibration)?void 0:s.tegangan)||1),[E,N]=e.useState((null==(r=null==o?void 0:o.telegram)?void 0:r.bot_token)||""),[S,P]=e.useState((null==(i=null==o?void 0:o.telegram)?void 0:i.chat_id)||""),[R,A]=e.useState(""),O="admin"===l,D=async e=>{if(O&&e!==(null==c?void 0:c.uid)&&confirm("Are you sure?")){g(!0);try{await(t=wh(Vh,`users/${e}`),Uc("remove",t._path),kh(t,null))}catch(n){console.error("Error deleting user:",n)}finally{g(!1)}var t}};return O?p.jsxs("div",{className:"space-y-6",children:[p.jsxs("div",{className:"flex justify-between items-center",children:[p.jsx("h1",{className:"text-2xl font-bold text-gray-900 dark:text-white",children:"System Settings"}),p.jsxs("button",{onClick:t,className:"flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition",children:[p.jsx(Xh,{className:"w-4 h-4"}),p.jsx("span",{children:"Logout"})]})]}),p.jsx("div",{className:"flex space-x-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg",children:["system","calibration","telegram","users"].map(e=>p.jsx("button",{onClick:()=>u(e),className:"px-4 py-2 rounded-md font-semibold capitalize transition "+(h===e?"bg-blue-600 text-white":"bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"),children:e},e))}),"system"===h&&p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4",children:[p.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mb-4",children:"System Configuration"}),p.jsxs("div",{children:[p.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",children:"Current Threshold (A)"}),p.jsx("input",{type:"number",value:f,onChange:e=>m(Number(e.target.value)),className:"w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"})]}),p.jsxs("div",{children:[p.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",children:"Send Interval (seconds)"}),p.jsx("input",{type:"number",value:_,onChange:e=>y(Number(e.target.value)),className:"w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"})]}),p.jsxs("div",{className:"flex items-center space-x-3",children:[p.jsx("input",{type:"checkbox",id:"buzzer",checked:v,onChange:e=>b(e.target.checked),className:"rounded"}),p.jsx("label",{htmlFor:"buzzer",className:"text-gray-700 dark:text-gray-300",children:"Enable Buzzer"})]}),p.jsxs("div",{className:"flex items-center space-x-3",children:[p.jsx("input",{type:"checkbox",id:"autoCutoff",checked:w,onChange:e=>x(e.target.checked),className:"rounded"}),p.jsx("label",{htmlFor:"autoCutoff",className:"text-gray-700 dark:text-gray-300",children:"Auto Cutoff on Danger"})]}),p.jsx("button",{onClick:async()=>{if(O){g(!0);try{await Ch(wh(Vh,"settings"),{threshold:f,send_interval:_,buzzer_enabled:v,auto_cutoff:w})}catch(e){console.error("Error saving settings:",e)}finally{g(!1)}}},disabled:d,className:"w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition",children:d?"Saving...":"Save"})]}),"calibration"===h&&p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4",children:[p.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mb-4",children:"Sensor Calibration"}),p.jsxs("div",{children:[p.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",children:"Current Calibration Factor"}),p.jsx("input",{type:"number",step:"0.01",value:k,onChange:e=>C(Number(e.target.value)),className:"w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"})]}),p.jsxs("div",{children:[p.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",children:"Voltage Calibration Factor"}),p.jsx("input",{type:"number",step:"0.01",value:I,onChange:e=>T(Number(e.target.value)),className:"w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"})]}),p.jsx("button",{onClick:async()=>{if(O){g(!0);try{await Ch(wh(Vh,"settings/calibration"),{arus:k,tegangan:I})}catch(e){console.error("Error saving calibration:",e)}finally{g(!1)}}},disabled:d,className:"w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition",children:d?"Saving...":"Save"})]}),"telegram"===h&&p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4",children:[p.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mb-4",children:"Telegram Integration"}),p.jsxs("div",{children:[p.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",children:"Bot Token"}),p.jsx("input",{type:"password",value:E,onChange:e=>N(e.target.value),className:"w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3",placeholder:"Enter bot token"})]}),p.jsxs("div",{children:[p.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",children:"Chat ID"}),p.jsx("input",{type:"text",value:S,onChange:e=>P(e.target.value),className:"w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3",placeholder:"Enter chat ID"})]}),p.jsx("button",{onClick:async()=>{if(O){g(!0);try{await Ch(wh(Vh,"settings/telegram"),{bot_token:E,chat_id:S})}catch(e){console.error("Error saving Telegram settings:",e)}finally{g(!1)}}},disabled:d,className:"w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition",children:d?"Saving...":"Save"})]}),"users"===h&&p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4",children:[p.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mb-4",children:"User Management"}),p.jsxs("div",{children:[p.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",children:"Add New User"}),p.jsxs("div",{className:"flex space-x-2",children:[p.jsx("input",{type:"email",value:R,onChange:e=>A(e.target.value),placeholder:"user@example.com",className:"flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"}),p.jsx("button",{className:"px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition",disabled:!0,children:"Invite"})]}),p.jsx("p",{className:"text-xs text-gray-500 dark:text-gray-400 mt-2",children:"Users can register themselves. Admin will upgrade as needed."})]}),p.jsx("div",{className:"overflow-x-auto",children:p.jsxs("table",{className:"w-full",children:[p.jsx("thead",{children:p.jsxs("tr",{className:"border-b border-gray-200 dark:border-gray-700",children:[p.jsx("th",{className:"text-left py-2 px-2 text-xs font-semibold text-gray-900 dark:text-white",children:"Email"}),p.jsx("th",{className:"text-left py-2 px-2 text-xs font-semibold text-gray-900 dark:text-white",children:"Role"}),p.jsx("th",{className:"text-left py-2 px-2 text-xs font-semibold text-gray-900 dark:text-white",children:"Created"}),p.jsx("th",{className:"text-right py-2 px-2 text-xs font-semibold text-gray-900 dark:text-white",children:"Action"})]})}),p.jsx("tbody",{children:a.map(e=>p.jsxs("tr",{className:"border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",children:[p.jsxs("td",{className:"py-2 px-2 text-sm text-gray-700 dark:text-gray-300",children:[e.email,e.uid===(null==c?void 0:c.uid)&&p.jsx("span",{className:"ml-2 text-xs text-blue-600",children:"(You)"})]}),p.jsx("td",{className:"py-2 px-2",children:p.jsxs("select",{value:e.role||"user",onChange:t=>(async(e,t)=>{if(O){g(!0);try{await Ch(wh(Vh,`users/${e}`),{role:t})}catch(n){console.error("Error changing role:",n)}finally{g(!1)}}})(e.uid,t.target.value),disabled:d||e.uid===(null==c?void 0:c.uid),className:"text-sm rounded px-2 py-1 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white disabled:opacity-50",children:[p.jsx("option",{value:"user",children:"User"}),p.jsx("option",{value:"admin",children:"Admin"})]})}),p.jsx("td",{className:"py-2 px-2 text-sm text-gray-600 dark:text-gray-400",children:new Date(e.created_at).toLocaleDateString("id-ID")}),p.jsx("td",{className:"py-2 px-2 text-right",children:p.jsx("button",{onClick:()=>D(e.uid),disabled:d||e.uid===(null==c?void 0:c.uid),className:"text-xs px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded transition",children:"Delete"})})]},e.uid))})]})})]})]}):p.jsx("div",{className:"space-y-6",children:p.jsxs("div",{className:"bg-white dark:bg-gray-800 p-6 rounded-lg shadow",children:[p.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mb-4",children:"Access Denied"}),p.jsx("p",{className:"text-gray-600 dark:text-gray-400",children:"Anda harus admin untuk mengakses pengaturan sistem."})]})})}function lu({onLogin:t}){const[n,s]=e.useState(""),[r,i]=e.useState(""),[o,a]=e.useState(!1),[l,c]=e.useState(!1),[h,u]=e.useState("");return p.jsx("div",{className:"min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center px-4 py-10",children:p.jsxs("div",{className:"w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl p-8",children:[p.jsxs("h1",{className:"text-2xl font-semibold text-gray-900 dark:text-white mb-6",children:[o?"Daftar Akun":"Login"," IoT Dashboard"]}),p.jsxs("form",{onSubmit:async e=>{if(e.preventDefault(),u(""),n.trim()&&r.trim()){c(!0);try{if(o){const e=await async function(e,t,n){if(Yt(e.app))return Promise.reject(wn(e));const s=Is(e),r=Ds(s,{returnSecureToken:!0,email:t,password:n,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",Xs,"EMAIL_PASSWORD_PROVIDER"),i=await r.catch(t=>{throw"auth/password-does-not-meet-requirements"===t.code&&rr(e),t}),o=await Zs._fromIdTokenResponse(s,"signIn",i);return await s._updateCurrentUser(o.user),o}(Wh,n,r),s=e.user.uid;await kh(wh(Vh,`users/${s}`),{email:n,role:"user",created_at:(new Date).getTime()}),u(""),t()}else await ir(Wh,n,r),u(""),t()}catch(s){const e=s instanceof Error?s.message:"Authentication failed";e.includes("auth/user-not-found")?u("Email tidak terdaftar. Buat akun terlebih dahulu."):e.includes("auth/wrong-password")?u("Password salah. Coba lagi."):e.includes("auth/email-already-in-use")?u("Email sudah terdaftar. Silakan login."):e.includes("auth/weak-password")?u("Password terlalu lemah. Gunakan minimal 6 karakter."):u(e)}finally{c(!1)}}else u("Email dan password wajib diisi.")},className:"space-y-4",children:[p.jsxs("div",{children:[p.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",children:"Email"}),p.jsx("input",{type:"email",value:n,onChange:e=>s(e.target.value),disabled:l,className:"w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50",placeholder:"user@example.com"})]}),p.jsxs("div",{children:[p.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",children:"Password"}),p.jsx("input",{type:"password",value:r,onChange:e=>i(e.target.value),disabled:l,className:"w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50",placeholder:"••••••••"})]}),h&&p.jsx("div",{className:"text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-950 rounded-lg",children:h}),p.jsx("button",{type:"submit",disabled:l,className:"w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 transition",children:l?"Loading...":o?"Daftar":"Masuk"})]}),p.jsx("div",{className:"mt-6 pt-6 border-t border-gray-200 dark:border-gray-800",children:p.jsx("button",{onClick:()=>{a(!o),u("")},disabled:l,className:"w-full text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50",children:o?"Sudah punya akun? Masuk":"Belum punya akun? Daftar"})}),p.jsx("p",{className:"mt-4 text-xs text-gray-500 dark:text-gray-400 text-center",children:"Admin akan upgrade akun Anda jika diperlukan."})]})})}function cu(){const{theme:t}=z(),{user:n,loading:s,initAuth:r,logout:i}=Hh(),{subscribeToData:o,subscribeLogs:a,subscribeSettings:l,subscribeUsers:c}=zh(),[h,u]=e.useState("dashboard");e.useEffect(()=>{document.documentElement.classList.toggle("dark","dark"===t)},[t]),e.useEffect(()=>{r()},[r]),e.useEffect(()=>{n&&(o(),a(),l(),c())},[n,o,a,l,c]);return s?p.jsx("div",{className:"min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center",children:p.jsxs("div",{className:"text-center",children:[p.jsx("div",{className:"inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"}),p.jsx("p",{className:"mt-4 text-gray-600 dark:text-gray-400",children:"Loading..."})]})}):n?p.jsxs("div",{className:"flex h-screen bg-gray-50 dark:bg-gray-900",children:[p.jsx(nu,{activePage:h,onNavigate:u}),p.jsxs("div",{className:"flex-1 flex flex-col",children:[p.jsx(su,{title:"history"===h?"History":"analytics"===h?"Analytics":"settings"===h?"Settings":"Dashboard"}),p.jsx("main",{className:"flex-1 p-6 overflow-auto",children:(()=>{switch(h){case"history":return p.jsx(iu,{});case"analytics":return p.jsx(ou,{});case"settings":return p.jsx(au,{onLogout:i});default:return p.jsx(ru,{})}})()})]})]}):p.jsx(lu,{onLogin:()=>{}})}g.createRoot(document.getElementById("root")).render(p.jsx(s.StrictMode,{children:p.jsx(cu,{})}));
