const Toast = (() => {
  let defaults = {
    position: 'bottom-left',
    modClass: '',
    hideByClick: true,
    delay: 5000,
    onClose: null
  };

  let toast = null;
  let closeBtn = null;
  let timer = null;
  let settings = null;

  function createElement(tag, options) {
    return Object.assign(document.createElement(tag), options);
  }

  function show(data) {
    if (document.getElementById('toast')) {
      return hide(() => show(data));
    }

    settings = { ...defaults };
    if (typeof data === 'string') {
      settings.message = data;
    } else {
      Object.assign(settings, data);
    }

    toast = createElement('div', {
      id: 'toast',
      className: `toast toast--${settings.position}`,
      innerHTML: `<div class="toast__message">${settings.message}</div>`
    });

    if (settings.hideByClick) {
      closeBtn = createElement('button', {
        className: 'toast__btn',
        innerHTML: `<svg version="1.1" width="24" height="24" viewBox="0 0 24 24" fill="#000"><path d="M18.984 6.422l-5.578 5.578 5.578 5.578-1.406 1.406-5.578-5.578-5.578 5.578-1.406-1.406 5.578-5.578-5.578-5.578 1.406-1.406 5.578 5.578 5.578-5.578z"></path></svg>`
      });
      closeBtn.addEventListener('click', closeHandler, { once: true });
      toast.insertAdjacentElement('beforeend', closeBtn);
    }

    document.body.appendChild(toast);

    if (settings.modClass) {
      toast.classList.add(settings.modClass);
    }

    setTimeout(() => {
      toast.classList.add('toast-enter');
    }, 20);

    if (settings.delay) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        hide();
      }, settings.delay);
    }
  }

  function closeHandler(e) {
    e.preventDefault();
    hide();
  }

  function hide(fn) {
    if (!toast) return;
    if (timer) clearTimeout(timer);

    settings.onClose && settings.onClose();
    toast.classList.remove('toast-enter');

    const handler = (e) => {
      if (e.target !== toast) return;
      try {
        closeBtn?.removeEventListener('click', closeHandler);
        toast.remove();
      } catch (error) {}
      toast = null;
      fn && fn();
    };
    toast.addEventListener('transitionend', handler, {
      once: true
    });
  }

  return {
    show
  };
})();

export default Toast;
