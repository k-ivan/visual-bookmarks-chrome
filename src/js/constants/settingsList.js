import { FIREFOX_BROWSER } from './index';

export default [
  {
    key: chrome.i18n.getMessage('view_setting'),
    list: [
      {
        id: 'dial_columns',
        title: chrome.i18n.getMessage('number_of_columns'),
        type: 'select',
        options: [
          { value: 1, title: 1 },
          { value: 2, title: 2 },
          { value: 3, title: 3 },
          { value: 4, title: 4 },
          { value: 5, title: 5 },
          { value: 6, title: 6 },
          { value: 7, title: 7 },
          { value: 8, title: 8 },
          { value: 9, title: 9 },
          { value: 10, title: 10 }
        ]
      },
      {
        id: 'dial_width',
        title: chrome.i18n.getMessage('dial_width'),
        type: 'range',
        min: 50,
        max: 99,
        step: 1,
        data: {
          selectorOutput: '#dial_width_value',
          outputPostfix: '%'
        }
      },
      {
        id: 'color_theme',
        title: chrome.i18n.getMessage('color_theme'),
        type: 'select',
        options: [
          { value: 'dark', title: chrome.i18n.getMessage('dark_theme') },
          { value: 'light', title: chrome.i18n.getMessage('light_theme') },
          { value: 'os', title: chrome.i18n.getMessage('os_theme') }
        ]
      },
      {
        id: 'vertical_center',
        title: chrome.i18n.getMessage('vertical_center'),
        type: 'switch'
      },
      {
        id: 'logo_external',
        title: chrome.i18n.getMessage('logo_external'),
        type: 'switch'
      },
      {
        group: [
          {
            id: 'show_toolbar',
            title: chrome.i18n.getMessage('show_toolbar'),
            type: 'switch'
          },
          ...(
            !FIREFOX_BROWSER && [{
              id: 'search_autofocus',
              title: browser.i18n.getMessage('search_autofocus'),
              type: 'switch'
            }] || []
          )

        ]
      },
      {
        id: 'show_settings_icon',
        title: chrome.i18n.getMessage('show_settings_icon'),
        type: 'switch'
      },
      {
        id: 'show_back_column',
        title: chrome.i18n.getMessage('show_back_column'),
        type: 'switch'
      },
      {
        id: 'show_create_column',
        title: chrome.i18n.getMessage('show_create_column'),
        type: 'switch'
      },
      {
        id: 'show_bookmark_title',
        title: chrome.i18n.getMessage('show_bookmark_title'),
        type: 'switch'
      },
      {
        id: 'show_favicon',
        title: chrome.i18n.getMessage('show_favicon'),
        type: 'switch'
      },
      {
        id: 'background_image',
        title: chrome.i18n.getMessage('background'),
        type: 'select',
        options: [
          { value: 'background_noimage', title: chrome.i18n.getMessage('background_noimage') },
          { value: 'background_external', title: chrome.i18n.getMessage('background_external') },
          { value: 'background_local', title: chrome.i18n.getMessage('background_local') }
        ]
      }
    ]
  },
  {
    key: chrome.i18n.getMessage('general_setting'),
    list: [
      {
        id: 'default_folder_id',
        title: chrome.i18n.getMessage('default_folder_id'),
        note: chrome.i18n.getMessage('option_not_sync'),
        type: 'vb-select-folders',
        options: []
      },
      {
        id: 'search_engine',
        title: chrome.i18n.getMessage('search_engine'),
        type: 'select',
        options: []
      },
      {
        id: 'services_enable',
        title: chrome.i18n.getMessage('services_enable'),
        type: 'switch'
      },
      {
        id: 'folder_preview',
        title: chrome.i18n.getMessage('folder_preview'),
        note: chrome.i18n.getMessage('folder_preview_description'),
        type: 'switch'
      },
      {
        group: [
          {
            id: 'thumbnails_update_button',
            title: chrome.i18n.getMessage('thumbnails_update_button'),
            note: chrome.i18n.getMessage('thumbnails_update_warn'),
            type: 'switch'
          },
          {
            id: 'auto_generate_thumbnail',
            title: chrome.i18n.getMessage('auto_generate_thumbnail'),
            type: 'switch'
          },
          {
            id: 'thumbnails_update_delay',
            title: chrome.i18n.getMessage('thumbnails_update_delay'),
            note: chrome.i18n.getMessage('thumbnails_update_delay_note'),
            type: 'range',
            min: 0.5,
            max: 15,
            step: 0.5,
            data: {
              selectorOutput: '#thumbnail_delay_output',
              outputPostfix: 's'
            }
          },
          {
            id: 'thumbnails_update_recursive',
            title: chrome.i18n.getMessage('thumbnails_update_recursive'),
            note: chrome.i18n.getMessage('thumbnails_update_recursive_note', [
              chrome.i18n.getMessage('thumbnails_update_button')
            ]),
            type: 'switch'
          }
        ]
      },
      {
        id: 'open_link_newtab',
        title: chrome.i18n.getMessage('open_link_newtab'),
        type: 'switch'
      },
      {
        id: 'move_to_start',
        title: chrome.i18n.getMessage('move_to_start'),
        type: 'switch'
      },
      {
        id: 'drag_and_drop',
        title: chrome.i18n.getMessage('drag_and_drop'),
        type: 'switch',
        data: {
          relationToggleId: 'sort_by_date,bookmarks_sorting_type'
        }
      },
      {
        group: [
          {
            id: 'sort_by_date',
            title: chrome.i18n.getMessage('sort_by_date'),
            note: chrome.i18n.getMessage('bookmarks_sorting_warning'),
            type: 'switch',
            data: {
              relationToggleId: 'drag_and_drop'
            }
          },
          {
            id: 'bookmarks_sorting_type',
            title: chrome.i18n.getMessage('bookmarks_sorting_type'),
            note: chrome.i18n.getMessage('bookmarks_sorting_warning'),
            type: 'select',
            data: {
              relationToggleId: 'drag_and_drop',
              relationToggleValues: 'folders_top,folders_bottom'
            },
            options: [
              { value: '', title: chrome.i18n.getMessage('not_sorting') },
              { value: 'folders_top', title: chrome.i18n.getMessage('folders_on_top') },
              { value: 'folders_bottom', title: chrome.i18n.getMessage('folders_at_the_bottom') }
            ]
          }
        ]
      },
      {
        group: [
          {
            id: 'show_contextmenu_item',
            title: chrome.i18n.getMessage('show_contextmenu_item'),
            type: 'switch'
          },
          {
            id: 'close_tab_after_adding_bookmark',
            title: chrome.i18n.getMessage('close_tab_after_adding_bookmark'),
            note: chrome.i18n.getMessage('close_tab_after_adding_bookmark_note'),
            type: 'switch'
          }
        ]
      },
      {
        id: 'enable_virtual_pagination',
        title: chrome.i18n.getMessage('enable_virtual_pagination'),
        note: chrome.i18n.getMessage('enable_virtual_pagination_note'),
        type: 'switch'
      },
      {
        id: 'enable_sync',
        title: chrome.i18n.getMessage('enable_sync'),
        type: 'switch'
      }
    ]
  },
  {
    key: chrome.i18n.getMessage('advanced_setting'),
    list: [
      {
        id: 'without_confirmation',
        title: chrome.i18n.getMessage('without_confirmation'),
        type: 'switch'
      },
      {
        id: 'clear_images',
        title: chrome.i18n.getMessage('clear_background_locals'),
        type: 'button',
        text: chrome.i18n.getMessage('btn_apply')
      },
      {
        id: 'restore_local',
        title: chrome.i18n.getMessage('reset_local_default'),
        type: 'button',
        text: chrome.i18n.getMessage('btn_apply')
      },
      {
        id: 'restore_sync',
        title: chrome.i18n.getMessage('reset_sync_text'),
        type: 'button',
        text: chrome.i18n.getMessage('btn_apply')
      },
      {
        id: 'custom_style',
        title: chrome.i18n.getMessage('custom_style'),
        type: 'textarea',
        spellcheck: false,
        placeholder: chrome.i18n.getMessage('placeholder_input_customstyle')
      },
      {
        id: 'backup',
        title: chrome.i18n.getMessage('backup_settings'),
        note: chrome.i18n.getMessage('backup_settings_description'),
        type: 'backup',
        import: {
          id: 'import',
          accept: '.backup'
        },
        export: {
          id: 'export'
        }
      }
    ]
  }
];
