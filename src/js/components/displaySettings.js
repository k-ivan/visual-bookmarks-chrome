import { $createElement } from '../utils';

function createSwitch(setting) {
  const input = $createElement('input', {
    id: setting.id,
    type: 'checkbox',
    name: setting.id,
    class: 'switch__input js-change'
  });

  Object.assign(input.dataset, setting.data);

  const switchElement = $createElement('div',
    {
      class: 'switch'
    },
    input,
    $createElement('label', {
      class: 'switch__label',
      for: setting.id
    })
  );

  if (setting.id === 'logo_external') {
    return switchElement.outerHTML + createExternalLogoSetting(setting);
  }

  return switchElement.outerHTML;
}

function createSelect(setting) {
  const selectElement = $createElement(
    'select',
    {
      id: setting.id,
      name: setting.id,
      class: 'form-control js-change'
    },
    {
      html: setting.options
        .map(
          (option) => {
            return `<option value="${option.value}"${option.selected ? ' selected' : ''}>${option.title}</option>`;
          }
        )
        .join('')
    }
  );
  Object.assign(selectElement.dataset, setting.data);

  if (setting.id === 'background_image') {
    return selectElement.outerHTML + createBackgroundSetting(setting);
  }

  return selectElement.outerHTML;
}

function createTextarea(setting) {
  const textarea = $createElement('textarea', {
    class: 'is-editor form-control js-change',
    name: setting.id,
    id: setting.id,
    spellcheck: setting.spellcheck,
    placeholder: setting.placeholder
  });
  Object.assign(textarea.dataset, setting.data);

  return textarea.outerHTML;
}

function createRange(setting) {
  const range = $createElement('input', {
    type: setting.type,
    class: 'range__input js-range',
    id: setting.id,
    name: setting.id,
    min: setting.min,
    max: setting.max,
    step: setting.step
  });

  Object.assign(range.dataset, setting.data);

  const rangeElement = $createElement(
    'div',
    {
      class: 'range'
    },
    range,
    $createElement('span', {
      id: setting.data.selectorOutput.replace('#', '')
    })
  );

  return rangeElement.outerHTML;
}

function createButton(setting) {
  return $createElement(
    'button',
    {
      class: 'btn md-ripple',
      id: setting.id
    },
    setting.text
  ).outerHTML;
}

function createVbSelect(setting) {
  return $createElement('vb-select-folders', {
    id: setting.id,
    class: 'js-change'
  }).outerHTML;
}

function createExternalLogoSetting() {
  return /* html */`<input
    type="text"
    name="logo_external_url"
    id="logo_external_url"
    class="form-control js-change"
    placeholder="https://img.logo.dev/{{website}}"
    spellcheck="false"
    value=""
    data-locale-message="external"
    style="margin-top: 5px">
    <small>${browser.i18n.getMessage('example_string', '<code>https://img.logo.dev/{{website}}</code>')}</small>`;
}

function createBackup(setting) {
  return /* html */`<div class="btn-group btn-group--full">
      <div class="c-upload btn">
        <input type="file" name="import" id="${setting.import.id}" class="c-upload__input" accept="${setting.import.accept}">
        <label for="${setting.import.id}" class="c-upload__btn md-ripple"><span class="c-upload__name">${browser.i18n.getMessage(setting.import.id)}</span></label>
      </div>
      <button class="btn md-ripple" id="${setting.export.id}">${browser.i18n.getMessage(setting.export.id)}</button>
    </div>`;
}

function createBackgroundSetting() {
  return (/* html */
  `<div id="background_noimage" class="tbl__option js-background-settings js-change text-muted" hidden>${browser.i18n.getMessage('background_noimage_text')}</div>
  <div id="background_bing" class="tbl__option js-background-settings js-change text-muted" hidden>${browser.i18n.getMessage('background_bing_text')}</div>
  <div id="background_local" class="tbl__option js-background-settings">
    <div class="c-upload">
      <form action="#0" method="post">
        <input type="file" name="upload" id="bgFile" class="c-upload__input">
        <label for="bgFile" class="c-upload__btn md-ripple">
          <svg width="20" height="20" class="c-upload__icon"><use xlink:href="/img/symbol.svg#upload_outline"></use></svg>
          <span class="c-upload__name" data-locale-message="choose_file">Изображение или видео</span>
        </label>
      </form>
      <div class="c-upload__preview">
        <div class="c-upload__remove">
          <button class="md-ripple" data-ripple-center id="delete_upload">
            <svg width="20" height="20"><use xlink:href="/img/symbol.svg#close"></use></svg>
          </button>
        </div>
        <div id="preview_upload">
          <div class="c-upload__preview-image"></div>
        </div>
      </div>
    </div>
  </div>
  <input type="url" id="background_external" name="external" class="form-control js-change tbl__option js-background-settings" placeholder="https://source.unsplash.com/1920x1080/daily?landscape" spellcheck="false">`);
}

function create(setting) {
  let method;

  switch (setting.type) {
    case 'switch':
      method = createSwitch;
      break;
    case 'select':
      method = createSelect;
      break;
    case 'range':
      method = createRange;
      break;
    case 'textarea':
      method = createTextarea;
      break;
    case 'button':
      method = createButton;
      break;
    case 'vb-select-folders':
      method = createVbSelect;
      break;
    case 'backup':
      method = createBackup;
      break;
  }
  return method(setting);
}

function createRow(setting, row = false) {
  const classRow = row ? 'tbl__row' : 'tbl';
  const hidden = setting.hidden ? ' hidden' : '';
  return /* html */ `<div id="setting_${setting.id}" class="${classRow}"${hidden}>
    <div class="tbl__setting">
      ${setting.title}
      ${
        setting.note
          ? `<small class="text-muted">${setting.note}</small>`
          : ``
      }
    </div>
    <div class="tbl__value">${create(setting)}</div>
  </div>`;
}

export function displaySettings(settings) {
  const tabs = [];
  const sections = [];

  settings.forEach((setting) => {
    tabs.push(`<div class="tabs__controls md-ripple">${setting.key}</div>`);

    const list = setting?.list?.map((item) => {
      if (item.group) {
        return `<div class="tbl">
            ${item.group.map((settingItem) => createRow(settingItem, 'row')).join('')}
          </div>`;
      } else {
        return createRow(item);
      }
    }).join('');

    sections.push(`<div class="tabs__section">${list ?? ''}</div>`);
  });

  return (/* html*/
  `<div class="tabs">
      <div class="tabs__bar-wrap">
        <div class="tabs__bar">
          ${tabs.join('')}
        </div>
      </div>
      <div class="tabs__content">
        ${sections.join('')}
      </div>
      <div class="tabs__footer">
        <a href="newtab.html" id="save_btn" class="btn md-ripple">${browser.i18n.getMessage('btn_back')}</a>
      </div>
    </div>
  `);
}
