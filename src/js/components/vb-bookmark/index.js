// import styles from '../../../css/components/_bookmark.css';
import { $createElement, $getDomain, faviconURL } from '../../utils';
import { SVG_LOADER, LOGO_CLEARBIT } from '../../constants';

class VbBookmark extends HTMLAnchorElement {
  #isRendered = false;
  #overlayEl = null;
  #_folderChildren = [];
  #externalLogo = false;

  constructor() {
    super();
  }

  connectedCallback() {
    this.#render();
    this.#isRendered = true;
  }

  disconnectedCallback() {
    document.dispatchEvent(new CustomEvent('bookmark-removed', {
      detail: {
        id: this.id,
        image: this.image
      }
    }));
  }

  static get observedAttributes() {
    return [
      'href',
      'title',
      'image',
      'has-overlay'
    ];
  }

  get #hasChildren() {
    return Boolean(this.#_folderChildren.length);
  }

  #toggleOverlay(isActive) {
    if (isActive) {
      this.#overlayEl = $createElement('div', {
        class: 'bookmark__overlay'
      }, {
        html: SVG_LOADER
      });
      this.appendChild(this.#overlayEl);
      this.classList.add('disable-events');
    } else {
      this.#overlayEl?.remove();
      this.classList.remove('disable-events');
    }
  }

  #updateLogo() {
    const imageEl = this.querySelector('.bookmark__img');
    imageEl.className = 'bookmark__img bookmark__img--logo';
    if (this.#externalLogo) {
      imageEl.classList.add('bookmark__img--external');
    }
    imageEl.style.backgroundImage = `url('${this.#logoUrl(this.url)}')`;
  }

  #updateFavicon() {
    if (this.hasFavicon) {
      const faviconEl = this.querySelector('.bookmark__favicon');
      faviconEl.src = this.faviconUrl;
    }
  }

  attributeChangedCallback(attr, oldValue, newValue) {
    if (!this.#isRendered) return;
    if (oldValue === newValue) return;

    if (attr === 'has-overlay') this.#toggleOverlay(this.hasOverlay);
    if (attr === 'title') {
      const titleEl = this.querySelector('.bookmark__title');
      if (titleEl) {
        titleEl.textContent = newValue;
      }
    }
    if (attr === 'image') {
      const imageEl = this.querySelector('.bookmark__img');

      if (this.image) {
        if (this.isFolder) {
          imageEl.className = 'bookmark__img bookmark__img--contain';
        } else {
          imageEl.className = 'bookmark__img';
          imageEl.classList.toggle('bookmark__img--contain', this.isCustomImage);
        }
        imageEl.style.backgroundImage = `url('${this.image}')`;
      } else {
        if (this.isFolder) {
          imageEl.className = 'bookmark__img bookmark__img--folder';
          imageEl.style.backgroundImage = '';
        } else {
          this.#updateLogo();
        }
      }
    }
    if (
      attr === 'href' &&
      this.hasTitle &&
      !this.isFolder
    ) {
      if (!this.image) {
        this.#updateLogo();
      }
      this.#updateFavicon();
    }
  }

  #renderFolderPreview() {
    if (this.#hasChildren) {
      const childs = this.#_folderChildren.map(child => {
        if (child.image) {
          return /* html */`<div class="bookmark__img bookmark__img--contain bookmark__img--children" style="background-image: url(${child.image})"></div>`;
        } else {
          const imageUrl = this.#logoUrl(child.url);
          return /* html */`<div class="bookmark__img bookmark__img--logo bookmark__img--children" style="background-image: url('${imageUrl}')"></div>`;
        }
      }).join('');

      return /* html */`<div class="bookmark__summary-folder">${childs}</div>`;
    }
    return /* html */`<div class="bookmark__img bookmark__img--folder"></div>`;
  }

  #renderFolder() {
    this.classList.add('bookmark', 'bookmark--folder');
    this.innerHTML =
    /* html */
    `<div class="bookmark__wrap">
      <button type="button" class="bookmark__action" aria-label="${chrome.i18n.getMessage('bookmark_context')}"></button>
      ${
        (this.hasFolderPreview)
          ? this.#renderFolderPreview()
          : (this.image)
            ? /* html */
              `<div
                class="bookmark__img bookmark__img--contain"
                style="background-image: url(${this.image})">
              </div>`
            : /* html */
            `<div class="bookmark__img bookmark__img--folder"></div>`
      }
      ${
        // bookmark title
        (this.hasTitle)
          ? /* html */
            `<div class="bookmark__caption">
              <img src="/img/folder.svg" class="bookmark__favicon" width="16" height="16" alt="">
              <span class="bookmark__title">${this.title}</span>
            </div>`
          : ``
      }
      ${
        // if dnd create a dropzone
        (this.isDND) ? /* html */`<div class="dropzone-bookmark" data-id="${this.id}"></div>` : ``
      }
    </div>`;
  }

  #renderBookmark() {
    this.classList.add('bookmark');
    if (this.openNewTab) {
      this.setAttribute('target', '_blank');
      this.setAttribute('rel', 'noopener noreferrer');
    }
    const imgAdditionalClassString = (
      this.image
        ? (this.isCustomImage && ' bookmark__img--contain')
        : (this.#externalLogo && ' bookmark__img--external')
    ) || '';

    this.innerHTML =
    /* html*/
    `<div class="bookmark__wrap">
        <button type="button" class="bookmark__action" aria-label="${chrome.i18n.getMessage('bookmark_context')}"></button>
        ${
          // bookmark img
          (this.image)
          ? /* html*/
            `<div class="bookmark__img${imgAdditionalClassString}" style="background-image: url('${this.image}');"></div>`
          : /* html*/
            `<div class="bookmark__img bookmark__img--logo${imgAdditionalClassString}" style="background-image: url('${this.#logoUrl(this.url)}')"></div>`
        }
        ${
          // bookmark title
          (this.hasTitle)
            ? /* html*/
              `<div class="bookmark__caption">
                ${ (this.hasFavicon)
                  ? /* html*/`<img class="bookmark__favicon" width="16" height="16" src="${this.faviconUrl}" alt="">`
                  : ``
                }
                <span class="bookmark__title">${this.title}</span>
              </div>`
            : ``
        }
      </div>`;
  }

  #render() {
    (this.isFolder)
      ? this.#renderFolder()
      : this.#renderBookmark();
  }

  #logoUrl(url) {
    return this.#externalLogo
      ? `${LOGO_CLEARBIT}/${$getDomain(url)}`
      : faviconURL(url, 32);
  }

  get serviceLogo() {
    return this.#externalLogo;
  }
  set externalLogo(value) {
    this.#externalLogo = value;
  }

  get faviconUrl() {
    return faviconURL(this.url);
  }

  get hasOverlay() {
    return this.hasAttribute('has-overlay');
  }
  set hasOverlay(value) {
    if (value) {
      this.setAttribute('has-overlay', '');
    } else {
      this.removeAttribute('has-overlay');
    }
  }

  get isFolder() {
    return this.hasAttribute('is-folder');
  }
  set isFolder(value) {
    if (value) {
      this.setAttribute('is-folder', '');
    } else {
      this.removeAttribute('is-folder');
    }
  }

  get id() {
    return this.getAttribute('data-id');
  }
  set id(value) {
    if (value) {
      this.setAttribute('id', `vb-${value}`);
      this.setAttribute('data-id', value);
    }
  }

  get url() {
    return this.getAttribute('href');
  }
  set url(value) {
    if (value) {
      this.setAttribute('href', value);
    }
  }

  get title() {
    return this.getAttribute('title') || ``;
  }
  set title(value) {
    if (value) {
      this.setAttribute('title', value);
    }
  }

  get image() {
    return this.getAttribute('image');
  }
  set image(value) {
    if (value) {
      this.setAttribute('image', value);
    } else {
      this.removeAttribute('image', value);
    }
  }

  get isCustomImage() {
    return this.hasAttribute('is-custom-image');
  }
  set isCustomImage(value) {
    if (value) {
      this.setAttribute('is-custom-image', '');
    } else {
      this.removeAttribute('is-custom-image');
    }
  }

  get openNewTab() {
    return this.hasAttribute('open-newtab');
  }
  set openNewTab(value) {
    if (value) {
      this.setAttribute('open-newtab', '');
    } else {
      this.removeAttribute('open-newtab');
    }
  }

  get hasTitle() {
    return this.hasAttribute('has-title');
  }
  set hasTitle(value) {
    if (value) {
      this.setAttribute('has-title', '');
    } else {
      this.removeAttribute('has-title');
    }
  }

  get hasFavicon() {
    return this.hasAttribute('has-favicon');
  }
  set hasFavicon(value) {
    if (value) {
      this.setAttribute('has-favicon', '');
    } else {
      this.removeAttribute('has-favicon');
    }
  }

  get isDND() {
    return this.hasAttribute('is-dnd');
  }
  set isDND(value) {
    if (value) {
      this.setAttribute('is-dnd', '');
    } else {
      this.removeAttribute('is-dnd');
    }
  }

  get hasFolderPreview() {
    return this.hasAttribute('has-folder-preview');
  }
  set hasFolderPreview(value) {
    if (value) {
      this.setAttribute('has-folder-preview', '');
    } else {
      this.removeAttribute('has-folder-preview');
    }
  }

  get folderChidlren() {
    return this.#_folderChildren;
  }
  set folderChidlren(children) {
    this.#_folderChildren = children;
  }
}

window.customElements.define('vb-bookmark', VbBookmark, { extends: 'a' });
