# zPanel

Made by Talha

A fast, modern Minecraft & game server management panel with multi-runtime support, terminal access, file management, and built-in Cloudflare Tunnel integration.

---

## Quick One-Line Install (Recommended)

Run directly on your Ubuntu/Debian or CentOS/RHEL/Fedora server:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/TalhaPlaysOG/zPanel/main/install.sh)
```

### Installer Menu Overview

```text
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ███████╗██████╗  █████╗ ███╗   ██╗███████╗██╗              ║
║   ╚══███╔╝██╔══██╗██╔══██╗████╗  ██║██╔════╝██║              ║
║     ███╔╝ ██████╔╝███████║██╔██╗ ██║█████╗  ██║              ║
║    ███╔╝  ██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║              ║
║   ███████╗██║     ██║  ██║██║ ╚████║███████╗███████╗         ║
║   ╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝         ║
║                                                              ║
║              zPanel MANAGEMENT SYSTEM                        ║
║           Secure Server Administration                       ║
║                                                              ║
║                 Default Port: 6767                           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

INSTALLATION & MANAGEMENT

[1] Install zPanel (Node.js + PM2) [Recommended]
[2] Cloudflare Tunnel Management
[3] Update zPanel
[4] Create Admin User
[5] Restart zPanel
[6] Uninstall zPanel
[7] Exit
```

---

## Installer Features

1. **[1] Install zPanel (Node.js + PM2)**
   - Automatic OS & dependency detection (Debian/Ubuntu, CentOS/RHEL/Fedora).
   - Node.js 22 LTS environment setup.
   - Production build (`vite` + `esbuild`).
   - PM2 process management with automatic system reboot recovery (`pm2 startup`).
   - Panel verification on default port `6767`.
   - Initial interactive administrator account creation.

2. **[2] Cloudflare Tunnel Management**
   - Connect your panel securely without port-forwarding or public IP exposure:
     `https://panel.yourdomain.com` ➔ `Cloudflare Tunnel` ➔ `http://127.0.0.1:6767`
   - **Configure Cloudflare Tunnel**: Choose between Remote-Managed (Zero Trust token) or Locally-Managed.
   - **Connect Existing Tunnel**: Secure token entry (masked input, stored in `/etc/cloudflared/tunnel.env` with `600` permissions).
   - **Tunnel Status**: Real-time diagnostic verification (binary, systemd service, PM2 process, local health, public hostname, auto-restart).
   - **Restart / Stop / Disconnect**: Independent lifecycle control without disturbing zPanel or Cloudflare dashboard configurations.

3. **[3] Update zPanel**
   - Automatically detects installation directory (`/opt/zpanel` or current directory).
   - Safeguards existing configuration (`.env` and `.data/` database).
   - Pulls updates, rebuilds bundle, and reloads PM2 with zero loss of data or settings.

4. **[4] Create Admin User**
   - Direct execution of the administrator registration script.

5. **[5] Restart zPanel**
   - Safely restarts the `zpanel` PM2 process and verifies local port responsiveness.

6. **[6] Uninstall zPanel**
   - Safe removal with explicit `UNINSTALL` typed confirmation.
   - Cleans up PM2 processes and systemd services while preserving system packages.

---

## Panel Features

- 🎮 **Minecraft Server Management** — Start, stop, live console streaming, file manager, plugins, mods, worlds, backups.
- ☁️ **Cloudflare Tunnel** — Built-in Zero Trust tunnel setup and quick ingress mapping.
- 🌐 **Playit.gg Tunnel** — Alternative gaming tunnel support via playit.gg.
- 📁 **File & World Manager** — Multi-file drag-and-drop upload, zip archiving/extraction, world upload & management.
- 🐳 **Docker & Local Process** — Isolated Docker containers or host-level local Java processes.
- 👥 **Sub-Users & Permissions** — Granular server-level permission management.
- 🔑 **Authentication** — Secure JWT authentication and optional Firebase Google Login.

---

## Manual Installation (Alternative)

If you prefer installing without the interactive script:

```bash
# 1. Clone repository
git clone https://github.com/TalhaPlaysOG/zPanel.git
cd zPanel

# 2. Configure environment
cp .env.example .env
# Edit .env as needed (Default PORT is 6767)

# 3. Install dependencies
npm install

# 4. Build production application
npm run build

# 5. Create administrator
npm run createuser

# 6. Start with PM2
npx pm2 start ecosystem.config.cjs
npx pm2 save
npx pm2 startup
```

## Development

To run the panel in local development mode:

```bash
npm run dev
```
