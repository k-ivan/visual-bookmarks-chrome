import '../css/options.css';
import './components/vb-select';
import Gmodal from 'glory-modal';
import TabsSlider from 'tabs-slider';
import { settings } from './settings';
import Localization from './plugins/localization';
import Ripple from './components/ripple';
import AutosizeTextarea from './components/autosizeTextarea';
import Toast from './components/toast';
import confirmPopup from './plugins/confirmPopup.js';
import { getFolders } from './api/bookmark';
import {
  $notifications,
  $resizeThumbnail,
  $trigger,
  getVideoPoster
} from './utils';
import Range from './components/range';
import ImageDB from './api/imageDB';
import {
  FILES_ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  SEARCH_ENGINES
} from './constants';
import { storage } from './api/storage';
import settingsList from './constants/settingsList';
import { displaySettings } from './components/displaySettings';
import { containsPermissions, removePermissions, requestPermissions } from './api/permissions';

let modalInstance = null;
let tabsSliderInstance = null;
let textareaInstance = null;
let backgroundImage = null;

async function init() {
  // Set lang attr
  // Replacement underscore on the dash because underscore is not a valid language subtag
  document.documentElement.setAttribute(
    'lang',
    browser.i18n.getMessage('@@ui_locale').replace('_', '-')
  );

  window.settings.innerHTML = displaySettings(settingsList);

  await settings.init();

  window.vbToggleTheme();

  Localization();

  Ripple.init('.md-ripple');

  const background = await ImageDB.get('background');
  if (background) {
    backgroundImage = URL.createObjectURL(background.blobThumbnail);
  }

  // range settings
  Array.from(document.querySelectorAll('.js-range')).forEach(el => {
    const id = el.id;
    new Range(el, {
      value: settings.$[id],
      postfix: el.dataset.outputPostfix,
      onBlur(e) {
        const { value } = e.target;
        settings.updateKey(id, value);
      },
      ...('thumbnails_update_delay' === id) && {
        format(value) {
          return parseFloat(value).toFixed(1);
        }
      }
    });
  });

  // Tabs
  const tabs = document.querySelector('.tabs');
  tabsSliderInstance = new TabsSlider(tabs, {
    draggable: false,
    slide: parseInt(localStorage['option_tab_slide']) || 0
  });

  // textarea autosize
  textareaInstance = new AutosizeTextarea('#custom_style');

  // Modal
  modalInstance = new Gmodal(document.getElementById('modal'), {
    closeBackdrop: false
  });
  modalInstance.element.addEventListener('gmodal:open', function() {
    storage.local.remove('extension_updated');
  });
  modalInstance.element.addEventListener('gmodal:close', function() {
    const video = modalInstance.element.querySelector('video');
    if (video) {
      video.pause();
      video.currentTime = 1;
    }
  });

  const manifest = browser.runtime.getManifest();
  document.getElementById('ext_name').textContent = manifest.name;
  document.getElementById('ext_version').textContent = `${browser.i18n.getMessage('version')} ${manifest.version}`;
  document.getElementById('modal_changelog_version').textContent = manifest.version;

  tabs.addEventListener('tabChange', function(evt) {
    localStorage['option_tab_slide'] = evt.detail.currentIndex;
  });
  textareaInstance.el.addEventListener('textarea-autosize', function() {
    tabsSliderInstance.recalcStyles();
  });

  getOptions();

  // Delegate change settings
  document.querySelector('.tabs').addEventListener('change', handleSetOptions);
  document.getElementById('background_image').addEventListener('change', handleSelectBackground);
  document.getElementById('background_local').addEventListener('click', handleRemoveFile);
  document.getElementById('restore_local').addEventListener('click', handleResetLocalSettings);
  document.getElementById('restore_sync').addEventListener('click', handleResetSyncSettings);
  document.getElementById('enable_sync').addEventListener('change', handleChangeSync);
  document.getElementById('clear_images').addEventListener('click', handleDeleteImages);
  document.getElementById('toggle_clipboard_access').addEventListener('change', handleToggleClipboardAccess);

  document.getElementById('export').addEventListener('click', handleExportSettings);
  document.getElementById('import').addEventListener('change', handleImportSettings);
  document.getElementById('bgFile').addEventListener('change', handleUploadFile);

  // TODO until full support is available https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker
  document.getElementById('bgFile').setAttribute(
    'accept',
    FILES_ALLOWED_EXTENSIONS.map(ext => `.${ext}`).join(', ')
  );

  document.querySelector('.info-btn').addEventListener('click', () => {
    modalInstance.open();
  });
  if (window.location.hash === '#changelog') {
    modalInstance.open();
  }
}

