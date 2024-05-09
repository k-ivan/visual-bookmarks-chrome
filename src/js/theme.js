
const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
const colorTheme = () => document.documentElement.classList.toggle('dark', colorScheme.matches);

async function toggleTheme() {
  const { settings } = await browser.storage.local.get('settings');

  if (settings.color_theme === 'os') {
    colorScheme.removeListener(colorTheme);
    colorTheme();
    colorScheme.addListener(colorTheme);
    return true;
  }

  if (settings.color_theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// make it global to have it in js modules
window.vbToggleTheme = toggleTheme;

toggleTheme();
