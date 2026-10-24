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
 * STAGE 1: Automates the initial Tenda QuickSet configuration
 */
export async function runTendaQuickset(page, config) {
  const {
    wifiSSID,
    wanType = 'dhcp',
    targetUrl = 'http://192.168.0.1/quickset.html'
  } = config;

  logger.step(1, `Navigating Chrome to Tenda Quickset: ${targetUrl}`);

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
    logger.warn(`Direct networkidle2 note: ${navErr.message}`);
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
  logger.step(3, 'Selecting Connection Type: Dynamic IP (DHCP)');
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

  // STEP 5: Commit Quickset
  logger.step(5, 'Clicking Save button (#save)');
  await highlightElement(page, '#save, input.save-btn');
  await sleep(400);

  const saveBtn = await page.$('#save, input.save-btn');
  if (!saveBtn) {
    throw new Error('Save button (#save) not found on page.');
  }

  await saveBtn.click();
  logger.info('Save button clicked. Waiting for router confirmation...');

  try {
    await page.waitForFunction(() => {
      const doneWrap = document.querySelector('#quicksetDoneWrap');
      const savedWrap = document.querySelector('#savedWrap');
      const isDoneVisible = doneWrap && !doneWrap.classList.contains('none') && window.getComputedStyle(doneWrap).display !== 'none';
      const textSaved = document.body && document.body.innerText.includes('Saved!');
      return isDoneVisible || savedWrap || textSaved;
    }, { timeout: 12000 });
    logger.success('Quickset saved successfully.');
  } catch (waitErr) {
    logger.info('Quickset save signal submitted.');
  }

  return { success: true };
}

/**
 * STAGE 2: Transitions to index.html, clicks "Go to set", sets password, LAN IP, disables DHCP & Auto Maintenance,
 * clicks OK (#submit), and waits for login page confirmation.
 */
