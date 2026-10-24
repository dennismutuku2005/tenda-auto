# TENDA AUTO - Router Web Config Automation Engine

An automated Node.js + Puppeteer automation CLI designed to configure Tenda routers completely upon connection, featuring a visible Chrome automation window and a clean terminal interface.

```
  ████████╗███████╗███╗   ██╗██████╗  █████╗      █████╗ ██╗   ██╗████████╗ ██████╗ 
  ╚══██╔══╝██╔════╝████╗  ██║██╔══██╗██╔══██╗    ██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗
     ██║   █████╗  ██╔██╗ ██║██║  ██║███████║    ███████║██║   ██║   ██║   ██║   ██║
     ██║   ██╔══╝  ██║╚██╗██║██║  ██║██╔══██║    ██╔══██║██║   ██║   ██║   ██║   ██║
     ██║   ███████╗██║ ╚████║██████╔╝██║  ██║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝
     ╚═╝   ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ 
```

---

## Complete Two-Stage Automation Workflow

### Stage 1: QuickSet Configuration
1. Automatically probes `http://192.168.0.1/quickset.html` until router is detected.
2. Selects **Dynamic IP (DHCP)** (`#dhcp`).
3. Inputs your custom **WiFi Name (SSID)** (prompt-based, no password needed).
4. Submits QuickSet and verifies the `"Saved!"` response.

### Stage 2: Administration & LAN Setup
1. Automatically transitions to `http://192.168.0.1/index.html`.
2. Detects the **Note** popup (`#setPassWord`) and clicks **Go to set** (`#goSet`).
3. Sets Router Login Password to **`auto321`** and confirms it.
4. Generates a random LAN IP in the range **`192.168.[10-254].1`** and updates the LAN IP field.
5. Unticks and disables the **DHCP Server** (OFF).
6. Unticks and disables **Sys Auto Maintenance** (OFF).
7. Clicks **OK** to commit all changes and apply router reboot.

---

## Installation

Ensure you have [Node.js](https://nodejs.org/) installed:

```bash
npm install
```

---

## Usage

### Interactive Prompt (Recommended)
Run the script. It will display the banner and prompt for the WiFi Name alone:
```bash
npm start
```
Terminal prompt:
```
> Enter WiFi Name (SSID): FREEWIFI NET
```
The visible Chrome browser window will launch automatically and carry out both Stage 1 and Stage 2 right in front of you.

---

## Testing with Local Mock Server

To test both stages locally without physical hardware:

1. **Terminal 1** (Start Mock Tenda Server):
   ```bash
   npm run mock
   ```

2. **Terminal 2** (Run Engine):
   ```bash
   npm run test:mock
   ```
