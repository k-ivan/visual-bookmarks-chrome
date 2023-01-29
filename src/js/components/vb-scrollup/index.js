import styles from './index.css';
import { $createElement } from '../../utils';

class VbScrollup extends HTMLElement {
  scrollButton = null;

  connectedCallback() {
    this.#render();
    this.#attachEvents();
  }

  disconnectedCallback() {
    this.#dettachEvents();
  }

  #render() {
    this.classList.add('vb-scrollup');
    this.scrollButton = $createElement('button', {
      class: 'vb-scrollup__button'
    }, {
      innerHTML: /* html */
        `<svg width="20" height="20">
          <use xlink:href="/img/symbol.svg#arrow_upward"/>
        </svg>`
    });
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>${styles}</style>`;
    this.shadowRoot.append(this.scrollButton);
  }

  #attachEvents() {
    this.handleClick = this.handleClick.bind(this);
    this.scrollButton.addEventListener('click', this.handleClick);

    this.handleScroll = this.handleScroll.bind(this);
    window.addEventListener('scroll', this.handleScroll);
  }

  #dettachEvents() {
    this.scrollButton.removeEventListener('click', this.handleClick);
    window.removeEventListener('scroll', this.handleScroll);
  }

  handleScroll() {
    const isShown = window.scrollY > 1000;
    this.classList.toggle('is-shown', isShown);
    this.scrollButton.disabled = !isShown;
  }

  handleClick(e) {
    e.preventDefault();
    window.scrollTo({
      left: 0,
      top: 0,
      behavior: 'smooth'
    });
  }
}

window.customElements.define('vb-scrollup', VbScrollup);
