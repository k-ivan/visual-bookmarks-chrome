import styles from './index.css';
import { $createElement } from '../../utils';
import { CONTEXT_MENU } from '../../constants';

class VbBookmarksPanel extends HTMLElement {
  panel = null;
  actions = [
    {
      icon: 'launch',
      tag: 'button',
      action: 'open_all',
      text: chrome.i18n.getMessage('open_selected')
    },
    {
      icon: 'delete_outline',
      tag: 'button',
      action: 'remove',
      text: chrome.i18n.getMessage('delete_selected')
    },
    {
      icon: 'capture_outline',
      tag: 'button',
      action: 'update_thumbnails',
      text: chrome.i18n.getMessage('thumbnails_update')
    }
  ];
  folderId = null;
  foldersThree = [];

  set selectedFolder(value) {
    this.folderId = value;
  }

  set folders(folders) {
    this.foldersThree = folders;
  }

  connectedCallback() {
    this.#render();
    this.#attachEvents();
  }

  disconnectedCallback() {
    this.#dettachEvents();
  }

  #render() {
    this.classList.add('bookmarks-panel');

    this.panelActions = $createElement('div', {
      class: 'bookmarks-panel__body'
    });

    this.closeBtn = $createElement('button', {
      class: 'bookmarks-panel__close md-ripple',
      'data-ripple-center': '',
      'aria-label': chrome.i18n.getMessage('btn_close')
    }, {
      html: /* html */ `<svg width="20" height="20"><use xlink:href="/img/symbol.svg#close"/></svg>`
    });

    this.actionsNodes = this.actions.map(action => {
      if (action.action === 'open_all') {
        const actions = CONTEXT_MENU
          .filter(item => ['open_all', 'open_all_window', 'new_window_incognito'].includes(item.action))
          .map(item => {
            return `<div class="bookmarks-panel__popup-action" data-action="${item.action}">${item.title}</div>`;
          });
        return (/* html */
          `<vb-popup class="bookmarks-panel__popup" title="${chrome.i18n.getMessage('toggle_actions_popup')}">
            <span class="bookmarks-panel__action" slot="button">
              <svg width="20" height="20"><use xlink:href="/img/symbol.svg#${action.icon}"></use></svg>
            </span>
            <div class="bookmarks-panel__popup-content" slot="content">
              ${actions.join('')}
            </div>
          </vb-popup>`
        );
      }
      return (/* html */
        `<button class="bookmarks-panel__action md-ripple" data-ripple-center data-action="${action.action}" aria-label="${action.text}">
          <svg width="20" height="20"><use xlink:href="/img/symbol.svg#${action.icon}"></use></svg>
        </button>`
      );
    });

    this.selectContainer = $createElement('div', {
      class: 'bookmarks-panel__selector'
    });
    this.select = $createElement('vb-select-folders');
    this.selectButton = $createElement('button', {
      id: 'panel_bookmark_selector',
      class: 'btn md-ripple',
      hidden: true,
      disabled: true
    }, chrome.i18n.getMessage('button_action_move'));
    this.selectContainer.append(this.select, this.selectButton);

    this.innerHTML = `<style>${styles}</style>`;
    this.panelActions.innerHTML = this.actionsNodes.join('');
    this.panelActions.append(this.selectContainer);

    this.append(this.panelActions);
    this.append(this.closeBtn);

    this.select.value = this.folderId;
    this.select.folders = this.foldersThree;
  }

  #attachEvents() {
    this.handleClickAction = this.selectAction.bind(this);
    this.addEventListener('click', this.handleClickAction);

    this.handleClose = this.close.bind(this);
    this.closeBtn.addEventListener('click', this.handleClose);

    this.handleChangeFolder = this.changeFolder.bind(this);
    this.select.addEventListener('vb:select:change', this.handleChangeFolder);
  }

  #dettachEvents() {
    this.removeEventListener('click', this.handleClickAction);
    this.closeBtn.removeEventListener('click', this.handleClose);
    this.select.removeEventListener('vb:select:change', this.handleChangeFolder);

    this.handleChangeFolder = null;
    this.handleClickAction = null;
    this.handleClose = null;
  }

  changeFolder({ detail }) {
    this.selectButton.hidden = this.folderId === detail;
    this.selectButton.disabled = this.selectButton.hidden;
    if (!this.selectButton.hidden) {
      this.selectButton.dataset.action = 'move_bookmarks';
      this.selectButton.dataset.destFolder = detail;
    } else {
      delete this.selectButton.dataset.action;
      delete this.selectButton.dataset.destFolder;
    }
  }

  selectAction(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const destFolder = target.dataset.destFolder;

    document.dispatchEvent(
      new CustomEvent('vb-bookmarks-panel:action', {
        detail: {
          action,
          ...(destFolder && { destFolder })
        }
      })
    );
  }

  close() {
    document.dispatchEvent(new CustomEvent('vb-bookmarks-panel:close'));
  }
}

window.customElements.define('vb-bookmarks-panel', VbBookmarksPanel);
