import { $createElement, $imageLoaded } from '../utils';
import { settings } from '../settings';
import Toast from '../components/toast';
import ImageDB from '../api/imageDB';
import { getBingImage } from '../api/bingImageDay';
import { containsPermissions } from '../api/permissions';

function createBingInfo(image) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 20 20');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  // eslint-disable-next-line max-len
  path.setAttribute('d', 'M10 18c.87 0 1.71-.14 2.494-.396a8 8 0 0 1-.974-1.63C11.024 16.675 10.486 17 10 17c-.657 0-1.407-.59-2.022-1.908A9.3 9.3 0 0 1 7.42 13.5h3.584q.019-.514.137-1H7.206A15 15 0 0 1 7 10c0-.883.073-1.725.206-2.5h5.588c.12.704.192 1.463.204 2.258q.453-.31.986-.5a16 16 0 0 0-.177-1.758h2.733c.21.549.353 1.131.419 1.736q.562.193 1.037.517A8 8 0 1 0 10 18m0-15c.657 0 1.407.59 2.022 1.908.217.466.406 1.002.559 1.592H7.419c.153-.59.342-1.126.56-1.592C8.592 3.59 9.342 3 10 3M7.072 4.485A10.5 10.5 0 0 0 6.389 6.5H3.936a7.02 7.02 0 0 1 3.778-3.118c-.241.33-.456.704-.642 1.103M6.192 7.5A16 16 0 0 0 6 10c0 .87.067 1.712.193 2.5H3.46A7 7 0 0 1 3 10c0-.88.163-1.724.46-2.5zm.197 6c.176.743.407 1.422.683 2.015.186.399.401.773.642 1.103A7.02 7.02 0 0 1 3.936 13.5zm5.897-10.118A7.02 7.02 0 0 1 16.064 6.5H13.61a10.5 10.5 0 0 0-.683-2.015 6.6 6.6 0 0 0-.642-1.103M19 13.682c0-2.033-1.465-3.681-3.499-3.681S12 11.649 12 13.682c0 1.524.982 3.53 3.256 5.236.145.11.345.11.49 0C18.022 17.212 19 15.206 19 13.682m-2-.182a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0');
  svg.appendChild(path);

  const copyright = image.copyright.match(/\(([^)]*)\)/)?.[1];

  return $createElement('a',
    {
      class: 'bing-info',
      href: image.copyrightlink,
      title: image.copyright.replace(/\(.+\)/, '')
    },
    svg,
    $createElement('div',
      {
        class: 'bing-info__text'
      },
      $createElement('div', { class: 'bing-info__title' }, image.title),
      $createElement('div', { class: 'bing-info__copy' }, copyright)
    )
  );
}

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

    if (!['background_local', 'background_external', 'background_bing'].includes(bgState)) {
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
    } else if (bgState === 'background_external') {
      resource = settings.$.background_external;
    } else {
      const bingHostPermission = await containsPermissions({ origins: ['https://www.bing.com/*'] });
      if (!bingHostPermission) {
        return Toast.show({
          message: browser.i18n.getMessage('bing_permission_toast'),
          delay: 0
        });
      }


      const response = await getBingImage();
      resource = response?.imageurl;
      if (resource) {
        const bingNode = createBingInfo(response);
        document.body.append(bingNode);
      }
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
      // const paddingInline = `${circBtnSize + 20}px ${circBtnSize + 30}px`;
      doc.style.setProperty('--container-padding-inline', `${circBtnSize + 20}px`);
    }

    // Calculate column dimensions
    const colWidth = Math.floor((grid.offsetWidth - ((columns - 1) * gap)) / columns);
    // if column width less than 80px do not update styles
    doc.style.setProperty('--grid-columns', colWidth < 80 ? '' : columns);
  }
};
