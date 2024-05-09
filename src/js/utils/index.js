
export function $createElement(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  for (const attribute in attributes) {
    if (attributes[attribute] == null) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(attributes, attribute)) {
      element.setAttribute(attribute, attributes[attribute]);
    }
  }
  if (children.length && children[0].html !== undefined) {
    element.innerHTML = children[0].html;
  } else if (children.length) {
    const fragment = document.createDocumentFragment();
    children.forEach(child => {
      if (typeof child === 'string') {
        child = document.createTextNode(child);
      }
      fragment.appendChild(child);
    });
    element.appendChild(fragment);
  }
  return element;
}

export function $debounce(func, wait, immediate) {
  let timeout = null;

  return function() {
    const context = this,
      args = arguments;

    const later = () => {
      timeout = null;

      if (!immediate) {
        func.apply(context, args);
      }
    };

    const callNow = immediate && !timeout;

    clearTimeout(timeout);

    timeout = setTimeout(later, wait);

    if (callNow) {
      func.apply(context, args);
    }
  };
}

export function $trigger(evt, el, flags = {}) {
  const event = new Event(evt, {
    ...flags
  });
  el.dispatchEvent(event);
}

export function $customTrigger(event, el, params = {}) {
  const e = new CustomEvent(event, {
    ...params
  });
  el.dispatchEvent(e);
}

export function $templater(tpl, data) {
  return tpl.replace(/\%(.*?)\%/g, function(str, a) {
    return data[a] || '';
  });
}

export function $escapeHtmlToText(unsafe) {
  const escape = $escapeHtml(unsafe);
  const div = document.createElement('div');
  div.textContent = escape;
  return div.innerHTML;
}

export function $escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function $unescapeHtml(unsafe) {
  return unsafe
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, '\'');
}

export function $notifications(message, id, buttons = []) {
  id = id || message;

  // For requireInteraction
  // if (window.timerNotice) {
  //   browser.notifications.clear(message);
  //   clearTimeout(window.timerNotice);
  // }

  browser.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Visual bookmarks',
    message,
    buttons
    // requireInteraction: true
  }, function() {
    // For requireInteraction
    // window.timerNotice = setTimeout(() => {
    //   browser.notifications.clear(id);
    //   window.timerNotice = null;
    // }, delay)
  });
}

export function $imageLoaded(img) {
  const image = new Image();
  image.src = img;
  return image.decode().then(() => image);
}

export function $base64ToBlob(base64, type, callback) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  let contentType = type || '';
  let byteString = atob(base64.split(',')[1]);

  // separate out the mime component
  // let mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to an ArrayBuffer
  let ab = new ArrayBuffer(byteString.length);
  let ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  // write the ArrayBuffer to a blob, and you're done
  let bb = new Blob([ab], { type: contentType });
  if (callback) return callback(bb);
  return bb;
}

export function $resizeScreen(image) {
  return new Promise((resolve) => {
    let img = new Image();
    let maxHeight = 300;
    img.onload = function() {
      if (maxHeight < img.height) {
        img.width *= maxHeight / img.height;
        img.height = maxHeight;
      }
      let canvas = document.createElement('canvas');
      let ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      resolve(canvas.toDataURL('image/jpg'));
    };
    img.src = image;
  });
}

export async function $resizeThumbnail(
  fileBlob,
  resizeHeight = 500,
  resizeQuality = 'high',
  quality = 0.75
) {
  let imageBitmap = await createImageBitmap(fileBlob);

  if (resizeHeight && imageBitmap.height > resizeHeight) {
    imageBitmap.close();
    imageBitmap = await createImageBitmap(fileBlob, {
      resizeHeight,
      resizeQuality
    });
  }

  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext('bitmaprenderer');
  ctx.transferFromImageBitmap(imageBitmap);
  imageBitmap.close();

  return canvas.convertToBlob({
    type: 'image/webp',
    quality
  });
}

export function $shuffle([...arr]) {
  let m = arr.length;
  while (m) {
    const i = Math.floor(Math.random() * m--);
    [arr[m], arr[i]] = [arr[i], arr[m]];
  }
  return arr;
}

export function $getDomain(url) {
  // return url.replace(/https?:\/\/(www.)?/i, '').replace(/\/.*/i, '');
  return url
    .replace(/(https?|ftps?|chrome|chrome-extension|file):\/\/\/?(www.)?/i, '')
    .replace(/:?\/.*/i, '');
}

export function $isValidUrl(url) {
  // The regex used in AngularJS to validate a URL + chrome internal pages & extension url & on-disk files
  const URL_REGEXP = /^(http|https|ftp|file|chrome|chrome-extension):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/;
  if (URL_REGEXP.test(url)) {
    return true;
  }
  return false;
}

// Copy String
export function $copyStr(str) {
  const el = document.createElement('textarea');
  el.value = str;
  el.setAttribute('readonly', '');
  el.style.cssText = `
      position: absolute;
      left: -9999px;
    `;

  document.body.appendChild(el);

  const selection = document.getSelection();
  let originalRange = (selection.rangeCount > 0) ? selection.getRangeAt(0) : false;

  el.select();

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (err) {}

  document.body.removeChild(el);

  if (originalRange) {
    selection.removeAllRanges();
    selection.addRange(originalRange);
  }

  return success;
}

export function $uid() {
  return `id${Math.floor(Math.random() * Date.now()).toString(36)}`;
}

// TODO: showOpenFilePicker instead upload inputs
export async function $filePicker(pickerOpts = {
  types: [{
    description: 'Images',
    accept: {
      'image/*': ['.png', '.gif', '.jpeg', '.jpg', '.webp', '.avif']
    }
  }],
  excludeAcceptAllOption: true,
  multiple: false
}) {
  const [fileHandle] = await window.showOpenFilePicker(pickerOpts);
  const file = await fileHandle.getFile();

  if (!/image\/(jpe?g|png|webp)$/.test(file.type)) {
    throw {
      alert: browser.i18n.getMessage('alert_file_type_fail')
    };
  }
  return file;
}

export function faviconURL(url, size = 16) {
  // const favUrl = new URL(browser.runtime.getURL('/_favicon/'));
  // favUrl.searchParams.set('pageUrl', url);
  // favUrl.searchParams.set('size', size);
  // return favUrl.toString();
  return `https://www.google.com/s2/favicons?sz=${size}&domain_url=${url}`;
}

export function getVideoPoster(file, height = 150) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
    // const blobUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = e.target.result;
      video.muted = true;
      // video.src = blobUrl;
      video.currentTime = 1;
      video.load();
      // video.addEventListener('loadeddata', () => {
      video.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth * (height / video.videoHeight);
        canvas.height = height;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // canvas.toBlob(resolve);
        canvas.toBlob(blob => {
          resolve(blob);
          // URL.revokeObjectURL(blobUrl);
        }, 'image/webp', 0.75);
      }, { once: true });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function asyncLoadComponents(factoryImport) {
  return factoryImport()
    .then((module) => module)
    .catch(console.warn);
}
