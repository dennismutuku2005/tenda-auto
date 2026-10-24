import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { colors } from './banner.js';

/**
 * Generate a random LAN IP in the range 192.168.[min-max].1
 * Range: 192.168.10.1 to 192.168.254.1
 */
export function generateRandomLanIp(min = 10, max = 254) {
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
 * Log styled status messages with clean ASCII tags
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
 * Print cleanly aligned Unicode table box
 */
export function printAlignedBox(title, rows, width = 72) {
  const c = colors;
  const line = '═'.repeat(width);

  console.log(`\n  ${c.brightCyan}╔${line}╗${c.reset}`);
  
  // Title row
  const titlePad = Math.max(0, width - title.length - 2);
  console.log(`  ${c.brightCyan}║${c.reset}  ${c.bold}${c.brightWhite}${title}${c.reset}${' '.repeat(titlePad)}${c.brightCyan}║${c.reset}`);
  console.log(`  ${c.brightCyan}╠${line}╣${c.reset}`);

  // Data rows
  for (const row of rows) {
    const labelPart = `  - ${row.label.padEnd(24)}: `;
    const valPart = `${row.value}`;
    const rawLength = labelPart.length + valPart.length;
    const padding = Math.max(0, width - rawLength);
    const color = row.color || c.brightWhite;
    
    console.log(`  ${c.brightCyan}║${c.reset}${c.dim}${labelPart}${c.reset}${color}${valPart}${c.reset}${' '.repeat(padding)}${c.brightCyan}║${c.reset}`);
  }

  console.log(`  ${c.brightCyan}╚${line}╝${c.reset}\n`);
}

/**
 * Print router configuration summary
 */
export function printConfigSummary({ routerNumber = 1, ssid, wanType, randomLanIp, targetUrl, loginPassword }) {
  const c = colors;
  printAlignedBox(`CONFIGURATION PARAMETERS - ROUTER #${routerNumber}`, [
    { label: 'Target URL', value: targetUrl },
    { label: 'Connection Type', value: wanType === 'dhcp' ? 'Dynamic IP (DHCP)' : wanType, color: c.brightCyan },
    { label: 'WiFi SSID', value: ssid, color: c.brightYellow },
    { label: 'WiFi Security', value: 'Open (No Password)' },
    { label: 'Router Login Password', value: loginPassword || 'auto321', color: c.brightYellow },
    { label: 'Target Random LAN IP', value: `${randomLanIp} (192.168.10-254.1)`, color: c.brightMagenta },
    { label: 'DHCP Server', value: 'Disabled (OFF)', color: c.brightRed },
    { label: 'Sys Auto Maintenance', value: 'Disabled (OFF)', color: c.brightRed }
  ]);
}

/**
 * Print router completion box
 */
export function printSuccessSummary({ routerNumber = 1, ssid, randomLanIp, loginPassword }) {
  const c = colors;
  printAlignedBox(`[OK] ROUTER #${routerNumber} FULLY CONFIGURED AND VERIFIED!`, [
    { label: 'Router Batch Status', value: `Configured & Verified (#${routerNumber})`, color: c.brightGreen },
    { label: 'WiFi SSID', value: ssid, color: c.brightYellow },
    { label: 'WiFi Security', value: 'Open (No Password)' },
    { label: 'Router Login Password', value: loginPassword || 'auto321', color: c.brightYellow },
    { label: 'New LAN IP Address', value: randomLanIp, color: c.brightMagenta },
    { label: 'DHCP Server Status', value: 'Disabled (OFF)', color: c.brightGreen },
    { label: 'Sys Auto Maintenance', value: 'Disabled (OFF)', color: c.brightGreen },
    { label: 'Login Verification', value: 'Confirmed (Login Page Online)', color: c.brightGreen }
  ]);
}

/**
 * Print batch swap notice asking user to unplug current and plug next router
 */
export function printSwapNotice(routerNumber, ssid) {
  const c = colors;
  const width = 72;
  const line = '─'.repeat(width);

  console.log(`  ${c.brightYellow}┌${line}┐${c.reset}`);
  console.log(`  ${c.brightYellow}│${c.reset}  ${c.bold}${c.brightWhite}ACTION REQUIRED: SWAP ROUTER HARDWARE${c.reset}${' '.repeat(width - 39)}${c.brightYellow}│${c.reset}`);
  console.log(`  ${c.brightYellow}├${line}┤${c.reset}`);
  
  const printLine = (txt, color = c.brightWhite) => {
    const pad = Math.max(0, width - txt.length - 2);
    console.log(`  ${c.brightYellow}│${c.reset}  ${color}${txt}${c.reset}${' '.repeat(pad)}${c.brightYellow}│${c.reset}`);
  };

  printLine(`1. Unplug configured Router #${routerNumber}.`, c.brightGreen);
  printLine(`2. Plug in the NEW router via LAN or connect to its default Wi-Fi.`, c.brightCyan);
  printLine(`3. The engine will reuse WiFi Name: "${ssid}".`, c.brightWhite);
  printLine(`4. Close terminal or press Ctrl+C anytime to stop.`, c.dim);
  
  console.log(`  ${c.brightYellow}└${line}┘${c.reset}\n`);
}
