const API = chrome.bookmarks;

/**
 * Get three folders
 * @param {Array} arr
 * @returns {Array} folders[]
 */
const recurseFolders = (arr) => {
  return arr.reduce((accum, current) => {
    if (current.children) {
      accum.push({
        title: current.title,
        id: current.id,
        parentId: current.parentId,
        children: recurseFolders(current.children)
      });
    }
    return accum;
  }, []);
};

/**
 * Get three
 * @returns {Promise<BookmarkTreeNode[]>} BookmarkTreeNode
 */
export function getThree() {
  return API.getTree()
    .then(rootNode => {
      const rootFolders = rootNode[0].children.map(item => item);
      return rootFolders;
    });
}

/**
 * Retrieves folders
 * @returns {Promise<BookmarkTreeNode[]>} BookmarkTreeNode
 */
export function getFolders() {
  try {
    return API.getTree()
      .then(rootNode => {
        const root = rootNode[0].children.map(item => item);
        const folders = recurseFolders(root);
        return folders;
      });
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Retrieves the specified BookmarkTreeNode(s).
 * @param {string} id
 * @returns {Promise<BookmarkTreeNode[]>} BookmarkTreeNode
 */
export function get(id) {
  try {
    return API.get(id);
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Retrieves the children of the specified BookmarkTreeNode id.
 * @param {string} id
 * @returns {Promise<BookmarkTreeNode[]>} BookmarkTreeNode
 */
export function getChildren(id) {
  try {
    return API.getChildren(id);
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Retrieves part of the Bookmarks hierarchy, starting at the specified node.
 * @param {string} id
 * @returns {Promise<BookmarkTreeNode[]>} BookmarkTreeNode
 */
export function getSubTree(id) {
  try {
    return API.getSubTree(id);
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Creates a bookmark or folder under the specified parentId. If url is NULL or missing, it will be a folder.
 * @param {{
 *  index?: number,
 *  parentId?: string,
 *  title?: string,
 *  url?: string
 * }} bookmark
 * @returns {Promise<BookmarkTreeNode>} BookmarkTreeNode
 */
export function create(bookmark) {
  try {
    return API.create(bookmark);
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Updates the properties of a bookmark or folder.
 * Specify only the properties that you want to change; unspecified properties will be left unchanged.
 * Note: Currently, only 'title' and 'url' are supported.
 * @param {string} id
 * @param {{ title: string, url: string }} bookmark
 * @returns {Promise<BookmarkTreeNode>} BookmarkTreeNode
 */
export function update(id, bookmark) {
  try {
    return API.update(id, bookmark);
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Moves the specified BookmarkTreeNode to the provided location.
 * @param {string} id
 * @param {string} destination
 * @returns {Promise<BookmarkTreeNode>} BookmarkTreeNode
 */
export function move(id, destination) {
  try {
    return API.move(id, destination);
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Removes a bookmark
 * @param {string} id
 * @returns {Promise<void>}
 */
export function remove(id) {
  try {
    return API.remove(id);
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Recursively removes a bookmark folder.
 * @param {string} id
 * @returns {Promise<void>}
 */
export function removeTree(id) {
  try {
    return API.removeTree(id);
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Search
 * @param {string} query
 * @returns {Promise<BookmarkTreeNode[]>} BookmarkTreeNode
 */
export function search(query) {
  try {
    return API.search(query);
  } catch (error) {
    return Promise.reject(error);
  }
}
