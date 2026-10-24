import { colors } from './banner.js';
import { logger, sleep } from './utils.js';

/**
 * Polls targetUrl until Tenda router responds.
 * Checks for HTTP 200 and router keywords in body if reachable.
 */
export async function waitForTendaRouter(targetUrl = 'http://192.168.0.1/quickset.html', options = {}) {
  const { maxRetries = 120, retryIntervalMs = 2000, message = 'Pinging Tenda router' } = options;
  const spinnerFrames = ['|', '/', '-', '\\'];
  let frameIndex = 0;
  let attempt = 0;

  console.log(`  ${colors.brightCyan}[PROBE] Waiting for Tenda router at ${colors.underline}${targetUrl}${colors.reset}...`);

  while (attempt < maxRetries) {
    attempt++;
    const spinner = spinnerFrames[frameIndex % spinnerFrames.length];
    frameIndex++;

    process.stdout.write(`\r  ${colors.brightYellow}${spinner}${colors.reset} ${colors.dim}[Attempt ${attempt}]${colors.reset} ${message} (${targetUrl})... `);

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
        const isTendaQuickset = text.includes('quickSet') || text.includes('wifiSSID') || text.includes('wanType') || text.includes('logo.png');
        
        process.stdout.write('\r' + ' '.repeat(85) + '\r');
        if (isTendaQuickset || res.status === 200) {
          logger.success(`Tenda router detected online at ${targetUrl}`);
          return true;
        }
      }
    } catch (err) {
      // Router is either powering on, unplugged, or network interface not yet initialized
    }

    await sleep(retryIntervalMs);
  }

  process.stdout.write('\r' + ' '.repeat(85) + '\r');
  logger.warn(`Could not verify router at ${targetUrl} within timeout.`);
  return false;
}

/**
 * Waits for the current router to disconnect / drop from 192.168.0.1
 * (triggered when current router is unplugged or reboots to new LAN IP)
 */
export async function waitForRouterDisconnect(targetUrl = 'http://192.168.0.1/quickset.html', maxRetries = 15) {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(targetUrl, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return true;
    } catch (e) {
      // Unreachable = successfully disconnected
      return true;
    }
    await sleep(1000);
  }
  return true;
}
