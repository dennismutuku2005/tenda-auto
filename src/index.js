#!/usr/bin/env node

import { displayBanner, colors } from './banner.js';
import {
  generateRandomLanIp,
  promptInput,
  printConfigSummary,
  printSuccessSummary,
  printSwapNotice,
  logger,
  sleep
} from './utils.js';
import { waitForTendaRouter, waitForRouterDisconnect } from './detector.js';
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
  // Graceful exit handler
  process.on('SIGINT', () => {
    console.log(`\n\n  ${colors.brightYellow}[BATCH STOPPED]${colors.reset} Terminal closed. Exiting Tenda Auto.\n`);
    process.exit(0);
  });

  try {
    // 1. Display Big Unicode Banner
    displayBanner();

    // 2. Parse arguments
    const cliOptions = parseArgs();

    // 3. Prompt for WiFi Name ONCE (used for all routers in this batch session)
    let wifiSSID = cliOptions.ssid;
    if (!wifiSSID) {
      console.log(`  ${colors.brightWhite}${colors.bold}Batch WiFi Configuration:${colors.reset}\n`);
      wifiSSID = await promptInput('Enter WiFi Name (SSID) for this batch');
      if (!wifiSSID) {
        wifiSSID = 'Tenda_HighSpeed';
      }
    }

    const loginPassword = 'auto321';
    let routerNumber = 1;

    // 4. Continuous Batch Provisioning Loop
    while (true) {
      console.log(`\n  ${colors.brightCyan}────────────────────────────────────────────────────────────────────────${colors.reset}`);
      console.log(`  ${colors.bold}${colors.brightWhite}STARTING CONFIGURATION CYCLE: ROUTER #${routerNumber}${colors.reset}`);
      console.log(`  ${colors.brightCyan}────────────────────────────────────────────────────────────────────────${colors.reset}`);

      // Generate a new random LAN IP for this specific router (192.168.10.1 to 192.168.254.1)
      const randomLanIp = generateRandomLanIp(10, 254);

      // Display clean aligned configuration table
      printConfigSummary({
        routerNumber,
        ssid: wifiSSID,
        wanType: 'dhcp',
        randomLanIp,
        targetUrl: cliOptions.quicksetUrl,
        loginPassword
      });

      // Wait for router plug-in detection
      if (!cliOptions.skipCheck) {
        logger.info(`Waiting for Router #${routerNumber} to be detected...`);
        const isPlugged = await waitForTendaRouter(cliOptions.quicksetUrl, {
          maxRetries: 120,
          retryIntervalMs: 2000,
          message: `Probing Router #${routerNumber}`
        });

        if (!isPlugged) {
          logger.error(`Could not detect router at ${cliOptions.quicksetUrl}.`);
          const retry = await promptInput('Retry connection check? (y/n)', 'y');
          if (retry.toLowerCase() !== 'y') {
            break;
          }
          continue;
        }
      }

      // Launch visible Chrome window for automation
      const browser = await launchBrowser({
        headless: false,
        slowMo: cliOptions.slowMo
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      // STAGE 1: QuickSet Automation
      await runTendaQuickset(page, {
        wifiSSID,
        wanType: 'dhcp',
        targetUrl: cliOptions.quicksetUrl
      });

      // STAGE 2: Administration Setup & Login Page Verification
      await runTendaAdministration(page, {
        randomLanIp,
        loginPassword,
        indexUrl: cliOptions.indexUrl
      });

      // Close browser
      await sleep(2000);
      await browser.close();

      // Display clean aligned success table for this router
      printSuccessSummary({
        routerNumber,
        ssid: wifiSSID,
        randomLanIp,
        loginPassword
      });

      // Display swap instructions for the next router
      printSwapNotice(routerNumber, wifiSSID);

      // Wait for the configured router to disconnect/unplug from 192.168.0.1
      logger.info('Waiting for current router to disconnect...');
      await waitForRouterDisconnect(cliOptions.quicksetUrl);
      logger.success(`Router #${routerNumber} disconnected.`);

      // Increment router counter for the next unit
      routerNumber++;

      // Wait for the next router to be plugged in at 192.168.0.1
      logger.info(`Ready for Router #${routerNumber}. Plug in the new router to continue...`);
      await waitForTendaRouter(cliOptions.quicksetUrl, {
        maxRetries: 300,
        retryIntervalMs: 2000,
        message: `Waiting for Router #${routerNumber} plug-in`
      });
    }

  } catch (error) {
    logger.error(`Automation failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
