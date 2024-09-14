import ContextMenu from './contextmenu';
import { $createElement } from '../../utils';

class VbContextMenu extends HTMLElement {
  containerNode = null;
  menuNode = null;
  items = [];

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();

    this.menuInstance = new ContextMenu(this.containerNode, {
      delegateSelector: this.triggerSelector,
      scrollContainer: '.app'
    });
    this.handleMenuOpen = this.handleMenuOpen.bind(this);
    this.handleMenuSelect = this.handleMenuSelect.bind(this);
    this.containerNode.addEventListener('contextmenu:open', this.handleMenuOpen);
    this.containerNode.addEventListener('contextmenu:selection', this.handleMenuSelect);
  }

  disconnectedCallback() {
    this.menuInstance.destroy();
    delete this.menuInstance;
  }

  get listItems() {
    return this.items;
  }

  set listItems(items) {
    if (!this.diffItems(items)) return;

    this.items = structuredClone(items);
    this.setItems();
  }

  get triggerSelector() {
    return this.getAttribute('trigger-selector');
  }

  set triggerSelector(value) {
    this.setAttribute('trigger-selector', value);
  }

  render() {
    this.containerNode = $createElement('div', {
      class: 'context-menu'
    });
    this.menuNode = $createElement('ul', {
      class: 'context-menu__list'
    });
    this.containerNode.append(this.menuNode);
    this.append(this.containerNode);
  }

  setItems() {
    const list = this.items.map(item => {
      const isDisabled = item.disabled ? 'is-disabled' : '';

      if (item.divider) {
        return '<li class="context-menu__item context-menu__item--divider"></li>';
      }
      return `<li class="context-menu__item">
          <a class="context-menu__link ${ isDisabled }" data-action="${ item.action }">
            <span class="context-menu__icon">${ item.icon ? item.icon : '' }</span>
            <span class="">${ item.title }</span>
          </a>
        </li>`;
    }).join('');
    this.menuNode.innerHTML = list;
    this.menuInstance.getDOMChildren();
  }

  close() {
    this.menuInstance.close();
  }

  trigger(event) {
    this.menuInstance.handlerTrigger(event);
  }

  handleMenuOpen(evt) {
    this.dispatchEvent(
      new CustomEvent('vb:contextmenu:open', {
        detail: evt.detail.trigger,
        bubbles: true,
        cancelable: true
      })
    );
  }

  handleMenuSelect(evt) {
    this.dispatchEvent(
      new CustomEvent('vb:contextmenu:select', {
        detail: {
          trigger: evt.detail.trigger,
          selection: evt.detail.selection
        },
        bubbles: true,
        cancelable: true
      })
    );
  }

  diffItems(newArr) {
    return JSON.stringify(this.listItems) !== JSON.stringify(newArr);

    // if (this.items.length !== newArr.length) {
    //   return true;
    // }

    // const resultArr = this.items.filter(currentItem => {
    //   return !newArr.some(newItem => newItem.action === currentItem.action);
    // });

    // return resultArr.length > 0;
  }
}

window.customElements.define('vb-context-menu', VbContextMenu);
