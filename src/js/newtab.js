import '../css/newtab.css';
import './components/vb-select';
import './components/vb-context-menu';
import './components/vb-scrollup';
import './components/vb-bookmarks-panel';
// import './components/vb-virtual-pagination';

import Gmodal from 'glory-modal';
import Validator from 'form-validation-plugin';
import { settings } from './settings';
import Bookmarks from './components/bookmarks';
import Localization from './plugins/localization';
import UI from './components/ui';
import Ripple from './components/ripple';
import confirmPopup from './plugins/confirmPopup';
import {
  get,
  getChildren,
  getFolders
} from './api/bookmark';
import {
  $getDomain,
  $createElement,
  $copyStr,
  $unescapeHtml,
  asyncLoadComponents
} from './utils';
import ImageDB from './api/imageDB';
import { REGEXP_URL_PATTERN, CONTEXT_MENU } from './constants';
import Toast from './components/toast';
import { storage } from './api/storage';

const container = document.getElementById('bookmarks');
const modal = document.getElementById('modal');
const form = document.getElementById('formBookmark');
const modalHead = document.getElementById('modalHead');
const modalSelectFolders = document.getElementById('modalSelectFolders');
const titleField = document.getElementById('title');
const urlField = document.getElementById('url');
const urlWrap = document.getElementById('urlWrap');
const customScreen = document.getElementById('customScreen');
const ctxMenuEl = document.getElementById('context-menu');
const upload = document.getElementById('upload');
const panelActions = {
  tween: null,
  tweenActive: false
};
let multipleSelectedBookmarks = [];
let isGenerateThumbs = false;
let modalApi;
let generateThumbsBtn = null;

