import { $createElement } from '../../utils/index';

export function letItSnow() {
  const currentDate = new Date();
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const startDate = new Date(([0, 1].includes(month) ? year - 1 : year), 11, 5); // December 5
  const endDate = new Date((month === 11 ? year + 1 : year), 1, 20); // February 20

  if (currentDate >= startDate && currentDate < endDate) {
    let snowActive = localStorage.getItem('let_it_snow') === 'true';

    const button = $createElement('button', {
      class: 'circ-btn let-it-snow-btn' + (snowActive ? ' is-active' : ''),
      'aria-label': 'Let it snow'
    }, {
      html: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 512 512"><path fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 32v448m57.72-400A111.47 111.47 0 0 1 256 96a111.47 111.47 0 0 1-57.72-16m0 352a112.11 112.11 0 0 1 115.44 0m136.27-288L62.01 368m375.26-150a112.09 112.09 0 0 1-57.71-100M74.73 294a112.09 112.09 0 0 1 57.71 100M62.01 144l387.98 224M74.73 218a112.09 112.09 0 0 0 57.71-100m304.83 176a112.09 112.09 0 0 0-57.71 100"/></svg>`
    });

    window.aside_controls.append(button);

    button.addEventListener('click', () => {
      if (snowActive) {
        localStorage.removeItem('let_it_snow');
      } else {
        localStorage.setItem('let_it_snow', true);
      }
      snowActive = !snowActive;
      button.classList.toggle('is-active', snowActive);
      toggleSnowflake();
    });

    snowActive && window.requestIdleCallback(() => {
      toggleSnowflake();
    });
  }
}

function toggleSnowflake() {
  if (window.snowInstance) {
    window.snowInstance.destroy();
    window.snowInstance = null;
    return;
  }

  import(/* webpackChunkName: "snow" */'./snow.js').then(({ default: Snow }) => {
    window.snowInstance = new Snow({
      total: 30,
      image: '/img/snowflake.webp'
    });
  });
}
