import path from 'path';
import puppeteer from 'puppeteer';

const EXTENSION_DIR = path.join(process.cwd(), '/extension');

async function bootstrap(options = {}) {
  const { devtools = false, slowMo = false } = options;
  const browser = await puppeteer.launch({
    headless: false,
    devtools,
    args: [
      `--disable-extensions-except=${EXTENSION_DIR}`,
      `--load-extension=${EXTENSION_DIR}`
    ],
    ...(slowMo && { slowMo })
  });

  const backgroundPageTarget = await browser.waitForTarget(
    target => target.type() === 'service_worker'
  );

  const partialExtensionUrl = backgroundPageTarget.url() || '';
  const [, , extensionId] = partialExtensionUrl.split('/');

  const extPage = await browser.newPage();
  const extensionUrl = `chrome-extension://${extensionId}/newtab.html`;
  await extPage.goto(extensionUrl, { waitUntil: 'load' });

  return {
    browser,
    extensionUrl,
    extPage
  };
}

export { bootstrap };
