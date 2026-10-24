// ANSI color constants
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  
  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background
  bgCyan: '\x1b[46m',
  bgBlue: '\x1b[44m',
  bgDark: '\x1b[40m'
};

export function displayBanner() {
  console.clear();
  
  const c = colors;
  const bannerLines = [
    `${c.brightCyan}  ████████╗███████╗███╗   ██╗██████╗  █████╗      █████╗ ██╗   ██╗████████╗ ██████╗ `,
    `${c.brightCyan}  ╚══██╔══╝██╔════╝████╗  ██║██╔══██╗██╔══██╗    ██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗`,
    `${c.cyan}     ██║   █████╗  ██╔██╗ ██║██║  ██║███████║    ███████║██║   ██║   ██║   ██║   ██║`,
    `${c.cyan}     ██║   ██╔══╝  ██║╚██╗██║██║  ██║██╔══██║    ██╔══██║██║   ██║   ██║   ██║   ██║`,
    `${c.brightBlue}     ██║   ███████╗██║ ╚████║██████╔╝██║  ██║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝`,
    `${c.brightBlue}     ╚═╝   ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ `
  ];

  console.log('\n' + bannerLines.join('\n') + c.reset + '\n');
  
  const border = '═'.repeat(74);
  console.log(`${c.dim}  ╔${border}╗${c.reset}`);
  console.log(`  ║  ${c.bold}${c.brightWhite}TENDA ROUTER WEB CONFIG AUTOMATION ENGINE${c.reset}${' '.repeat(32)}║`);
  console.log(`  ║  ${c.brightYellow}Automated Quickset Engine${c.reset}  ${c.dim}|${c.reset}  ${c.brightCyan}Puppeteer Driver${c.reset}${' '.repeat(25)}║`);
  console.log(`  ║  ${c.dim}Target: http://192.168.0.1/quickset.html${c.reset}${' '.repeat(34)}║`);
  console.log(`${c.dim}  ╚${border}╝${c.reset}\n`);
}
