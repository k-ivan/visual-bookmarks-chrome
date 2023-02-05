import ImageDB from './api/imageDB';
import browserContextMenu from './plugins/browserContextMenu';
import { settings } from './settings';
import { storage } from './api/storage';
import {
  $notifications,
  $base64ToBlob,
  $resizeThumbnail
} from './utils';
import {
  create,
  search
} from './api/bookmark';
import {
  THUMBNAIL_POPUP_HEIGHT,
  THUMBNAIL_POPUP_WIDTH
} from './constants';

function browserActionHandler() {
  // TODO: need current hash folder
  const urls = [
    chrome.runtime.getURL('newtab.html'),
    'chrome://newtab/'
  ];

  chrome.tabs.query({ currentWindow: true }, function(tabs) {
    for (let tab of tabs) {
      if (urls.some(url => tab.url.startsWith(url))) {
        return chrome.tabs.update(tab.id, { active: true });
      }
    }
    return chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
  });
}

async function initContextMenu() {
  const { settings } = await storage.local.get('settings');
  browserContextMenu.init(settings.show_contextmenu_item);
}

async function captureScreen(link, callback) {
  const { screen } = await storage.local.get('screen');

  chrome.windows.create({
    url: link,
    state: 'normal',
    left: 1e5,
    top: 1e5,
    width: 1,
    height: 1,
    type: 'popup'
  }, async function(w) {
    // capture timeout
    let timeout = 25000;

    const { settings } = await storage.local.get('settings');
    // delay in milliseconds
    const captureDelay = (parseFloat(settings.thumbnails_update_delay) || 0.5) * 1000;

    if (captureDelay > 500) {
      timeout += captureDelay;
    }

    if (!w.tabs || !w.tabs.length) {
      chrome.windows.remove(w.id);
      console.error('not found page');
      return false;
    }

    let tab = w.tabs[0];
    let stop = false;

    chrome.tabs.update(tab.id, {
      muted: true
    });

    let closeWindow = setTimeout(function() {
      chrome.windows.remove(w.id);
      callback({ error: 'long_load', url: tab.url });
      stop = true;
    }, timeout);

    checkerStatus();

    function checkerStatus() {
      if (stop) {
        clearTimeout(closeWindow);
        return false;
      }

      chrome.tabs.get(tab.id, function(tabInfo) {
        if (tabInfo.status === 'complete') {
          chrome.scripting.insertCSS({
            target: {
              tabId: tab.id
            },
            css: 'html, body { overflow-y: hidden !important; }'
          });
          chrome.windows.update(w.id, {
            left: screen.availWidth - THUMBNAIL_POPUP_WIDTH,
            top: screen.availHeight - THUMBNAIL_POPUP_HEIGHT,
            width: THUMBNAIL_POPUP_WIDTH,
            height: THUMBNAIL_POPUP_HEIGHT,
            focused: true
          }, function(win) {
            setTimeout(() => {
              chrome.tabs.captureVisibleTab(win.id, function(dataUrl) {
                callback({
                  capture: dataUrl,
                  title: tabInfo.title
                });
                try {
                  chrome.windows.remove(win.id, () => {
                    clearTimeout(closeWindow);
                  });
                } catch (e) {}
              });
            }, captureDelay);
          });
        } else {
          setTimeout(() => {
            checkerStatus();
          }, 300);
        }
      });
    }
  });
}

