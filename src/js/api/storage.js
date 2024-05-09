export const storage = {
  local: {
    get(key) {
      return browser.storage.local.get(key);
    },
    set(payload) {
      return browser.storage.local.set(payload);
    },
    remove(key) {
      return browser.storage.local.remove(key);
    }
  },
  sync: {
    get(key) {
      return browser.storage.sync.get(key);
    },
    set(payload) {
      return browser.storage.sync.set(payload);
    },
    remove(key) {
      return browser.storage.sync.remove(key);
    }
  }
};
