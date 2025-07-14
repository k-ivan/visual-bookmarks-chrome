import { $createElement } from '../utils';

const Toast = (() => {
  const DEFAULTS = {
    position: 'bottom-left',
    modClass: '',
    hideByClick: true,
    delay: 5000,
    progress: false,
    message: '',
    action: undefined,
    onClose: undefined,
    onShow: undefined
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
    let actionBtn = null;
    let closeBtn = null;
    let clickByManual = false;
    let timer = null;

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

    function onActionClick(evt) {
      settings.action?.callback?.(evt, hideToast);
    }
    function hideToast(evt) {
      if (clickByManual) return;

      if (evt) {
        // if (!evt.target.closest('.toast__btn')) return;
        clickByManual = true;
      }

      toast.classList.add('is-deleting');

      closeBtn?.removeEventListener('click', hideToast);
      closeBtn = null;
      actionBtn?.removeEventListener('click', onActionClick);
      actionBtn = null;

      clearTimeout(timer);

      setTimeout(() => {
        toast.remove();
        settings.onClose?.();
      }, 250);
    }

    if (settings.action) {
      actionBtn = $createElement('button', {
        class: 'toast__action',
        'data-action': ''
      }, {
        html: settings.action.html
      });
      if (settings.action.class) {
        actionBtn.classList.add(...settings.action.class);
      }
      toast.append(actionBtn);
      actionBtn.addEventListener('click', onActionClick);
    }

    if (settings.hideByClick) {
      closeBtn = $createElement('button', {
        class: 'toast__btn',
        'aria-label': 'Close'
      }, {
        html: `<svg version="1.1" width="24" height="24" viewBox="0 0 24 24" fill="#000"><path d="M18.984 6.422l-5.578 5.578 5.578 5.578-1.406 1.406-5.578-5.578-5.578 5.578-1.406-1.406 5.578-5.578-5.578-5.578 1.406-1.406 5.578 5.578 5.578-5.578z"></path></svg>`
      });
      toast.append(closeBtn);
      closeBtn.addEventListener('click', hideToast);
    }

    const container = containers[settings.position];
    settings.position.startsWith('top')
      ? container.el.prepend(toast)
      : container.el.append(toast);

    settings?.onShow?.();

    setTimeout(() => {
      toast.classList.add('toast-enter');
    }, 16);

    if (settings.delay) {
      toast.style.setProperty('--toast-delay', `${settings.delay}ms`);
      settings.progress && toast.classList.add('toast--progress');

      timer = setTimeout(hideToast, settings.delay);
    }
  }

  init();

  return {
    show
  };
})();

export default Toast;
