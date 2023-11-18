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
  suggestNode = null;
  resetNode = null;
  selectNode = null;
  vbPopup = null;
  vbPopupBtn = null;
  vbPopupContent = null;
  vbPopupActive = false;
  engineNodes = [];
  engineIndex = 0;
  prevEngineIndex = 0;
  inputValue = '';

  suggestIndex = -1;
  suggestList = [];
  abortController = null;

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
    this.vbPopup.setAttribute('label', chrome.i18n.getMessage('toggle_search_popup'));
    this.vbPopupBtn = this.vbPopup.popupTriger;
    this.vbPopupSlotBtn = this.vbPopup.querySelector('[slot="button"]');
    this.vbPopupContent = this.vbPopup.querySelector('[slot="content"]');

    this.#setSearchEngines();
    this.#attachEvents();
    this.hashchange();

    if (settings.$.search_autofocus) {
      this.inputNode.focus();
    }
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

        if (!this.isBookmarksEngine) {
          this.suggestNode = $createElement('div', {
            id: 'suggest',
            class: 'suggest',
            hidden: 'hidden'
          });
          this.formNode.append(this.suggestNode);
        } else {
          this.suggestNode?.remove();
          this.suggestNode = null;
        }

        if (settings.$.open_link_newtab) {
          !this.isBookmarksEngine
            ? this.formNode.setAttribute('target', '_blank')
            : this.formNode.removeAttribute('target');
        }

        // when switching engines
        // if search is active, we will display the actual results when the bookmark search returns
        // if we leave the search for bookmarks on the engine, then we need to reset the search results by bookmarks
        if (this.inputNode.value.trim()) {
          this.dispatchEvent(
            new CustomEvent('vb:search', {
              detail: {
                search: this.isBookmarksEngine ? this.inputNode.value : ''
              },
              bubbles: true,
              cancelable: true
            })
          );
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

    this.handleKeydown = this.handleKeydown.bind(this);
    this.inputNode.addEventListener('keydown', this.handleKeydown);

    this.handleClickSuggest = this.handleClickSuggest.bind(this);
    this.formNode.addEventListener('click', this.handleClickSuggest);

    this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
    document.addEventListener('keydown', this.handleDocumentKeydown);

    this.handleDocClick = this.handleDocClick.bind(this);
    document.addEventListener('click', this.handleDocClick);
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
    this.inputNode.removeEventListener('keydown', this.handleKeydown);
    this.formNode.removeEventListener('click', this.handleClickSuggest);
    document.removeEventListener('changeFolder', this.handleHash);
    document.removeEventListener('updateFolderList', this.handleUpdateFolders);
    document.removeEventListener('keydown', this.handleEscape);
    document.removeEventListener('click', this.handleDocClick);
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
            class: 'back',
            'aria-label': chrome.i18n.getMessage('history_back')
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
      this.inputNode.focus();
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
    if (this.isBookmarksEngine) {
      this.inputNode.dispatchEvent(
        new CustomEvent('vb:searchreset', {
          bubbles: true,
          cancelable: true
        })
      );
    } else {
      this.closeSuggest();
    }

    this.resetNode.classList.remove('is-show');
    this.inputNode.focus();
  }

  handleInput(e) {
    const search = e.target.value;
    if (this.isBookmarksEngine) {
      this.dispatchEvent(
        new CustomEvent('vb:search', {
          detail: {
            search
          },
          bubbles: true,
          cancelable: true
        })
      );
    } else {
      this.inputValue = e.target.value;
      this.suggestSearch(e.target.value.trim());
    }

    this.resetNode.classList.toggle('is-show', search.trim().length);
  }

  handleDocumentKeydown(e) {
    if (e.code === 'Escape' && this.suggestList.length) {
      this.closeSuggest();
    } else if (e.code === 'Slash' && document.activeElement !== this.inputNode) {
      e.preventDefault();
      this.inputNode.focus();
    }
  }

  handleDocClick(e) {
    if (!e.target.closest('#searchForm')) {
      this.closeSuggest();
    }
  }

  handleKeydown(e) {
    if (!this.suggestList.length) return true;

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        this.gotoSuggest(e);
        break;
      case 'Enter': this.handleEnterSuggest(e); break;
    }
  }

  async suggestSearch(query) {
    this.suggestIndex = -1;
    if (this.abortController) {
      this.abortController.abort();
    }
    if (query.length > 0) {
      try {
        this.suggestList = await this.suggestRequest(query);
      } catch (error) {}
    } else {
      this.suggestList = [];
      this.suggestIndex = -1;
    }

    this.suggestNode.innerHTML = this.suggestList.map((suggest, index) => {
      return `<div data-suggest="${index}">${suggest}</div>`;
    }).join('');
    this.suggestNode.hidden = !this.suggestList.length;
  }

  suggestRequest(query) {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    return fetch(`https://google.com/complete/search?output=toolbar&q=${query}`, { signal })
      .then(response => {
        if (response.ok) {
          return response.text();
        }
        throw new Error(response.statusText);
      })
      .then(str => {
        const xmlDOM = new DOMParser().parseFromString(str, 'text/xml');
        const suggestions = Array
          .from(xmlDOM.querySelectorAll('[data]'))
          .map(suggestion => suggestion.getAttribute('data'));

        return suggestions;
      });
  }

  gotoSuggest(e) {
    e.preventDefault();
    const suggestedList = Array.from(this.suggestNode.querySelectorAll('[data-suggest]'));
    const prevIndex = this.suggestIndex;

    this.suggestIndex = e.key === 'ArrowUp'
      ? this.suggestIndex - 1
      : this.suggestIndex + 1;

    if (this.suggestIndex > this.suggestList.length - 1) {
      this.suggestIndex = -1;
    } else if (this.suggestIndex < -1) {
      this.suggestIndex = this.suggestList.length - 1;
    }

    this.inputNode.value = this.suggestIndex < 0
      ? this.inputValue
      : this.suggestList[this.suggestIndex];

    suggestedList[prevIndex]?.classList.remove('is-active');
    suggestedList[this.suggestIndex]?.classList.add('is-active');
  }

  handleEnterSuggest(e) {
    if (this.suggestIndex > -1) {
      e.preventDefault();
      this.inputNode.value = this.suggestList[this.suggestIndex];
      this.inputNode.focus();
      this.formNode.submit();
    }
    this.closeSuggest();
  }

  handleClickSuggest(e) {
    const target = e.target.closest('[data-suggest]');
    if (!target) return true;

    e.preventDefault();
    const selectedIndex = parseInt(target.dataset.suggest);
    this.inputNode.value = this.suggestList[selectedIndex];
    this.inputNode.focus();
    this.formNode.submit();
    this.closeSuggest();
  }

  closeSuggest() {
    if (!this.suggestNode || this.suggestNode.hidden) {
      return;
    }

    this.suggestNode.hidden = true;
    this.suggestList = [];
    this.suggestIndex = -1;
  }
}

window.customElements.define('vb-header', VbHeader);
