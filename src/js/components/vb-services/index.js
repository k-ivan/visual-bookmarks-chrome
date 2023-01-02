import Sortable from 'sortablejs';
import Validator from 'form-validation-plugin';
import styles from './index.css';
import html from './template.html';
import {
  FAVICON_GOOGLE,
  SERVICES_COUNT
} from '../../constants';
import {
  $escapeHtml,
  $uid
} from '../../utils';
import Localization from '../../plugins/localization.js';

class VBServices extends HTMLElement {
  services = [];
  isActive = false;
  hasSettings = false;

  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: 'open' });
    const template = document.createElement('template');
    template.innerHTML = `<style>${styles}</style>${this.#prepareTemplate}`;
    shadowRoot.appendChild(
      template.content.cloneNode(true)
    );

    this.trigger = this.shadowRoot.querySelector('.trigger');
    this.popup = this.shadowRoot.querySelector('.popup');
    this.grid = this.shadowRoot.querySelector('.list');

    this.settingsTriggerEl = this.shadowRoot.querySelector('.settings-trigger');
    this.settingsEl = this.shadowRoot.querySelector('.settings');
    this.settingsFormEl = this.shadowRoot.querySelector('.settings-form');
    this.settingsLimitEl = this.shadowRoot.querySelector('.settings-limit');
    this.settingsCloseEl = this.shadowRoot.querySelector('.settings-close');
  }

  set servicesList(services) {
    this.services = services;
  }

  get servicesLength() {
    return this.services.length;
  }

  get hasOverLimit() {
    return (this.servicesLength >= SERVICES_COUNT);
  }

  get #prepareTemplate() {
    return html.replace(`{services_limit_message}`, `services_limit:${SERVICES_COUNT}`);
  }

  _attachEvents() {
    this.handlerToggle = this.#toggle.bind(this);
    this.handlerKeyClose = this.#closeByKey.bind(this);
    this.handlerClickClose = this.#closeByClick.bind(this);
    this.handleShowSettings = this.#showSettings.bind(this);
    this.handleCancelForm = this.#cancelForm.bind(this);
    this.handleRemove = this.#removeService.bind(this);

    this.trigger.addEventListener('click', this.handlerToggle);
    document.addEventListener('click', this.handlerClickClose);
    document.addEventListener('keydown', this.handlerKeyClose);
    this.settingsTriggerEl.addEventListener('click', this.handleShowSettings);
    this.settingsCloseEl.addEventListener('click', this.handleCancelForm);
    this.grid.addEventListener('click', this.handleRemove);
  }

  #dettachEvents() {
    this.trigger.removeEventListener('click', this.handlerToggle);
    document.removeEventListener('click', this.handlerClickClose);
    document.removeEventListener('keydown', this.handlerKeyClose);
    this.settingsTriggerEl.removeEventListener('click', this.handleShowSettings);
    this.settingsCloseEl.removeEventListener('click', this.handleCancelForm);
    this.grid.removeEventListener('click', this.handleRemove);

    delete this.handlerToggle;
    delete this.handlerKeyClose;
    delete this.handlerClickClose;
    delete this.handleShowSettings;
    delete this.handleCancelForm;
    delete this.handleRemove;
  }

  #reorderArray(event, originalArray) {
    const movedItem = originalArray.find((item, index) => index === event.oldIndex);
    const remainingItems = originalArray.filter((item, index) => index !== event.oldIndex);

    const reorderedItems = [
      ...remainingItems.slice(0, event.newIndex),
      movedItem,
      ...remainingItems.slice(event.newIndex)
    ];

    return reorderedItems;
  }

  #showSettings() {
    this.hasSettings = true;
    this.grid.classList.add('is-edit');
    this.settingsTriggerEl.hidden = this.hasSettings;
    this.settingsEl.hidden = !this.hasSettings;
    this.settingsFormEl.name.focus();
    this.sortableInstance.option('disabled', true);
    this.#toggleServicesLimit();
  }

  #hideSettings() {
    this.hasSettings = false;
    this.grid.classList.remove('is-edit');
    this.settingsTriggerEl.hidden = this.hasSettings;
    this.settingsEl.hidden = !this.hasSettings;
    this.settingsFormEl.reset();
    this.sortableInstance.option('disabled', false);
  }

  #toggleServicesLimit() {
    this.settingsFormEl.hidden = this.hasOverLimit;
    this.settingsLimitEl.hidden = !this.hasOverLimit;
  }

  #cancelForm(e) {
    e.preventDefault();
    this.#hideSettings();
  }

  #addService() {
    if (this.hasOverLimit) return;

    const { name, link } = this.settingsFormEl;
    const service = {
      id: $uid(),
      name: $escapeHtml(name.value),
      link: link.value.toLowerCase()
    };

    this.services.push(service);
    this.#toggleListEmpty();
    this.grid.insertAdjacentHTML('beforeend', this.#templateItem(service));
    this.settingsFormEl.reset();
    name.focus();
    this.#toggleServicesLimit();

    this.dispatchEvent(
      new CustomEvent('update', {
        detail: {
          services: this.services
        },
        bubbles: true,
        cancelable: true
      })
    );
  }

  #removeService(e) {
    const target = e.target.closest('.item-remove');
    if (!target) return true;

    e.preventDefault();
    const id = target.dataset.id;
    this.services = this.services.filter(service => service.id !== id);

    target.closest('.item').remove();
    this.#toggleListEmpty();
    this.#toggleServicesLimit();

    this.dispatchEvent(
      new CustomEvent('update', {
        detail: {
          services: this.services
        },
        bubbles: true,
        cancelable: true
      })
    );
  }

  #closeByClick(e) {
    if (this.isActive && this !== e.target) {
      this.#hide();
    }
  }

  #closeByKey(e) {
    if (e.which === 27 && this.isActive) {
      this.#hide();
    }
  }

  #show() {
    this.trigger.classList.add('is-active');
    this.popup.classList.add('is-open');
    this.isActive = true;
    this.dispatchEvent(new CustomEvent('open'), {
      bubbles: true,
      cancelable: true
    });
  }

  #hide() {
    this.trigger.classList.remove('is-active');
    this.popup.classList.remove('is-open');
    this.isActive = false;
    this.dispatchEvent(new CustomEvent('close'), {
      bubbles: true,
      cancelable: true
    });
    // TODO: better use event(transitionend)
    setTimeout(() => {
      this.#hideSettings();
    }, 150);
  }

  #toggle() {
    !this.isActive
      ? this.#show()
      : this.#hide();
  }

  #toggleListEmpty() {
    const hasServices = Boolean(this.servicesLength);
    this.grid.classList.toggle('is-empty', !hasServices);
  }

  #templateItem({ id, name, link }) {
    const logo = `${FAVICON_GOOGLE}${link}`;
    const nameText = document.createTextNode(name).textContent;

    return /* html */`
      <a class="item" href="${link}" id="${id}">
        <div class="item-img-wrap">
          <img class="item-logo" alt="${nameText}" src="${logo}"/>
        </div>
        <div class="item-name">${nameText}</div>
        <button class="item-remove" data-id="${id}">
          <svg height="14" width="14">
            <use xlink:href="/img/symbol.svg#minus"/>
          </svg>
        </button>
      </a>`;
  }

  #render() {
    const htmlList = this.services.map(this.#templateItem).join('');
    this.grid.innerHTML = htmlList;
    this.#toggleListEmpty();
  }

  connectedCallback() {
    // render component
    this.#render();

    Localization(this.popup);

    // attach Events
    this._attachEvents();

    // external plugin
    this.sortableInstance = new Sortable(this.grid, {
      animation: 150,
      ghostClass: 'ghost',
      onUpdate: (e) => {
        this.services = this.#reorderArray(e, this.services);
        this.dispatchEvent(
          new CustomEvent('update', {
            detail: {
              services: this.services
            },
            bubbles: true,
            cancelable: true
          })
        );
      }
    });

    Validator.i18n = {
      required: chrome.i18n.getMessage('error_input_required'),
      url: chrome.i18n.getMessage('error_input_url')
    };

    Validator.run(this.settingsFormEl, {
      showErrors: true,
      checkChange: true,
      checkInput: true,
      containerSelector: '.group',
      errorClass: 'has-error',
      errorHintClass: 'error-hint',
      onSuccess: (event) => {
        event.preventDefault();
        this.#addService();
      },
      onError: (err) => {
        err[0].el.focus();
      }
    });
  }

  disconnectedCallback() {
    this.#dettachEvents();
    this.sortableInstance.destroy();
    delete this.sortableInstance;
    Validator.destroy();
  }
}

window.customElements.define('vb-services', VBServices);
