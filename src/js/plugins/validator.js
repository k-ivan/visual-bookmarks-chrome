export function Validator(form, options = {
  onError: null,
  onSuccess: null
}) {
  function handleInput(e) {
    const { target } = e;
    toggleErrors(target);
  }
  function handleSubmit(e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      for (const item of form.elements) {
        if (!item.willValidate || item.tagName === 'BUTTON') continue;
        toggleErrors(item);
      }

      form.querySelector('.has-error')?.focus();
      options.onError?.(e);
      return;
    }

    options.onSuccess?.(e);
  }
  function handleReset() {
    form.querySelectorAll('.has-error').forEach(item => {
      item.classList.remove('has-error');
      item.errorNode?.remove();
      item.errorNode = null;
    });
  }
  function toggleErrors(target) {
    const isValid = target.validity.valid;
    if (!isValid) {
      if (target.errorNode) return;
      target.errorNode = Object.assign(document.createElement('div'), {
        className: 'error-hint',
        textContent: browser.i18n.getMessage(target.dataset.errorI18n)
      });
      target.classList.add('has-error');
      target.after(target.errorNode);
    } else {
      target.errorNode?.remove();
      target.errorNode = null;
      target.classList.remove('has-error');
    }
    return isValid;
  }

  form.addEventListener('submit', handleSubmit);
  form.addEventListener('input', handleInput);
  form.addEventListener('reset', handleReset);

  return () => {
    form.removeEventListener('submit', handleSubmit);
    form.removeEventListener('input', handleInput);
    form.removeEventListener('reset', handleReset);
  };
}
