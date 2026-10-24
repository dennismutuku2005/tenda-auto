# TENDA AUTO - Router Access Point (AP Mode) Mass Provisioning Engine

A developer-grade Node.js and Puppeteer automation suite designed for mass-configuring Tenda consumer routers into transparent Wireless Access Points (AP Mode). Features automated plug-in detection, a visible automation browser, two-stage DOM execution, and a continuous multi-unit hardware loop.

```
  ████████╗███████╗███╗   ██╗██████╗  █████╗      █████╗ ██╗   ██╗████████╗ ██████╗ 
  ╚══██╔══╝██╔════╝████╗  ██║██╔══██╗██╔══██╗    ██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗
     ██║   █████╗  ██╔██╗ ██║██║  ██║███████║    ███████║██║   ██║   ██║   ██║   ██║
     ██║   ██╔══╝  ██║╚██╗██║██║  ██║██╔══██║    ██╔══██║██║   ██║   ██║   ██║   ██║
     ██║   ███████╗██║ ╚████║██████╔╝██║  ██║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝
     ╚═╝   ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ 
```

---

## Technical Overview: Why AP Mode Configuration?

When deploying consumer Tenda routers across larger enterprise, hospitality, or campus networks, using them in standard Gateway/Router mode causes double-NAT, IP conflicts, and rogue routing. This engine automates the exact parameters required to turn a fresh Tenda router into a transparent Layer 2 Wireless Access Point:

| Configuration Parameter | Setting Applied | Technical Rationale |
| :--- | :--- | :--- |
| **DHCP Server** | `Disabled (OFF)` | **Critical for AP Mode.** Disables the local DHCP pool (`#dhcpEn`). Prevents the router from broadcasting rogue DHCP offer packets that crash or conflict with upstream core gateways (MikroTik, pfSense, Cisco, ISP modems). |
| **LAN IP Address** | `192.168.[10-254].1` | Consumer routers default to `192.168.0.1`. When deploying multiple APs on the same subnet, static collisions crash network management. The engine randomly provisions a unique 3rd octet for isolated management access. |
| **Sys Auto Maintenance** | `Disabled (OFF)` | Disables scheduled 03:00 AM - 05:00 AM reboot cycles (`#autoMaintenanceEn`), preventing forced connection drops for active nocturnal or long-running clients. |
| **Admin Login Password** | `auto321` | Replaces the unprotected default router dashboard with uniform fleet administrator credentials, securing `#newPwd` and `#cfmPwd`. |
| **WAN / Uplink Mode** | `Dynamic IP (DHCP)` | Configures WAN connection type to Dynamic IP (`#dhcp`) for immediate uplink communication when connected to the main switch. |
| **WiFi Network Name** | User-defined SSID | Broadcasts the specified network name across the venue with open security (or prepared captive portal integration). |

---

## Two-Stage Automation Architecture

The engine uses Puppeteer with natural pacing (`slowMo: 90ms`) and visual element outlines to orchestrate two consecutive configuration stages:

```
[Start Session]
      │
      ▼
Prompt for SSID (Requested once per batch)
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ BATCH LOOP: ROUTER #N                                  │
│                                                        │
│  [1. Detector]                                         │
│       Polls http://192.168.0.1/quickset.html           │
│       Detects physical plug-in via Ethernet/Wi-Fi      │
│                                                        │
│  [2. Stage 1: QuickSet]                                │
│       WAN Mode -> Dynamic IP (#dhcp)                   │
│       WiFi SSID -> Target Name (#wifiSSID)             │
│       Commit -> Clicks #save                           │
│                                                        │
│  [3. Stage 2: Administration]                          │
│       Transitions to /index.html                       │
│       Bypasses Note modal -> Clicks #goSet             │
│       Sets Admin Password -> auto321 (#newPwd, #cfmPwd)│
│       Sets Random LAN IP -> 192.168.X.1 (#lanIP)       │
│       Disables DHCP Server -> Unticks #dhcpEn          │
│       Disables Auto Maintenance -> Unticks             │
│                                    #autoMaintenanceEn  │
│       Commit -> Clicks button#submit                   │
│                                                        │
│  [4. Verification]                                     │
│       Waits for reboot & login page appearance         │
│                                                        │
│  [5. Hardware Swap]                                    │
│       Displays completion table & swap notification    │
│       Waits for router disconnect                      │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
           Ready for Router #N+1 (Auto-resumes)
```

---

## Directory Structure