function handlerCreateBookmark(data) {
  chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs){
    const matches = await search(data.pageUrl);
    if (!matches) return;

    const isExist = matches.some(match => match.url === data.pageUrl);
    if (isExist) {
      // Bookmarks exist
      $notifications(chrome.i18n.getMessage('notice_bookmark_exist'));
    } else {
      const { settings } = await storage.local.get('settings');
      // ID of the item for subfolders starts with 'save-{parentId}'
      // to get a valid ID, remove the extra characters from the string
      // extra characters will be found in subfolders in the add item
      const menuItemId = data.menuItemId.replace('save-', '');

      const parentId = (menuItemId === 'current_folder')
        ? String(settings.default_folder_id)
        : menuItemId;

      // Create
      const response = await create({
        parentId,
        url: data.pageUrl,
        title: tabs[0].title
      }).catch(err => {
        console.warn(err);
      });

      // do not generate a thumbnail if you could not create a bookmark or the auto-generation option is turned off
      if (!response) return;

      if (settings.auto_generate_thumbnail) {
        captureScreen(response.url, async function(data) {
          const fileBlob = $base64ToBlob(data.capture, 'image/webp');
          const blob = await $resizeThumbnail(fileBlob);
          await ImageDB.update({ id: response.id, blob, custom: false });
          chrome.runtime.sendMessage({ autoGenerateThumbnail: true });
        });
      }

      if (settings.close_tab_after_adding_bookmark) {
        chrome.tabs.remove(tabs[0].id);
      }
      $notifications(chrome.i18n.getMessage('notice_bookmark_created'));
    }
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  // if storage changes from local
  // watching the settings parameter
  if (area === 'local' && changes?.settings?.oldValue) {
    // at the moment we only need to track changes for the show_contextmenu_item option
    const { show_contextmenu_item: newContextMenu } = changes.settings.newValue;
    const { show_contextmenu_item: oldContextMenu } = changes.settings.oldValue;
    // toggle the context menu only if show_contextmenu_item has changed
    if (newContextMenu !== oldContextMenu) {
      browserContextMenu.toggle(newContextMenu);
    }
  }
});

chrome.runtime.onInstalled.addListener(async(event) => {
  if (event.reason === 'install') {
    await settings.init();
  }
  initContextMenu();
  if (event.reason === 'update') {
    storage.local.set({ updated: true });
    // return chrome.tabs.create({ url: chrome.runtime.getURL('options.html#changelog') });
  }
});

chrome.bookmarks.onCreated.addListener(initContextMenu);
chrome.bookmarks.onChanged.addListener(initContextMenu);
chrome.bookmarks.onRemoved.addListener(initContextMenu);
chrome.bookmarks.onMoved.addListener(initContextMenu);

chrome.contextMenus.onClicked.addListener(handlerCreateBookmark);
chrome.action.onClicked.addListener(browserActionHandler);
chrome.notifications.onClicked.addListener(browserActionHandler);
chrome.notifications.onButtonClicked.addListener((id) => {
  // TODO: updates info
  // more about updates
  // go to options page with hash to show modal info
  if (id === 'changelog') {
    return chrome.tabs.create({ url: chrome.runtime.getURL('options.html#changelog') });
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.capture) {
    const { id, captureUrl } = request.capture;

    // captureScreen(request.captureUrl, async function(data) {
    captureScreen(captureUrl, async function(data) {
      if (data && data.error) {
        try {
          sendResponse({ warning: 'Timeout waiting for a screenshot' });
        } catch (e) {}
        console.warn(`Timeout waiting for a screenshot ${data.url}`);
        return false;
      }

      // If cannot access contents of url
      if (data && data.capture === undefined) {
        try {
          sendResponse({ warning: 'Cannot access contents of url' });
        } catch (e) {}
        console.warn(`Cannot access contents of url: ${captureUrl}`);
        return false;
      }

      const fileBlob = $base64ToBlob(data.capture, 'image/webp');
      const blob = await $resizeThumbnail(fileBlob);
      await ImageDB.update({ id, blob, custom: false });
      try {
        sendResponse('success');
      } catch (e) {}
    });
  }

  // Toggle contextmenu item
  if (request.showContextMenuItem) {
    const { checked } = request.showContextMenuItem;
    browserContextMenu.toggle(checked);
  }

  // send a response asynchronously (return true)
  // this will keep the message channel open to the other end until sendResponse is called
  return true;
});