function handleImportSettings(e) {
  const input = e.target;
  if (input.files && input.files[0]) {
    const reader = new FileReader();

    reader.addEventListener('load', async(e) => {
      try {
        const importSettings = JSON.parse(e.target.result);
        await settings.updateAll(importSettings);
        $notifications(
          browser.i18n.getMessage('import_settings_success')
        );
        setTimeout(() => {
          location.reload();
        }, 0);
      } catch (error) {
        input.value = '';
        Toast.show(browser.i18n.getMessage('import_settings_failed'));
        console.warn(error);
      }
    });
    reader.readAsBinaryString(input.files[0]);
  }
}

function handleExportSettings() {
  const data = Object.keys(settings.$).reduce((acc, cur) => {
    if (
      ![
        'default_folder_id',
        'custom_dials',
        'background_local'
      ].includes(cur)
    ) {
      acc[cur] = settings.$[cur];
    }
    return acc;
  }, {});

  const file = new Blob([JSON.stringify(data)], { type: 'text/plain' });
  // TODO: permission is required to download
  // browser.downloads.download({
  //   url: URL.createObjectURL(file),
  //   filename: 'visual-bookmarks-settings.backup'
  // });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = 'visual-bookmarks-settings.backup';
  a.click();
  a.remove();
}

function getOptions() {
  generateFolderList();
  generateSearchEngineList();
  getPermissions();

  const optionBackgroundSelect = document.getElementById('background_image');
  optionBackgroundSelect.value = settings.$.background_image;
  toggleBackgroundControls(settings.$.background_image);

  const logoExternalInput = document.getElementById('logo_external_url');
  logoExternalInput.value = settings.$.logo_external_url;

  for (let id of Object.keys(settings.$)) {
    const elOption = document.getElementById(id);

    // goto next if element not type
    if (!elOption || !elOption.type) continue;

    if (/checkbox|radio/.test(elOption.type)) {
      elOption.checked = settings.$[id];
    } else {
      elOption.value = settings.$[id];

      // update range slider
      if (elOption.type === 'range') {
        $trigger('change', elOption);
      }


      // Triggering event at program input to the textarea(for autosize textarea)
      if (elOption === textareaInstance.el) {
        $trigger('input', textareaInstance.el);
      }
    }
  }
}

/**
 * Toggle background settings
 * @param {string} value - localStorage background_image value
 */
function toggleBackgroundControls(value) {
  Array.from(document.querySelectorAll('.js-background-settings')).forEach((item) => {
    item.hidden = true;
  });
  if (value === 'background_local') {
    if (backgroundImage) {
      document.getElementById('preview_upload').innerHTML = /* html */
        `<div class="c-upload__preview-image" style="background-image: url(${backgroundImage});"><div>`;
    } else {
      document.getElementById('preview_upload').innerHTML = '';
    }
    document.querySelector('.c-upload__preview').hidden = !backgroundImage;
  }
  document.getElementById(value).hidden = false;
  tabsSliderInstance.recalcStyles();
}

function relationToggleOption(target) {
  // Settings that depend on each other.
  // When enabling one setting, the related setting must be disabled
  if (target.dataset.relationToggleId) {
    const checkedRegexp = /checkbox|radio/;
    // association can be with multiple selectors
    // create an array of settings IDs from the string
    const ids = target.dataset.relationToggleId.split(',');
    // get value regardless of element type
    const value = checkedRegexp.test(target.type) ? target.checked : target.value;
    ids.forEach(id => {
      const relationEl = document.getElementById(id);
      // disable the related option only if it was initially enabled
      // if relation element => checkbox|radio
      if (checkedRegexp.test(relationEl.type) && relationEl.checked) {
        // if relation with boolean type
        if (typeof value === 'boolean') {
          relationEl.checked = !target.checked;
        } else {
        // otherwise we try to get the string value of the data attribute
        // convert string to array
        // and search by keyword
        // if array includes keyword, we need to turn off the setting
          const values = target.dataset.relationToggleValues.split(',');
          relationEl.checked = !values.includes(value);
        }
        // update extension setting
        settings.updateKey(id, relationEl.checked);
      } else {
        // if relation element => select
        if (relationEl.tagName === 'SELECT') {
          relationEl.selectedIndex = 0;
        } else {
        // if relation element => input
          relationEl.value = '';
        }
        // update extension setting
        settings.updateKey(id, relationEl.value);
      }
    });
  }
}

function handleSetOptions(e) {
  const target = e.target.closest('.js-change');
  if (!target) return;

  const id = target.id;

  if (/checkbox|radio/.test(target.type)) {
    settings.updateKey(id, target.checked);
  } else {
    settings.updateKey(id, target.value);
  }

  relationToggleOption(target);

  // dark theme
  if (target.id === 'color_theme') {
    window.vbToggleTheme();
  }
}

