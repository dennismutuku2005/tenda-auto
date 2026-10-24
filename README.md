# TENDA AUTO - Router Web Config Automation Engine

A Node.js + Puppeteer automation CLI designed to configure Tenda routers automatically upon connection, featuring a visible Chrome automation window and a clean terminal interface.

```
  ████████╗███████╗███╗   ██╗██████╗  █████╗      █████╗ ██╗   ██╗████████╗ ██████╗ 
  ╚══██╔══╝██╔════╝████╗  ██║██╔══██╗██╔══██╗    ██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗
     ██║   █████╗  ██╔██╗ ██║██║  ██║███████║    ███████║██║   ██║   ██║   ██║   ██║
     ██║   ██╔══╝  ██║╚██╗██║██║  ██║██╔══██║    ██╔══██║██║   ██║   ██║   ██║   ██║
     ██║   ███████╗██║ ╚████║██████╔╝██║  ██║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝
     ╚═╝   ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ 
```

---

## Key Features

1. **Prompt-Based WiFi Configuration**:
   - Asks for WiFi Name (SSID) alone at launch.
   - No password required (configures open/unprotected network).
2. **Visible Chrome Web Automation**:
   - Opens the actual Chrome browser window live on screen.
   - Smooth pacing (`slowMo: 90ms`) allows you to watch every click and keystroke.
   - Highlights active form fields on the router page with an outline before interacting.
3. **Automatic Router Plug-in Detection**:
   - Continuously checks `http://192.168.0.1/quickset.html`.
   - Starts configuration the moment the Tenda router is plugged in and online.
4. **Dynamic IP (DHCP) Setting**:
   - Selects the Dynamic IP radio button (`#dhcp`).
5. **Random LAN IP Generator**:
   - Automatically selects a randomized LAN IP in the subnet range `192.168.10.1` to `192.168.200.1`.
   - Prepares this parameter for subsequent LAN configuration.

---

## Installation

Ensure you have [Node.js](https://nodejs.org/) installed:

```bash
npm install
```

---

## Usage

### 1. Interactive Prompt (Recommended)
Run the engine. It will show the big banner and ask for your WiFi name:
```bash
npm start
```
Terminal prompt:
```
> Enter WiFi Name (SSID): MyHomeWiFi
```
Once entered, it detects the router, pops up the visible Chrome window, and automates the configuration!

### 2. Pass Name Directly via CLI Argument
```bash
npm start -- "MyHomeWiFi"
```

---

## Testing with Local Mock Server

To test the automation and watch Chrome configure the router without needing physical hardware:

1. **Terminal 1** (Start Mock Tenda Server):
   ```bash
   npm run mock
   ```

2. **Terminal 2** (Run Engine):
   ```bash
   npm run test:mock
   ```

---

## Project Structure

```
tenda-auto/
├── .gitignore           # Excludes node_modules, logs, etc.
├── package.json         # Scripts and dependencies
├── src/
│   ├── index.js         # CLI entry point, prompts & orchestrator
│   ├── banner.js        # Unicode ASCII art banner
│   ├── detector.js      # Plug-in polling and HTTP reachability watcher
│   ├── browser.js       # Puppeteer visible Chrome launcher
│   ├── engine.js        # Tenda QuickSet DOM automation with element highlighting
│   └── utils.js         # Random IP generator, prompts, styling helpers
└── test/
    └── mock-server.js   # Local Tenda QuickSet simulation server
```
