export const storage = {
  local: {
    get(key) {
      return chrome.storage.local.get(key);
    },
    set(payload) {
      return chrome.storage.local.set(payload);
    }
  },
  sync: {
    get(key) {
      return chrome.storage.sync.get(key);
    },
    set(payload) {
      return chrome.storage.sync.set(payload);
    }
  }
};