async function handleUploadFile() {
  const form = this.closest('form');
  const file = this.files[0];
  if (!file) return;

  form.reset();

  const isSizeExceeded = MAX_FILE_SIZE_BYTES < file.size;
  const isAllowedType = FILES_ALLOWED_EXTENSIONS.some(type => file.type.endsWith(type));
  if (!isAllowedType) {
    return Toast.show(browser.i18n.getMessage(
      'alert_file_type_fail_type',
      [FILES_ALLOWED_EXTENSIONS.join(' | ')]
    ));
  }
  if (isSizeExceeded) {
    return Toast.show(browser.i18n.getMessage(
      'alert_file_type_fail_size',
      [MAX_FILE_SIZE_BYTES / 10 ** 6]
    ));
  }

  form.classList.add('is-upload');

  const blob = new Blob([new Uint8Array(await file.arrayBuffer())], {
    type: file.type
  });
  const blobThumbnail = file.type.startsWith('video')
    ? await getVideoPoster(file)
    : await $resizeThumbnail(blob);

  if (backgroundImage) {
    URL.revokeObjectURL(backgroundImage);
  }
  backgroundImage = URL.createObjectURL(blobThumbnail);
  ImageDB.update({
    id: 'background',
    blob,
    blobThumbnail
  });

  form.classList.remove('is-upload');

  document.querySelector('.c-upload__preview').hidden = false;
  document.getElementById('preview_upload').innerHTML = /* html */
          `<div class="c-upload__preview-image"
            style="background-image: url(${backgroundImage});">
          <div>`;

  Toast.show(browser.i18n.getMessage('notice_bg_image_updated'));
  tabsSliderInstance.recalcStyles();
}

async function handleRemoveFile(evt) {
  const target = evt.target.closest('#delete_upload');
  if (!target) return;

  const confirmAction = await confirmPopup(browser.i18n.getMessage('confirm_delete_image'));
  if (!confirmAction) return;

  evt.preventDefault();
  const preview = document.getElementById('preview_upload');
  const previewParent = preview.closest('.c-upload__preview');

  await ImageDB.delete('background');
  if (backgroundImage) {
    URL.revokeObjectURL(backgroundImage);
    backgroundImage = null;
  }

  preview.innerHTML = '';
  previewParent.hidden = true;
  tabsSliderInstance.recalcStyles();
  Toast.show(browser.i18n.getMessage('notice_image_removed'));
}

function handleSelectBackground() {
  toggleBackgroundControls(this.value);
}

async function handleDeleteImages(evt) {
  evt.preventDefault();

  const confirmAction = await confirmPopup(browser.i18n.getMessage('confirm_delete_images'));
  if (!confirmAction) return;

  await ImageDB.clear();
  Toast.show(browser.i18n.getMessage('notice_images_removed'));
}

async function handleResetLocalSettings() {
  const confirmAction = await confirmPopup(browser.i18n.getMessage('confirm_restore_default_settings'));
  if (!confirmAction) return;

  await settings.resetLocal();

  window.vbToggleTheme();
  getOptions();
  Toast.show(browser.i18n.getMessage('notice_reset_default_settings'));
}
async function handleResetSyncSettings() {
  const confirmAction = await confirmPopup(browser.i18n.getMessage('confirm_clear_sync_settings'));
  if (!confirmAction) return;

  await settings.resetSync();
  Toast.show(browser.i18n.getMessage('notice_sync_settings_cleared'));
}
function handleChangeSync() {
  if (this.checked) {
    browser.storage.sync.getBytesInUse(null, async(bytes) => {
      if (bytes > 0) {
        const confirmAction = await confirmPopup(browser.i18n.getMessage('confirm_sync_remote_settings'));

        if (confirmAction) {
          await settings.restoreFromSync();
          getOptions();
          window.vbToggleTheme();
        } else {
          this.checked = false;
          settings.updateKey('enable_sync', false);
        }
      } else {
        settings.syncToStorage();
      }
    });
  }
}
async function handleToggleClipboardAccess(e) {
  e.preventDefault();
  const clipboardInput = document.getElementById('toggle_clipboard_access');

  if (clipboardInput.dataset.active !== 'true') {
    const requestPermission = await requestPermissions({ permissions: ['clipboardRead'] });
    clipboardInput.dataset.active = requestPermission;
  } else {
    const removePermission = await removePermissions({ permissions: ['clipboardRead'] });
    clipboardInput.dataset.active = !removePermission;
  }
  clipboardInput.checked = clipboardInput.dataset.active === 'true';
}

async function getPermissions() {
  const clipboardInput = document.getElementById('toggle_clipboard_access');
  const clipboardReadPermission = await containsPermissions({ permissions: ['clipboardRead'] });
  clipboardInput.checked = clipboardReadPermission;
  clipboardInput.dataset.active = clipboardReadPermission;
}

async function generateFolderList() {
  const folders = await getFolders().catch(err => console.warn(err));
  if (folders) {
    const vbSelect = document.getElementById('default_folder_id');
    vbSelect.value = settings.$.default_folder_id;
    vbSelect.folders = folders;
  }
}

function generateSearchEngineList() {
  const select = document.getElementById('search_engine');
  select.innerHTML = SEARCH_ENGINES.map(engine => {
    return `<option value="${engine.value}">${engine.title}</option>`;
  }).join('');
}

init();
