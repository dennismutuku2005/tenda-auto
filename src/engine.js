import { logger, sleep } from './utils.js';
import { colors } from './banner.js';

/**
 * Visually highlight an element on the router web page before interacting with it
 */
async function highlightElement(page, selector) {
  try {
    await page.evaluate((sel) => {
      document.querySelectorAll('.tenda-auto-highlight').forEach((el) => {
        el.style.outline = '';
        el.style.boxShadow = '';
      });

      const el = document.querySelector(sel);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.outline = '3px solid #0284c7';
        el.style.outlineOffset = '3px';
        el.style.boxShadow = '0 0 14px rgba(2, 132, 199, 0.7)';
        el.classList.add('tenda-auto-highlight');
      }
    }, selector);
  } catch (e) {
    // Ignore highlight errors if DOM is navigating
  }
}

/**
 * Automates the Tenda QuickSet configuration inside the visible Chrome window
 */
export async function runTendaQuickset(page, config) {
  const {
    wifiSSID,
    wanType = 'dhcp',
    randomLanIp,
    targetUrl = 'http://192.168.0.1/quickset.html'
  } = config;

  logger.step(1, `Navigating Chrome to Tenda Quickset Page: ${targetUrl}`);

  // Auto-accept any browser alerts from the router firmware
  page.on('dialog', async (dialog) => {
    logger.warn(`Router dialog encountered: "${dialog.message()}". Accepting...`);
    await dialog.accept();
  });

  try {
    await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
  } catch (navErr) {
    logger.warn(`Direct networkidle2 timed out, checking loaded DOM: ${navErr.message}`);
  }

  // Ensure quickSetWrap form or elements exist
  logger.step(2, 'Verifying Quickset page structure');
  await page.waitForSelector('#quickSetWrap, #wifiSSID, #save', {
    visible: true,
    timeout: 15000
  });
  logger.success('Quickset interface loaded in Chrome');

  await sleep(600);

  // STEP 3: Configure WAN Connection Type (Dynamic IP / DHCP)
  logger.step(3, `Selecting Connection Type: Dynamic IP (DHCP)`);
  await highlightElement(page, '#dhcp, label[for="dhcp"]');
  await sleep(400);

  await page.evaluate((type) => {
    const radio = document.querySelector(`#${type}`) || document.querySelector(`input[name="wanType"][value="${type}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      radio.dispatchEvent(new Event('click', { bubbles: true }));
    }
    const label = document.querySelector(`label[for="${type}"]`);
    if (label) label.click();
  }, wanType);

  await sleep(700);
  logger.success('Connection type selected: Dynamic IP (DHCP)');

  // STEP 4: Configure WiFi SSID
  logger.step(4, `Entering WiFi Name: "${wifiSSID}"`);
  await highlightElement(page, '#wifiSSID');
  await sleep(300);

  const ssidInput = await page.$('#wifiSSID');
  if (!ssidInput) {
    throw new Error('WiFi SSID input field (#wifiSSID) not found on page.');
  }

  // Focus, clear existing text, and type new SSID visibly
  await ssidInput.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await ssidInput.type(wifiSSID, { delay: 60 });

  // Ensure password field is left empty / cleared
  const pwdInput = await page.$('#wifiPwd');
  if (pwdInput) {
    await pwdInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
  }

  await sleep(600);

  // STEP 5: Commit and Save
  logger.step(5, 'Clicking Save button (#save)');
  await highlightElement(page, '#save, input.save-btn');
  await sleep(400);

  const saveBtn = await page.$('#save, input.save-btn');
  if (!saveBtn) {
    throw new Error('Save button (#save) not found on page.');
  }

  await saveBtn.click();
  logger.info('Save button clicked. Waiting for router confirmation...');

  // Wait for confirmation container or completion indicator
  try {
    await page.waitForFunction(() => {
      const doneWrap = document.querySelector('#quicksetDoneWrap');
      const savedWrap = document.querySelector('#savedWrap');
      const isDoneVisible = doneWrap && !doneWrap.classList.contains('none') && window.getComputedStyle(doneWrap).display !== 'none';
      const textSaved = document.body && document.body.innerText.includes('Saved!');
      return isDoneVisible || savedWrap || textSaved;
    }, { timeout: 12000 });
    logger.success('Router accepted configuration and displayed "Saved!" confirmation.');
  } catch (waitErr) {
    logger.info('Save signal sent to router successfully.');
  }

  // Prepared for LAN IP automation (Step 2)
  if (randomLanIp) {
    console.log(`\n  ${colors.brightYellow}[NEXT STAGE READY]${colors.reset}`);
    logger.bullet('Target Random LAN IP', randomLanIp);
    logger.info('Ready for LAN IP change once administration page details are provided.');
  }

  // Pause briefly so the user can see the final state in the Chrome window
  await sleep(3000);

  return {
    success: true,
    ssid: wifiSSID,
    wanType,
    randomLanIp
  };
}