async function init() {
  // Set lang attr
  // Replacement underscore on the dash because underscore is not a valid language subtag
  document.documentElement.setAttribute(
    'lang',
    chrome.i18n.getMessage('@@ui_locale').replace('_', '-')
  );

  /**
   * Localization
   */
  Localization();

  /**
   * Ripple
   */
  Ripple.init('.md-ripple');

  /**
   * Settings
   */
  await settings.init();

  /**
   * UI
   */
  UI.toggleTheme();
  UI.userStyles();
  UI.calculateStyles();
  UI.setBG();

  Bookmarks.init().then(() => {
    if (settings.$.enable_virtual_pagination) {
      // eslint-disable-next-line max-len
      asyncLoadComponents(() => import(/* webpackChunkName: "webcomponents/vb-virtual-pagination" */'./components/vb-virtual-pagination'))
        .then(() => {
          document.body.insertAdjacentElement(
            'beforeEnd',
            $createElement('vb-virtual-pagination', { 'scrollable-selector': '.app' })
          );
        });
    }
  });

  modalApi = new Gmodal(modal, {
    stickySelectors: ['.sticky'],
    closeBackdrop: false
  });
  modalApi.element.addEventListener('gmodal:beforeopen', () => {
    // reset form and validation errors
    form.reset();
  });
  modalApi.element.addEventListener('gmodal:open', () => {
    // UX focus when modal open
    if (form.getAttribute('data-action') === 'New') {
      form.elements.title.focus();
    } else {
      form.elements.title.select();
    }
  });

  const formBookmarkEl = document.getElementById('formBookmark');

  Validator.i18n = {
    required: chrome.i18n.getMessage('error_input_required')
  };

  Validator.run(formBookmarkEl, {
    showErrors: true,
    checkChange: true,
    checkInput: true,
    containerSelector: '.group',
    errorClass: 'has-error',
    errorHintClass: 'error-hint',
    validators: {
      regex: {
        isValidUrl: {
          pattern: REGEXP_URL_PATTERN,
          error: chrome.i18n.getMessage('error_input_url')
        }
      }
    },
    onSuccess: handleSubmitForm,
    onError: handleFormError
  });

  settings.$.services_enable && runServices();

  upload.addEventListener('change', handleUploadScreen);
  container.addEventListener('click', handleDelegateClick);
  ctxMenuEl.addEventListener('vb:contextmenu:select', handleMenuSelection);
  ctxMenuEl.addEventListener('vb:contextmenu:open', handleMenuOpen);
  document.getElementById('resetCustomImage').addEventListener('click', handleResetThumb);
  modal.addEventListener('gmodal:close', handleCloseModal);

  // scrollup button component
  document.getElementById('aside_controls').insertAdjacentElement(
    'afterend',
    $createElement('vb-scrollup', { class: 'sticky', 'scroll-selector': '.app' })
  );

  // If thumbnail generation button
  if (settings.$.thumbnails_update_button) {
    generateThumbsBtn = $createElement('button', {
      class: 'circ-btn update-thumbnails'
    }, {
      html: `<svg width="20" height="20"><use xlink:href="/img/symbol.svg#capture_fill"/></svg>`
    });
    document.getElementById('aside_controls').appendChild(generateThumbsBtn);

    // Thumbnail generation tracking events
    // Switching the flag in the local storage to prevent multiple launches
    // Reset the flag when you close the window
    if (localStorage.getItem('update_thumbnails') === 'true') {
      // if the storage has a launch flag for generating thumbnails, disable button
      generateThumbsBtn.disabled = true;
    }
    container.addEventListener('thumbnails:updating', function() {
      isGenerateThumbs = true;
      generateThumbsBtn.disabled = true;
      localStorage.setItem('update_thumbnails', true);
    });
    container.addEventListener('thumbnails:updated', function() {
      isGenerateThumbs = false;
      generateThumbsBtn.disabled = false;
      localStorage.removeItem('update_thumbnails');
    });
    generateThumbsBtn.addEventListener('click', handleGenerateThumbs);
  }

  window.addEventListener('resize', () => UI.calculateStyles());
  window.addEventListener('popstate', handlePopstate);
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('unload', handleUnload);
  window.addEventListener('storage', handleUpdateStorage);
  window.addEventListener('load', handleLoad);
  window.addEventListener('hashchange', hideControlMultiplyBookmarks);

  // if tab with bookmarks is open, but hidden, we need to reload, after updating thumbnails
  chrome.runtime.onMessage.addListener(function(request) {
    if (request.bookmarksUpdated && document.hidden) {
      window.location.reload();
    }
  });

  // import(/* webpackChunkName: "webcomponents/vb-actions-panel" */'./components/vb-bookmarks-panel');
  container.addEventListener('click', handleSelectBookmark);
  document.addEventListener('vb-bookmarks-panel:action', handleMultipleBookmarks);
  document.addEventListener('vb-bookmarks-panel:close', hideControlMultiplyBookmarks);
  document.addEventListener('vb:search', hideControlMultiplyBookmarks);
  document.addEventListener('vb:searchreset', hideControlMultiplyBookmarks);
  document.addEventListener('keydown', ({ code }) => {
    code === 'Escape' && hideControlMultiplyBookmarks();
  });
}

function handleSelectBookmark(e) {
  if (isGenerateThumbs) return;
  const bookmark = e.target.closest('.bookmark');
  if (!bookmark) return true;

  if (!e.shiftKey) return true;

  e.preventDefault();

  if (!bookmark.dataset.selected) {
    // if bookmark not selected
    bookmark.dataset.selected = true;
    // added selected bookmark to the array of selected bookmarks
    multipleSelectedBookmarks.push(bookmark);
  } else {
    // else bookmark already selected
    delete bookmark.dataset.selected;
    // remove selected bookmark from the array of selected bookmarks
    multipleSelectedBookmarks = multipleSelectedBookmarks.filter(selectedBookmark => selectedBookmark !== bookmark);
  }

  multipleSelectedBookmarks.length > 0
    ? showControlMultiplyBookmarks()
    : hideControlMultiplyBookmarks();
}

