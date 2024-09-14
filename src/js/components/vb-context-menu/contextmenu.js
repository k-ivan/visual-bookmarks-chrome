import { $customTrigger } from '../../utils';

const EVENTS = {
  OPEN: 'contextmenu:open',
  CLOSE: 'contextmenu:close',
  SELECTION: 'contextmenu:selection'
};

class ContextMenu {
  constructor(menu, options) {
    if (typeof menu === 'string') {
      menu = document.querySelector(menu);
    }
    if (!(menu instanceof HTMLElement)) {
      throw Error('Check the argument of the selector');
    }

    this.menu = menu;

    if (this.menu.active) return;

    this.menu.active = true;

    this.settings = Object.assign({
      tresholdMargin: 10,
      delegateSelector: 'html',
      scrollContainer: window
    }, options);

    this.init();
  }

  init() {
    this.state = false;
    this.trigger = null;

    if (this.settings.scrollContainer !== window) {
      const el = document.querySelector(this.settings.scrollContainer);
      this.scrollContainer = el ? el : window;
    } else {
      this.scrollContainer = window;
    }

    // Menu size
    this.menuWidth = null;
    this.menuHeight = null;

    // Mouse position
    this.menuX = null;
    this.menuY = null;

    this.attachEvents();
  }

  getDOMChildren() {
    this.items = Array.from(this.menu.querySelectorAll('.context-menu__link'));
    this.itemsLength = this.items.length;
  }

  attachEvents() {
    this.handlerTrigger = this.handlerTrigger.bind(this);
    this.handlerClick = this.handlerClick.bind(this);
    this.handlerKeyboard = this.handlerKeyboard.bind(this);
    this.handlerClose = this.handlerClose.bind(this);

    this.scrollContainer.addEventListener('scroll', this.handlerClose);
    window.addEventListener('resize', this.handlerClose);
    document.addEventListener('contextmenu', this.handlerTrigger);
    document.addEventListener('keydown', this.handlerKeyboard);
    document.addEventListener('click', this.handlerClick);
  }

  detachEvents() {
    this.scrollContainer.removeEventListener('scroll', this.handlerClose);
    window.removeEventListener('resize', this.handlerClose);
    document.removeEventListener('contextmenu', this.handlerTrigger);
    document.removeEventListener('keydown', this.handlerKeyboard);
    document.removeEventListener('click', this.handlerClick);
  }

  position(e) {
    this.menu.style.top = 0;
    this.menu.style.left = 0;

    if (!e.clientX && !e.clientY) {
      // trigger by key
      const target = e.target;
      const pos = target.getBoundingClientRect();
      this.menuX = pos.left + window.pageXOffset;
      this.menuY = pos.top + window.pageYOffset;
    } else {
      this.menuX = e.pageX;
      this.menuY = e.pageY;
    }

    this.menuWidth = this.menu.offsetWidth;
    this.menuHeight = this.menu.offsetHeight;

    const windowWidth = document.documentElement.clientWidth + window.pageXOffset;
    const windowHeight = document.documentElement.clientHeight + window.pageYOffset;

    if ((windowWidth - this.menuX) < this.menuWidth) {
      this.menu.style.left = `${windowWidth - this.menuWidth - this.settings.tresholdMargin}px`;
    } else {
      this.menu.style.left = `${this.menuX}px`;
    }

    if ((windowHeight - this.menuY) < this.menuHeight) {
      this.menu.style.top = `${windowHeight - this.menuHeight - this.settings.tresholdMargin}px`;
    } else {
      this.menu.style.top = `${this.menuY}px`;
    }
  }

  handlerClose() {
    this.close();
  }

  handlerKeyboard(e) {
    const key = e.which;

    switch (key) {
      case 38: {
        if (this.state) {
          e.preventDefault();
          this.prev();
        }
        break;
      }
      case 40: {
        if (this.state) {
          e.preventDefault();
          this.next();
        }
        break;
      }
      case 27:
        this.close();
        break;
      case 13:
        this.enter(e);
        break;
    }
  }

  handlerClick(e) {
    if (!this.state) return;

    const menu = e.target.closest('.context-menu');

    if (!menu) {
      this.close();
      return;
    }

    e.preventDefault();
    const action = e.target.closest('.context-menu__link');
    this.select(action);
  }

  handlerTrigger(e) {
    if (!this.menu || !this.menu.active) return;

    const target = e.target.closest(this.settings.delegateSelector);
    if (target) {
      e.preventDefault();
      this.trigger = target;
      this.close();
      this.open(e);
    } else {
      this.close();
    }
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.itemsLength;
    if (this.items[this.currentIndex].classList.contains('is-disabled')) {
      this.next();
      return;
    }
    this.mark();
  }

  prev() {
    this.currentIndex--;
    if (this.currentIndex < 0) {
      this.currentIndex = this.itemsLength - 1;
    }
    if (this.items[this.currentIndex].classList.contains('is-disabled')) {
      this.prev();
      return;
    }
    this.mark();
  }

  mark() {
    const current = this.menu.querySelector('.hover');
    if (current) {
      current.classList.remove('hover');
    }

    this.items[this.currentIndex].classList.add('hover');
  }

  enter(e) {
    if (!this.state) return;
    e.preventDefault();
    e.stopPropagation();
    this.select(this.items[this.currentIndex]);
  }

  select(action) {
    if (action && !action.classList.contains('disabled')) {
      $customTrigger(EVENTS.SELECTION, this.menu, {
        detail: {
          selection: action.dataset.action,
          trigger: this.trigger
        }
      });

      this.close();
    }
  }

  open(e) {
    if (this.state) return;

    this.state = true;
    this.menu.classList.add('context-menu--open');

    $customTrigger(EVENTS.OPEN, this.menu, {
      detail: {
        trigger: this.trigger
      }
    });
    this.position(e);

    // links
    this.currentIndex = -1;
    this.getDOMChildren();
  }

  close() {
    if (!this.state) return;

    this.state = false;
    this.menu.classList.remove('context-menu--open');

    const current = this.menu.querySelector('.hover');
    if (current) {
      current.classList.remove('hover');
    }
    this.currentIndex = -1;

    $customTrigger(EVENTS.CLOSE, this.menu, {
      detail: {
        trigger: this.trigger
      }
    });
  }

  destroy() {
    if (!this.menu || !this.menu.active) return;

    this.close();
    this.detachEvents();

    delete this.menu.active;
    Object.keys(this).forEach(property => {
      delete this[property];
    });
  }
}

export default ContextMenu;
