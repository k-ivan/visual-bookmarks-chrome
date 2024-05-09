export default function(root = null) {
  const els = (root ? root : document).querySelectorAll('[data-locale-message]');

  Array.prototype.slice.call(els).forEach(item => {
    const msg = item.getAttribute('data-locale-message');
    if (!msg) return;

    // if exist params i18nString:param1,param2,paramI18nString
    const params = msg.split(':');
    if (params.length > 1) {
      const arrString = params[1].split(',').map(str => {
        return browser.i18n.getMessage(str) || str;
      });
      item.textContent = browser.i18n.getMessage(params[0], arrString);
    } else {
      // only string without params

      // remove the service pointer to the attribute from the translation string
      // for example, original string  options[.arialabel] can be written as a string + .arialabel(optional)
      const translation = browser.i18n.getMessage(msg.replace(/\..*/, ''));
      if (!translation) return;

      if (~msg.indexOf('placeholder')) {
        item.placeholder = translation;
        return;
      }
      if (~msg.indexOf('.aria-label')) {
        item.setAttribute('aria-label', translation);
        return;
      }
      item.textContent = translation;
    }
  });
}
