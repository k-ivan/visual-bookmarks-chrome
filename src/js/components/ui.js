import { $createElement, $imageLoaded } from '../utils';
import { settings } from '../settings';
import ImageDB from '../api/imageDB';

export default {
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
    let hasVideo = false;
    if (bgState === 'background_local') {
      const image = await ImageDB.get('background');
      if (image?.blob) {
        resource = URL.createObjectURL(image.blob);
        hasVideo = image.blob.type.startsWith('video');
      }
    } else {
      resource = settings.$.background_external;
    }

    if (!resource) return;

    if (resource && resource !== '') {
      if (hasVideo) {
        const video = $createElement('video', {
          src: resource
        });
        video.muted = true;
        video.loop = true;
        video.autoplay = true;

        bgEl.append(video);

        video.addEventListener('canplay', () => {
          bgEl.style.opacity = 1;
          document.body.classList.add('has-image');
        }, { once: true });
      } else {
        bgEl.style.backgroundImage = `url('${resource}')`;
        $imageLoaded(resource)
          .then(() => {
            (bgState === 'background_local') && URL.revokeObjectURL(resource);
            document.body.classList.add('has-image');
          })
          .catch(e => {
            console.warn(`Local background image resource problem: ${e}`);
          })
          .finally(() => {
            bgEl.style.opacity = 1;
          });
      }
    }
  },
  calculateStyles() {
    const doc = document.documentElement;
    const grid = document.getElementById('bookmarks');
    const gap = parseInt(window.getComputedStyle(doc).getPropertyValue('--grid-gap'));
    const columns = parseInt(settings.$.dial_columns);
    const lsGridWidth = parseInt(settings.$.dial_width);

    const mediaQuery = window.matchMedia('(width > 480px)');
    const containerWidth = mediaQuery.matches ? lsGridWidth : 100;
    doc.style.setProperty('--container-width', `${containerWidth}%`);

    // if there is at least one button and the width of the container is greater than 95
    // set container inline padding
    // to avoid overlaying the container on the buttons
    // on the right the padding is larger due to the scrollbar
    if ((
      settings.$.show_settings_icon ||
      settings.$.thumbnails_update_button ||
      settings.$.services_enable
    ) && lsGridWidth >= 85
    ) {
      const circBtnSize = parseInt(window.getComputedStyle(doc).getPropertyValue('--circ-btn-size'));
      // button size + small padding
      // value = left right(increased padding for the scrollbar)
      const paddingInline = `${circBtnSize + 20}px ${circBtnSize + 30}px`;
      doc.style.setProperty('--container-padding-inline', paddingInline);
    }

    // Calculate column dimensions
    const colWidth = Math.floor((grid.offsetWidth - ((columns - 1) * gap)) / columns);
    // if column width less than 80px do not update styles
    doc.style.setProperty('--grid-columns', colWidth < 80 ? '' : columns);
  }
};
