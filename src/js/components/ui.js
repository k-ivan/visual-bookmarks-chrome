import { $imageLoaded } from '../utils';
import { settings } from '../settings';
import ImageDB from '../api/imageDB';


const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
const colorTheme = () => document.documentElement.classList.toggle('dark', colorScheme.matches);

export default {
  toggleTheme() {
    const theme = settings.$.color_theme;

    if (theme === 'os') {
      colorScheme.removeListener(colorTheme);
      colorTheme();
      colorScheme.addListener(colorTheme);
      return true;
    }

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
  userStyles() {
    const styles = settings.$.custom_style;
    if (!styles) return;

    const style = document.createElement('style');
    style.appendChild(document.createTextNode(styles));
    document.head.appendChild(style);
  },
  async setBG() {
    const bgEl = document.getElementById('bg');
    const bgState = settings.$.background_image;

    if (!['background_local', 'background_external'].includes(bgState)) {
      return;
    }

    let resource;
    if (bgState === 'background_local') {
      const image = await ImageDB.get('background');
      if (image?.blob) {
        resource = URL.createObjectURL(image.blob);
      }
    } else {
      resource = settings.$.background_external;
    }

    if (!resource) return;

    bgEl.style.backgroundImage = `url('${resource}')`;

    if (resource && resource !== '') {
      $imageLoaded(resource)
        .then(() => {
          (bgState === 'background_local') && URL.revokeObjectURL(resource);
          document.body.classList.add('has-image');
          bgEl.style.opacity = 1;
        })
        .catch(e => {
          console.warn(`Local background image resource problem: ${e}`);
          bgEl.style.opacity = 1;
        });
    }
  },
  calculateStyles() {
    const doc = document.documentElement;
    const grid = document.getElementById('bookmarks');
    const gap = parseInt(window.getComputedStyle(doc).getPropertyValue('--grid-gap'), 10);
    const columns = parseInt(settings.$.dial_columns);
    const ratio = 4 / 3;

    // Calculate and set container width
    const lsGridWidth = parseInt(settings.$.dial_width);
    const gridWidth = Math.floor(window.innerWidth * (lsGridWidth / 100));

    doc.style.setProperty('--container-width', `${gridWidth}px`);

    // if there is at least one button and the width of the container is greater than 95
    // set container inline padding
    // to avoid overlaying the container on the buttons
    // on the right the padding is larger due to the scrollbar
    if ((
      settings.$.show_settings_icon ||
      settings.$.thumbnails_update_button ||
      settings.$.services_enable
    ) && lsGridWidth >= 95
    ) {
      doc.style.setProperty('--container-padding-inline', '50px 60px');
    }

    // Calculate column dimensions
    const colWidth = Math.floor((grid.offsetWidth - ((columns - 1) * gap)) / columns);
    const colHeight = Math.floor(colWidth / ratio);

    // if column width less than 80px do not update styles
    if (colWidth < 80) {
      doc.style.setProperty('--grid-column-width', '');
      doc.style.setProperty('--grid-row-height', '');
      doc.style.setProperty('--grid-columns', '');
      return;
    }

    doc.style.setProperty('--grid-column-width', `${colWidth}px`);
    doc.style.setProperty('--grid-row-height', `${colHeight}px`);
    doc.style.setProperty('--grid-columns', columns);
  }
};
