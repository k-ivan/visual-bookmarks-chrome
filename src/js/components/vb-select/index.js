import { $createElement } from '../../utils';

class VbSelectFolders extends HTMLElement {
  connectedCallback() {
    this.selectNode = $createElement('select', {
      id: this.selectId,
      name: 'folder',
      class: 'form-control',
      'aria-label': chrome.i18n.getMessage('select_folder')
    });

    this.insertAdjacentElement('afterbegin', this.selectNode);
    this.#attachEvents();
  }

  disconnectedCallback() {
    this.#dettachEvents();
  }

  static get observedAttributes() {
    return [
      'folder-id',
      'parent-folder-id',
      'bookmark-id'
    ];
  }

  attributeChangedCallback() {
    this.#getAttributes();
  }

  #getAttributes() {
    this.folderId = this.getAttribute('folder-id');
    this.parentFolderId = this.getAttribute('parent-folder-id') ?? null;
    this.bookmarkId = this.getAttribute('bookmark-id') ?? null;
  }

  get selectId() {
    return this.getAttribute('select-id');
  }

  set folders(arr) {
    if (!this.selectNode) {
      throw new Error('custom item must be in the DOM');
    }

    const html = this.#renderOptions(arr);
    this.selectNode.innerHTML = html.join('');
  }

  set value(value) {
    setTimeout(() => {
      this.selectNode.value = value;
    }, 0);
  }

  get value() {
    return this.selectNode.value;
  }

  #renderOptions(folders) {
    const folderId = this.parentFolderId ? this.parentFolderId : this.folderId;
    const options = [];
    const processTree = (three, pass = 0) => {
      for (let folder of three) {
        if (
          this.bookmarkId !== folder.id &&
          folder.parentId !== this.bookmarkId
        ) {
          let prefix = '-'.repeat(pass);
          if (pass > 0) {
            prefix = `&nbsp;&nbsp;${prefix}` + '&nbsp;';
          }

          const name = `${prefix} ${folder.title}`;
          options.push(`<option${folder.id === folderId ? ' selected' : ''} value="${folder.id}">${name}</option>`);
          if (folder.children.length) {
            processTree(folder.children, pass + 1);
          }
        }
      }
    };
    processTree(folders);
    return options;
  }

  #attachEvents() {
    this.handleSelect = this.#onSelect.bind(this);
    this.handleHashChange = this.#hashchange.bind(this);

    this.selectNode.addEventListener('change', this.handleSelect);
    document.addEventListener('changeFolder', this.handleHashChange);
  }

  #dettachEvents() {
    this.selectNode.removeEventListener('change', this.handleSelect);
    document.removeEventListener('changeFolder', this.handleHashChange);
  }

  #hashchange(e) {
    this.value = e?.detail?.folderId;
  }

  #onSelect(e) {
    this.dispatchEvent(
      new CustomEvent('vb:select:change', {
        detail: e.target.value,
        bubbles: true,
        cancelable: true
      })
    );
  }
}

window.customElements.define('vb-select-folders', VbSelectFolders);
