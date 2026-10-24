import { colors } from './banner.js';
import { logger, sleep } from './utils.js';

/**
 * Polls targetUrl until Tenda router responds.
 * Checks for HTTP 200 and router keywords in body if reachable.
 */
export async function waitForTendaRouter(targetUrl = 'http://192.168.0.1/quickset.html', options = {}) {
  const { maxRetries = 60, retryIntervalMs = 2000 } = options;
  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frameIndex = 0;
  let attempt = 0;

  console.log(`  ${colors.brightCyan}[PROBE] Checking for Tenda router at ${colors.underline}${targetUrl}${colors.reset}...`);

  while (attempt < maxRetries) {
    attempt++;
    const spinner = spinnerFrames[frameIndex % spinnerFrames.length];
    frameIndex++;

    process.stdout.write(`\r  ${colors.brightYellow}${spinner}${colors.reset} ${colors.dim}[Attempt ${attempt}]${colors.reset} Pinging ${targetUrl}... `);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);

      const res = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TendaAuto/1.0'
        }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        // Verify it contains Tenda quickset page markers
        const isTendaQuickset = text.includes('quickSet') || text.includes('wifiSSID') || text.includes('wanType') || text.includes('logo.png');
        
        process.stdout.write('\r' + ' '.repeat(80) + '\r');
        if (isTendaQuickset || res.status === 200) {
          logger.success(`Tenda router is plugged in and online! (${targetUrl})`);
          return true;
        }
      }
    } catch (err) {
      // Router is either powering on, unplugged, or network interface not yet initialized
    }

    await sleep(retryIntervalMs);
  }

  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  logger.warn(`Could not verify router at ${targetUrl} within timeout.`);
  return false;
}
