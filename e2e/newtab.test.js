import { bootstrap } from './bootstrap';
import { beforeAll, afterAll, describe, expect, it } from '@jest/globals';

const DEFAULT_BOOKMARKS = [
  { title: 'google', url: 'https://google.com' },
  { title: 'youtube', url: 'https://youtube.com' },
  { title: 'folder', url: '' }
];

describe('visual bookmark tests', () => {
  let extPage, browser;

  beforeAll(async() => {
    const context = await bootstrap({ devtools: true });
    extPage = context.extPage;
    browser = context.browser;

    await extPage.waitForSelector('#add');
    for (const bookmark of DEFAULT_BOOKMARKS) {
      const { title, url } = bookmark;

      // added some default bookmarks
      await extPage.click('#add');
      await extPage.type('#title', title),
      await extPage.type('#url', url);
      await extPage.evaluate(({ title, url }) => {
        document.getElementById('title').value =  title;
        document.getElementById('url').value =  url;
      }, bookmark);

      await extPage.click('#saveBookmarkBtn');
    }
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
