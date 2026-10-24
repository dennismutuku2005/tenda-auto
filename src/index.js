#!/usr/bin/env node

import { displayBanner, colors } from './banner.js';
import { generateRandomLanIp, promptInput, printConfigSummary, logger, sleep } from './utils.js';
import { waitForTendaRouter } from './detector.js';
import { launchBrowser } from './browser.js';
import { runTendaQuickset, runTendaAdministration } from './engine.js';

// Parse optional CLI flags
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    ssid: '',
    skipCheck: false,
    slowMo: 90,
    quicksetUrl: 'http://192.168.0.1/quickset.html',
    indexUrl: 'http://192.168.0.1/index.html'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--skip-check') {
      parsed.skipCheck = true;
    } else if (arg.startsWith('--slowmo=')) {
      parsed.slowMo = parseInt(arg.split('=')[1], 10) || 90;
    } else if (arg.startsWith('--url=')) {
      parsed.quicksetUrl = arg.split('=')[1];
    } else if (arg.startsWith('--ssid=')) {
      parsed.ssid = arg.split('=')[1];
    } else if (!arg.startsWith('-') && !parsed.ssid) {
      parsed.ssid = arg;
    }
  }

  return parsed;
}

async function main() {
  try {
    // 1. Display Big Unicode Banner
    displayBanner();

    // 2. Parse arguments
    const cliOptions = parseArgs();

    // 3. Prompt for WiFi Name alone (no password prompt)
    let wifiSSID = cliOptions.ssid;
    if (!wifiSSID) {
      console.log(`  ${colors.brightWhite}${colors.bold}WiFi Configuration:${colors.reset}\n`);
      wifiSSID = await promptInput('Enter WiFi Name (SSID)');
      if (!wifiSSID) {
        wifiSSID = 'Tenda_HighSpeed';
      }
    }

    // 4. Generate Random LAN IP (192.168.10.1 to 192.168.254.1)
    const randomLanIp = generateRandomLanIp(10, 254);
    const loginPassword = 'auto321';

    // 5. Display Configuration Summary Table
    printConfigSummary({
      ssid: wifiSSID,
      wanType: 'dhcp',
      randomLanIp,
      targetUrl: cliOptions.quicksetUrl,
      loginPassword
    });

    // 6. Router Connection Check (polls until Tenda is detected)
    if (!cliOptions.skipCheck) {
      logger.info('Checking if Tenda router is plugged in...');
      const isPlugged = await waitForTendaRouter(cliOptions.quicksetUrl, {
        maxRetries: 60,
        retryIntervalMs: 2000
      });

      if (!isPlugged) {
        logger.error(`Could not reach Tenda router at ${cliOptions.quicksetUrl}.`);
        logger.warn('Please ensure the router is powered on and connected via LAN cable or Wi-Fi.');
        const retry = await promptInput('Retry connection check? (y/n)', 'y');
        if (retry.toLowerCase() !== 'y') {
          process.exit(1);
        }
        return main();
      }
    }

    // 7. Launch Visible Chrome Window for Web Automation
    const browser = await launchBrowser({
      headless: false,
      slowMo: cliOptions.slowMo
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // 8. STAGE 1: Run Quickset automation
    await runTendaQuickset(page, {
      wifiSSID,
      wanType: 'dhcp',
      targetUrl: cliOptions.quicksetUrl
    });

    // 9. STAGE 2: Run Administration automation (Go to set, Password, LAN IP, DHCP Off, Auto Maint Off, Save)
    await runTendaAdministration(page, {
      randomLanIp,
      loginPassword,
      indexUrl: cliOptions.indexUrl
    });

    // 10. Close browser after completion
    await sleep(2500);
    await browser.close();

    // 11. Final Success Summary Box in Terminal
    console.log(`\n  ${colors.brightGreen}╔══════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  ${colors.bold}${colors.brightWhite}[OK] TENDA ROUTER FULLY CONFIGURED SUCCESSFULLY!${colors.reset}${' '.repeat(24)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}╠══════════════════════════════════════════════════════════════════════════╣${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  - WAN Mode             : ${colors.brightCyan}Dynamic IP (DHCP)${colors.reset}${' '.repeat(30)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  - WiFi SSID            : ${colors.brightYellow}${wifiSSID.padEnd(25)}${colors.reset}${' '.repeat(20)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  - WiFi Security        : ${colors.brightWhite}Open (No Password)${colors.reset}${' '.repeat(28)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  - Router Login Password: ${colors.brightYellow}${loginPassword.padEnd(25)}${colors.reset}${' '.repeat(20)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  - New LAN IP Address   : ${colors.brightMagenta}${randomLanIp.padEnd(25)}${colors.reset}${' '.repeat(20)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  - DHCP Server          : ${colors.brightRed}Disabled (OFF)${colors.reset}${' '.repeat(32)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  - Sys Auto Maintenance : ${colors.brightRed}Disabled (OFF)${colors.reset}${' '.repeat(32)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}╚══════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  } catch (error) {
    logger.error(`Automation failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
