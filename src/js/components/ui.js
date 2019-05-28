import Helpers from './helpers';

export default {
  toggleTheme() {
    const hasDark = (localStorage.getItem('dark_theme') === 'true');

    if (hasDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
  setBG() {
    const bgEl = document.getElementById('bg');
    const bgState = localStorage.getItem('background_image');

    if (!['background_local', 'background_external'].includes(bgState)) {
      return;
    }
    const resource = localStorage.getItem(bgState);

    if (resource && resource !== '') {
      Helpers.imageLoaded(resource, {
        done(data) {
          document.body.classList.add('has-image');
          bgEl.style.backgroundImage = `url('${data}')`;
          bgEl.style.opacity = 1;
        },
        fail(e) {
          console.warn(`Local background image resource problem: ${e}`);
          bgEl.style.opacity = 1;
        }
      });
    }
  },
  calculateStyles() {
    const doc = document.documentElement;
    const grid = document.getElementById('bookmarks');
    const gap = parseInt(window.getComputedStyle(doc).getPropertyValue('--grid-gap'), 10);
    const columns = parseInt(localStorage.getItem('dial_columns'));
    const ratio = 4 / 3;

    // Calculate and set container width
    const lsGridWidth = parseInt(localStorage.getItem('dial_width'));
    const gridWidth = Math.floor(window.innerWidth * (lsGridWidth / 100));

    // const lsGridWidth = parseInt(localStorage.getItem('dial_width'));
    // const gridWidth = Math.floor(window.innerWidth * (lsGridWidth / 100));

    doc.style.setProperty('--container-width', `${gridWidth}px`);

    // Calculate column dimensions
    const colWidth = Math.floor((grid.offsetWidth - ((columns - 1) * gap)) / columns);
    const colHeight = Math.floor(colWidth / ratio);

    // if column width less than 120px do not update styles
    if (colWidth < 120) {
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
