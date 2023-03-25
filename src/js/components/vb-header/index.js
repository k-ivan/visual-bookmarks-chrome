import '../vb-select';
import '../vb-popup';
import html from './template.html';
import { $createElement } from '../../utils';
import { getFolders } from '../../api/bookmark';
import { SEARCH_ENGINES } from '../../constants';
import { settings } from '../../settings';

class VbHeader extends HTMLElement {
  initialFolderId = null;
  folderId = null;
  initialHash = window.location.hash;

  backNode = null;
  headerNode = null;
  formNode = null;
  inputNode = null;
  resetNode = null;
  selectNode = null;
  vbPopup = null;
  vbPopupBtn = null;
  vbPopupContent = null;
  vbPopupActive = false;
  engineNodes = [];
  engineIndex = 0;
  prevEngineIndex = 0;

  connectedCallback() {
    this.#render();
  }

  disconnectedCallback() {
    this.#dettachEvents();
  }

  async #render() {
    this.insertAdjacentHTML('afterbegin', html);
    // initial folder id
    this.initialFolderId = this.getAttribute('initial-folder-id');
    // current folder id
    this.folderId = this.getAttribute('folder-id');

    this.headerNode = this.querySelector('.header');
    // form nodes
    this.formNode = this.querySelector('form');
    this.inputNode = this.querySelector('input');
    this.resetNode = this.querySelector('#searchReset');
    this.buttonSubmitNode = this.querySelector('#searchSubmit');
    // get vb-select-folders component
    this.selectNode = this.querySelector('vb-select-folders');
    this.selectNode.setAttribute('folder-id', this.folderId);
    // get folders list for select component
    this.selectNode.folders = await getFolders();

    // get vb-popup
    this.vbPopup = this.querySelector('vb-popup');
    this.vbPopupBtn = this.vbPopup.popupTriger;
    this.vbPopupSlotBtn = this.vbPopup.querySelector('[slot="button"]');
    this.vbPopupContent = this.vbPopup.querySelector('[slot="content"]');