```
tenda-auto/
├── package.json         # Engine dependencies, bin entry & run scripts
├── package-lock.json    # Deterministic lockfile
├── .gitignore           # Ignores node_modules, logs, and environments
├── src/
│   ├── index.js         # Infinite multi-unit batch runner & CLI entry point
│   ├── engine.js        # Stage 1 (QuickSet) & Stage 2 (Administration) DOM automaton
│   ├── detector.js      # HTTP polling daemon for router connect / disconnect cycles
│   ├── browser.js       # Puppeteer launcher with fallback to system Chrome/Edge
│   ├── banner.js        # Large-format Unicode ASCII branding banner
│   └── utils.js         # Random IP generator, aligned Unicode tables, and prompts
└── test/
    └── mock-server.js   # Local simulation server mirroring exact Tenda firmware DOM
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18.0.0 or higher
- Windows 10/11, macOS, or Linux
- Google Chrome or Microsoft Edge installed (used automatically by Puppeteer)

---

## Installation

Clone the repository and install runtime dependencies:

```bash
git clone https://github.com/dennismutuku2005/tenda-auto.git
cd tenda-auto
npm install
```

---

## Operational Guide: Mass-Provisioning Workflow

### 1. Launch the Engine
Run the primary start command in your terminal:

```bash
npm start
```

### 2. Enter Fleet SSID Once
The terminal will display the header banner and request the target network name:
```
  Batch WiFi Configuration:

> Enter WiFi Name (SSID) for this batch: FREEWIFI NET
```

### 3. Provisioning Sequence
1. **Connect Unit #1**: Plug an Ethernet cable from your computer into any LAN port of the first Tenda router (or connect to its factory Wi-Fi).
2. **Autonomous Execution**:
   - The engine automatically detects the unit at `http://192.168.0.1/quickset.html`.
   - Chrome opens visibly on screen, selects Dynamic IP, sets the SSID, clicks Save.
   - Chrome navigates to Administration, clicks `Go to set`, applies `auto321`, assigns random LAN IP (e.g. `192.168.142.1`), unticks DHCP, unticks auto-reboot, and submits `button#submit`.
   - The engine monitors the reboot cycle and confirms the login page.
3. **Swap Hardware**:
   The terminal displays a clean completion card and outputs:
   ```
   ┌────────────────────────────────────────────────────────────────────────┐
   │  ACTION REQUIRED: SWAP ROUTER HARDWARE                                 │
   ├────────────────────────────────────────────────────────────────────────┤
   │  1. Unplug configured Router #1.                                       │
   │  2. Plug in the NEW router via LAN or connect to its default Wi-Fi.    │
   │  3. The engine will reuse WiFi Name: "FREEWIFI NET".                   │
   │  4. Close terminal or press Ctrl+C anytime to stop.                    │
   └────────────────────────────────────────────────────────────────────────┘
   ```
4. **Repeat**: Unplug Unit #1 and plug in Unit #2. The engine immediately detects Unit #2, assigns a fresh random LAN IP, and provisions it with the same SSID.
5. **Exit**: When finished with your batch, press `Ctrl+C` or close the terminal window.

---

## Advanced CLI Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--ssid="NAME"` | Provide WiFi SSID directly via command line, skipping the prompt | Interactive prompt |
| `--slowmo=MS` | Execution delay between browser interactions in milliseconds | `90` |
| `--skip-check` | Bypass pre-flight router reachability ping (for testing) | `false` |
| `--url=URL` | Override default target QuickSet address | `http://192.168.0.1/quickset.html` |

Example:
```bash
node src/index.js --ssid="Venue_Guest_WiFi" --slowmo=50
```

---

## Offline Testing with Mock Server

To test the entire two-stage automation workflow without a physical router connected:

1. **Terminal 1** (Start Mock Tenda Server):
   ```bash
   npm run mock
   ```
   *Runs an embedded HTTP server on `http://127.0.0.1:8089` simulating the exact QuickSet form, Note modal, and Administration page.*

2. **Terminal 2** (Run Engine against Mock Server):
   ```bash
   npm run test:mock
   ```

---

## Technical DOM Reference for Developers

For developers maintaining or extending compatibility with other Tenda firmware versions, key DOM selectors utilized in [`src/engine.js`](file:///c:/Users/DENNISMUTUKU/Desktop/tenda-auto/src/engine.js) are documented below:

- **QuickSet Radio**: `#dhcp` or `input[name="wanType"][value="dhcp"]`
- **QuickSet SSID Field**: `#wifiSSID` (maxlength: 32)
- **QuickSet Save Button**: `#save` or `input.save-btn`
- **Note Modal Trigger**: `#goSet` inside `<section id="setPassWord">`
- **Admin Password**: `#newPwd` (New) and `#cfmPwd` (Repeat)
- **LAN IP Field**: `#lanIP` (maxlength: 15)
- **DHCP Toggle**: `#dhcpEn` (inline checkbox)
- **Maintenance Toggle**: `#autoMaintenanceEn` (inline checkbox)
- **Admin Commit Button**: `button#submit` inside `<div class="main-footer">`
- **Reboot Progress Container**: `#rebootWrap` and `#progress-dialog`
- **Post-Reboot Login Input**: `#loginPassword` or `#loginPwd`
