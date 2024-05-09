import { $uid } from './utils';
/**
 * TODO: temporary promise wrapper for asynchronous work with browser.storage in manifest v2
 * storage[local|sync][set|get]
 * remove after switching to a new manifest (v3)
 */
import { storage } from './api/storage';
import { DEFAULT_FOLDER, FIREFOX_BROWSER } from './constants';

const DEFAULTS = Object.freeze({
  color_theme: 'os',
  background_image: 'background_noimage',
  background_external: '',
  default_folder_id: FIREFOX_BROWSER ? DEFAULT_FOLDER.FIREFOX : DEFAULT_FOLDER.CHROME,
  dial_columns: 7,
  dial_width: 70, // value in percent (50,60,70,80,90)
  vertical_center: false,
  drag_and_drop: true,
  auto_generate_thumbnail: true,
  enable_sync: false,
  show_toolbar: true,
  show_contextmenu_item: true,
  show_settings_icon: true,
  show_back_column: true,
  show_create_column: true,
  show_bookmark_title: true,
  show_favicon: true,
  open_link_newtab: false,
  thumbnails_update_button: true,
  thumbnails_update_recursive: false,
  thumbnails_update_delay: 0.5,
  custom_style: '',
  without_confirmation: false,
  services_enable: false,
  services_list: [
    { id: $uid(), name: 'youtube', link: 'https://www.youtube.com' },
    { id: $uid(), name: 'search', link: 'https://google.com' },
    { id: $uid(), name: 'translate', link: 'https://translate.google.com' },
    { id: $uid(), name: 'gmail', link: 'https://mail.google.com/mail' },
    { id: $uid(), name: 'drive', link: 'https://drive.google.com/' },
    { id: $uid(), name: 'photos', link: 'https://photos.google.com' }
  ],
  folder_preview: false,
  close_tab_after_adding_bookmark: false,
  logo_external: false,
  search_engine: 'bookmarks',
  move_to_start: false,
  sort_by_date: false,
  bookmarks_sorting_type: '',
  search_autofocus: false,
  enable_virtual_pagination: false
});

const SETTINGS_NOT_SYNCED = ['default_folder_id', 'enable_sync'];

const settingsStore = () => {
  let $settings = {};

  return {
    /**
     * settings.$ getter
     * @return {Object} Settings object
     */
    get $() {
      return $settings;
    },

    /**
     * Initializing the settings Store
     */
    async init() {
      // read local settings
      let { settings } = await storage.local.get('settings');

      // if there are no settings, set default
      if (!settings) {
        settings = Object.assign({}, DEFAULTS);
        storage.local.set({ settings });
      } else {
        // if the settings are already there
        // but default settings object is expanded
        // we need to add these properties immediately
        Object.assign($settings, DEFAULTS, settings);
      }

      // if synchronization is enabled, we take data from the cloud
      if (settings.enable_sync) {
        const { settings: syncSettings } = await storage.sync.get('settings');
        Object.assign(settings, syncSettings);
      }

      // write the settings to the settings.$ object
      Object.assign($settings, settings);
    },

    /**
     * update setting value
     * @param {String} key
     * @param {<any>} value
     * @returns
     */
    async updateKey(key, value) {
      if (!$settings) {
        throw Error('Settings store must be initialized with the init method');
      }

      $settings[key] = value;
      // resave settings in local storage
      await storage.local.set({ settings: $settings });

      if ($settings.enable_sync) {
        if (!SETTINGS_NOT_SYNCED.includes(key)) {
          // if we change sync settings
          // start synchronization
          this.syncToStorage();
        }
      }
    },

    async updateAll(settings = {}) {
      Object.assign($settings, settings);
      // await setLocalSettings({ settings: $settings });
      await storage.local.set({ settings: $settings });
    },

    /**
     * syncToStorage - update storage cloud
     * send the current settings to the cloud previously excluding local
     */
    syncToStorage() {
      // TODO: вместо JSON[method] использовать structuredClone
      const settings = JSON.parse(JSON.stringify($settings));
      SETTINGS_NOT_SYNCED.forEach(key => delete settings[key]);
      storage.sync.set({ settings });
    },

    /**
     * restoreFromSync - restore settings from cloud storage
     * @returns Promise
     */
    async restoreFromSync() {
      let { settings } = await storage.sync.get('settings');
      Object.assign($settings, settings);
      storage.local.set({ settings: $settings });
    },

    /**
     * Reset local settings
     * @returns Promise
     */
    async resetLocal() {
      $settings = Object.assign({}, DEFAULTS);
      await storage.local.set({ settings: $settings });
    },

    /**
     * Reset sync settings
     * @returns Promise
     */
    resetSync() {
      return new Promise(resolve => {
        browser.storage.sync.clear(resolve);
      });
    }
  };
};

export const settings = settingsStore();
