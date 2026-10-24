import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { colors } from './banner.js';

/**
 * Generate a random LAN IP in the range 192.168.[min-max].1
 * Default: 192.168.10.1 to 192.168.200.1
 */
export function generateRandomLanIp(min = 10, max = 200) {
  const octet3 = Math.floor(Math.random() * (max - min + 1)) + min;
  return `192.168.${octet3}.1`;
}

/**
 * Sleep helper
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Interactive prompt helper using standard Node.js readline
 */
export async function promptInput(questionText, defaultValue = '') {
  const rl = readline.createInterface({ input, output });
  try {
    const formattedQuestion = `${colors.bold}${colors.brightCyan}> ${questionText}${colors.reset} ${defaultValue ? `${colors.dim}(default: ${defaultValue})${colors.reset} ` : ''}`;
    const answer = await rl.question(formattedQuestion);
    return answer.trim() || defaultValue;
  } finally {
    rl.close();
  }
}

/**
 * Log styled status messages
 */
export const logger = {
  info: (msg) => console.log(`  ${colors.brightCyan}[INFO]${colors.reset}  ${msg}`),
  success: (msg) => console.log(`  ${colors.brightGreen}[OK]${colors.reset}    ${colors.bold}${colors.brightGreen}${msg}${colors.reset}`),
  warn: (msg) => console.log(`  ${colors.brightYellow}[WARN]${colors.reset}  ${colors.yellow}${msg}${colors.reset}`),
  error: (msg) => console.log(`  ${colors.brightRed}[ERROR]${colors.reset} ${colors.bold}${colors.brightRed}${msg}${colors.reset}`),
  step: (stepNum, msg) => console.log(`\n  ${colors.brightMagenta}[STEP ${stepNum}]${colors.reset} ${colors.bold}${msg}${colors.reset}`),
  bullet: (label, val) => console.log(`     ${colors.dim}-${colors.reset} ${colors.bold}${label}:${colors.reset} ${colors.brightWhite}${val}${colors.reset}`)
};

/**
 * Print nice summary box
 */
export function printConfigSummary({ ssid, password, wanType, randomLanIp, targetUrl }) {
  const c = colors;
  const width = 64;
  const line = '─'.repeat(width);

  console.log(`\n  ${c.brightCyan}┌${line}┐${c.reset}`);
  console.log(`  ${c.brightCyan}│${c.reset}  ${c.bold}${c.brightWhite}CONFIGURATION PARAMETERS READY${c.reset}${' '.repeat(width - 31)}${c.brightCyan}│${c.reset}`);
  console.log(`  ${c.brightCyan}├${line}┤${c.reset}`);
  
  const printRow = (label, value) => {
    const text = `  - ${label.padEnd(20)}: ${value}`;
    const padding = Math.max(0, width - text.length);
    console.log(`  ${c.brightCyan}│${c.reset} ${c.brightWhite}${text}${c.reset}${' '.repeat(padding - 1)}${c.brightCyan}│${c.reset}`);
  };

  printRow('Target URL', targetUrl);
  printRow('Connection Type', wanType === 'dhcp' ? 'Dynamic IP (DHCP)' : wanType);
  printRow('WiFi SSID', ssid);
  printRow('WiFi Security', 'Open (No Password)');
  printRow('Generated LAN IP', `${randomLanIp} (192.168.10-200.1)`);
  
  console.log(`  ${c.brightCyan}└${line}┘${c.reset}\n`);
}