    this.#setSearchEngines();
    this.#attachEvents();
    this.hashchange();
  }

  get isBookmarksEngine() {
    return settings.$.search_engine === 'bookmarks';
  }

  set engine(engine) {
    this.engineNodes[this.prevEngineIndex].classList.remove('is-active');
    const engineObject = SEARCH_ENGINES.find((searchEngine, index) => {
      if (searchEngine.value === engine) {
        this.engineIndex = index;
        return true;
      }
      return false;
    });
    this.engineNodes[this.engineIndex].classList.add('is-active');

    this.vbPopupSlotBtn.innerHTML = /* html */
      `<svg width="16" height="16"><use xlink:href="/img/symbol.svg#${engineObject.value}"/></svg>`;

    const placeholderEngine = engineObject.value === 'bookmarks'
      ? chrome.i18n.getMessage('placeholder_input_search_bookmarks')
      : engineObject.title;

    settings
      .updateKey('search_engine', engine)
      .then(() => {
        this.inputNode.placeholder = chrome.i18n.getMessage('placeholder_input_search', [placeholderEngine]);
        this.inputNode.name = engineObject.name ?? 'bookmarks';
        this.formNode.action = engineObject.url ?? '';

        this.buttonSubmitNode.hidden = this.isBookmarksEngine;

        if (settings.$.open_link_newtab) {
          !this.isBookmarksEngine
            ? this.formNode.setAttribute('target', '_blank')
            : this.formNode.removeAttribute('target');
        }
      });
  }

  #setSearchEngines() {
    this.vbPopupContent.innerHTML = SEARCH_ENGINES.map(engine => {
      const isActive = engine.value === settings.$.search_engine ? ' is-active' : '';
      return (/* html */
        `<div class="header__engine-item${isActive}" data-engine="${engine.value}">
          ${engine.title}
        </div>`
      );
    }).join('');
    this.engineNodes = Array.from(this.vbPopupContent.children);
    this.engine = settings.$.search_engine;
  }

  #attachEvents() {
    this.handleInput = this.handleInput.bind(this);
    this.inputNode.addEventListener('input', this.handleInput);

    this.handleReset = this.handleReset.bind(this);
    this.resetNode.addEventListener('click', this.handleReset);

    this.handleSelectHash = this.handleSelectHash.bind(this);
    this.selectNode.addEventListener('vb:select:change', this.handleSelectHash);

    this.handleSubmit = this.handleSubmit.bind(this);
    this.formNode.addEventListener('submit', this.handleSubmit);

    this.handleClickEngine = this.handleClickEngine.bind(this);
    this.vbPopupContent.addEventListener('click', this.handleClickEngine);

    this.handleKeydownEngine = this.handleKeydownEngine.bind(this);
    this.vbPopup.addEventListener('keydown', this.handleKeydownEngine);

    this.handlePopupState = this.handlePopupState.bind(this);
    this.vbPopup.addEventListener('vb:popup:open', this.handlePopupState);
    this.vbPopup.addEventListener('vb:popup:close', this.handlePopupState);

    // listen for folder change event
    this.handleHash = this.hashchange.bind(this);
    document.addEventListener('changeFolder', this.handleHash);

    // listen for folders update event
    this.handleUpdateFolders = this.handleUpdateFolders.bind(this);
    document.addEventListener('updateFolderList', this.handleUpdateFolders);
  }

  #dettachEvents() {
    this.inputNode.removeEventListener('input', this.handleInput);
    this.resetNode.removeEventListener('click', this.handleReset);
    this.selectNode.removeEventListener('vb:select:change', this.handleSelectHash);
    this.formNode.removeEventListener('submit', this.handleSubmit);
    this.vbPopupContent.removeEventListener('click', this.handleClickEngine);
    this.vbPopup.removeEventListener('keydown', this.handleKeydownEngine);
    this.vbPopup.removeEventListener('vb:popup:open', this.handlePopupState);
    this.vbPopup.removeEventListener('vb:popup:close', this.handlePopupState);
    document.removeEventListener('changeFolder', this.handleHash);
    document.removeEventListener('updateFolderList', this.handleUpdateFolders);
  }

  async handleUpdateFolders(e) {
    if (e.detail?.isFolder && this.selectNode) {
      this.selectNode.folders = await getFolders();
    }
  }

  handlePopupState({ type }) {
    this.vbPopupActive = type === 'vb:popup:open';
  }

  hashchange() {
    const hash = window.location.hash.slice(1);

    if (hash && hash !== this.initialFolderId) {
      if (!this.backNode) {
        this.backNode = $createElement(
          'button',
          {
            class: 'back'
          },
          {
            html: `<svg width="20" height="20"><use xlink:href="/img/symbol.svg#arrow_back"/></svg>`
          }
        );
        this.handleBack = this.handleBack.bind(this);
        this.headerNode.insertAdjacentElement('afterbegin', this.backNode);
        this.backNode.addEventListener('click', this.handleBack);
      }
    } else {
      if (this.backNode) {
        this.backNode.removeEventListener('click', this.handleBack);
        this.backNode.remove();
        this.backNode = null;
      }
    }
    this.selectNode.setAttribute('folder-id', hash || this.initialFolderId);
  }

  handleKeydownEngine(e) {
    switch (e.code) {
      case 'ArrowUp':
        e.preventDefault();
        this.prevEngineIndex = this.engineIndex;
        this.engineIndex = this.engineIndex - 1;
        if (this.engineIndex < 0) {
          this.engineIndex = this.engineNodes.length - 1;
        }
        this.engine = SEARCH_ENGINES[this.engineIndex].value;
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.prevEngineIndex = this.engineIndex;
        this.engineIndex = (this.engineIndex + 1) % this.engineNodes.length;
        this.engine = SEARCH_ENGINES[this.engineIndex].value;
        break;
      case 'Enter':
      case 'Space':
        if (this.vbPopupActive) {
          this.inputNode.focus();
        }
        break;
    }
  }

  handleSubmit(e) {
    if (this.isBookmarksEngine || !this.inputNode.value.trim()) {
      e.preventDefault();
      return;
    }
    return true;
  }

  handleClickEngine(e) {
    const target = e.target.closest('.header__engine-item');
    if (!target) return;

    this.prevEngineIndex = this.engineNodes.findIndex(engineNode => {
      return engineNode.classList.contains('is-active');
    });
    this.engine = target.dataset.engine;
    this.vbPopup.hide();
    this.inputNode.focus();
  }

  handleSelectHash(e) {
    window.location.hash = e.detail;
  }

  handleBack() {
    // if initialHash does not match location hash
    // can go back in history
    // until the hashes are equal
    if (this.initialHash === window.location.hash) {
      window.location.hash = this.initialFolderId;
    } else {
      window.history.back();
    }
  }

  handleReset() {
    this.inputNode.value = '';
    this.isBookmarksEngine && this.inputNode.dispatchEvent(
      new CustomEvent('vb:searchreset', {
        bubbles: true,
        cancelable: true
      })
    );
    this.resetNode.classList.remove('is-show');
    this.inputNode.focus();
  }

  handleInput(e) {
    const search = e.target.value;
    this.isBookmarksEngine && this.dispatchEvent(
      new CustomEvent('vb:search', {
        detail: {
          search
        },
        bubbles: true,
        cancelable: true
      })
    );

    this.resetNode.classList.toggle('is-show', search.trim().length);
  }
}

window.customElements.define('vb-header', VbHeader);
