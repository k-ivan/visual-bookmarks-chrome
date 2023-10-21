import styles from './index.css';
import { $createElement } from '../../utils';

class VbPopup extends HTMLElement {
  popupTriger = null;
  popupContent = null;
  isActive = false;
  isTransition = false;

  connectedCallback() {
    this.#render();
    this.#attachEvents();
  }

  disconnectedCallback() {
    this.#dettachEvents();
  }

  static get observedAttributes() {
    return ['title'];
  }

  get title() {
    return this.getAttribute('title');
  }

  attributeChangedCallback(attr, oldValue, newValue) {
    if (attr === 'title') {
      this.popupTriger?.setAttribute('aria-label', newValue);
    }
  }

  #render() {
    this.classList.add('popup');
    this.popupTriger = $createElement('button', {
      type: 'button',
      class: 'button',
      'aria-label': this.title
    }, {
      html: '<slot name="button"></slot>'
    });
    this.popupContent = $createElement('div', {
      class: 'content'
    }, {
      html: '<slot name="content"></<slot>'
    });
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>${styles}</style>`;
    this.shadowRoot.append(this.popupTriger);
    this.shadowRoot.append(this.popupContent);
  }

  #attachEvents() {
    this.handleToggle = this.toggle.bind(this);
    this.handleHideByDocument = this.handleHideByDocument.bind(this);
    this.closeByEsc = (e) => {
      if (e.code === 'Escape' && this.isActive && !this.isTransition) {
        this.hide();
      }
    };
    this.handleFocusout = this.handleFocusout.bind(this);

    this.popupTriger.addEventListener('click', this.handleToggle);
    document.addEventListener('click', this.handleHideByDocument);
    document.addEventListener('keydown', this.closeByEsc);
    this.addEventListener('focusout', this.handleFocusout);
  }

  #dettachEvents() {
    this.popupTriger.removeEventListener('click', this.handleToggle);
    document.removeEventListener('click', this.handleHideByDocument);
    document.removeEventListener('keydown', this.closeByEsc);
  }

  transitionEnd(callback) {
    const handler = (e) => {
      this.popupContent.removeEventListener(e.type, handler);
      callback();
    };
    this.popupContent.addEventListener('transitionend', handler);
  }

  handleFocusout(e) {
    if (!e.relatedTarget || this.contains(e.relatedTarget)) {
      return;
    }
    this.isActive && this.hide();
  }

  handleHideByDocument(e) {
    e.stopPropagation();
    // For elements inside the Shadow DOM events are automatically retargeted to the parent component
    // This means that event.target is set to the parent component for any event originating from inside the Shadow DOM.
    // The composedPath() method of the Event interface returns the event's path which is an array of the objects on which listeners will be invoked
    // https://developer.mozilla.org/en-US/docs/Web/API/Event/composedPath
    const target = e.composedPath()[0];
    if (
      this.isActive &&
      !this.contains(target) && // in a custom popup must contain a target
      !event.composedPath().includes(this) // should contain our custom popup
    ) {
      this.hide();
    }
  }

  toggle(e) {
    e.preventDefault();
    !this.isActive && this.popupTriger.focus();
    this[!this.isActive ? 'show' : 'hide']();
  }

  show() {
    if (this.isActive || this.isTransition) return false;

    this.popupContent.classList.remove('is-below', 'is-above');
    this.popupContent.style.display = 'block';

    const { top, height } = this.popupTriger.getBoundingClientRect();
    const posYClass = (top + height + this.popupContent.offsetHeight > window.innerHeight)
      ? 'is-below'
      : 'is-above';

    this.popupContent.classList.add(posYClass);

    this.transitionEnd(() => {
      this.isTransition = false;
      this.isActive = true;

      this.dispatchEvent(
        new CustomEvent('vb:popup:open', {
          bubbles: true,
          cancelable: true
        })
      );
    });

    this.isTransition = true;
    this.popupContent.classList.add('is-show');
  }

  hide() {
    if (!this.isActive || this.isTransition) return false;

    this.transitionEnd(() => {
      this.popupContent.style.display = 'none';
      this.isTransition = false;
      this.isActive = false;

      this.dispatchEvent(
        new CustomEvent('vb:popup:close', {
          bubbles: true,
          cancelable: true
        })
      );
    });

    this.isTransition = true;
    this.popupContent.classList.remove('is-show');
  }
}

window.customElements.define('vb-popup', VbPopup);
