import styles from './index.css';
import { $createElement, $debounce } from '../../utils';

class VbVirtualPagination extends HTMLElement {
  node = null;
  scrollableContainer = null;
  buttons = [];
  currentPage = 0;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.scrollableContainer = document.querySelector(this.scrollableSelector) ?? document.body;
    this.node = $createElement('div', {
      class: 'vb-virtual-pagination'
    });
    this.shadowRoot.innerHTML = `<style>${styles}</style>`;
    this.shadowRoot.append(this.node);


    this.renderDots();
    this.attachEvents();
  }

  disconnectedCallback() {
    this.detachEvents();
  }

  get windowHeight() {
    return window.innerHeight;
  }

  get pages() {
    const containerHeight = this.scrollableContainer.scrollHeight;
    return Math.ceil(containerHeight / this.windowHeight);
  }

  get scrollableSelector() {
    return this.getAttribute('scrollable-selector');
  }

  get isHidden() {
    if (this.hidden) {
      return true;
    }

    const styles = window.getComputedStyle(this);
    return styles.display === 'none' || styles.visibility === 'hidden';
  }

  attachEvents() {
    this.handleScroll = this.handleScroll.bind(this);
    this.scrollableContainer.addEventListener('scroll', this.handleScroll);

    this.handleClick = this.handleClick.bind(this);
    this.shadowRoot.addEventListener('click', this.handleClick);

    this.handleChangeHash = this.renderDots.bind(this);
    window.addEventListener('changeFolder', this.handleChangeHash);

    this.handleResize = $debounce(this.renderDots.bind(this), 300);
    window.addEventListener('resize', this.handleResize);
  }

  dettachEvents() {
    this.scrollableContainer.addEventListener('scroll', this.handleScroll);
    this.shadowRoot.addEventListener('click', this.handleClick);
    window.addEventListener('changeFolder', this.handleChangeHash);
    window.addEventListener('resize', this.handleResize);
  }

  renderDots() {
    const pages = this.pages;
    if (pages <= 1) {
      this.buttons = [];
    } else if (pages <= 20) {
      this.buttons = Array.from(
        Array(pages).keys()
      ).map((slide, index) => {
        const isActive = this.currentPage === index ? ' class="is-active"' : '';
        return `<button${isActive} data-page="${slide}">${index + 1}</button>`;
      });
    } else {
      this.hidden = true;
      return;
    }

    this.node.innerHTML = this.buttons.join('');
    this.hidden = pages <= 1;
  }

  handleClick(e) {
    const target = e.target.closest('[data-page]');
    if (!target) return true;

    e.preventDefault();
    const prevPage = this.currentPage;
    const currentPage = parseInt(target.dataset.page);

    if (prevPage === currentPage) return;

    this.changeActiveSlide(currentPage);

    this.scrollableContainer.scrollTo({
      left: 0,
      top: currentPage * this.windowHeight,
      behavior: 'smooth'
    });
  }

  handleScroll() {
    if (this.isHidden) {
      return;
    }
    const scrollProperty = this.scrollableContainer === window ? 'scrollY' : 'scrollTop';
    const scrollY = Math.floor(this.scrollableContainer[scrollProperty] + this.windowHeight);
    const index = Math.floor(scrollY / Math.floor(this.scrollableContainer.scrollHeight / this.pages)) - 1;

    this.changeActiveSlide(index);
  }

  changeActiveSlide(page) {
    const prevPage = this.currentPage;
    this.currentPage = page;

    if (prevPage === this.currentPage) return;

    const buttonsNodes = Array.from(this.shadowRoot.querySelectorAll('button'));
    buttonsNodes[prevPage]?.classList?.remove('is-active');
    buttonsNodes[this.currentPage]?.classList?.add('is-active');
  }
}

window.customElements.define('vb-virtual-pagination', VbVirtualPagination);
