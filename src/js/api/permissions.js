export async function containsPermissions({ permissions, origins }) {
  return await browser.permissions.contains({ permissions, origins });
}

export async function requestPermissions({ permissions, origins }) {
  return await browser.permissions.request({ permissions, origins });
}

export async function removePermissions({ permissions }) {
  return await browser.permissions.remove({ permissions });
}
