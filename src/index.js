#!/usr/bin/env node

import { displayBanner, colors } from './banner.js';
import { generateRandomLanIp, promptInput, printConfigSummary, logger, sleep } from './utils.js';
import { waitForTendaRouter } from './detector.js';
import { launchBrowser } from './browser.js';
import { runTendaQuickset } from './engine.js';

// Parse optional CLI flags
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    ssid: '',
    skipCheck: false,
    slowMo: 90,
    url: 'http://192.168.0.1/quickset.html'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--skip-check') {
      parsed.skipCheck = true;
    } else if (arg.startsWith('--slowmo=')) {
      parsed.slowMo = parseInt(arg.split('=')[1], 10) || 90;
    } else if (arg.startsWith('--url=')) {
      parsed.url = arg.split('=')[1];
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

    // 4. Generate Random LAN IP (192.168.10.1 to 192.168.200.1)
    const randomLanIp = generateRandomLanIp(10, 200);

    // 5. Display Configuration Summary Table
    printConfigSummary({
      ssid: wifiSSID,
      wanType: 'dhcp',
      randomLanIp,
      targetUrl: cliOptions.url
    });

    // 6. Router Connection Check (polls until Tenda is detected)
    if (!cliOptions.skipCheck) {
      logger.info('Checking if Tenda router is plugged in...');
      const isPlugged = await waitForTendaRouter(cliOptions.url, {
        maxRetries: 60,
        retryIntervalMs: 2000
      });

      if (!isPlugged) {
        logger.error(`Could not reach Tenda router at ${cliOptions.url}.`);
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

    // 8. Run Quickset automation in the visible Chrome window
    await runTendaQuickset(page, {
      wifiSSID,
      wanType: 'dhcp',
      randomLanIp,
      targetUrl: cliOptions.url
    });

    // 9. Close browser after completion
    await browser.close();

    // 10. Success Summary Box in Terminal
    console.log(`\n  ${colors.brightGreen}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  ${colors.bold}${colors.brightWhite}[OK] TENDA ROUTER QUICKSET CONFIGURED SUCCESSFULLY!${colors.reset}${' '.repeat(14)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}╠════════════════════════════════════════════════════════════════╣${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  - WAN Mode       : ${colors.brightCyan}Dynamic IP (DHCP)${colors.reset}${' '.repeat(26)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  - WiFi SSID      : ${colors.brightYellow}${wifiSSID.padEnd(25)}${colors.reset}${' '.repeat(16)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  - WiFi Security  : ${colors.brightWhite}Open (No Password)${colors.reset}${' '.repeat(24)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  - Prepared LAN IP: ${colors.brightMagenta}${randomLanIp.padEnd(25)}${colors.reset}${' '.repeat(16)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  } catch (error) {
    logger.error(`Automation failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
