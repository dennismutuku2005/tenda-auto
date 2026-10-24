# TENDA AUTO - Router Web Config Automation Engine

An automated Node.js + Puppeteer automation CLI designed to configure Tenda routers in continuous batch mode, featuring a visible Chrome automation window and a clean, perfectly aligned terminal interface.

```
  ████████╗███████╗███╗   ██╗██████╗  █████╗      █████╗ ██╗   ██╗████████╗ ██████╗ 
  ╚══██╔══╝██╔════╝████╗  ██║██╔══██╗██╔══██╗    ██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗
     ██║   █████╗  ██╔██╗ ██║██║  ██║███████║    ███████║██║   ██║   ██║   ██║   ██║
     ██║   ██╔══╝  ██║╚██╗██║██║  ██║██╔══██║    ██╔══██║██║   ██║   ██║   ██║   ██║
     ██║   ███████╗██║ ╚████║██████╔╝██║  ██║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝
     ╚═╝   ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ 
```

---

## Complete Multi-Router Batch Workflow

### 1. Single Prompt at Startup
Enter the WiFi Name (SSID) once at launch. The engine reuses this name across every router in your batch session.

### 2. Stage 1: QuickSet
- Pings `http://192.168.0.1/quickset.html` until router is detected.
- Selects **Dynamic IP (DHCP)** (`#dhcp`).
- Types your **WiFi Name (SSID)** (open network, no password).
- Submits QuickSet and confirms.

### 3. Stage 2: Administration Setup
- Transitions to `http://192.168.0.1/index.html`.
- Detects the **Note** popup (`#setPassWord`) and clicks **Go to set** (`#goSet`).
- Sets router login password to **`auto321`** and confirms it.
- Generates a fresh random LAN IP in the range **`192.168.[10-254].1`** (unique for each router).
- Unticks **DHCP Server** (OFF).
- Unticks **Sys Auto Maintenance** (OFF).
- Clicks **OK** to commit changes.
- **Login Verification**: Waits for the router's login page to appear before officially marking the router as configured.

### 4. Seamless Hardware Swapping
- Displays a clean, beautifully aligned completion table for the current router.
- Instructs you to unplug the configured router and plug in the next one.
- Automatically detects the new router and configures it with the same WiFi name and a new random LAN IP.
- Continues automatically until you close the terminal or press `Ctrl+C`.

---

## Installation

Ensure you have [Node.js](https://nodejs.org/) installed:

```bash
npm install
```

---

## Usage

### Run Batch Provisioning
```bash
npm start
```
Terminal prompt:
```
> Enter WiFi Name (SSID) for this batch: FREEWIFI NET
```
Plug in Router #1 -> Automatically configured -> Unplug and plug in Router #2 -> Automatically configured -> and so on!