async function showControlMultiplyBookmarks() {
  const panelNode = document.getElementById('bookmarks-panel');
  if (panelNode) return;

  const panel = $createElement('vb-bookmarks-panel', {
    id: 'bookmarks-panel',
    class: 'bookmarks-panel'
  });
  panel.selectedFolder = window.location.hash.slice(1) || settings.$.default_folder_id;
  panel.folders = await getFolders();

  document.body.append(panel);

  // disable sorting to avoid side effects
  // for example, the selected bookmark can be moved by sorting to another folder
  localStorage.setItem('disabledSort', 1);

  // animate panel actions
  panelActions.tweenActive = true;
  panelActions.tween = panel.animate([
    { transform: 'translate3D(0, 100%, 0)' },
    { transform: 'translate3D(0, 0, 0)' }
  ], {
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    fill: 'forwards'
  });
}

function hideControlMultiplyBookmarks() {
  if (!document.getElementById('bookmarks-panel')) return;
  // if (!panelTweenActive) return;
  if (!panelActions.tweenActive) return;

  multipleSelectedBookmarks.forEach(bookmark => delete bookmark.dataset.selected);
  multipleSelectedBookmarks.length = 0;

  localStorage.removeItem('disabledSort');

  panelActions.tween.playbackRate = -1;
  panelActions.tween.onfinish = () => {
    panelActions.tweenActive = false;
    document.getElementById('bookmarks-panel')?.remove();
  };
}

function handleMultipleBookmarks(evt) {
  const { action, destFolder } = evt.detail;

  if (!action) return;

  switch (action) {
    case 'open_all':
    case 'open_all_window':
    case 'new_window_incognito': openSelectedBookmarks(multipleSelectedBookmarks, action); break;
    case 'remove': removeSelectedBookmarks(multipleSelectedBookmarks); break;
    case 'update_thumbnails': updateSelectedThumbnails(multipleSelectedBookmarks); break;
    case 'move_bookmarks': movedSelectedBookmarks(multipleSelectedBookmarks, destFolder); break;
    default: break;
  }
}

async function movedSelectedBookmarks(multipleSelectedBookmarks, destFolder) {
  await Bookmarks.moveSelectedBookmarks(multipleSelectedBookmarks, destFolder);
  hideControlMultiplyBookmarks();
}

async function updateSelectedThumbnails(multipleSelectedBookmarks) {
  await Bookmarks.updateSelectedThumbnails(multipleSelectedBookmarks);
  hideControlMultiplyBookmarks();
}

async function handleLoad() {
  // show a notification with a link to the description of the update
  const { extension_updated } = await storage.local.get('extension_updated');
  if (extension_updated) {
    const text = chrome.i18n.getMessage('extension_updated_notification');
    const linkText = chrome.i18n.getMessage('whats_new');
    Toast.show({
      message: `${text}.&nbsp;&nbsp;<a href="/options.html#changelog">${linkText}</a>`,
      delay: 0,
      onClose() {
        storage.local.remove('extension_updated');
      }
    });
  }
}

function handlePopstate() {
  // when navigating through the history
  // hide the context menu or the modal window if they are active
  ctxMenuEl.close();
  modalApi.close();
}

function handleBeforeUnload(evt) {
  // if generate thumbs exist
  if (localStorage.getItem('update_thumbnails') !== null && isGenerateThumbs)
    return evt.returnValue = '';
}

function handleUnload() {
  // remove flag from storage to unlock button generate
  if (isGenerateThumbs) {
    localStorage.removeItem('update_thumbnails');
  }

  localStorage.removeItem('disabledSort');
}

function handleUpdateStorage(e) {
  // If several tabs are open, on the rest of them we will update the attribute at the button
  if (e.key === 'update_thumbnails') {
    generateThumbsBtn.disabled = !!e.newValue;
  }
}

function handleGenerateThumbs() {
  // method to start generating all bookmark thumbnails
  if (this.hasAttribute('disabled') || localStorage.getItem('update_thumbnails') !== null) return;
  Bookmarks.autoUpdateThumb();
}

function handleDelegateClick(evt) {
  if (evt.target.closest('#bookmark-back')) {
    evt.preventDefault();
    window.location.hash = container.dataset.parentFolder;
  } else if (evt.target.closest('#add')) {
    evt.preventDefault();
    prepareModal();
    modalApi.open();
  } else if (evt.target.closest('.bookmark__action')) {
    evt.preventDefault();
    evt.stopPropagation();
    ctxMenuEl.trigger(evt);
  } else if (evt.target.closest('.bookmark')) {
    const url = evt.target.closest('.bookmark').href;

    if (url.startsWith('file:///')) {
      evt.preventDefault();
      chrome.tabs.update({
        url
      });
    }
  }
}