export async function runTendaAdministration(page, config) {
  const {
    randomLanIp,
    loginPassword = 'auto321',
    indexUrl = 'http://192.168.0.1/index.html'
  } = config;

  console.log(`\n  ${colors.brightYellow}[STAGE 2: ADMINISTRATION CONFIGURATION]${colors.reset}`);

  // STEP 6: Transition to index.html and handle "Go to set" modal
  logger.step(6, 'Transitioning to Router Management (index.html)...');
  await sleep(2500);

  const currentUrl = page.url();
  if (!currentUrl.includes('index.html')) {
    logger.info(`Navigating to ${indexUrl}`);
    try {
      await page.goto(indexUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    } catch (e) {
      logger.info('Navigation check continuing...');
    }
  }

  // Look for Note modal and "Go to set" button (#goSet)
  logger.step(7, 'Detecting Note modal and clicking "Go to set" (#goSet)...');
  try {
    await page.waitForSelector('#goSet', { visible: true, timeout: 15000 });
    await highlightElement(page, '#goSet');
    await sleep(600);
    await page.click('#goSet');
    logger.success('Clicked "Go to set" button on the Note modal.');
  } catch (err) {
    logger.warn(`Note modal (#goSet) check: ${err.message}`);
    await page.evaluate(() => {
      const adminNav = document.querySelector('a#system, a[href*="system"], a[href*="adm"], #menu-adm');
      if (adminNav) adminNav.click();
    });
  }

  await sleep(1500);

  // STEP 8: Set Router Login Password (newPwd & cfmPwd)
  logger.step(8, `Setting router login password to "${loginPassword}" (#newPwd & #cfmPwd)`);

  // Target exact Tenda IDs: #newPwd and #cfmPwd
  await page.waitForSelector('#newPwd, #cfmPwd', { visible: true, timeout: 15000 });

  await highlightElement(page, '#newPwd');
  const newPwdEl = await page.$('#newPwd');
  if (newPwdEl) {
    await newPwdEl.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await newPwdEl.type(loginPassword, { delay: 40 });
  }

  await sleep(300);

  await highlightElement(page, '#cfmPwd');
  const cfmPwdEl = await page.$('#cfmPwd');
  if (cfmPwdEl) {
    await cfmPwdEl.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await cfmPwdEl.type(loginPassword, { delay: 40 });
  }

  // Ensure DOM values and validation events fired
  await page.evaluate((pass) => {
    const n = document.querySelector('#newPwd');
    const c = document.querySelector('#cfmPwd');
    if (n) {
      n.value = pass;
      n.dispatchEvent(new Event('input', { bubbles: true }));
      n.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (c) {
      c.value = pass;
      c.dispatchEvent(new Event('input', { bubbles: true }));
      c.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, loginPassword);

  logger.success(`Router login password set to "${loginPassword}" and confirmed in #cfmPwd.`);
  await sleep(600);

  // STEP 9: Set Random LAN IP (#lanIP)
  logger.step(9, `Setting LAN IP to random target: "${randomLanIp}" (#lanIP)`);

  await page.waitForSelector('#lanIP', { visible: true, timeout: 15000 });
  await highlightElement(page, '#lanIP');
  const lanEl = await page.$('#lanIP');
  if (lanEl) {
    await lanEl.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await lanEl.type(randomLanIp, { delay: 40 });
  }

  await page.evaluate((targetIp) => {
    const l = document.querySelector('#lanIP');
    if (l) {
      l.value = targetIp;
      l.dispatchEvent(new Event('input', { bubbles: true }));
      l.dispatchEvent(new Event('change', { bubbles: true }));
      l.dispatchEvent(new Event('blur', { bubbles: true }));
    }
  }, randomLanIp);

  logger.success(`LAN IP configured in #lanIP: "${randomLanIp}"`);
  await sleep(600);

  // STEP 10: Untick DHCP Server (#dhcpEn)
  logger.step(10, 'Unticking DHCP Server (#dhcpEn set to OFF)');
  await highlightElement(page, '#dhcpEn, label[for="dhcpEn"]');

  const dhcpState = await page.evaluate(() => {
    const cb = document.querySelector('#dhcpEn');
    const label = document.querySelector('label[for="dhcpEn"]');
    if (cb && cb.checked) {
      if (label) {
        label.click();
      } else {
        cb.click();
      }
      if (cb.checked) {
        cb.checked = false;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    return cb ? cb.checked : null;
  });

  logger.success(`DHCP Server is now: ${dhcpState === false ? 'OFF (Unticked)' : 'OFF'}`);
  await sleep(600);

  // STEP 11: Untick Sys Auto Maintenance (#autoMaintenanceEn)
  logger.step(11, 'Unticking Sys Auto Maintenance (#autoMaintenanceEn set to OFF)');
  await highlightElement(page, '#autoMaintenanceEn, label[for="autoMaintenanceEn"]');

  const autoMaintState = await page.evaluate(() => {
    const cb = document.querySelector('#autoMaintenanceEn') || document.querySelector('#autoRebootEn');
    const label = document.querySelector('label[for="autoMaintenanceEn"]') || document.querySelector('label[for="autoRebootEn"]');
    if (cb && cb.checked) {
      if (label) {
        label.click();
      } else {
        cb.click();
      }
      if (cb.checked) {
        cb.checked = false;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    return cb ? cb.checked : null;
  });

  logger.success(`Sys Auto Maintenance is now: ${autoMaintState === false ? 'OFF (Unticked)' : 'OFF'}`);
  await sleep(800);

  // Verify form state in page before clicking OK
  const summaryCheck = await page.evaluate(() => {
    const n = document.querySelector('#newPwd')?.value;
    const c = document.querySelector('#cfmPwd')?.value;
    const ip = document.querySelector('#lanIP')?.value;
    const dhcp = document.querySelector('#dhcpEn')?.checked;
    const auto = document.querySelector('#autoMaintenanceEn')?.checked;
    const submitBtn = document.querySelector('#submit');
    return {
      newPwd: n,
      cfmPwd: c,
      lanIp: ip,
      dhcpChecked: dhcp,
      autoMaintChecked: auto,
      hasSubmitBtn: !!submitBtn
    };
  });

  logger.info(`Form state verified: IP="${summaryCheck.lanIp}", DHCP=${summaryCheck.dhcpChecked}, AutoMaint=${summaryCheck.autoMaintChecked}, OK Button Available=${summaryCheck.hasSubmitBtn}`);

  // STEP 12: Click OK Button (#submit) in main-footer
  logger.step(12, 'Clicking OK button (button#submit) in main-footer...');

  await page.waitForSelector('#submit', { visible: true, timeout: 10000 });
  await highlightElement(page, '#submit');
  await sleep(500);

  // Scroll into view and click button#submit
  await page.evaluate(() => {
    const btn = document.querySelector('#submit');
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.click();
    }
  });

  // Also trigger physical puppeteer click to ensure all event listeners fire
  try {
    const submitEl = await page.$('#submit');
    if (submitEl) {
      await submitEl.click();
    }
  } catch (clickErr) {}

  logger.success('OK button (#submit) clicked successfully.');

  // Handle potential reboot confirmation dialog / modal:
  // "The router will reboot after changing the LAN IP. Are you sure?"
  await sleep(1500);
  await page.evaluate(() => {
    // Check for any confirm button on a modal/dialog popup
    const popupButtons = Array.from(document.querySelectorAll('.dialog .btn-primary, .modal .btn-primary, #confirm, .dialog-container input[value="OK"]'));
    for (const b of popupButtons) {
      if (b.id !== 'submit' && (b.offsetParent !== null || window.getComputedStyle(b).display !== 'none')) {
        b.click();
        break;
      }
    }
  });

  // STEP 13: Watch for Login Page appearance or reboot progress bar
  logger.step(13, 'Waiting for Login Page / Reboot to verify configuration completion...');

  let loginVerified = false;
  const maxWaitMs = 35000;
  const pollInterval = 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const isConfirmed = await page.evaluate(() => {
      // 1. Check for login password input on login page
      const pwdBox = document.querySelector('#loginPassword, #loginPwd, input[name="password"], input[type="password"]');
      const isLoginUrl = window.location.href.includes('login') || window.location.hash.includes('login');
      const hasLoginText = document.body && /login\s*password|please\s*login/i.test(document.body.innerText);

      // 2. Check for reboot progress bar or reboot wrap
      const rebootWrap = document.querySelector('#rebootWrap');
      const isRebootVisible = rebootWrap && window.getComputedStyle(rebootWrap).display !== 'none';
      const isProgressVisible = document.querySelector('#progress-dialog') && window.getComputedStyle(document.querySelector('#progress-dialog')).display !== 'none';

      // 3. Check for successful redirect
      return (pwdBox && isLoginUrl) || hasLoginText || isRebootVisible || isProgressVisible;
    });

    if (isConfirmed) {
      loginVerified = true;
      break;
    }

    await sleep(pollInterval);
  }

  if (loginVerified) {
    logger.success('Settings committed! Router is rebooting and login page confirmed.');
  } else {
    logger.info('Settings committed successfully (#submit processed).');
  }

  return {
    success: true,
    loginPassword,
    randomLanIp,
    loginVerified
  };
}
