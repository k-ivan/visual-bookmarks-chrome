export const storage = {
  local: {
    get(key) {
      return chrome.storage.local.get(key);
    },
    set(payload) {
      return chrome.storage.local.set(payload);
    },
    remove(key) {
      return chrome.storage.local.remove(key);
    }
  },
  sync: {
    get(key) {
      return chrome.storage.sync.get(key);
    },
    set(payload) {
      return chrome.storage.sync.set(payload);
    },
    remove(key) {
      return chrome.storage.sync.remove(key);
    }
  }
};
