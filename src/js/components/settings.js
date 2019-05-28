const DEFAULTS = {
  dark_theme: 'false',
  background_image: 'background_noimage',
  background_external: '',
  default_folder_id: 1,
  dial_columns: 5,
  dial_width: 70, // value in percent (60,70,80,90)
  thumbnail_width: 100, // value in percent (60,70,80,90)
  vertical_center: 'false',
  drag_and_drop: 'true',
  auto_generate_thumbnail: 'true',
  enable_sync: 'false',
  show_toolbar: 'true',
  low_transparency: 'false',
  show_contextmenu_item: 'true',
  show_settings_icon: 'true',
  show_create_column: 'true',
  show_favicon: 'true',
  thumbnailing_service: 'https://logo.clearbit.com/[URL]',
  thumbnails_update_button: 'true',
  // TODO: experiment
  google_services: false
};

// TODO: experiment service object (without sync)
const GOOGLE_SERVICES = [
  { name: 'youtube', link: 'https://www.youtube.com' },
  { name: 'search', link: 'https://google.com' },
  { name: 'translate', link: 'https://translate.google.com' },
  { name: 'gmail', link: 'https://mail.google.com/mail' },
  { name: 'drive', link: 'https://drive.google.com/' },
  { name: 'photos', link: 'https://photos.google.com' }
];

export default {
  init() {
    // Creates default localStorage values if they don't already exist
    Object.keys(DEFAULTS).forEach(function(name) {
      if (localStorage.getItem(name) === null) {
        localStorage.setItem(name, DEFAULTS[name]);
      }
    });

    // Replace option thumbnailing_service
    const arr = [
      'http://free.pagepeeker.com/v2/thumbs.php?size=x&url=[URL]',
      'http://api.webthumbnail.org/?width=500&height=400&screen=1280&url=[URL]'
    ];
    if (arr.indexOf(localStorage.getItem('thumbnailing_service')) > -1) {
      localStorage.setItem('thumbnailing_service', DEFAULTS['thumbnailing_service']);
    }

    // TODO: experiment service object
    if (localStorage.getItem('google_services_list') === null) {
      localStorage.setItem('google_services_list', JSON.stringify(GOOGLE_SERVICES));
    }
  },
  restoreFromSync(cb) {
    chrome.storage.sync.get(function(sync_object) {
      Object.keys(sync_object).forEach(function(key) {
        // because of different id`s on different computers, we will exclude the default folder from synchronization
        if (key !== 'default_folder_id') {
          localStorage.setItem(key, sync_object[key]);
        }
      });
      cb && cb();
    });
  },
  syncToStorage() {
    let settings_object = {};
    Object.keys(DEFAULTS).forEach(function(key) {
      // because of different id`s on different computers, we will exclude the default folder from synchronization
      if (localStorage[key] && key !== 'default_folder_id') {
        settings_object[key] = localStorage[key];
      }
    });
    chrome.storage.sync.set(settings_object);
  },
  syncSingleToStorage(key) {
    let settings_object = {};
    if (localStorage[key] && key !== 'default_folder_id') {
      settings_object[key] = localStorage[key];
    }
    chrome.storage.sync.set(settings_object);
  }
};
