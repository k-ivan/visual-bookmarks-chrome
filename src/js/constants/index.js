export const FAVICON_GOOGLE = 'https://www.google.com/s2/favicons?sz=32&amp;domain_url=';

export const SVG_LOADER =
`<svg class="loading" id="loading" viewBox="0 0 100 100">` +
  `<defs>` +
    `<linearGradient id="%id%">` +
      `<stop offset="5%" stop-color="#4285f4"></stop>` +
      `<stop offset="95%" stop-color="#b96bd6"></stop>` +
    `</linearGradient>` +
  `</defs>` +
  `<circle class="path" fill="none" stroke="url(#%id%)" stroke-width="8" stroke-linecap="round" cx="50" cy="50" r="40"></circle>` +
`</svg>`;

export const SERVICES_COUNT = 20;

export const REGEXP_URL_PATTERN = /^(https?|ftp|file|edge|chrome|(chrome-)?extension):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/i;

export const THUMBNAIL_POPUP_WIDTH = 1170;
export const THUMBNAIL_POPUP_HEIGHT = 720;

export const FILES_ALLOWED_EXTENSIONS = [
  'avif',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'png',
  'svg',
  'mp4'
];
export const MAX_FILE_SIZE_BYTES = 50 * (10 ** 6);

export const CONTEXT_MENU = [
  {
    action: 'new_tab',
    title: browser.i18n.getMessage('contextmenu_tab')
  },
  {
    action: 'new_window',
    title: browser.i18n.getMessage('contextmenu_window')
  },
  {
    action: 'new_window_incognito',
    title: browser.i18n.getMessage('contextmenu_incognito'),
    isBookmark: true
  },
  {
    action: 'open_all',
    title: browser.i18n.getMessage('contextmenu_open_all'),
    isFolder: true
  },
  {
    action: 'open_all_window',
    title: browser.i18n.getMessage('contextmenu_open_all_window'),
    isFolder: true
  },
  {
    divider: true
  },
  {
    action: 'copy_link',
    title: browser.i18n.getMessage('contextmenu_copy_link'),
    icon: `<svg height="24" width="24" fill="currentColor"><use xlink:href="/img/symbol.svg#copy_outline"/></svg>`,
    isBookmark: true
  },
  {
    action: 'edit',
    title: browser.i18n.getMessage('contextmenu_edit'),
    icon: '<svg height="24" width="24" fill="currentColor"><use xlink:href="/img/symbol.svg#edit_outline"/></svg>'
  },
  {
    action: 'capture',
    title: browser.i18n.getMessage('contextmenu_capture'),
    icon: '<svg height="24" width="24" fill="currentColor"><use xlink:href="/img/symbol.svg#capture_outline"/></svg>',
    isBookmark: true
  },
  {
    divider: true
  },
  {
    action: 'upload',
    title: browser.i18n.getMessage('contextmenu_upload'),
    icon: '<svg height="24" width="24" fill="currentColor"><use xlink:href="/img/symbol.svg#upload_outline"/></svg>'
  },
  {
    action: 'paste_image',
    title: browser.i18n.getMessage('contextmenu_upload_paste'),
    icon: '<svg height="24" width="24" fill="currentColor"><use xlink:href="/img/symbol.svg#image_paste"/></svg>'
  },
  {
    divider: true
  },
  {
    action: 'delete_thumbnail',
    title: browser.i18n.getMessage('delete_thumbnail'),
    icon: '<svg height="24" width="24" fill="currentColor"><use xlink:href="/img/symbol.svg#hide_image"/></svg>'
  },
  {
    action: 'remove',
    title: browser.i18n.getMessage('contextmenu_remove'),
    icon: '<svg height="24" width="24" fill="currentColor"><use xlink:href="/img/symbol.svg#delete_outline"/></svg>'
  }
];

export const SEARCH_ENGINES = [
  {
    title: 'Bookmarks',
    value: 'bookmarks'
  },
  {
    title: browser.i18n.getMessage('search_browser_default'),
    value: 'browser'
  },
  {
    title: 'Google',
    url: 'https://www.google.com/search',
    name: 'q',
    value: 'google'
  },
  {
    title: 'Bing',
    url: 'https://bing.com/search',
    name: 'q',
    value: 'bing'
  },
  {
    title: 'Yandex',
    url: 'https://ya.ru/search/',
    name: 'text',
    value: 'yandex'
  },
  {
    title: 'DuckDuckGo',
    url: 'https://duckduckgo.com/',
    name: 'q',
    value: 'duckduckgo'
  },
  {
    title: 'YouTube',
    url: 'https://www.youtube.com/results',
    name: 'search_query',
    value: 'youtube'
  },
  {
    title: 'Baidu',
    url: 'https://www.baidu.com/s',
    name: 'wd',
    value: 'baidu'
  },
  {
    title: 'Yahoo',
    url: 'https://search.yahoo.com/search',
    name: 'p',
    value: 'yahoo'
  }
];

export const NEWTAB_URLS = [
  'edge://newtab/',
  'chrome://newtab/',
  browser.runtime.getURL('newtab.html')
];

export const NEWTAB_EMPTY_URLS = [
  'edge://newtab/',
  'chrome://newtab/',
  'about:blank'
];

export const FIREFOX_BROWSER = (process.env.BROWSER === 'firefox');
export const DEFAULT_FOLDER = {
  CHROME: '1',
  FIREFOX: 'toolbar_____'
};

/**
 * Browser root folders
 * @type {string[]}
 * 0 - chrome
 * root________ - firefox
 */
export const ROOT_FOLDERS = ['0', 'root________'];

export const LOCAL_PROTOCOLS = [
  'file:///',
  'edge://',
  'chrome://'
];
