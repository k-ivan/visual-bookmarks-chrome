!function(e){function t(n){if(r[n])return r[n].exports;var o=r[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,t),o.l=!0,o.exports}var r={};t.m=e,t.c=r,t.i=function(e){return e},t.d=function(e,r,n){t.o(e,r)||Object.defineProperty(e,r,{configurable:!1,enumerable:!0,get:n})},t.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(r,"a",r),r},t.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},t.p="",t(t.s=7)}([function(e,t,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var n=function(){function e(e){var t="";switch(e.name){case"QuotaExceededError":t="QuotaExceededError";break;case"NotFoundError":t="NotFoundError";break;case"SecurityError":t="SecurityError";break;case"InvalidModificationError":t="InvalidModificationError";break;case"InvalidStateError":t="InvalidStateError";break;default:t="Unknown Error"}console.error(t)}var t=null;return{init:function(){var r=arguments.length>0&&void 0!==arguments[0]?arguments[0]:500,n=arguments[1];navigator.webkitPersistentStorage.requestQuota(1048576*r,function(r){window.webkitRequestFileSystem(window.PERSISTENT,r,function(e){t=e,n&&n()},e)},e)},usedAndRemaining:function(e){navigator.webkitPersistentStorage.queryUsageAndQuota(function(t,r){e&&e(t,r)})},createDir:function(r,n){t.root.getDirectory(r,{create:!0},function(e){n&&n(e)},e)},getDir:function(r,n){t.root.getDirectory(r,{},function(e){n&&n(e)},e)},deleteDir:function(r,n,o){var n=n||{};void 0===n.recursive&&(n.recursive=!1),t.root.getDirectory(r,{},function(t){n.recursive?t.removeRecursively(function(){o&&o()},e):t.remove(function(){o&&o()},e)},e)},createFile:function(e,r,n){t.root.getFile(e,{create:!0},function(e){e.createWriter(function(t){t.onwriteend=function(){n&&n(e)},t.onerror=function(e){console.log(e)};var o=new Blob([r.file],{type:r.fileType});t.write(o)})})},deleteFile:function(r,n){t.root.getFile(r,{create:!1},function(t){t.remove(function(){n&&n()},e)},e)},purge:function(){t.root.createReader().readEntries(function(t){for(var r,n=0;r=t[n];++n)r.isDirectory?r.removeRecursively(function(){},e):r.remove(function(){},e);console.info("Local storage emptied.")},e)}}}();t.default=n},function(e,t,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={transitionEnd:function(){var e={transition:"transitionend",webkitTransition:"webkitTransitionEnd"},t=document.createElement("fake");for(var r in e)if(void 0!==t.style[r])return e[r];return!1},debounce:function(e,t,r){var n=null;return function(){var o=this,i=arguments,c=function(){n=null,r||e.apply(o,i)},a=r&&!n;clearTimeout(n),n=setTimeout(c,t),a&&e.apply(o,i)}},trigger:function(e,t){var r=document.createEvent("HTMLEvents");r.initEvent(e,!0,!1),t.dispatchEvent(r)},templater:function(e,t){return e.replace(/\{(.*?)\}/g,function(e,r){return t[r]||""})},notifications:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:5e3;window.timerNotice&&(chrome.notifications.clear(e),clearTimeout(window.timerNotice)),chrome.notifications.create(e,{type:"basic",iconUrl:"icons/icon128.png",title:"Visual bookmarks",message:e},function(){window.timerNotice=setTimeout(function(){chrome.notifications.clear(e)},t)})},base64ToBlob:function(e,t,r){for(var n=e,o=t||"",i=atob(n.split(",")[1]),c=(n.split(",")[0].split(":")[1].split(";")[0],new ArrayBuffer(i.length)),a=new Uint8Array(c),u=0;u<i.length;u++)a[u]=i.charCodeAt(u);var s=new Blob([c],{type:o});return r?r(s):s},resizeScreen:function(e,t){var r=new Image;r.onload=function(){300<r.height&&(r.width*=300/r.height,r.height=300);var e=document.createElement("canvas"),n=e.getContext("2d");e.width=r.width,e.height=r.height,n.drawImage(r,0,0,r.width,r.height),t(e.toDataURL("image/jpg"))},r.src=e},rand:function(e,t){return Math.round(e-.5+Math.random()*(t-e+1))},getDomain:function(e){return e.replace(/https?:\/\/(www.)?/i,"").replace(/\/.*/i,"")}}},,,,,,function(e,t,r){"use strict";function n(e){return e&&e.__esModule?e:{default:e}}function o(e,t){var r={url:e,focused:!1,left:1e5,top:1e5,width:1,height:1,type:"popup"},n=void 0,o=!1;chrome.windows.create(r,function(e){function r(){if(1==o)return clearTimeout(i),!1;chrome.tabs.get(n.id,function(n){"complete"==n.status?setTimeout(function(){chrome.tabs.captureVisibleTab(e.id,function(r){t({capture:r,title:n.title}),clearTimeout(i);try{chrome.windows.remove(e.id)}catch(e){}})},300):setTimeout(function(){r()},500)})}if(!e.tabs||!e.tabs.length)return chrome.windows.remove(e.id),console.error("not found page"),!1;n=e.tabs[0],chrome.tabs.update(n.id,{muted:!0});try{chrome.tabs.executeScript(n.id,{code:'document.addEventListener("DOMContentLoaded", function(){document.body.style.overflow = "hidden";});',runAt:"document_start"})}catch(e){console.warn(e)}var i=setTimeout(function(){chrome.windows.remove(e.id),t({error:"long_load",url:n.url}),o=!0},15e3);chrome.windows.update(e.id,{width:1170,height:720,top:1e5,left:1e5},function(){r()})})}var i=r(0),c=n(i),a=r(1),u=n(a);c.default.init(500),chrome.runtime.onMessage.addListener(function(e,t,r){if(e.captureUrl)return o(e.captureUrl,function(t){if(t&&t.error){try{r({warning:"Timeout waiting for a screenshot"})}catch(e){}return console.warn("Timeout waiting for a screenshot "+t.url),!1}u.default.resizeScreen(t.capture,function(t){var n=u.default.base64ToBlob(t,"image/jpg"),o=u.default.getDomain(e.captureUrl)+"_"+e.id+".jpg";c.default.createDir("images",function(t){c.default.createFile(t.fullPath+"/"+o,{file:n,fileType:n.type},function(t){var n=JSON.parse(localStorage.getItem("custom_dials"));n[e.id]=t.toURL(),localStorage.setItem("custom_dials",JSON.stringify(n)),console.info("Image file saved as "+t.toURL());try{r(t.toURL())}catch(e){}})})})}),!0}),chrome.browserAction.onClicked.addListener(function(e){var t=[chrome.extension.getURL("newtab.html"),"chrome://newtab/"];chrome.tabs.query({currentWindow:!0},function(e){for(var r,n=0;r=e[n];n++)if(r.url&&~t.indexOf(r.url))return chrome.tabs.update(r.id,{active:!0});return chrome.tabs.create({url:chrome.extension.getURL("newtab.html")})})})}]);