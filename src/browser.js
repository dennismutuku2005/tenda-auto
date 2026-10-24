import puppeteer from 'puppeteer';
import { logger } from './utils.js';

/**
 * Launch visible Chrome browser window so the user can watch
 * the live web automation directly on their screen.
 */
export async function launchBrowser(options = {}) {
  const { slowMo = 90 } = options;

  const defaultArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-web-security',
    '--window-size=1280,850'
  ];

  logger.info(`Opening visible Chrome window (live automation mode)...`);

  const launchConfig = {
    headless: false,       // Always visible browser window
    slowMo,                // Paced interaction so user sees each click and keystroke
    defaultViewport: null, // Uses the actual browser window size
    args: defaultArgs
  };

  try {
    return await puppeteer.launch(launchConfig);
  } catch (err) {
    logger.warn(`Default Puppeteer browser launch note: ${err.message}. Trying system Chrome...`);
    try {
      return await puppeteer.launch({
        ...launchConfig,
        channel: 'chrome'
      });
    } catch (chromeErr) {
      logger.warn(`Trying Microsoft Edge as fallback...`);
      return await puppeteer.launch({
        ...launchConfig,
        channel: 'msedge'
      });
    }
  }
}
