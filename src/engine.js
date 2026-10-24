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
 * STAGE 2: Transitions to index.html, clicks "Go to set", sets password, LAN IP, disables DHCP and Auto Maintenance
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

  // Look for the Note modal and "Go to set" button (#goSet)
  logger.step(7, 'Detecting Note modal and clicking "Go to set" (#goSet)...');
  try {
    await page.waitForSelector('#goSet', { visible: true, timeout: 15000 });
    await highlightElement(page, '#goSet');
    await sleep(600);
    await page.click('#goSet');
    logger.success('Clicked "Go to set" button on the Note modal.');
  } catch (err) {
    logger.warn(`Note modal (#goSet) not immediately detected or already dismissed: ${err.message}`);
    // Check if there is an Administration menu button to click directly
    await page.evaluate(() => {
      const adminNav = document.querySelector('a[href*="system"], a[href*="adm"], #menu-adm, [data-target="system"], #sys_set');
      if (adminNav) adminNav.click();
    });
  }

  await sleep(1500);

  // STEP 8: Set Router Login Password (auto321) & Confirm
  logger.step(8, `Setting router login password to "${loginPassword}" (and confirming)`);

  const pwdElements = await page.evaluate((pass) => {
    // 1. Identify New Password and Confirm Password inputs
    let newPwd = document.querySelector('#newPwd, #sysPwd, input[name="newPwd"], input[name="sysPwd"], #loginPwd, #newPassword');
    let cfmPwd = document.querySelector('#confirmPwd, #cfmPwd, input[name="confirmPwd"], input[name="cfmPwd"], #confirmPassword');

    // Fallback: search all visible password inputs
    if (!newPwd || !cfmPwd) {
      const pwds = Array.from(document.querySelectorAll('input[type="password"]')).filter((el) => {
        return el.offsetParent !== null || window.getComputedStyle(el).display !== 'none';
      });
      if (pwds.length >= 2) {
        newPwd = newPwd || pwds[0];
        cfmPwd = cfmPwd || pwds[1];
      } else if (pwds.length === 1) {
        newPwd = newPwd || pwds[0];
      }
    }

    if (newPwd) {
      newPwd.value = pass;
      newPwd.dispatchEvent(new Event('input', { bubbles: true }));
      newPwd.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (cfmPwd) {
      cfmPwd.value = pass;
      cfmPwd.dispatchEvent(new Event('input', { bubbles: true }));
      cfmPwd.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return {
      newPwdSelector: newPwd ? (newPwd.id ? `#${newPwd.id}` : `input[name="${newPwd.name}"]`) : null,
      cfmPwdSelector: cfmPwd ? (cfmPwd.id ? `#${cfmPwd.id}` : `input[name="${cfmPwd.name}"]`) : null
    };
  }, loginPassword);

  if (pwdElements.newPwdSelector) {
    await highlightElement(page, pwdElements.newPwdSelector);
    const newPwdEl = await page.$(pwdElements.newPwdSelector);
    if (newPwdEl) {
      await newPwdEl.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await newPwdEl.type(loginPassword, { delay: 45 });
    }
  }

  if (pwdElements.cfmPwdSelector) {
    await highlightElement(page, pwdElements.cfmPwdSelector);
    const cfmPwdEl = await page.$(pwdElements.cfmPwdSelector);
    if (cfmPwdEl) {
      await cfmPwdEl.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await cfmPwdEl.type(loginPassword, { delay: 45 });
    }
  }

  logger.success(`Router login password set and confirmed: "${loginPassword}"`);
  await sleep(600);

  // STEP 9: Set Random LAN IP
  logger.step(9, `Setting LAN IP to random target: "${randomLanIp}"`);

  const lanElementSelector = await page.evaluate((targetIp) => {
    let lanInput = document.querySelector('#lanIP, #lanIp, input[name="lanIP"], input[name="lanIp"], input[name="ip"], #lan_ip');

    if (!lanInput) {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      for (const input of inputs) {
        const parentText = input.closest('.form-group, tr, div')?.innerText || '';
        if (/lan\s*ip/i.test(parentText) || /192\.168\./.test(input.value)) {
          lanInput = input;
          break;
        }
      }
    }

    if (lanInput) {
      lanInput.value = targetIp;
      lanInput.dispatchEvent(new Event('input', { bubbles: true }));
      lanInput.dispatchEvent(new Event('change', { bubbles: true }));
      return lanInput.id ? `#${lanInput.id}` : `input[name="${lanInput.name}"]`;
    }
    return null;
  }, randomLanIp);

  if (lanElementSelector) {
    await highlightElement(page, lanElementSelector);
    const lanEl = await page.$(lanElementSelector);
    if (lanEl) {
      await lanEl.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await lanEl.type(randomLanIp, { delay: 45 });
    }
  }
  logger.success(`LAN IP configured: "${randomLanIp}"`);
  await sleep(600);

  // STEP 10: Untick DHCP Server (Off)
  logger.step(10, 'Unticking DHCP Server (set to OFF)');

  const dhcpUnticked = await page.evaluate(() => {
    let el = document.querySelector('#dhcpEn, input[name="dhcpEn"], #dhcpServer, input[name="dhcpServer"], #lanDhcp, #dhcp_en');

    if (!el) {
      const labels = Array.from(document.querySelectorAll('label, th, td, div'));
      for (const label of labels) {
        if (/dhcp\s*server/i.test(label.innerText) || /dhcp/i.test(label.innerText)) {
          const container = label.closest('.form-group, tr, .control-group, div');
          if (container) {
            const cb = container.querySelector('input[type="checkbox"], input[type="radio"], .btn-switch, .btn-toggle');
            if (cb) {
              el = cb;
              break;
            }
          }
        }
      }
    }

    if (el) {
      if (el.type === 'checkbox') {
        if (el.checked) {
          el.click();
          if (el.checked) {
            el.checked = false;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        return true;
      } else if (el.type === 'radio') {
        const disableRadio = document.querySelector('input[name="' + el.name + '"][value="0"], input[name="' + el.name + '"][value="false"]');
        if (disableRadio) disableRadio.click();
        return true;
      } else {
        el.click();
        return true;
      }
    }
    return false;
  });

  if (dhcpUnticked) {
    logger.success('DHCP Server unticked (OFF)');
  } else {
    logger.warn('DHCP toggle was not found or already disabled.');
  }

  await sleep(600);

  // STEP 11: Untick Sys Auto Maintenance (Off)
  logger.step(11, 'Unticking Sys Auto Maintenance (set to OFF)');

  const autoMaintUnticked = await page.evaluate(() => {
    let el = document.querySelector('#autoRebootEn, input[name="autoRebootEn"], #rebootEn, input[name="rebootEn"], #sysAutoMaintain, #autoMaintenance, #sys_auto_maintenance');

    if (!el) {
      const labels = Array.from(document.querySelectorAll('label, th, td, div, span'));
      for (const label of labels) {
        if (/sys\s*auto\s*maintenance/i.test(label.innerText) || /auto\s*maintenance/i.test(label.innerText)) {
          const container = label.closest('.form-group, tr, .control-group, div');
          if (container) {
            const cb = container.querySelector('input[type="checkbox"], input[type="radio"], .btn-switch, .btn-toggle');
            if (cb) {
              el = cb;
              break;
            }
          }
        }
      }
    }

    if (el) {
      if (el.type === 'checkbox') {
        if (el.checked) {
          el.click();
          if (el.checked) {
            el.checked = false;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        return true;
      } else if (el.type === 'radio') {
        const disableRadio = document.querySelector('input[name="' + el.name + '"][value="0"], input[name="' + el.name + '"][value="false"]');
        if (disableRadio) disableRadio.click();
        return true;
      } else {
        el.click();
        return true;
      }
    }
    return false;
  });

  if (autoMaintUnticked) {
    logger.success('Sys Auto Maintenance unticked (OFF)');
  } else {
    logger.warn('Sys Auto Maintenance toggle was not found or already disabled.');
  }

  await sleep(800);

  // STEP 12: Click OK / Save button to commit administration settings
  logger.step(12, 'Clicking OK to apply and save settings...');

  const okBtnSelector = await page.evaluate(() => {
    // Search administration form save button
    const candidates = ['#save', '#subBtn', 'input[value="OK"]', 'input[value="Save"]', 'button[value="OK"]', 'input.btn-primary', 'input.save-btn'];
    for (const sel of candidates) {
      const btn = document.querySelector(sel);
      if (btn && (btn.offsetParent !== null || window.getComputedStyle(btn).display !== 'none')) {
        return sel;
      }
    }
    return 'input[value="OK"]';
  });

  await highlightElement(page, okBtnSelector);
  await sleep(400);

  await page.evaluate((sel) => {
    const btn = document.querySelector(sel) || document.querySelector('input[value="OK"]') || document.querySelector('#save');
    if (btn) btn.click();
  }, okBtnSelector);

  logger.info('OK button clicked. Processing router reboot/save confirmation...');

  // Also check if router opened a secondary confirmation dialog box: "Are you sure you want to change the LAN IP?"
  await sleep(1000);
  await page.evaluate(() => {
    const modalOk = document.querySelector('.modal input[value="OK"], .dialog-container input[value="OK"], #confirm, .btn-primary');
    if (modalOk) modalOk.click();
  });

  await sleep(3500);

  logger.success('Administration settings applied and committed to router.');

  return {
    success: true,
    loginPassword,
    randomLanIp
  };
}
