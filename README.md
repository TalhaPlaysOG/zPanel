# zPanel

Made by Talha

A fast, lightweight, and modern server-management panel with real-time console streaming, multi-runtime support (Docker & Local Process), Playit.gg integration, and automated Cloudflare Tunnel management through the installer.

---

## One-Line Install (Recommended)

Run directly on your Ubuntu/Debian or CentOS/RHEL/Fedora server:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/TalhaPlaysOG/zPanel/main/install.sh)
```

### Production Installer Menu

```text
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║                           zPanel                             ║
║                  SERVER MANAGEMENT SYSTEM                    ║
║                                                              ║
║                    Production Installer                      ║
║                    Default Port: 6767                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

INSTALLATION & MANAGEMENT

  [1] Install zPanel (Node.js + PM2) [Recommended]
  [2] Cloudflare Tunnel Management
  [3] Update zPanel
  [4] Create Admin User
  [5] Restart zPanel
  [6] Exit
```

---

## Installer Capabilities

1. **[1] Install zPanel (Node.js + PM2)**
   - Automatic OS & dependency detection (Debian/Ubuntu, CentOS/RHEL/Fedora).
   - Node.js 22 LTS environment setup.
   - **Automatic Java 25 installation** for host Minecraft execution (no interactive prompts).
   - Automatic runtime configuration (prefers Docker if available, otherwise local process).
   - Production application build.
   - PM2 process management with automatic system reboot recovery (`pm2 startup` & `pm2 save`).
   - Verifies panel health on default port `6767`.
   - Initial interactive administrator account creation.

2. **[2] Cloudflare Tunnel Management**
   - Configured **exclusively through the installer** — completely independent from the web UI.
   - Secure token-based connector setup (`read -rs` masked input, stored in `/etc/cloudflared/tunnel.env` with `chmod 600`).
   - Persistent systemd service (`cloudflared.service`) with auto-restart on boot and process recovery.
   - Direct Cloudflare Zero Trust dashboard workflow: map your public hostname to origin `http://127.0.0.1:6767`.
   - Real-time diagnostic verification (binary, systemd service, PM2 process, and connection state).
   - Independent lifecycle: stopping or restarting the tunnel does not interrupt the panel or Playit.

3. **[3] Update zPanel**
   - Detects installation directory (`/opt/zpanel` or current directory).
   - Safeguards existing configuration (`.env` and `.data/` database).
   - Pulls updates, rebuilds bundle, and reloads PM2 with zero loss of data or settings.

4. **[4] Create Admin User**
   - Runs administrator registration directly from the command line.

5. **[5] Restart zPanel**
   - Safely restarts the `zpanel` PM2 process and verifies local port responsiveness.

---

## Panel Web Interface

The web interface is streamlined to 5 essential sections:
- 📊 **Dashboard** — Live host CPU/RAM statistics, instance overview, and fast server navigation with zero decorative widgets or fake data.
- 🎮 **Servers** — Server creation, live console streaming, file management, SFTP, player management, plugins, mods, and backups.
- 🌐 **Playit** — Dedicated Playit.gg tunnel management for instances, live agent status, and claim link connection.
- 👥 **Users** — Administrator and user account management, role assignments, and password updates.
- ⚙️ **Settings** — Panel configuration, default server runtime, and security credentials (no Cloudflare clutter in the UI).

---

## Manual Installation (Alternative)

```bash
# 1. Clone repository
git clone https://github.com/TalhaPlaysOG/zPanel.git
cd zPanel

# 2. Configure environment
cp .env.example .env
# Default PORT is 6767

# 3. Install dependencies & build
npm install
npm run build

# 4. Create administrator
npm run createuser

# 5. Start with PM2
npx pm2 start ecosystem.config.cjs
npx pm2 save
npx pm2 startup
```

## Development

To run the panel in local development mode:

```bash
npm run dev
```
