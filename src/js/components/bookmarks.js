import Sortable from 'sortablejs';
import Toast from './toast';
import ImageDB from '../api/imageDB';
import { settings } from '../settings';
import { storage } from '../api/storage';
import {
  move,
  getSubTree,
  search as searchBookmarks,
  remove,
  removeTree,
  create,
  update
} from '../api/bookmark';
import {
  $debounce,
  $customTrigger,
  $escapeHtml,
  $shuffle,
  $createElement,
  $notifications,
  $resizeThumbnail
} from '../utils';
import { SVG_LOADER } from '../constants';
import  confirmPopup from '../plugins/confirmPopup.js';
import './vb-bookmark';

/**
 * Bookmarks module
 */
const Bookmarks = (() => {
  const THUMBNAILS_MAP = new Map();
  const THUMBNAILS_CREATION_QUEUE = [];
  const DROPZONE_SELECTOR = '.dropzone-bookmark';
  const container = document.getElementById('bookmarks');
  const dialLoading = document.getElementById('dial_loading');
  let isGeneratedThumbs = false;

  async function init() {
    // screen sizes needed for the service worker
    storage.local.set({
      screen: {
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight
      }
    });

    // Vertical center
    if (settings.$.vertical_center) {
      container.classList.add('grid--vcenter');
    }

    // Hide the settings icon if setting_icon disable
    if (!settings.$.show_settings_icon) {
      const icon = document.getElementById('settings_icon');
      icon.parentNode.removeChild(icon);
    }

    // Dragging option
    if (
      settings.$.drag_and_drop &&
      !settings.$.sort_by_newest
    ) {
      observerDropzone();
      initDrag(container);
    }

    // Search bookmarks if toolbar enable
    if (settings.$.show_toolbar) {
      await import(/* webpackChunkName: "webcomponents/vb-header" */'./vb-header');
      const vbHeader = document.createElement('vb-header');
      vbHeader.setAttribute('placeholder', chrome.i18n.getMessage('placeholder_input_search'));
      vbHeader.setAttribute('initial-folder-id', settings.$.default_folder_id);
      vbHeader.setAttribute('folder-id', startFolder());
      document.querySelector('header').append(vbHeader);

      let hasSearch = false;
      const searchHandler = $debounce(({ detail }) => {
        const query = detail.search.trim();
        if (!query.length && hasSearch) {
          hasSearch = false;
          return createSpeedDial(startFolder());
        }
        if (query.length > 1) {
          hasSearch = true;
          search(query);
        }
      }, 500);
      const searchResetHandler = () => {
        hasSearch = false;
        createSpeedDial(startFolder());
      };

      vbHeader.addEventListener('vb:search', searchHandler);
      vbHeader.addEventListener('vb:searchreset', searchResetHandler);
    }

    // Create speeddial
    createSpeedDial(startFolder());

    // Change the current dial if the page hash changes
    window.addEventListener('hashchange', function() {
      const folderId = startFolder();
      createSpeedDial(folderId);
      $customTrigger('changeFolder', container, {
        detail: { folderId },
        bubbles: true
      });
    }, false);

    document.addEventListener('bookmark-removed', ({ detail }) => {
      // on any action, folder change or bookmark removal (from DOM)
      // remove the previously created url of the blob object from memory
      if (!document.getElementById(`vb-${detail.id}`)) {
        URL.revokeObjectURL(detail.image);

        const thumbnail = THUMBNAILS_MAP.get(detail.id);
        if (thumbnail) {
          if (thumbnail.children) {
            // if there are thumbnails in the children, clear them from memory too
            thumbnail.children.forEach(item => {
              item.blobUrl && URL.revokeObjectURL(item.blobUrl);
            });
          }
          // delete an inaccessible item from Map
          THUMBNAILS_MAP.delete(detail.id);
        }
      }
    });
  }

  function observerDropzone() {
    const observer = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        for (let node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;

          const dropzone = node.querySelector(DROPZONE_SELECTOR);
          if (!dropzone) continue;
          initDrag(dropzone);
        }

        for (let node of mutation.removedNodes) {
          if (!(node instanceof HTMLElement)) continue;

          const dropzone = node.querySelector(DROPZONE_SELECTOR);
          if (!dropzone) continue;

          dropzone.sortInstance?.destroy();
          delete dropzone.sortInstance;
        }
      }
    });

    observer.observe(container, {
      childList: true
    });
  }

  // helper to turn on the dropzone lighting
  function showDropzone(target) {
    [...container.querySelectorAll(DROPZONE_SELECTOR)]
      .forEach(el => {
        const bookmark = el.closest('.bookmark') || el.closest('.bookmark-btn--back');
        if (bookmark.dataset.id !== target.dataset.id) {
          el.classList.add('is-activate');
        }
      });
  }

  // helper to turn off the dropzone backlight
  function hideDropzone() {
    [...container.querySelectorAll('.is-activate')]
      .forEach(el => el.classList.remove('is-activate'));
  }

  function initDrag(el) {
    el.sortInstance = Sortable.create(el, {
      group: {
        name: 'shared',
        pull: 'clone'
      },
      animation: 200,
      fallbackOnBody: true,
      filter: '.bookmark__action',
      draggable: '.bookmark',
      removeCloneOnHide: false,
      ghostClass: 'bookmark--ghost',
      chosenClass: 'bookmark--chosen',
      preventOnFilter: false,
      onStart(evt) {
        showDropzone(evt.item);
      },
      onEnd(evt) {
        if (!evt.pullMode) {
          hideDropzone();
        }
      },
      /**
       * Sortable onMove event
       * @param {Object} event - sortablejs event
       * @param {HTMLElement} event.to - HTMLElement target list
       * @param {HTMLElement} event.related - HTMLElement on which have guided
       */
      onMove({ to, related }) {
        container.querySelector('.has-highlight')?.classList.remove('has-highlight');
        if (to.matches(DROPZONE_SELECTOR)) {
          to.classList.add('has-highlight');
        }
        // do not sort create column
        if (related.classList.contains('bookmark-btn')) {
          return false;
        }
      },
      /**
       * Sortable onAdd event
       * @param {Object} event -sortablejs event
       * @param {HTMLElement} event.item - dragging element
       * @param {HTMLElement} event.clone -clone for dragging element
       * @param {HTMLElement} event.target - dropzone element
       *
       */
      onAdd({ item, clone, target }) {
        const id = item.dataset.id;
        const destination = {
          parentId: target.dataset.id,
          ...(settings.$.move_to_start && { index: 0 })
        };

        // preparation for animation
        item.style.transformOrigin = 'center bottom';
        // animation of moving a bookmark to a folder(Web Animations API)
        let itemAnimation = item.animate([
          {
            opacity: 1,
            transform: 'scale3d(0.475, 0.475, 0.475) translate3d(0, -20px, 0)',
            animationTimingFunction: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
            offset: 0.4
          },
          {
            opacity: 0,
            transform: 'scale3d(0.1, 0.1, 0.1) translate3d(0, 100px, 0)',
            animationTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 1)'
          }
        ], 550);
        // waiting animationend
        itemAnimation.onfinish = () => {
          // remove clone bookmark
          clone.remove();
          // remove bookmark node from DOM
          item.remove();
          // hide highlight dropzone
          hideDropzone();
          // move the bookmark to the target folder
          move(id, destination)
            .then(() => {
              const isFolder = item.hasAttribute('is-folder');
              // if the folder run the updateFolderList trigger
              isFolder && $customTrigger('updateFolderList', document, {
                detail: {
                  isFolder: true
                }
              });
            });
        };
      },
      onUpdate() {
        Array.from(container.querySelectorAll('.bookmark')).forEach(async(item, index) => {
          await move(item.getAttribute('data-id'), {
            'parentId': container.dataset.folder,
            'index': index
          }).catch(console.warn);
        });
      }
    });
  }

  function startFolder() {
    let folderId = String(settings.$.default_folder_id);

    if (window.location.hash !== '') {
      folderId = window.location.hash.slice(1);
    }
    return folderId;
  }

  function genBookmark(bookmark) {
    let image;
    let custom = false;
    const thumbnail = THUMBNAILS_MAP.get(bookmark.id);
    if (thumbnail) {
      image = thumbnail.blobUrl;
      custom = thumbnail.custom;
    }

    const vbBookmark = document.createElement('a', { is: 'vb-bookmark' });
    Object.assign(vbBookmark, {
      id: bookmark.id,
      url: bookmark.url,
      title: $escapeHtml(bookmark.title),
      parentId: bookmark.parentId,
      image,
      isCustomImage: custom,
      externalLogo: settings.$.logo_external,
      openNewTab: settings.$.open_link_newtab,
      hasTitle: settings.$.show_bookmark_title,
      hasFavicon: settings.$.show_favicon
    });
    return vbBookmark;
  }

  function genFolder(bookmark) {
    let image;
    const folderPreview = settings.$.folder_preview;

    if (!folderPreview) {
      const thumbnail = THUMBNAILS_MAP.get(bookmark.id);
      image = thumbnail?.blobUrl;
    }

    const vbBookmark = document.createElement('a', { is: 'vb-bookmark' });
    Object.assign(vbBookmark, {
      id: bookmark.id,
      url: `#${bookmark.id}`,
      parentId: bookmark.parentId,
      title: $escapeHtml(bookmark.title),
      isFolder: true,
      hasFolderPreview: folderPreview,
      folderChidlren: folderPreview ? renderFolderChildren(bookmark) : [],
      externalLogo: settings.$.logo_external,
      image,
      openNewTab: settings.$.open_link_newtab,
      hasTitle: settings.$.show_bookmark_title,
      hasFavicon: settings.$.show_favicon,
      isDND: settings.$.drag_and_drop
    });
    return vbBookmark;
  }

  /**
   * Thumbnails or logos for folder render
   * @param {Object<BookmarkTreeNode>} bookmark
   * @returns {Array<Object>} thumbnail object
   */
  function renderFolderChildren(bookmark) {
    const thumbnail = THUMBNAILS_MAP.get(bookmark.id);

    if (!thumbnail?.children) return [];

    return thumbnail.children.map(thumbnailChild => ({
      ...thumbnailChild,
      image: thumbnailChild.blobUrl
    }));
  }

  function clearContainer() {
    if (!container.firstChild) return;

    while (container.firstChild) {
      container.firstChild.remove();
    }
  }

  /**
   * Create an array of strings from bookmarks inside a folder
   * @param {Array<BookmarkTreeNode>} bookmarks
   * @returns {Array<String>} array id
   */
  function getChildren(bookmarks) {
    return bookmarks.reduce((acc, bookmark) => {
      if (bookmark.children) {
        const children = $shuffle(bookmark.children);
        acc.push(
          ...children
            .reduce((acc, child) => {
              if (!child.children) {
                acc.push(child);
              }
              return acc;
            }, [])
            .slice(0, 4)
        );
      }
      return acc;
    }, []);
  }

  /**
   * Set thumbnails map for folders
   * @param {Array<Object>} existingChildrenThumbnails
   * @param {Array<BookmarkTreeNode>} childrenBookmarks
   */
  function setChildrenThumbnails(existingChildrenThumbnails, childrenBookmarks) {
    // prepare an array of thumbnails
    const thumbnails = childrenBookmarks.reduce((acc, bookmark) => {
      // search for a thumbnail among existing thumbnails
      let thumbnail = existingChildrenThumbnails.find(thumbnail => thumbnail.id === bookmark.id);

      if (thumbnail?.blob) {
        // if there is a thumbnail, we create a key that stores the url
        thumbnail.blobUrl = URL.createObjectURL(thumbnail.blob);
      } else {
        // if there is no thumbnail, create an object with id to display the logo later
        thumbnail = { id: bookmark.id, url: bookmark.url };
      }

      // each folder must contain an array of thumbnails
      if (!Array.isArray(acc?.[bookmark.parentId])) {
        // if the folder is not filled yet, create an object and an array inside it
        acc[bookmark.parentId] = [];
      }
      // add folder thumbnail
      acc[bookmark.parentId].push(thumbnail);
      return acc;
    }, {});

    // iterate through the array of thumbnail keys
    // add thumbnails to thumbnail map
    Object.keys(thumbnails).forEach(key => {
      THUMBNAILS_MAP.set(key, {
        id: key,
        children: thumbnails[key]
      });
    });
  }

  /**
   * Render bookmarks
   * @param {Array<BookmarkTreeNode>} arr - array of bookmarks
   * @param {boolean} [hasCreate=false] - show add bookmark button
   */
  async function render(arr, hasCreate = false) {
    dialLoading.hidden = false;
    clearContainer();

    // bookmarks ids array
    const bookmarksIds = arr.map(child => child.id);
    let childrenBookmarks;

    // array of indexDB query promises
    // request for main thumbnails
    const promiseThumbnailsRequests = [
      ImageDB.getAllByIds(bookmarksIds)
    ];
    // request for thumbnails in folders if the display option is enabled
    if (settings.$.folder_preview) {
      // get children bookmarks for folders
      childrenBookmarks = getChildren(arr);
      // get only ids
      const childrenIds = childrenBookmarks.map(child => child.id);
      promiseThumbnailsRequests.push(ImageDB.getAllByIds(childrenIds));
    }

    // request thumbnails from indexDB
    const [thumbnails, childrenThumbnails] = await Promise.all(promiseThumbnailsRequests);

    // clear local thumbnail map
    THUMBNAILS_MAP.clear();

    // convert blob to thumbnail url for main bookmarks
    thumbnails.forEach(thumbnail => {
      thumbnail.blobUrl = URL.createObjectURL(thumbnail.blob);
      THUMBNAILS_MAP.set(thumbnail.id, thumbnail);
    });

    // convert blob to thumbnail url for children bookmarks
    if (settings.$.folder_preview) {
      setChildrenThumbnails(childrenThumbnails, childrenBookmarks);
    }

    // sorting by newest
    if (settings.$.sort_by_date) {
      arr.sort((a, b) => b.dateAdded - a.dateAdded);
    }
    // sorting by type
    if (settings.$.bookmarks_sorting_type === 'folders_top') {
      // folders at the top
      arr.sort((a, b) => Object.hasOwn(a, 'url') ? 1 : Object.hasOwn(b, 'url') ? -1 : 0);
    } else if (settings.$.bookmarks_sorting_type === 'folders_bottom') {
      // folders at the bottom
      arr.sort((a, b) => !Object.hasOwn(a, 'url') ? 0 : Object.hasOwn(b, 'url') ? 1 : -1);
    }

    const fragment = document.createDocumentFragment();

    for (let bookmark of arr) {
      if (bookmark.url) {
        fragment.appendChild(genBookmark(bookmark));
      } else {
        fragment.appendChild(genFolder(bookmark));
      }
    }

    container.appendChild(fragment);

    const hasBack = (window.location.hash !== '')
      && container.dataset?.parentFolder
      && settings.$.show_back_column;

    hasBack && container.prepend(
      $createElement('button', {
        id: 'bookmark-back',
        class: 'bookmark-btn bookmark-btn--back md-ripple'
      }, $createElement('span', {
        class: DROPZONE_SELECTOR.replace('.', ''),
        'data-id': container.dataset?.parentFolder
      }))
    );

    hasCreate && container.append(
      $createElement('button', {
        id: 'add',
        class: 'bookmark-btn bookmark-btn--create md-ripple',
        'data-create': 'New'
      })
    );
    dialLoading.hidden = true;
  }

  /**
   * Create speed dial
   * @param {String} id current folder id
   * @returns {Promise}
   */
  function createSpeedDial(id) {
    if (settings.$.drag_and_drop) {
      // if dnd instance exist and disabled(after search) turn it on
      if (container.sortInstance?.options?.disabled) {
        container.sortInstance?.option('disabled', false);
      }
    }

    return getSubTree(id)
      .then(item => {
        if (!item[0].children) {
          throw new Error('not_folder');
        }

        // folder by id exists
        render(item[0].children, settings.$.show_create_column);
        container.setAttribute('data-folder', id);

        if (Number(item[0].parentId)) {
          container.setAttribute('data-parent-folder', item[0].parentId);
        } else {
          container.removeAttribute('data-parent-folder');
        }
      })
      .catch(() => {
        Toast.show(chrome.i18n.getMessage('notice_cant_find_id'));
        container.innerHTML = /* html */
            `<div class="not-found">
              <div class="not-found__wrap">
                <div class="not-found__icon"></div>
                <div class="not-found__text">
                  ${chrome.i18n.getMessage('not_found_text')}
                </div>
                <a class="btn md-ripple" href="#1">${chrome.i18n.getMessage('not_found_link_text')}</a>
              </div>
            </div>`;
      });
  }

  /**
   * Create progress toast
   * @param {Number} number of bookmarks
   * @returns {HTMLElement} progress element
   */
  function renderProgressToast(sum) {
    const i18n = chrome.i18n.getMessage(
      'thumbnails_creation',
      [
        '<strong id="progress-text">0</strong>',
        sum
      ]
    );
    const progressToast = $createElement(
      'div', {
        class: 'progress-toast'
      },
      {
        innerHTML:
          `<div class="progress-toast__icon">${SVG_LOADER}</div>` +
          `<div class="progress-toast__text">${i18n}</div>`
      }
    );
    return progressToast;
  }

  /**
   * Create a flat array of bookmarks
   * @param {Array<BookmarkTreeNode>} bookmarks
   * @returns {Array<BookmarkTreeNode>} flatten bookmarks
   */
  function flattenArrayBookmarks(arr) {
    return [].concat(...arr.map(item => {
      return Array.isArray(item.children) ? flattenArrayBookmarks(item.children) : item;
    }));
  }

  function autoUpdateThumb() {
    if (isGeneratedThumbs) return;
    const id = startFolder();
    getSubTree(id)
      .then(async(items) => {
        // check recursively or not
        const children = settings.$.thumbnails_update_recursive
          // create a flat array of nested bookmarks
          ? flattenArrayBookmarks(items[0].children)
          // only first level bookmarks without folders
          : items[0].children.filter(item => item.url);

        // sort by newest
        if (settings.$.sort_by_newest) {
          children.sort((a, b) => b.dateAdded - a.dateAdded);
        }

        // create notification toast
        const progressToast = renderProgressToast(children.length);
        document.body.append(progressToast);
        const progressToastTween = progressToast.animate([
          { transform: 'translate3D(-100%, 0, 0)' },
          { transform: 'translate3D(0, 0, 0)' }
        ], {
          duration: 200,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        });
        const progressText = document.getElementById('progress-text');

        isGeneratedThumbs = true;
        $customTrigger('thumbnails:updating', container);

        for (const [index, b] of children.entries()) {
          // updating toast progress
          progressText.textContent = index + 1;
          // get capture
          const response = await captureScreen(b.url, b.id, b.parentId);
          if (response.warning) continue;

          const image = await ImageDB.get(b.id);
          const blobUrl = URL.createObjectURL(image.blob);
          const thumbnail = THUMBNAILS_MAP.get(b.id);

          if (thumbnail) {
            URL.revokeObjectURL(thumbnail.blobUrl);
          }
          THUMBNAILS_MAP.set(b.id, {
            ...image,
            blobUrl
          });

          try {
            // if we can, then update the bookmark in the DOM
            const bookmark = document.getElementById(`vb-${b.id}`);
            bookmark.image = blobUrl;
          } catch (err) {}
        }

        isGeneratedThumbs = false;
        $notifications(
          chrome.i18n.getMessage('notice_thumbnails_update_complete')
        );
        $customTrigger('thumbnails:updated', container);
        progressToastTween.reverse();
        progressToastTween.onfinish = () => {
          progressToast.remove();
        };
      });
  }

  /**
   * Upload user image for thumbnail
   * @param {Object} data
   * @param {HTMLInputElement} data.target - input file
   * @param {string} data.id
   * @param {(string|undefined)} data.site - domain
   */
  async function uploadScreen(data) {
    const { target, id, site } = data;
    const file = target.files[0];
    if (!file) return;

    if (!/image\/(jpe?g|png|webp)$/.test(file.type)) {
      return Toast.show(chrome.i18n.getMessage('alert_file_type_fail'));
    }
    target.value = '';

    const bookmark = document.getElementById(`vb-${id}`);
    bookmark.hasOverlay = true;

    const fileBlob = new Blob([new Uint8Array(await file.arrayBuffer())], {
      type: file.type
    });
    const blob = await $resizeThumbnail(fileBlob);
    const blobUrl = URL.createObjectURL(blob);
    const thumbnail = THUMBNAILS_MAP.get(id);

    ImageDB.update({ id, blob, custom: true });

    if (thumbnail) {
      URL.revokeObjectURL(thumbnail.blobUrl);
    }

    THUMBNAILS_MAP.set(id, {
      id,
      blob,
      blobUrl,
      custom: true,
      ...(thumbnail?.children && { children: thumbnail.children })
    });

    if (!settings.$.folder_preview || site) {
      bookmark.isCustomImage = true;
      bookmark.image = blobUrl;
    }

    bookmark.hasOverlay = false;
    Toast.show(chrome.i18n.getMessage('notice_thumb_image_updated'));
  }

  function captureScreen(captureUrl, id) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        capture: {
          id,
          captureUrl
        }
      }, (response) => {
        if (response.warning) {
          console.warn(response.warning);
        }
        resolve(response);
      });
    });
  }

  async function captureByTurn() {
    const bookmark = THUMBNAILS_CREATION_QUEUE[0];
    const response = await captureScreen(bookmark.url, bookmark.id, bookmark.parentId);

    if (!response.warning) {
      const image = await ImageDB.get(bookmark.id);
      const thumbnail = THUMBNAILS_MAP.get(bookmark.id);

      bookmark.isCustomImage = false;
      bookmark.image = URL.createObjectURL(image.blob);

      if (thumbnail) {
        // если миниатюра объекта существует удалить его из памяти
        URL.revokeObjectURL(thumbnail.blobUrl);
      }
      // write to the thumbnails map on the page a new blobUrl
      THUMBNAILS_MAP.set(bookmark.id, {
        ...image,
        blobUrl: bookmark.image
      });
    }

    bookmark.hasOverlay = false;
    THUMBNAILS_CREATION_QUEUE.shift();

    if (THUMBNAILS_CREATION_QUEUE.length) {
      await captureByTurn();
    }
  }

  function createScreen(bookmark) {
    if (!bookmark) return;

    bookmark.hasOverlay = true;
    THUMBNAILS_CREATION_QUEUE.push(bookmark);

    if (THUMBNAILS_CREATION_QUEUE.length === 1) {
      captureByTurn();
    }
  }

  /**
   * Search bookmarks
   * @param {String} query
   */
  function  search(query) {
    searchBookmarks(query)
      .then(match => {
        if (match.length > 0) {
          if (settings.$.drag_and_drop) {
            // if dnd we turn off sorting and destroy nested instances
            container.sortInstance?.option('disabled', true);
          }
          render(match);
        } else {
          container.innerHTML = `<div class="empty-search">🙁 ${chrome.i18n.getMessage('empty_search')}</div>`;
        }
      });
  }

  async function removeBookmark(bookmark) {
    if (!settings.$.without_confirmation) {
      const confirmAction = await confirmPopup(chrome.i18n.getMessage('confirm_delete_bookmark'));
      if (!confirmAction) return;
    }

    const id = bookmark.getAttribute('data-id');
    remove(id)
      .then(() => {
        bookmark.remove();
        removeThumbnail(id);
        THUMBNAILS_MAP.delete(id);
        Toast.show(chrome.i18n.getMessage('notice_bookmark_removed'));
      });
  }

  async function removeFolder(bookmark) {
    if (!settings.$.without_confirmation) {
      const confirmAction = await confirmPopup(chrome.i18n.getMessage('confirm_delete_folder'));
      if (!confirmAction) return;
    }

    const { id } = bookmark;
    removeTree(id)
      .then(() => {
        bookmark.remove();
        removeThumbnail(id);
        $customTrigger('updateFolderList', document, {
          detail: {
            isFolder: true
          }
        });
        Toast.show(chrome.i18n.getMessage('notice_folder_removed'));
      });
  }

  function removeThumbnail(id) {
    const thumbnail = THUMBNAILS_MAP.get(id);
    thumbnail && URL.revokeObjectURL(thumbnail.blobUrl);
    THUMBNAILS_MAP.delete(id);
    return ImageDB.delete(id);
  }

  function createBookmark(title, url) {
    const parentId = container.getAttribute('data-folder');

    return create({ title, url, parentId })
      .then(result => {
        let bookmark;
        if (result.url) {
          bookmark = genBookmark(result);
        } else {
          bookmark = genFolder(result);
        }
        container.querySelector('.bookmark-btn--create').insertAdjacentElement('beforeBegin', bookmark);

        if (result.url) {
          if (settings.$.auto_generate_thumbnail) {
            createScreen(bookmark, result.id, result.url);
          }
        } else {
          $customTrigger('updateFolderList', document, {
            detail: {
              isFolder: true
            }
          });
        }
        return true;
      });
  }

  function updateBookmark(id, title, url, moveId) {
    const bookmark = document.getElementById(`vb-${id}`);

    return update(id, { title, url })
      .then(result => {
        // if the bookmark is moved to another folder
        if (moveId !== id && moveId !== result.parentId) {
          const destination = {
            parentId: moveId,
            ...(settings.$.move_to_start && { index: 0 })
          };
          move(id, destination)
            .then(() => {
              // if it is a folder update folderList
              if (!result.url) {
                $customTrigger('updateFolderList', document, {
                  detail: {
                    isFolder: true
                  }
                });
              }
              bookmark.remove();
            });
        } else {
          // if it is a folder update folderList
          if (!result.url) {
            $customTrigger('updateFolderList', document, {
              detail: {
                isFolder: true
              }
            });
          }
          // else update bookmark view
          bookmark.title = result.title;
          bookmark.url = result.url ? result.url : `#${result.id}`;
        }
        Toast.show(chrome.i18n.getMessage('notice_bookmark_updated'));
        return true;
      });
  }

  return {
    init,
    createBookmark,
    updateBookmark,
    removeBookmark,
    removeFolder,
    createScreen,
    uploadScreen,
    removeThumbnail,
    autoUpdateThumb
  };
})();

export default Bookmarks;
