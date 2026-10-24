import puppeteer from 'puppeteer';
import { logger } from './utils.js';

/**
 * Launch Puppeteer browser instance with sensible router-automation defaults
 * and fallback to system Chrome/Edge if needed.
 */
export async function launchBrowser(options = {}) {
  const { headless = false } = options;

  const defaultArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-web-security',
    '--ignore-certificate-errors',
    '--window-size=1280,850'
  ];

  logger.info(`Launching browser engine (headless: ${headless})...`);

  try {
    // 1. Try default Puppeteer launch
    const browser = await puppeteer.launch({
      headless: headless ? 'shell' : false,
      defaultViewport: { width: 1280, height: 800 },
      args: defaultArgs
    });
    return browser;
  } catch (err) {
    logger.warn(`Default Puppeteer launch failed (${err.message}). Trying system Chrome channel...`);
    
    // 2. Try Chrome channel
    try {
      const browser = await puppeteer.launch({
        channel: 'chrome',
        headless: headless ? 'shell' : false,
        defaultViewport: { width: 1280, height: 800 },
        args: defaultArgs
      });
      return browser;
    } catch (chromeErr) {
      logger.warn(`Chrome channel failed. Trying Microsoft Edge channel...`);
      
      // 3. Try Edge channel
      const browser = await puppeteer.launch({
        channel: 'msedge',
        headless: headless ? 'shell' : false,
        defaultViewport: { width: 1280, height: 800 },
        args: defaultArgs
      });
      return browser;
    }
  }
}
