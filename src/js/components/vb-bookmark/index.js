// import styles from '../../../css/components/_bookmark.css';
import { $createElement, $getDomain, faviconURL } from '../../utils';
import { SVG_LOADER } from '../../constants';

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
      const imageEl = this.querySelector('[data-thumb]');
      const newThumbnail = this.#createBookmarkThumbnail();
      queueMicrotask(() => {
        imageEl.replaceWith(newThumbnail);
      });

      if (!this.isFolder) {
        this.#updateLogo();
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
      const fragment = document.createDocumentFragment();
      const bookmark = $createElement('div', { class: 'bookmark__img bookmark__img--children' });

      this.#_folderChildren.forEach(child => {
        const el = bookmark.cloneNode(true);
        if (child.image) {
          el.classList.add('bookmark__img--contain');
          el.style.backgroundImage = `url('${child.image}')`;
        } else {
          el.classList.add('bookmark__img--logo');
          el.style.backgroundImage = `url('${this.#logoUrl(child.url)}')`;
        }
        fragment.appendChild(el);
      });

      return fragment;
    }
    return null;
  }

  #createContextButton() {
    return $createElement('button', {
      type: 'button',
      class: 'bookmark__action',
      'aria-label': browser.i18n.getMessage('bookmark_context')
    });
  }

  #createBookmarkCaption() {
    const caption = $createElement('div', {
      class: 'bookmark__caption'
    });
    if (this.hasFavicon) {
      const favicon = $createElement('img', {
        class: 'bookmark__favicon',
        width: 16,
        height: 16,
        src: this.isFolder ? '/img/folder.svg' : this.faviconUrl,
        alt: ''
      });
      caption.appendChild(favicon);
    }

    const title = $createElement('span', {
      class: 'bookmark__title'
    }, this.title);

    caption.appendChild(title);

    return caption;
  }

  #createBookmarkThumbnail() {
    const thumbnail = $createElement('div', { 'data-thumb': '' });

    if (this.image) {
      thumbnail.classList.add('bookmark__img');
      thumbnail.classList.toggle('bookmark__img--contain', this.isCustomImage || this.isFolder);
      thumbnail.style.backgroundImage = `url('${this.image}')`;
    } else if (!this.isFolder) {
      thumbnail.classList.add('bookmark__img', 'bookmark__img--logo');
      thumbnail.classList.toggle('bookmark__img--external', this.#externalLogo);
      thumbnail.style.backgroundImage = `url('${this.#logoUrl(this.url)}')`;
    } else if (this.isFolder) {
      if (this.hasFolderPreview) {
        thumbnail.classList.add('bookmark__summary-folder');
        const children = this.#renderFolderPreview();
        children
          ?  thumbnail.appendChild(children)
          : thumbnail.classList.add('bookmark__img', 'bookmark__img--folder');
      } else {
        thumbnail.classList.add('bookmark__img', 'bookmark__img--folder');
      }
    }

    return thumbnail;
  }

  #render() {
    this.innerHTML = '';
    this.classList.add('bookmark');
    if (this.openNewTab && !this.isFolder) {
      this.setAttribute('target', '_blank');
    }

    this.append(
      this.#createContextButton(),
      this.#createBookmarkThumbnail()
    );

    if (this.hasTitle) {
      this.append(this.#createBookmarkCaption());
    }

    if (this.isDND) {
      this.append($createElement('div', {
        class: 'dropzone-bookmark',
        'data-id': this.id
      }));
    }
  }

  #logoUrl(url) {
    if (!this.#canDisplayLogo(url)) {
      return '/img/black-hole.svg';
    }

    return this.#externalLogo
      ? this.#externalLogo.replace('{{website}}', $getDomain(url))
      : faviconURL(url, 32);
  }

  #canDisplayLogo(url) {
    const urlLink = url ?? this.url;
    return /^https?:\/\/.+|^#.+/.test(urlLink);
  }

  get serviceLogo() {
    return this.#externalLogo;
  }
  set externalLogo(value) {
    this.#externalLogo = value;
  }

  get faviconUrl() {
    if (!this.#canDisplayLogo()) {
      return '/img/black-hole.svg';
    }
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
