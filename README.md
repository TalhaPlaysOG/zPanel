# zPanel

Made by Jishnu

## One-Line Install (Recommended)

Run directly from GitHub — no manual download needed:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/JishnuTheGamer/Jtg/main/install.sh)
```

This interactive script lets you:
1. **Install Panel** — Node.js only (Port 6767)
2. **Install Panel** — Node.js + Docker Support (Port 6767)
3. **Install Panel** — Development Mode (Port 3000)
4. **Update Panel**
5. **Create Admin User**
6. **Restart Panel**
7. **Exit**

---

## Features

- 🎮 **Minecraft Server Management** — Start, stop, console, file manager, plugins, mods, worlds, backups
- ☁️ **Cloudflare Tunnel** — Expose servers via Quick Tunnels (`*.trycloudflare.com`) or Zero Trust tokens
- 🌐 **Playit.gg Tunnel** — Alternative tunneling via playit.gg
- 📁 **Multi-File Upload** — Upload multiple files at once via button or drag-and-drop
- 🐳 **Docker & Local Process** — Run servers in Docker containers or as local processes
- 👥 **Sub-Users** — Per-server access control
- 🔑 **Google Login** — Optional Firebase authentication

---

## Manual Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/JishnuTheGamer/Jtg.git
   cd Jtg
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run build
   ```

4. Create an admin user:
   ```bash
   npm run createuser
   ```

5. Start the server (Port 6767):
   ```bash
   npm run start
   ```

## Development

To run the panel in development mode on port 3000:

```bash
npm run dev
```

