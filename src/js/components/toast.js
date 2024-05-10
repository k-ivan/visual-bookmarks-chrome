import { $createElement } from '../utils';

const Toast = (() => {
  const DEFAULTS = {
    position: 'bottom-left',
    modClass: '',
    hideByClick: true,
    delay: 5000,
    message: '',
    onClose: null
  };

  const containers = {
    'top': {
      el: createContainer('top')
    },
    'top-left': {
      el: createContainer('top-left')
    },
    'top-right': {
      el: createContainer('top-right')
    },
    'bottom': {
      el: createContainer('bottom')
    },
    'bottom-left': {
      el: createContainer('bottom-left')
    },
    'bottom-right': {
      el: createContainer('bottom-right')
    }
  };

  function init() {
    const fragment = document.createDocumentFragment();
    Object.keys(containers).forEach(key => fragment.append(containers[key].el));

    document.body.append(fragment);
  }

  function createContainer(position) {
    return $createElement('div', {
      class: `toast-container toast-container${position ? `--${position}` : ''}`
    });
  }

  function show(data) {
    let clickByManual = false;
    const settings = { ...DEFAULTS };

    if (typeof data === 'string') {
      settings.message = data;
    } else {
      Object.assign(settings, data);
    }

    const toast = $createElement('div', {
      class: `toast toast--${settings.position}`
    }, {
      html: `<div class="toast__message">${settings.message}</div>`
    });

    const hideToast = (evt) => {
      if (clickByManual) return;

      if (evt) {
        if (!evt.target.closest('.toast__btn')) return;
        clickByManual = true;
      }

      toast.classList.add('is-deleting');
      toast.removeEventListener('click', hideToast);
      setTimeout(() => {
        toast.remove();
        settings.onClose?.();
      }, 250);
    };

    if (settings.hideByClick) {
      const closeBtn = $createElement('button', {
        class: 'toast__btn',
        'aria-label': 'Close'
      }, {
        html: `<svg version="1.1" width="24" height="24" viewBox="0 0 24 24" fill="#000"><path d="M18.984 6.422l-5.578 5.578 5.578 5.578-1.406 1.406-5.578-5.578-5.578 5.578-1.406-1.406 5.578-5.578-5.578-5.578 1.406-1.406 5.578 5.578 5.578-5.578z"></path></svg>`
      });
      toast.append(closeBtn);
      toast.addEventListener('click', hideToast);
    }

    const container = containers[settings.position];
    settings.position.startsWith('top')
      ? container.el.prepend(toast)
      : container.el.append(toast);
    // container.el.append(toast)

    setTimeout(() => {
      toast.classList.add('toast-enter');
    }, 16);

    if (settings.delay) {
      setTimeout(hideToast, settings.delay);
    }
  }

  init();

  return {
    show
  };
})();

export default Toast;
