import { storage } from './storage';

const BING_BASE_URL = 'https://www.bing.com';

/**
 * Fetches the Bing image of the day metadata.
 *
 * @returns {Promise<Object>} A promise that resolves to the image metadata object from Bing's API.
 */
function fetchImage() {
  return fetch(`${BING_BASE_URL}/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error: Bing api status: ${res.status}`);
      }

      return res.json();
    })
    .then(data => {
      return data.images?.[0];
    })
    .catch(console.warn);
}

/**
 * Checks if a UHD (Ultra High Definition) image exists at the specified base URL.
 *
 * Sends a HEAD request to the constructed UHD image URL and returns a promise
 * that resolves to true if the image exists (HTTP 200), or false otherwise.
 *
 * @param {string} baseUrl - The base URL of the image (without the _UHD.jpg suffix).
 * @returns {Promise<boolean>} A promise that resolves to true if the UHD image exists, false otherwise.
 */
function hasUHDImage(baseUrl) {
  return fetch(`${BING_BASE_URL}${baseUrl}_UHD.jpg`, { method: 'HEAD' })
    .then(res => res.ok)
    .catch(() => false);
}


/**
 * Parses a Bing image date string and returns the expiration timestamp in milliseconds.
 *
 * The input date string is expected to be in the format 'yyyyMMddHHmm'.
 * The function creates a Date object in UTC, adds 24 hours to it, and returns the resulting time in milliseconds.
 * 24 hours + 10 minutes for the next day.
 *
 * @param {string} date - The Bing image date string in the format 'yyyyMMddHHmm'.
 * @returns {number} The expiration time as a Unix timestamp in milliseconds.
 */
function parseBingImageDate(date) {
  const year = date.slice(0, 4);
  const month = date.slice(4, 6);
  const day = date.slice(6, 8);
  const hour = date.slice(8, 10);
  const minutes = date.slice(10, 12);
  const expiration = new Date(Date.UTC(year, month - 1, day, hour, minutes));
  expiration.setTime(expiration.getTime() + (600 + 24 * 3600) * 1000);

  return expiration.getTime();
}


/**
 * Retrieves the Bing image of the day, using a cached version if available and valid.
 * Fetches a new image if the cache is expired or missing, determines the best available resolution,
 * and updates the cache accordingly.
 *
 * @returns {Promise<Object|null>} The Bing image object with additional properties (`imageurl`, `expiresAt`), or null if not found.
 */
export async function getBingImage() {
  const { bingImage } = await storage.local.get('bingImage');

  const now = Date.now();

  // If the cached image is still valid, return it
  if (bingImage?.expiresAt > now) {
    return bingImage;
  }

  const image = await fetchImage();

  if (!image) {
    console.warn('Bing image of the day not found');
    return null;
  }

  const hasUHD = await hasUHDImage(image.urlbase);
  const imageurl = hasUHD
    ? `${BING_BASE_URL}${image.urlbase}_UHD.jpg`
    : `${BING_BASE_URL}${image.url}`;


  const expiresAt  = parseBingImageDate(image.fullstartdate);

  const newBingImage = {
    ...image,
    imageurl,
    expiresAt
  };

  storage.local.set({
    bingImage: newBingImage
  });

  return newBingImage;
}
