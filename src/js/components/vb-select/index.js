import { $createElement } from '../../utils';

class VbSelectFolders extends HTMLElement {
  connectedCallback() {
    this.selectNode = $createElement('select', {
      id: this.selectId,
      name: 'folder',
      class: 'vb-select-folders form-control',
      'aria-label': browser.i18n.getMessage('select_folder')
    }, $createElement('button',
      {},
      $createElement('selectedcontent')
    ));

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
    this.selectNode.options.length  = 0;
    this.selectNode.innerHTML += html.join('');
  }

  set value(value) {
    setTimeout(() => {
      this.selectNode.value = value;
    }, 0);
  }

  get value() {
    return this.selectNode.value;
  }

  set disabled(value) {
    this.selectNode.disabled = value;
  }

  get disabled() {
    return this.selectNode.disabled;
  }

  get #optionTemplate() {
    return /* html */`
      <option{selected} value="{value}">
        {name}
        <span class="vb-select-badge">
          <span>(</span>{childrenLength}<span>)</span>
        </span>
      </option>
    `;
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
            prefix = `&nbsp;${prefix}` + '&nbsp;';
          }

          const name = `${prefix} ${folder.title}`;
          options.push(
            this.#optionTemplate
              .replace('{selected}', folder.id === folderId ? ' selected' : '')
              .replace('{value}', folder.id)
              .replace('{name}', name)
              .replace('{childrenLength}', folder.childrenLength)
          );

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
