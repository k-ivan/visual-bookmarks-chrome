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
  flattenArrayBookmarks,
  search
} from './api/bookmark';
import {
  THUMBNAIL_POPUP_HEIGHT,
  THUMBNAIL_POPUP_WIDTH,
  NEWTAB_URLS,
  NEWTAB_EMPTY_URLS,
  FIREFOX_BROWSER
} from './constants';
import { containsPermissions } from './api/permissions';

function browserActionHandler() {
  browser.tabs.query({ currentWindow: true }, function(tabs) {
    for (let tab of tabs) {
      if (NEWTAB_URLS.some(url => tab.url.startsWith(url))) {
        return browser.tabs.update(tab.id, { active: true });
      }
    }
    return browser.tabs.create({ url: browser.runtime.getURL('newtab.html') });
  });
}

async function initContextMenu() {
  const { settings } = await storage.local.get('settings');
  browserContextMenu.init(settings.show_contextmenu_item);
}

// TODO a refactor is needed to make the function return a promise
async function captureScreen(link, callback) {
  const { screen } = await storage.local.get('screen');

  browser.windows.create({
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
      browser.windows.remove(w.id);
      console.error('not found page');
      return false;
    }

    let tab = w.tabs[0];
    let stop = false;

    browser.tabs.update(tab.id, {
      muted: true
    });

    let closeWindow = setTimeout(function() {
      browser.windows.remove(w.id);
      callback({ error: 'long_load', url: tab.url });
      stop = true;
    }, timeout);

    checkerStatus();

    function checkerStatus() {
      if (stop) {
        clearTimeout(closeWindow);
        return false;
      }

      browser.tabs.get(tab.id, function(tabInfo) {
        if (tabInfo.status === 'complete') {
          browser.scripting.insertCSS({
            target: {
              tabId: tab.id
            },
            css: 'html, body { overflow-y: hidden !important; }'
          });
          browser.windows.update(w.id, {
            left: screen.availWidth - THUMBNAIL_POPUP_WIDTH,
            top: screen.availHeight - THUMBNAIL_POPUP_HEIGHT,
            width: THUMBNAIL_POPUP_WIDTH,
            height: THUMBNAIL_POPUP_HEIGHT,
            focused: true
          }, function(win) {
            setTimeout(() => {
              browser.tabs.captureVisibleTab(win.id, function(dataUrl) {
                callback({
                  capture: dataUrl,
                  title: tabInfo.title
                });
                try {
                  browser.windows.remove(win.id, () => {
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

function handleCreateBookmark(data) {
  browser.tabs.query({ active: true, currentWindow: true }, async function(tabs){
    const matches = await search(data.pageUrl);
    if (!matches) return;

    const isExist = matches.some(match => match.url === data.pageUrl);
    if (isExist) {
      // Bookmarks exist
      $notifications(browser.i18n.getMessage('notice_bookmark_exist'));
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

      if (settings.close_tab_after_adding_bookmark) {
        browser.tabs.remove(tabs[0].id);
      }
      $notifications(browser.i18n.getMessage('notice_bookmark_created'));
    }
  });
}

async function handleCreatedTab(tab) {
  const { settings } = await storage.local.get('settings');
  if (settings.search_autofocus && NEWTAB_EMPTY_URLS.includes(tab.pendingUrl)) {
    browser.tabs.create({
      url: browser.runtime.getURL('newtab.html')
    });
    browser.tabs.remove(tab.id);
  }
}

async function handleCreateThumbnail(id, bookmark, callback) {
  const { importingBookmarks } = await storage.local.get('importingBookmarks');
  if (importingBookmarks) return;

  captureScreen(bookmark.url, async function(data) {
    if (data.error) {
      return callback && callback();
    }
    const fileBlob = $base64ToBlob(data.capture, 'image/webp');
    const blob = await $resizeThumbnail(fileBlob);
    await ImageDB.update({ id: bookmark.id, blob, custom: false });
    callback && callback();
  });
}

async function handleBookmarks(eventType, id, bookmark) {
  const isBookmarkUrl = bookmark.url || bookmark.node?.url;
  // we will start rebuilding the list of folders only if an event happened to the folder
  // note: in the case of moving, it will also work with a bookmark
  if (!isBookmarkUrl || eventType === 'moved') {
    initContextMenu();
  }

  // to avoid duplicating actions when editing bookmarks,
  // we will ignore further execution if our application is in the active tab
  const tabs = await browser.tabs.query({ active: true });
  const tabUrl = tabs[0].url.replace(/#\d*/, '');
  if (NEWTAB_URLS.includes(tabUrl)) return;

  const { settings } = await storage.local.get('settings');
  const sendMessageCallback = () => {
    browser.runtime.sendMessage({ bookmarksUpdated: true }, () => {
      if (browser.runtime.lastError) {
        return;
      }
    });
  };

  // create a thumbnail if required
  // send a command to update the list of bookmarks
  if (
    ['created', 'changed'].includes(eventType) &&
    settings.auto_generate_thumbnail &&
    bookmark.url
  ) {
    const allUrlsPermission = await containsPermissions({ origins: ['<all_urls>'] });
    allUrlsPermission && handleCreateThumbnail(id, bookmark, sendMessageCallback);
  } else {
    sendMessageCallback();
  }

  // delete all thumbnails associated with the folder being deleted
  if (eventType === 'removed') {
    const deletedThumbsPromises = [ImageDB.delete(id)];

    if (!bookmark.node.url) {
      deletedThumbsPromises.push(
        ...flattenArrayBookmarks(bookmark.node.children, true).map(({ id }) => ImageDB.delete(id))
      );
    }

    Promise.all(deletedThumbsPromises);
  }
}

browser.storage.onChanged.addListener((changes, area) => {
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

browser.runtime.onInstalled.addListener(async(event) => {
  if (event.reason === 'install') {
    await settings.init();
  }
  initContextMenu();
  if (event.reason === 'update') {
    storage.local.set({ extension_updated: true });
    // return browser.tabs.create({ url: browser.runtime.getURL('options.html#changelog') });
  }
});

browser.bookmarks.onCreated.addListener((id, bookmark) => handleBookmarks('created', id, bookmark));
browser.bookmarks.onChanged.addListener((id, bookmark) => handleBookmarks('changed', id, bookmark));
browser.bookmarks.onRemoved.addListener((id, bookmark) => handleBookmarks('removed', id, bookmark));
browser.bookmarks.onMoved.addListener((id, bookmark) => handleBookmarks('moved', id, bookmark));

if (!FIREFOX_BROWSER) {
  // firefox does not support onImportBegan and onImportEnded events
  browser.bookmarks.onImportBegan.addListener(() => {
    storage.local.set({ importingBookmarks: true });
  });
  browser.bookmarks.onImportEnded.addListener(() => {
    storage.local.remove('importingBookmarks');
  });
}

browser.contextMenus.onClicked.addListener(handleCreateBookmark);
browser.action.onClicked.addListener(browserActionHandler);
browser.notifications.onClicked.addListener(browserActionHandler);
browser.notifications.onButtonClicked.addListener((id) => {
  // TODO: updates info
  // more about updates
  // go to options page with hash to show modal info
  if (id === 'changelog') {
    return browser.tabs.create({ url: browser.runtime.getURL('options.html#changelog') });
  }
});

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
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

browser.tabs.onCreated.addListener(handleCreatedTab);
