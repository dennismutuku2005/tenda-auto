#!/usr/bin/env node

import { displayBanner, colors } from './banner.js';
import { generateRandomLanIp, promptInput, printConfigSummary, logger, sleep } from './utils.js';
import { waitForTendaRouter } from './detector.js';
import { launchBrowser } from './browser.js';
import { runTendaQuickset } from './engine.js';

// Parse CLI command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    ssid: '',
    pwd: '',
    headless: false,
    skipCheck: false,
    url: 'http://192.168.0.1/quickset.html'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--headless') {
      parsed.headless = true;
    } else if (arg === '--headful') {
      parsed.headless = false;
    } else if (arg === '--skip-check') {
      parsed.skipCheck = true;
    } else if (arg.startsWith('--ssid=')) {
      parsed.ssid = arg.split('=')[1];
    } else if (arg.startsWith('--pwd=') || arg.startsWith('--password=')) {
      parsed.pwd = arg.split('=')[1];
    } else if (arg.startsWith('--url=')) {
      parsed.url = arg.split('=')[1];
    } else if (!arg.startsWith('-') && !parsed.ssid) {
      // First positional parameter is treated as the WiFi Name
      parsed.ssid = arg;
    }
  }

  return parsed;
}

async function main() {
  try {
    // 1. Show the big Unicode banner
    displayBanner();

    // 2. Parse arguments
    const cliOptions = parseArgs();

    // 3. Prompt for WiFi Name if not provided via command line
    let wifiSSID = cliOptions.ssid;
    if (!wifiSSID) {
      console.log(`  ${colors.brightWhite}${colors.bold}Please provide the WiFi Network configuration:${colors.reset}\n`);
      wifiSSID = await promptInput('Enter WiFi Name (SSID)', 'Tenda_HighSpeed');
    }

    // Optional WiFi password (can be empty for open network or preset)
    let wifiPwd = cliOptions.pwd;
    if (wifiPwd === undefined || wifiPwd === '') {
      wifiPwd = await promptInput('Enter WiFi Password (leave blank for none)', '');
    }

    // 4. Generate random LAN IP (192.168.10.1 to 192.168.200.1)
    const randomLanIp = generateRandomLanIp(10, 200);

    // 5. Display configuration summary table
    printConfigSummary({
      ssid: wifiSSID,
      password: wifiPwd,
      wanType: 'dhcp',
      randomLanIp,
      targetUrl: cliOptions.url
    });

    // 6. Router plug-in detection check
    if (!cliOptions.skipCheck) {
      logger.info('Initiating plug-in detection...');
      const isPlugged = await waitForTendaRouter(cliOptions.url, {
        maxRetries: 45,
        retryIntervalMs: 2000
      });

      if (!isPlugged) {
        logger.error(`Could not detect Tenda router at ${cliOptions.url}.`);
        logger.warn('Please check that your Ethernet cable is plugged into the router or your PC is connected to the default Tenda Wi-Fi.');
        const retry = await promptInput('Retry connection check? (y/n)', 'y');
        if (retry.toLowerCase() !== 'y') {
          process.exit(1);
        }
        return main();
      }
    } else {
      logger.warn('Plug-in check skipped via --skip-check flag.');
    }

    // 7. Launch Puppeteer
    const browser = await launchBrowser({ headless: cliOptions.headless });
    const page = await browser.newPage();
    
    // Set desktop user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // 8. Run Quickset automation
    const result = await runTendaQuickset(page, {
      wifiSSID,
      wifiPwd,
      wanType: 'dhcp',
      randomLanIp,
      targetUrl: cliOptions.url
    });

    await sleep(2500);

    // Close browser when complete
    await browser.close();

    // 9. Success Box
    console.log(`\n  ${colors.brightGreen}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  ${colors.bold}${colors.brightWhite}[OK] TENDA ROUTER QUICKSET CONFIGURED SUCCESSFULLY!${colors.reset}${' '.repeat(14)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}╠════════════════════════════════════════════════════════════════╣${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  - WAN Mode       : ${colors.brightCyan}Dynamic IP (DHCP)${colors.reset}${' '.repeat(26)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  - WiFi SSID      : ${colors.brightYellow}${wifiSSID.padEnd(25)}${colors.reset}${' '.repeat(16)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}║${colors.reset}  - Prepared LAN IP: ${colors.brightMagenta}${randomLanIp.padEnd(25)}${colors.reset}${' '.repeat(16)}${colors.brightGreen}║${colors.reset}`);
    console.log(`  ${colors.brightGreen}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  } catch (error) {
    logger.error(`Automation failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
