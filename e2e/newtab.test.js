import { bootstrap } from './bootstrap';
import { beforeAll, afterAll, describe, expect, it } from '@jest/globals';

describe('visual bookmark tests', () => {
  let extPage, browser;

  beforeAll(async() => {
    const context = await bootstrap({ devtools: true });
    extPage = context.extPage;
    browser = context.browser;
  });

  // for example
  it('should be a title', async() => {
    // 3. When the user goes to the chrome extension
    await extPage.bringToFront();
    const titleText = await extPage.evaluate(() => document.title);
    expect(titleText).toEqual('Visual bookmarks');
  });

  afterAll(async() => {
    await browser.close();
  });
});