function handleUploadScreen(evt) {
  evt.preventDefault();

  const el = evt.target;
  const data = el.dataset;
  Bookmarks.uploadScreen({
    target: el,
    id: data.id,
    site: data.site
  });
}

function handleMenuOpen(evt) {
  // when opening the context menu,
  // hide the quick action bar to avoid side effects
  hideControlMultiplyBookmarks();

  let items;
  if (evt.detail.isFolder) {
    items = CONTEXT_MENU.filter(item => !item.isBookmark);
  } else {
    items = CONTEXT_MENU.filter(item => !item.isFolder);
  }
  if (!evt.detail.image) {
    // hide the menu item if there is no thumbnail
    items = items.filter(item => item.action !== 'delete_thumbnail');
  }
  ctxMenuEl.listItems = items;
}

function handleMenuSelection(evt) {
  const target = evt.detail.trigger;
  const action = evt.detail.selection;

  switch (action) {
    case 'new_window':
    case 'new_window_incognito':
      openWindow(target.href, action);
      break;
    case 'open_all':
    case 'open_all_window':
      openAll(target.id, action);
      break;
    case 'new_tab':
      openTab(target.href);
      break;
    case 'edit':
      prepareModal(target);
      modalApi.open();
      break;
    case 'copy_link':
      $copyStr(target.href);
      break;
    case 'capture': {
      Bookmarks.createScreen(target);
      break;
    }
    case 'upload': {
      delete upload.dataset.site;
      upload.dataset.id = target.id;
      if (!target.isFolder) {
        upload.dataset.site = $getDomain(target.href);
      }
      upload.click();
      break;
    }
    case 'delete_thumbnail': {
      Bookmarks.removeThumbnail(target.id)
        .then(() => {
          target.image = null;
        });
      break;
    }
    case 'remove': {
      (target.isFolder)
        ? Bookmarks.removeFolder(target)
        : Bookmarks.removeBookmark(target);
      break;
    }
  }
}

function handleCloseModal() {
  modal.classList.remove('has-edit', 'has-add');
  customScreen.style.display = '';
  form.reset();
}

// TODO: experiment webcomponents
function runServices() {
  import(/* webpackChunkName: "webcomponents/vb-services" */'./components/vb-services').then(() => {
    const el = document.createElement('vb-services');
    el.classList.add('sticky');
    el.servicesList = settings.$.services_list;
    document.body.append(el);

    // update storage after sorting
    el.addEventListener('update', e => {
      settings.updateKey('services_list', e.detail.services);
    });
  }).catch(err => {
    console.warn(err);
  });
}

async function removeSelectedBookmarks(multipleSelectedBookmarks) {
  if (!settings.$.without_confirmation) {
    const confirmAction = await confirmPopup(chrome.i18n.getMessage('confirm_delete_selected_bookmarks'));
    if (!confirmAction) return;
  }
  await Promise.all(
    multipleSelectedBookmarks.map(bookmark => {
      return Bookmarks.removeFromBrowser(bookmark, bookmark.isFolder);
    })
  );
  hideControlMultiplyBookmarks();
}

function openSelectedBookmarks(multipleSelectedBookmarks, action) {
  if (['open_all_window', 'new_window_incognito'].includes(action)) {
    chrome.windows.create({
      focused: true,
      state: 'maximized',
      incognito: (action === 'new_window_incognito')
    }, win => {
      multipleSelectedBookmarks.forEach(bookmark => {
        openTab(bookmark.url, { windowId: win.id });
      });
    });
  } else if (action === 'open_all') {
    multipleSelectedBookmarks.forEach(bookmark => {
      openTab(bookmark.url);
    });
  }
}

/**
 * Open all bookmarks from a folder
 * @param {string} id - folder id
 * @param {string} action - action to run
 */
