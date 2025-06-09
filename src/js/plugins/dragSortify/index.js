export class DragSortify {
  el = null;
  #handlers = {};
  #defaults = {
    draggableSelector: '[draggable]',
    draggingClass: 'dragging',
    viewTransition: false,
    holdDelay: 800,
    ignoreSelectors: [],
    plugin: null
  };

  options = {};
  isDisabled = false;
  isDragging = false;
  draggingItems = [];
  draggedItem = null;
  lastDraggedItem = null;
  timer = null;
  previousCursorX = null;

  constructor(el, options = {}) {
    if (typeof el === 'string') {
      this.el = document.querySelector(el);
    } else {
      this.el = el;
    }

    if (!(this.el instanceof Element)) {
      console.warn('el must be selector or HTMLElement');
      return false;
    }

    this.options = {
      ...this.#defaults,
      ...options
    };

    if (this.hasViewTransition) {
      this.#observeItems();
    }

    this.#handlers = options.plugin
      ? options.plugin(this)
      : {
        dragstart: this.#onDragStart.bind(this),
        dragover: this.#onDragOver.bind(this),
        dragend: this.#onDragEnd.bind(this)
      };

    this.#attachEvents();
  }

  get hasViewTransition() {
    return document.startViewTransition && this.options.viewTransition;
  }

  #observeItems() {
    if (this.isDragging) return;

    const arr = [];

    const observer = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        for (let node of mutation.addedNodes) {
          if (
            !(node instanceof HTMLElement) ||
            !node.matches(this.options.draggableSelector)
          ) continue;

          arr.push(node);
        }
      }

      window.requestAnimationFrame(() => {
        arr.forEach((item, index) => {
          item.style.viewTransitionName = `item-${index}`;
        });
      });
    });

    observer.observe(this.el, {
      childList: true
    });
  }

  #attachEvents() {
    this.el.addEventListener('pointerdown', this.#onPointerDown);
    this.el.addEventListener('pointermove', this.#onPointerMove);
    this.el.addEventListener('dragenter', this.#onDragEnter);

    Object.entries(this.#handlers).forEach(([event, handler]) => {
      if (typeof handler === 'function') {
        this.el.addEventListener(event, handler);
      }
    });
  }

  #detachEvents() {
    this.el.removeEventListener('pointerdown', this.#onPointerDown);
    this.el.removeEventListener('pointermove', this.#onPointerMove);
    this.el.removeEventListener('dragenter', this.#onDragEnter);

    Object.entries(this.#handlers).forEach(([event, handler]) => {
      if (typeof handler === 'function') {
        this.el.removeEventListener(event, handler);
      }
    });
  }

  toggleDisable(state = false) {
    this.isDisabled = state;
    (state)
      ? this.#detachEvents()
      : this.#attachEvents();
  }

  toggleDragging(el, state) {
    this.isDragging = state;
    el.classList.toggle(this.options.draggingClass, state);
  }

  setSelectedItems(elements) {
    this.draggingItems = elements;
  }

  destroy() {
    this.#detachEvents();
  }

  isIgnoreSelector(target) {
    return this.options.ignoreSelectors.some((selector) => {
      return target.closest(selector);
    });
  }

  #onDragStart(e) {
    if (this.isDisabled) {
      return false;
    }

    const target = e.target.closest(this.options.draggableSelector);
    if (!target) return;

    this.draggedItem = target;
    this.toggleDragging(this.draggedItem, true);

    this.options.onDragStart?.(e);
  }

  #onDragEnd(e) {
    this.timer = null;

    if (this.draggedItem) {
      this.toggleDragging(this.draggedItem, false);
      this.draggedItem = null;
      this.options.onDragEnd?.(e);
    }
  }

  #onDragOver(e) {
    e.preventDefault();
    const overElement = e.target.closest(this.options.draggableSelector);

    if (this.isIgnoreSelector(e.target)) {
      return;
    }

    if (overElement && overElement !== this.draggedItem) {
      const items = Array.from(this.el.children);
      const fromIndex = items.indexOf(this.draggedItem);
      const toIndex = items.indexOf(overElement);

      const sort = () => {
        if (fromIndex < toIndex) {
          overElement.after(this.draggedItem);
        } else {
          overElement.before(this.draggedItem);
        }

        this.options.onUpdate?.({
          oldIndex: fromIndex,
          newIndex: toIndex,
          draggedItem: this.draggedItem,
          items
        });
      };


      if (this.hasViewTransition) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          document.startViewTransition(sort);
        });
      } else {
        sort();
      }

      this.options.onDragOver?.(e);
    }
  }

  #onDragEnter = (e) => {
    e.preventDefault();
    this.options.onDragEnter?.(e);
  };

  #onPointerDown = (e) => {
    const target = e.target.closest(this.options.draggableSelector);

    if (target) {
      target.draggable = true;
    }

    if (e.target.tagName === 'IMG') {
      e.target.draggable = false;
    }


    if (!this.options.ignoreSelectors.length) return true;

    if (this.isIgnoreSelector(e.target)) {
      e.preventDefault();
      return;
    }
  };

  #onPointerMove = (e) => {
    this.dir = e.clientX - this.previousCursorX > 0 ? 'right' : 'left';
    this.previousCursorX = e.clientX;
  };
}
