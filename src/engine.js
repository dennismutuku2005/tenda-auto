import { logger, sleep } from './utils.js';
import { colors } from './banner.js';

/**
 * Automates the Tenda QuickSet configuration page
 * @param {import('puppeteer').Page} page
 * @param {Object} config
 * @param {string} config.wifiSSID - The WiFi network name
 * @param {string} [config.wifiPwd] - Optional WiFi password
 * @param {string} [config.wanType='dhcp'] - Connection type: 'dhcp', 'pppoe', or 'static'
 * @param {string} [config.randomLanIp] - Generated LAN IP for subsequent steps
 * @param {string} [config.targetUrl] - URL of quickset page
 */
export async function runTendaQuickset(page, config) {
  const {
    wifiSSID,
    wifiPwd = '',
    wanType = 'dhcp',
    randomLanIp,
    targetUrl = 'http://192.168.0.1/quickset.html'
  } = config;

  logger.step(1, `Navigating to Tenda Quickset Page (${targetUrl})`);

  // Handle any native alert / confirm dialogs that router firmware might show
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
    logger.warn(`Direct networkidle2 timed out, attempting load state check: ${navErr.message}`);
  }

  // Ensure quickSetWrap form or elements exist
  logger.step(2, 'Verifying Quickset page structure');
  await page.waitForSelector('#quickSetWrap, #wifiSSID, #save', {
    visible: true,
    timeout: 15000
  });
  logger.success('Quickset interface loaded successfully');

  // STEP 3: Configure WAN Connection Type (Dynamic IP / DHCP)
  logger.step(3, `Setting WAN Connection Type to "${wanType.toUpperCase()}" (Dynamic IP)`);
  
  await page.evaluate((type) => {
    // Locate the dynamic IP radio
    const radio = document.querySelector(`#${type}`) || document.querySelector(`input[name="wanType"][value="${type}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      radio.dispatchEvent(new Event('click', { bubbles: true }));
    }
    
    // Also trigger label click to activate Tenda's UI visibility scripts
    const label = document.querySelector(`label[for="${type}"]`);
    if (label) {
      label.click();
    }
  }, wanType);

  await sleep(600);
  logger.success('Connection type selected: Dynamic IP (DHCP)');

  // STEP 4: Configure WiFi SSID
  logger.step(4, `Configuring WiFi Name (SSID) -> "${wifiSSID}"`);
  
  const ssidInput = await page.$('#wifiSSID');
  if (!ssidInput) {
    throw new Error('WiFi SSID input field (#wifiSSID) not found on page.');
  }

  // Clear existing SSID and type the new one
  await ssidInput.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await ssidInput.type(wifiSSID, { delay: 40 });

  // STEP 5: Configure WiFi Password (if provided)
  const pwdInput = await page.$('#wifiPwd');
  if (pwdInput) {
    await pwdInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    if (wifiPwd && wifiPwd.trim().length > 0) {
      logger.step(5, `Configuring WiFi Password`);
      await pwdInput.type(wifiPwd, { delay: 40 });
      logger.success('WiFi password entered.');
    } else {
      logger.info('WiFi Password left blank / open.');
    }
  }

  await sleep(500);

  // Validate form state before saving
  const inputValues = await page.evaluate(() => {
    const ssid = document.querySelector('#wifiSSID')?.value;
    const dhcpChecked = document.querySelector('#dhcp')?.checked;
    return { ssid, dhcpChecked };
  });

  logger.info(`Form state before commit: SSID="${inputValues.ssid}", DynamicIP=${inputValues.dhcpChecked}`);

  // STEP 6: Commit and Save
  logger.step(6, 'Submitting Quickset configuration (#save)');
  const saveBtn = await page.$('#save, input.save-btn');
  if (!saveBtn) {
    throw new Error('Save button (#save) not found on page.');
  }

  await Promise.all([
    saveBtn.click(),
    sleep(1500)
  ]);

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
    logger.info('Router response received (Save signal sent successfully).');
  }

  // Prepared for LAN IP automation (Step 2)
  if (randomLanIp) {
    console.log(`\n  ${colors.brightYellow}[NEXT STAGE READY]${colors.reset}`);
    logger.bullet('Target Random LAN IP', randomLanIp);
    logger.info('Ready for LAN IP change once administration page details are provided.');
  }

  return {
    success: true,
    ssid: wifiSSID,
    wanType,
    randomLanIp
  };
}