function openAll(id, action) {
  getChildren(id)
    .then(childrens => {
      if (action === 'open_all_window') {
        chrome.windows.create({
          focused: true
        }, win => {
          childrens.forEach(children => {
            const url = children.url ?? children.id;
            openTab(url, { windowId: win.id });
          });
        });
      } else {
        childrens.forEach(children => {
          const url = children.url ?? children.id;
          openTab(url);
        });
      }
    });
}

/**
 * Open a bookmark in a new window
 * @param {string} url - bookmark URL
 * @param {string} action - action to run
 */
function openWindow(url, action) {
  try {
    chrome.windows.create({
      url: url,
      state: 'maximized',
      incognito: (action === 'new_window_incognito')
    });
  } catch (e) {}
}

/**
 * Open a bookmark in a new tab
 * @param {string} url - bookmark URL
 * @param {object} [options={}] - options for creating a tab
 * @param {boolean} [options.active]
 * @param {number} [options.index]
 * @param {number} [options.openerTabId]
 * @param {boolean} [options.pinned]
 * @param {string} [options.url]
 * @param {number} [options.windowId]
 */
function openTab(url, options = {}) {
  if (url.startsWith('#')) {
    url = `newtab.html${url}`;
  }

  const defaults = {
    url: url,
    active: false
  };
  try {
    chrome.tabs.create({
      ...defaults,
      ...options
    });
  } catch (e) {}
}

async function handleSubmitForm(evt) {
  evt.preventDefault();
  const form = evt.target;
  const id = form.getAttribute('data-action');
  const title = form.title.value;
  const url = form.url.value;

  let success = false;
  if (id !== 'New') {
    const newLocation = modalSelectFolders.value;
    success = await Bookmarks.updateBookmark(id, title, url, newLocation);
  } else {
    success = await Bookmarks.createBookmark(title, url);
  }
  success && modalApi.close();
}

/**
 * Form submit error handler
 * Set focus to the first field in the array of invalid fields
 * @param {Array<{el: HTMLElement, errors: [string]}>} err
 */
function handleFormError(err) {
  return err[0]?.el?.focus();
}

async function handleResetThumb(evt) {
  if (!settings.$.without_confirmation) {
    const confirmAction = await confirmPopup(chrome.i18n.getMessage('confirm_delete_image'));
    if (!confirmAction) return;
  }

  evt.preventDefault();
  const id = this.getAttribute('data-bookmark');

  Bookmarks.removeThumbnail(id)
    .then(() => {
      const bookmark = document.getElementById(`vb-${id}`);
      bookmark.image = null;
      this.closest('#customScreen').style.display = '';
    });
}

async function prepareModal(target) {
  if (target) {
    modal.classList.add('has-edit');

    const bookmarkNode = await get(target.id).catch(err => console.warn(err));
    if (!bookmarkNode) return;

    const { id, url, parentId } = bookmarkNode[0];
    const title = $unescapeHtml(bookmarkNode[0].title);
    const imageData = await ImageDB.get(id);

    // generate bookmark folder list
    modalSelectFolders.setAttribute('parent-folder-id', parentId);
    modalSelectFolders.setAttribute('bookmark-id', id);
    modalSelectFolders.folders = await getFolders();

    if (imageData) {
      const image = URL.createObjectURL(imageData.blob);
      const imgElement = customScreen.querySelector('img');

      customScreen.style.display = 'block';
      imgElement.onload = () => {
        URL.revokeObjectURL(image);
      };
      imgElement.src = image;
      customScreen.querySelector('#resetCustomImage').setAttribute('data-bookmark', id);
    }

    modalHead.textContent = chrome.i18n.getMessage('edit_bookmark');
    titleField.value = title;

    if (url) {
      urlWrap.style.display = '';
      urlField.value = url;
    } else {
      urlWrap.style.display = 'none';
    }
    form.setAttribute('data-action', id);
  } else {
    modal.classList.add('has-add');
    modalHead.textContent = chrome.i18n.getMessage('add_bookmark');
    urlWrap.style.display = '';
    titleField.value = '';
    urlField.value = '';
    form.setAttribute('data-action', 'New');
  }
}

init();
