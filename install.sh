#!/bin/bash

# =========================================================
# zPanel - Automated Installation & Management Script
# Repository: https://github.com/TalhaPlaysOG/zPanel
# =========================================================

# Redirect stdin to controlling terminal if available (handles process substitution & pipe execution)
if [ ! -t 0 ] && [ -e /dev/tty ]; then
    exec < /dev/tty
fi

# Do not exit immediately on non-fatal command errors; steps handle errors explicitly
set +e

# ─────────────────────────────────────────────
#  CONSTANTS & PATHS
# ─────────────────────────────────────────────
REPO_URL="https://github.com/TalhaPlaysOG/zPanel.git"
DEFAULT_INSTALL_DIR="/opt/zpanel"
PM2_APP_NAME="zpanel"
PANEL_PORT="6767"
CF_SERVICE="cloudflared"
CF_CONFIG_DIR="/etc/cloudflared"
CF_ENV_FILE="/etc/cloudflared/tunnel.env"
CF_HOST_FILE="/etc/cloudflared/public_host.txt"

# ─────────────────────────────────────────────
#  TERMINAL COLORS & STYLES
# ─────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ─────────────────────────────────────────────
#  LOGGING HELPERS
# ─────────────────────────────────────────────
log_info()    { echo -e "  ${BLUE}${BOLD}[INFO]${NC}    $1"; }
log_success() { echo -e "  ${GREEN}${BOLD}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "  ${YELLOW}${BOLD}[WARNING]${NC} $1"; }
log_error()   { echo -e "  ${RED}${BOLD}[ERROR]${NC}   $1"; }
log_step()    { echo -e "\n  ${CYAN}${BOLD}▶ $1${NC}"; }
log_divider() { echo -e "  ${DIM}──────────────────────────────────────────────────────────────${NC}"; }

# ─────────────────────────────────────────────
#  HEADER BANNER
# ─────────────────────────────────────────────
print_banner() {
    clear
    echo -e "${CYAN}${BOLD}"
    echo "  ╔══════════════════════════════════════════════════════════════╗"
    echo "  ║                                                              ║"
    echo "  ║   ███████╗██████╗  █████╗ ███╗   ██╗███████╗██╗              ║"
    echo "  ║   ╚══███╔╝██╔══██╗██╔══██╗████╗  ██║██╔════╝██║              ║"
    echo "  ║     ███╔╝ ██████╔╝███████║██╔██╗ ██║█████╗  ██║              ║"
    echo "  ║    ███╔╝  ██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║              ║"
    echo "  ║   ███████╗██║     ██║  ██║██║ ╚████║███████╗███████╗         ║"
    echo "  ║   ╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝         ║"
    echo "  ║                                                              ║"
    echo "  ║              zPanel MANAGEMENT SYSTEM                        ║"
    echo "  ║           Secure Server Administration                       ║"
    echo "  ║                                                              ║"
    echo "  ║                 Default Port: 6767                           ║"
    echo "  ║                                                              ║"
    echo "  ╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# ─────────────────────────────────────────────
#  PRIVILEGE CHECK
# ─────────────────────────────────────────────
check_privileges() {
    if [ "$EUID" -ne 0 ]; then
        if command -v sudo &>/dev/null; then
            SUDO="sudo"
        else
            log_error "This operation requires root or sudo privileges."
            echo -e "  Please re-run as root: sudo bash <(curl -fsSL https://raw.githubusercontent.com/TalhaPlaysOG/zPanel/main/install.sh)"
            exit 1
        fi
    else
        SUDO=""
    fi
}

# ─────────────────────────────────────────────
#  OPERATING SYSTEM DETECTION
# ─────────────────────────────────────────────
detect_os() {
    log_step "Detecting operating system..."
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_NAME="$NAME"
        OS_ID="$ID"
        log_success "Operating System: $OS_NAME ($OS_ID)"
    else
        OS_ID="unknown"
        log_warning "Could not detect OS from /etc/os-release. Proceeding with standard package detection."
    fi

    if command -v apt-get &>/dev/null; then
        PKG_MGR="apt"
    elif command -v yum &>/dev/null; then
        PKG_MGR="yum"
    elif command -v dnf &>/dev/null; then
        PKG_MGR="dnf"
    else
        log_error "Unsupported package manager. zPanel installer supports Debian/Ubuntu (apt) and RHEL/CentOS/Fedora (dnf/yum)."
        exit 1
    fi
}

# ─────────────────────────────────────────────
#  NETWORK CHECK
# ─────────────────────────────────────────────
check_network() {
    log_step "Verifying internet connectivity..."
    if curl -fsSL --max-time 6 https://raw.githubusercontent.com &>/dev/null || curl -fsSL --max-time 6 https://github.com &>/dev/null; then
        log_success "Internet connection verified."
    else
        log_error "Failed to connect to GitHub. Please check your server's network connection and DNS settings."
        exit 1
    fi
}

# ─────────────────────────────────────────────
#  FIND INSTALLATION DIRECTORY
# ─────────────────────────────────────────────
find_panel_directory() {
    # 1. Current directory if package.json has react-example or server.ts
    if [ -f "./package.json" ] && [ -f "./server.ts" ]; then
        pwd
        return 0
    fi
    # 2. Check /opt/zpanel
    if [ -d "$DEFAULT_INSTALL_DIR" ] && [ -f "$DEFAULT_INSTALL_DIR/package.json" ]; then
        echo "$DEFAULT_INSTALL_DIR"
        return 0
    fi
    # 3. Check ~/zpanel
    if [ -d "$HOME/zpanel" ] && [ -f "$HOME/zpanel/package.json" ]; then
        echo "$HOME/zpanel"
        return 0
    fi
    # 4. Check ./Jtg or ./zPanel
    if [ -d "./zPanel" ] && [ -f "./zPanel/package.json" ]; then
        echo "$(pwd)/zPanel"
        return 0
    fi
    if [ -d "./Jtg" ] && [ -f "./Jtg/package.json" ]; then
        echo "$(pwd)/Jtg"
        return 0
    fi
    return 1
}

# ─────────────────────────────────────────────
#  SYSTEM PACKAGES INSTALLATION
# ─────────────────────────────────────────────
install_system_packages() {
    log_step "Installing essential system packages..."
    if [ "$PKG_MGR" = "apt" ]; then
        $SUDO dpkg --configure -a 2>/dev/null || true
        $SUDO apt-get install -f -y 2>/dev/null || true
        $SUDO apt-get update -y 2>/dev/null || true
        $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y \
            curl git build-essential ca-certificates tar xz-utils jq procps \
            2>/dev/null || log_warning "Some optional system packages could not be installed, continuing..."
    elif [ "$PKG_MGR" = "yum" ] || [ "$PKG_MGR" = "dnf" ]; then
        $SUDO $PKG_MGR install -y curl git make gcc-c++ ca-certificates tar xz jq procps \
            2>/dev/null || log_warning "Some optional system packages could not be installed, continuing..."
    fi
    log_success "System utilities ready."
}

# ─────────────────────────────────────────────
#  NODE.JS INSTALLATION (Requires >= 22 or >= 20.19)
# ─────────────────────────────────────────────
install_nodejs() {
    log_step "Checking Node.js runtime..."
    local NEED_NODE=0

    if ! command -v node &>/dev/null; then
        NEED_NODE=1
    else
        NODE_VER_RAW=$(node -v 2>/dev/null | tr -d 'v')
        NODE_MAJOR=$(echo "$NODE_VER_RAW" | cut -d'.' -f1)
        NODE_MINOR=$(echo "$NODE_VER_RAW" | cut -d'.' -f2)

        if [ "$NODE_MAJOR" -lt 22 ]; then
            if [ "$NODE_MAJOR" -lt 20 ] || [ "${NODE_MINOR:-0}" -lt 19 ]; then
                NEED_NODE=1
                log_info "Current Node.js version ($NODE_VER_RAW) is below requirements. Upgrading to Node.js 22.x..."
            fi
        fi
    fi

    if [ "$NEED_NODE" -eq 1 ]; then
        log_info "Installing Node.js 22.x LTS..."
        if [ "$PKG_MGR" = "apt" ]; then
            curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash - 2>/dev/null || true
            $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs 2>/dev/null || true
        elif [ "$PKG_MGR" = "yum" ] || [ "$PKG_MGR" = "dnf" ]; then
            curl -fsSL https://rpm.nodesource.com/setup_22.x | $SUDO bash - 2>/dev/null || true
            $SUDO $PKG_MGR install -y nodejs 2>/dev/null || true
        fi

        # Fallback to direct official Node binary tarball if package manager failed
        CURRENT_MAJOR=0
        if command -v node &>/dev/null; then
            CURRENT_MAJOR=$(node -v 2>/dev/null | cut -d'.' -f1 | tr -d 'v')
        fi

        if [ "$CURRENT_MAJOR" -lt 20 ]; then
            log_info "Installing official Node.js 22.14.0 binary release directly..."
            ARCH=$(uname -m)
            case "$ARCH" in
                x86_64)  NODE_ARCH="x64" ;;
                aarch64) NODE_ARCH="arm64" ;;
                armv7l)  NODE_ARCH="armv7l" ;;
                *)       NODE_ARCH="x64" ;;
            esac
            NODE_PKG="node-v22.14.0-linux-${NODE_ARCH}"
            curl -fsSL "https://nodejs.org/dist/v22.14.0/${NODE_PKG}.tar.xz" -o /tmp/node22.tar.xz 2>/dev/null || true
            if [ -f "/tmp/node22.tar.xz" ]; then
                $SUDO tar -xJf /tmp/node22.tar.xz -C /usr/local --strip-components=1 2>/dev/null || true
                rm -f /tmp/node22.tar.xz
            fi
        fi
    fi

    if command -v node &>/dev/null && command -v npm &>/dev/null; then
        log_success "Node.js $(node -v) & npm v$(npm -v) confirmed."
    else
        log_error "Node.js installation failed. Please install Node.js 22 manually and re-run."
        exit 1
    fi
}

# ─────────────────────────────────────────────
#  PM2 INSTALLATION
# ─────────────────────────────────────────────
install_pm2() {
    log_step "Checking PM2 process manager..."
    if ! command -v pm2 &>/dev/null; then
        log_info "Installing PM2 globally..."
        $SUDO npm install -g pm2 2>/dev/null || npm install -g pm2
        if ! command -v pm2 &>/dev/null; then
            log_error "Failed to install PM2. Process manager is required."
            exit 1
        fi
    fi
    log_success "PM2 is ready ($(pm2 -v 2>/dev/null || echo 'installed'))."
}

# ─────────────────────────────────────────────
#  JAVA 21 OPTIONAL INSTALL (For Local Process Servers)
# ─────────────────────────────────────────────
setup_java_optional() {
    if command -v java &>/dev/null; then
        JAVA_BIN_PATH=$(which java)
        log_success "Java is installed: $JAVA_BIN_PATH"
        return 0
    fi

    echo ""
    echo -e "  ${CYAN}Would you like to install OpenJDK 21 for running Minecraft servers locally? [y/N]:${NC} \c"
    read -r INSTALL_JAVA
    if [[ "$INSTALL_JAVA" =~ ^[Yy]$ ]]; then
        log_info "Installing OpenJDK 21..."
        if [ "$PKG_MGR" = "apt" ]; then
            $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y openjdk-21-jre-headless 2>/dev/null || true
        elif [ "$PKG_MGR" = "yum" ] || [ "$PKG_MGR" = "dnf" ]; then
            $SUDO $PKG_MGR install -y java-21-openjdk-headless 2>/dev/null || true
        fi
        if command -v java &>/dev/null; then
            log_success "Java 21 installed successfully: $(which java)"
        else
            log_warning "Java installation encountered an issue. Local Minecraft server processes may require manual Java setup."
        fi
    else
        log_info "Skipping Java installation."
    fi
}

# ─────────────────────────────────────────────
#  CLOUDFLARED BINARY INSTALLATION
# ─────────────────────────────────────────────
install_cloudflared_binary() {
    if command -v cloudflared &>/dev/null; then
        CF_VER=$(cloudflared --version 2>/dev/null | awk '{print $3}' | head -1)
        log_success "cloudflared is already installed (version: ${CF_VER:-ok})."
        return 0
    fi

    log_step "Installing Cloudflare Tunnel client (cloudflared)..."

    # Official package repository method for Debian/Ubuntu
    if [ "$PKG_MGR" = "apt" ]; then
        curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | $SUDO tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null 2>&1 || true
        echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main' \
            | $SUDO tee /etc/apt/sources.list.d/cloudflared.list >/dev/null 2>&1 || true
        $SUDO apt-get update -y >/dev/null 2>&1 || true
        $SUDO apt-get install -y cloudflared >/dev/null 2>&1 || true
    fi

    # Fallback to direct official standalone binary
    if ! command -v cloudflared &>/dev/null; then
        log_info "Downloading official cloudflared binary release..."
        ARCH=$(uname -m)
        case "$ARCH" in
            x86_64)  CF_ARCH="amd64" ;;
            aarch64) CF_ARCH="arm64" ;;
            armv7l)  CF_ARCH="arm" ;;
            *)       CF_ARCH="amd64" ;;
        esac
        curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}" -o /tmp/cloudflared 2>/dev/null || true
        if [ -f "/tmp/cloudflared" ]; then
            $SUDO install -m 755 /tmp/cloudflared /usr/local/bin/cloudflared
            rm -f /tmp/cloudflared
        fi
    fi

    if command -v cloudflared &>/dev/null; then
        log_success "cloudflared installed: $(cloudflared --version 2>/dev/null | head -1)"
        return 0
    else
        log_error "Failed to install cloudflared. Please verify network access or install cloudflared manually."
        return 1
    fi
}

# ─────────────────────────────────────────────
#  WRITE PM2 ECOSYSTEM CONFIGURATION
# ─────────────────────────────────────────────
write_pm2_ecosystem() {
    local target_dir="$1"
    cat > "$target_dir/ecosystem.config.cjs" << 'ECOSYSTEM'
module.exports = {
  apps: [
    {
      name: "zpanel",
      script: "npm",
      args: "start",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 6767
      }
    }
  ]
};
ECOSYSTEM
    log_success "PM2 ecosystem config created (Port 6767)."
}

# ─────────────────────────────────────────────
#  SETUP APPLICATION ENVIRONMENT (.env)
# ─────────────────────────────────────────────
configure_application_env() {
    local target_dir="$1"
    local env_file="$target_dir/.env"

    if [ -f "$env_file" ]; then
        log_info "Existing .env file found. Preserving current secrets and settings..."
        # Ensure PORT is 6767
        if grep -q "^PORT=" "$env_file"; then
            sed -i "s/^PORT=.*/PORT=6767/" "$env_file"
        else
            echo "PORT=6767" >> "$env_file"
        fi
    else
        log_info "Creating production .env file..."
        GENERATED_SECRET=$(head -c 32 /dev/urandom 2>/dev/null | base64 | tr -dc 'a-zA-Z0-9' | head -c 48)
        [ -z "$GENERATED_SECRET" ] && GENERATED_SECRET="zpanel-jwt-$(date +%s%N)"
        cat > "$env_file" << ENVEOF
# zPanel Production Environment
PORT=6767
ENABLE_DOCKER=false
JWT_SECRET=${GENERATED_SECRET}
GEMINI_API_KEY=
DOCKER_SOCKET_PATH=
VITE_ENABLE_DEVELOPER_PANEL=false
ENVEOF
    fi

    # Add Java path if available
    if command -v java &>/dev/null; then
        JAVA_PATH=$(which java)
        if ! grep -q "^JAVA_BIN=" "$env_file"; then
            echo "JAVA_BIN=$JAVA_PATH" >> "$env_file"
        fi
    fi

    chmod 600 "$env_file" 2>/dev/null || true
    log_success "Environment configured."
}

# ─────────────────────────────────────────────
#  LOCAL HEALTH CHECK
# ─────────────────────────────────────────────
check_panel_health() {
    local port="${1:-$PANEL_PORT}"
    local max_retries=25
    local count=0

    while [ $count -lt $max_retries ]; do
        if curl -fsSL --max-time 2 "http://127.0.0.1:$port" &>/dev/null; then
            return 0
        fi
        sleep 2
        count=$((count + 1))
    done
    return 1
}

# ─────────────────────────────────────────────
#  [1] INSTALL zPanel (Node.js + PM2)
# ─────────────────────────────────────────────
install_zpanel() {
    print_banner
    echo -e "  ${BOLD}${CYAN}INSTALLATION — Node.js + PM2 [Recommended]${NC}\n"
    log_divider

    check_privileges
    check_network
    detect_os
    install_system_packages
    install_nodejs
    install_pm2

    # Prompt for default server runtime (Docker vs Local Process)
    echo ""
    echo -e "  ${CYAN}Which default runtime mode should new servers use?${NC}"
    echo -e "    ${BOLD}[1]${NC} Docker  (Stable, Recommended for isolated containers)"
    echo -e "    ${BOLD}[2]${NC} Local Process  (Beta, runs directly on host)"
    echo -e "  \c"
    read -p "Select [1-2] (default 1): " RUNTIME_CHOICE
    if [ "$RUNTIME_CHOICE" = "2" ]; then
        DEFAULT_RUNTIME="local"
        log_info "Default runtime configured as: Local Process"
    else
        DEFAULT_RUNTIME="docker"
        log_info "Default runtime configured as: Docker"
    fi

    setup_java_optional

    # Determine installation location
    TARGET_DIR="$DEFAULT_INSTALL_DIR"
    # If running inside existing clone
    if [ -f "./package.json" ] && [ -f "./server.ts" ]; then
        TARGET_DIR="$(pwd)"
        log_info "Using current directory: $TARGET_DIR"
    elif [ -d "$DEFAULT_INSTALL_DIR" ] && [ -f "$DEFAULT_INSTALL_DIR/package.json" ]; then
        TARGET_DIR="$DEFAULT_INSTALL_DIR"
        log_info "Using existing directory: $TARGET_DIR"
    else
        log_step "Downloading zPanel source code..."
        $SUDO mkdir -p "$TARGET_DIR"
        $SUDO chown -R "$(whoami)" "$TARGET_DIR" 2>/dev/null || true
        if ! git clone "$REPO_URL" "$TARGET_DIR"; then
            log_error "Failed to clone repository from $REPO_URL."
            exit 1
        fi
    fi

    cd "$TARGET_DIR" || { log_error "Failed to enter directory $TARGET_DIR"; exit 1; }

    # Setup environment
    configure_application_env "$TARGET_DIR"
    if grep -q "^DEFAULT_RUNTIME=" .env; then
        sed -i "s/^DEFAULT_RUNTIME=.*/DEFAULT_RUNTIME=$DEFAULT_RUNTIME/" .env
    else
        echo "DEFAULT_RUNTIME=$DEFAULT_RUNTIME" >> .env
    fi

    # Write PM2 ecosystem
    write_pm2_ecosystem "$TARGET_DIR"

    # Install dependencies
    log_step "Installing project dependencies (npm install)..."
    if ! npm install; then
        log_error "Dependency installation failed. Please check the npm error logs above."
        exit 1
    fi
    log_success "Dependencies installed."

    # Build production bundle
    log_step "Building production bundle (npm run build)..."
    if ! npm run build; then
        log_error "Production build failed. Please check build output above."
        exit 1
    fi
    log_success "Production application built successfully."

    # Create admin user
    echo ""
    log_step "Setting up initial Administrator Account..."
    echo -e "  ${DIM}Running interactive admin creation script:${NC}"
    npm run createuser || log_warning "Admin creation exited with warnings. You can run option [4] from the menu anytime."

    # Start with PM2
    log_step "Starting zPanel under PM2 management..."
    pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
    if ! pm2 start ecosystem.config.cjs; then
        log_error "PM2 failed to launch zPanel."
        exit 1
    fi
    pm2 save 2>/dev/null || true

    # Configure PM2 startup on boot
    log_step "Configuring PM2 automatic startup on server reboot..."
    STARTUP_CMD=$(pm2 startup 2>/dev/null | grep -E "sudo env PATH|pm2 startup" | tail -1)
    if [ -n "$STARTUP_CMD" ]; then
        eval "$STARTUP_CMD" 2>/dev/null || true
        pm2 save 2>/dev/null || true
        log_success "PM2 startup hook registered."
    else
        log_info "PM2 startup already configured or run 'pm2 startup' manually if prompted."
    fi

    # Local Health Verification
    log_step "Verifying local application responsiveness..."
    if check_panel_health "$PANEL_PORT"; then
        PANEL_STATUS="Running"
        log_success "zPanel is actively listening on port $PANEL_PORT."
    else
        PANEL_STATUS="Starting (Pending local response)"
        log_warning "Panel process is started in PM2, but did not respond on port $PANEL_PORT yet."
        log_info "Check logs anytime using: pm2 logs zpanel"
    fi

    # Final Installation Summary
    echo ""
    log_divider
    echo -e "${GREEN}${BOLD}"
    echo "  ╔══════════════════════════════════════════════════════════════╗"
    echo "  ║              INSTALLATION COMPLETED                          ║"
    echo "  ╠══════════════════════════════════════════════════════════════╣"
    printf  "  ║  %-20s : %-37s ║\n" "Panel Name" "zPanel"
    printf  "  ║  %-20s : %-37s ║\n" "Local URL" "http://127.0.0.1:6767"
    printf  "  ║  %-20s : %-37s ║\n" "Process Manager" "PM2"
    printf  "  ║  %-20s : %-37s ║\n" "Process Status" "$PANEL_STATUS"
    printf  "  ║  %-20s : %-37s ║\n" "Auto Startup" "Configured"
    echo "  ║                                                              ║"
    echo "  ║  Next Step       : Configure Cloudflare Tunnel for public    ║"
    echo "  ║                    access. Select option [2] from the main   ║"
    echo "  ║                    menu to continue.                         ║"
    echo "  ╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# ─────────────────────────────────────────────
#  [2] CLOUDFLARE TUNNEL SUBMENU & OPERATIONS
# ─────────────────────────────────────────────

# Helper: setup systemd service using Tunnel Token securely
setup_cloudflared_token_service() {
    local token="$1"
    local hostname="$2"
    local cf_bin
    cf_bin=$(command -v cloudflared)

    if [ -z "$cf_bin" ]; then
        cf_bin="/usr/local/bin/cloudflared"
    fi

    $SUDO mkdir -p "$CF_CONFIG_DIR"

    # Store token securely in env file with strict permissions (never exposed to world)
    $SUDO bash -c "printf 'TUNNEL_TOKEN=%s\n' '$token' > $CF_ENV_FILE"
    $SUDO chmod 600 "$CF_ENV_FILE"
    $SUDO chown root:root "$CF_ENV_FILE" 2>/dev/null || true

    # Save public hostname reference if provided
    if [ -n "$hostname" ]; then
        $SUDO bash -c "printf '%s\n' '$hostname' > $CF_HOST_FILE"
        $SUDO chmod 644 "$CF_HOST_FILE"
    fi

    # Write systemd service file
    log_step "Configuring persistent systemd service for Cloudflare Tunnel..."
    $SUDO bash -c "cat > /etc/systemd/system/${CF_SERVICE}.service" << SVCEOF
[Unit]
Description=Cloudflare Tunnel Connector for zPanel
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
EnvironmentFile=-/etc/cloudflared/tunnel.env
ExecStart=${cf_bin} tunnel --no-autoupdate run --token \${TUNNEL_TOKEN}
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

    $SUDO systemctl daemon-reload
    $SUDO systemctl enable "$CF_SERVICE" 2>/dev/null || true
    $SUDO systemctl restart "$CF_SERVICE"
    sleep 3

    if $SUDO systemctl is-active --quiet "$CF_SERVICE"; then
        log_success "Cloudflare Tunnel service is active and running."
        return 0
    else
        log_error "Cloudflare Tunnel service failed to start."
        log_info "Check service logs using: sudo journalctl -u cloudflared -n 30"
        return 1
    fi
}

# A. Configure Cloudflare Tunnel
cf_configure_tunnel() {
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL — Configure${NC}\n"
    log_divider

    check_privileges
    install_cloudflared_binary || return 1

    # Check for existing configuration
    if [ -f "$CF_ENV_FILE" ] || [ -f "$CF_CONFIG_DIR/config.yml" ]; then
        echo ""
        log_warning "An existing Cloudflare Tunnel configuration was found on this server."
        echo -e "  ${YELLOW}Do you wish to overwrite it with a new configuration? [y/N]:${NC} \c"
        read -r OVERWRITE_CF
        if [[ ! "$OVERWRITE_CF" =~ ^[Yy]$ ]]; then
            log_info "Configuration preserved. Returning to tunnel menu."
            return 0
        fi
        # Create timestamped backup
        TS=$(date +%Y%m%d_%H%M%S)
        [ -f "$CF_ENV_FILE" ] && $SUDO cp "$CF_ENV_FILE" "${CF_ENV_FILE}.bak_${TS}"
        [ -f "$CF_CONFIG_DIR/config.yml" ] && $SUDO cp "$CF_CONFIG_DIR/config.yml" "${CF_CONFIG_DIR}/config.yml.bak_${TS}"
        log_info "Existing configuration backed up with timestamp $TS."
    fi

    echo ""
    echo -e "  ${CYAN}Select Cloudflare Tunnel configuration method:${NC}"
    echo -e "    ${BOLD}[1]${NC} Cloudflare Zero Trust Remote Tunnel  (Token-based)  ${GREEN}[Recommended]${NC}"
    echo -e "    ${BOLD}[2]${NC} Locally Managed Tunnel  (cloudflared login + local config.yml)"
    echo -e "  \c"
    read -p "Select [1-2] (default 1): " TUNNEL_METHOD
    TUNNEL_METHOD="${TUNNEL_METHOD:-1}"

    if [ "$TUNNEL_METHOD" = "1" ]; then
        echo ""
        echo -e "  ${CYAN}Enter your Cloudflare Tunnel Token:${NC}"
        echo -e "  ${DIM}(From Cloudflare Zero Trust → Networks → Tunnels → Install connector)${NC}"
        echo -e "  ${DIM}(Input is masked for security)${NC}"
        echo -e "  ${BOLD}Token:${NC} \c"
        read -rs INPUT_TOKEN
        echo ""

        if [ -z "$INPUT_TOKEN" ]; then
            log_error "Tunnel token cannot be empty."
            return 1
        fi

        echo -e "  ${CYAN}Enter your Public Hostname (e.g. panel.yourdomain.com):${NC} \c"
        read -r INPUT_HOSTNAME

        echo -e "  ${CYAN}Origin Service Target: http://127.0.0.1:6767${NC}"
        echo -e "  ${DIM}Ensure your tunnel's Public Hostname routes traffic to HTTP -> 127.0.0.1:6767 in Zero Trust.${NC}"

        if setup_cloudflared_token_service "$INPUT_TOKEN" "$INPUT_HOSTNAME"; then
            echo ""
            log_divider
            log_success "Cloudflare Tunnel successfully configured and enabled at boot!"
            if [ -n "$INPUT_HOSTNAME" ]; then
                echo -e "  ${GREEN}${BOLD}Public URL  : https://${INPUT_HOSTNAME}${NC}"
            else
                echo -e "  ${GREEN}${BOLD}Public URL  : Configured in Cloudflare Zero Trust Dashboard${NC}"
            fi
            echo -e "  ${DIM}Origin       : http://127.0.0.1:6767${NC}"
            log_divider
        fi

    else
        # Locally managed tunnel
        log_step "Initiating locally authenticated tunnel setup..."
        echo -e "  ${YELLOW}Please open the link that appears in your browser to authorize with Cloudflare:${NC}"
        cloudflared tunnel login || { log_error "Authorization failed."; return 1; }

        echo -e "  ${CYAN}Enter a name for this tunnel (default: zpanel):${NC} \c"
        read -r LOCAL_TUNNEL_NAME
        LOCAL_TUNNEL_NAME="${LOCAL_TUNNEL_NAME:-zpanel}"

        cloudflared tunnel create "$LOCAL_TUNNEL_NAME" || { log_error "Failed to create tunnel."; return 1; }
        LOCAL_TUNNEL_UUID=$(cloudflared tunnel list | grep -w "$LOCAL_TUNNEL_NAME" | awk '{print $1}' | head -1)

        if [ -z "$LOCAL_TUNNEL_UUID" ]; then
            log_error "Could not retrieve tunnel UUID."
            return 1
        fi

        echo -e "  ${CYAN}Enter your Public Hostname (e.g. panel.example.com):${NC} \c"
        read -r LOCAL_HOST

        $SUDO mkdir -p "$CF_CONFIG_DIR"
        $SUDO bash -c "cat > $CF_CONFIG_DIR/config.yml" << YMLEOF
tunnel: $LOCAL_TUNNEL_UUID
credentials-file: /root/.cloudflared/${LOCAL_TUNNEL_UUID}.json

ingress:
  - hostname: $LOCAL_HOST
    service: http://127.0.0.1:6767
  - service: http_status:404
YMLEOF
        $SUDO chmod 600 "$CF_CONFIG_DIR/config.yml"

        if [ -n "$LOCAL_HOST" ]; then
            cloudflared tunnel route dns "$LOCAL_TUNNEL_NAME" "$LOCAL_HOST" 2>/dev/null || \
                log_warning "DNS record routing could not be assigned automatically. You can assign it in Cloudflare dashboard."
            $SUDO bash -c "printf '%s\n' '$LOCAL_HOST' > $CF_HOST_FILE"
        fi

        CF_BIN_PATH=$(command -v cloudflared)
        $SUDO bash -c "cat > /etc/systemd/system/${CF_SERVICE}.service" << SVCEOF2
[Unit]
Description=Cloudflare Tunnel Connector for zPanel
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=${CF_BIN_PATH:-/usr/local/bin/cloudflared} tunnel --config $CF_CONFIG_DIR/config.yml --no-autoupdate run
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF2

        $SUDO systemctl daemon-reload
        $SUDO systemctl enable "$CF_SERVICE" 2>/dev/null || true
        $SUDO systemctl restart "$CF_SERVICE"
        sleep 3

        if $SUDO systemctl is-active --quiet "$CF_SERVICE"; then
            log_success "Locally managed tunnel started and enabled at boot!"
            [ -n "$LOCAL_HOST" ] && echo -e "  ${GREEN}${BOLD}Public URL: https://${LOCAL_HOST}${NC}"
        else
            log_error "Tunnel service failed to start."
            log_info "Check: sudo journalctl -u cloudflared -n 30"
        fi
    fi
}

# B. Connect Existing Tunnel
cf_connect_existing() {
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL — Connect Existing Tunnel${NC}\n"
    log_divider

    check_privileges
    install_cloudflared_binary || return 1

    echo ""
    echo -e "  ${CYAN}Connect an existing tunnel already created in Cloudflare Zero Trust.${NC}"
    echo -e "  ${DIM}(Input is masked for security)${NC}"
    echo -e "  ${BOLD}Tunnel Token:${NC} \c"
    read -rs EXISTING_TOKEN
    echo ""

    if [ -z "$EXISTING_TOKEN" ]; then
        log_error "Token cannot be empty."
        return 1
    fi

    echo -e "  ${CYAN}Public Hostname (leave empty if managed via Cloudflare dashboard):${NC} \c"
    read -r EXISTING_HOSTNAME

    echo -e "  ${CYAN}Confirm tunnel origin will point to http://127.0.0.1:6767? [Y/n]:${NC} \c"
    read -r CONFIRM_ORIGIN
    if [[ "$CONFIRM_ORIGIN" =~ ^[Nn]$ ]]; then
        log_info "Connection aborted by user."
        return 0
    fi

    if setup_cloudflared_token_service "$EXISTING_TOKEN" "$EXISTING_HOSTNAME"; then
        echo ""
        log_divider
        log_success "Existing Cloudflare Tunnel successfully connected and active!"
        if [ -n "$EXISTING_HOSTNAME" ]; then
            echo -e "  ${GREEN}${BOLD}Public URL : https://${EXISTING_HOSTNAME}${NC}"
        else
            echo -e "  ${GREEN}${BOLD}Public URL : Configured in Cloudflare Zero Trust Dashboard${NC}"
        fi
        log_divider
    fi
}

# C. Check Tunnel Status
cf_check_status() {
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL STATUS${NC}\n"
    log_divider
    echo ""

    # 1. cloudflared check
    if command -v cloudflared &>/dev/null; then
        CF_VER=$(cloudflared --version 2>/dev/null | awk '{print $3}' | head -1)
        echo -e "  ${BOLD}cloudflared${NC}     : ${GREEN}Installed${NC} ${DIM}(v${CF_VER:-latest})${NC}"
    else
        echo -e "  ${BOLD}cloudflared${NC}     : ${RED}Not installed${NC}"
    fi

    # 2. Systemd service status
    if command -v systemctl &>/dev/null; then
        if systemctl is-active --quiet "$CF_SERVICE" 2>/dev/null; then
            echo -e "  ${BOLD}Tunnel Service${NC}  : ${GREEN}Active (Running)${NC}"
        else
            SVC_STATE=$(systemctl is-active "$CF_SERVICE" 2>/dev/null || echo "inactive/not-installed")
            echo -e "  ${BOLD}Tunnel Service${NC}  : ${RED}${SVC_STATE}${NC}"
        fi
    else
        echo -e "  ${BOLD}Tunnel Service${NC}  : ${YELLOW}systemd not available on this host${NC}"
    fi

    # 3. Panel PM2 process status
    if command -v pm2 &>/dev/null; then
        PM2_PANEL_STAT=$(pm2 jlist 2>/dev/null | grep -o '"name":"zpanel"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ "$PM2_PANEL_STAT" = "online" ]; then
            echo -e "  ${BOLD}Panel Process${NC}   : ${GREEN}Running (PM2 - online)${NC}"
        elif [ -n "$PM2_PANEL_STAT" ]; then
            echo -e "  ${BOLD}Panel Process${NC}   : ${RED}${PM2_PANEL_STAT}${NC}"
        else
            echo -e "  ${BOLD}Panel Process${NC}   : ${YELLOW}Not registered in PM2${NC}"
        fi
    else
        echo -e "  ${BOLD}Panel Process${NC}   : ${YELLOW}PM2 not installed${NC}"
    fi

    # 4. Local Health Check
    if curl -fsSL --max-time 3 "http://127.0.0.1:$PANEL_PORT" &>/dev/null; then
        echo -e "  ${BOLD}Local Health${NC}    : ${GREEN}Passed (127.0.0.1:${PANEL_PORT} responding)${NC}"
    else
        echo -e "  ${BOLD}Local Health${NC}    : ${RED}Failed (127.0.0.1:${PANEL_PORT} not responding)${NC}"
    fi

    # 5. Public Hostname & URL
    HOST_DISPLAY=""
    if [ -f "$CF_HOST_FILE" ]; then
        HOST_DISPLAY=$(head -1 "$CF_HOST_FILE" | tr -d '[:space:]')
    elif [ -f "$CF_CONFIG_DIR/config.yml" ]; then
        HOST_DISPLAY=$(grep -E "^[[:space:]]*-?[[:space:]]*hostname:" "$CF_CONFIG_DIR/config.yml" | head -1 | awk '{print $NF}' | tr -d '[:space:]')
    fi

    if [ -n "$HOST_DISPLAY" ]; then
        echo -e "  ${BOLD}Public Hostname${NC} : ${GREEN}${HOST_DISPLAY}${NC}"
        echo -e "  ${BOLD}Public URL${NC}      : ${GREEN}${BOLD}https://${HOST_DISPLAY}${NC}"
    else
        echo -e "  ${BOLD}Public Hostname${NC} : ${YELLOW}Managed in Cloudflare Dashboard${NC}"
        echo -e "  ${BOLD}Public URL${NC}      : ${DIM}Refer to your Cloudflare Zero Trust public hostname${NC}"
    fi

    # 6. Auto Restart
    if command -v systemctl &>/dev/null && systemctl is-enabled --quiet "$CF_SERVICE" 2>/dev/null; then
        echo -e "  ${BOLD}Auto Restart${NC}    : ${GREEN}Enabled (systemd boot enabled)${NC}"
    else
        echo -e "  ${BOLD}Auto Restart${NC}    : ${YELLOW}Disabled / Not configured${NC}"
    fi

    echo ""
    log_divider
}

# D. Restart Tunnel
cf_restart_tunnel() {
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL — Restart${NC}\n"
    log_divider
    check_privileges

    if ! command -v systemctl &>/dev/null; then
        log_error "systemd is not available on this host."
        return 1
    fi

    if ! systemctl list-unit-files | grep -q "${CF_SERVICE}.service"; then
        log_error "Cloudflare Tunnel service is not installed on this system."
        log_info "Configure a tunnel first using option [1] or [2]."
        return 1
    fi

    log_step "Restarting Cloudflare Tunnel service..."
    $SUDO systemctl restart "$CF_SERVICE"
    sleep 2

    if $SUDO systemctl is-active --quiet "$CF_SERVICE"; then
        log_success "Cloudflare Tunnel service restarted successfully."
    else
        log_error "Cloudflare Tunnel service failed to restart. Check: sudo journalctl -u cloudflared -n 30"
    fi
}

# E. Stop Tunnel
cf_stop_tunnel() {
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL — Stop${NC}\n"
    log_divider
    check_privileges

    echo -e "  ${YELLOW}Stopping the tunnel will temporarily disable public web access to zPanel.${NC}"
    echo -e "  ${YELLOW}The local zPanel application will continue running on http://127.0.0.1:6767.${NC}"
    echo -e "  ${BOLD}Are you sure you want to stop the tunnel? [y/N]:${NC} \c"
    read -r CONFIRM_STOP

    if [[ ! "$CONFIRM_STOP" =~ ^[Yy]$ ]]; then
        log_info "Stop operation cancelled."
        return 0
    fi

    $SUDO systemctl stop "$CF_SERVICE" 2>/dev/null || true
    log_success "Cloudflare Tunnel service stopped."
}

# F. Disconnect Tunnel
cf_disconnect_tunnel() {
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL — Disconnect${NC}\n"
    log_divider
    check_privileges

    log_warning "This will stop and disable the Cloudflare Tunnel service on this machine."
    log_warning "Public access via your hostname will be disconnected."
    echo -e "  ${DIM}Note: Your Cloudflare account, tunnel configuration, and DNS records will NOT be deleted.${NC}"
    echo ""
    echo -e "  ${YELLOW}Confirm tunnel disconnection? [y/N]:${NC} \c"
    read -r CONFIRM_DISCONNECT

    if [[ ! "$CONFIRM_DISCONNECT" =~ ^[Yy]$ ]]; then
        log_info "Disconnection cancelled. Tunnel remains active."
        return 0
    fi

    $SUDO systemctl stop "$CF_SERVICE" 2>/dev/null || true
    $SUDO systemctl disable "$CF_SERVICE" 2>/dev/null || true
    log_success "Cloudflare Tunnel service stopped and disabled from system boot."
    log_info "Configuration preserved in $CF_CONFIG_DIR. You can reconnect anytime from this menu."
}

# Cloudflare Tunnel Submenu Loop
cloudflare_menu() {
    while true; do
        print_banner
        echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL MANAGEMENT${NC}\n"
        log_divider
        echo ""
        echo -e "    ${BOLD}[1]${NC} Configure Cloudflare Tunnel"
        echo -e "    ${BOLD}[2]${NC} Connect Existing Tunnel"
        echo -e "    ${BOLD}[3]${NC} Check Tunnel Status"
        echo -e "    ${BOLD}[4]${NC} Restart Tunnel"
        echo -e "    ${BOLD}[5]${NC} Stop Tunnel"
        echo -e "    ${BOLD}[6]${NC} Disconnect Tunnel"
        echo -e "    ${BOLD}[7]${NC} Back to Main Menu"
        echo ""
        log_divider
        echo -e "  \c"
        read -p "Select an option [1-7]: " CF_SUB_CHOICE

        case "$CF_SUB_CHOICE" in
            1) cf_configure_tunnel;  echo ""; read -p "  Press Enter to continue..." ;;
            2) cf_connect_existing;   echo ""; read -p "  Press Enter to continue..." ;;
            3) cf_check_status;       echo ""; read -p "  Press Enter to continue..." ;;
            4) cf_restart_tunnel;     echo ""; read -p "  Press Enter to continue..." ;;
            5) cf_stop_tunnel;        echo ""; read -p "  Press Enter to continue..." ;;
            6) cf_disconnect_tunnel;  echo ""; read -p "  Press Enter to continue..." ;;
            7) return 0 ;;
            *) log_error "Invalid selection. Please choose an option from 1 to 7."; sleep 1.2 ;;
        esac
    done
}

# ─────────────────────────────────────────────
#  [3] UPDATE zPanel
# ─────────────────────────────────────────────
update_zpanel() {
    print_banner
    echo -e "  ${BOLD}${CYAN}UPDATE zPanel${NC}\n"
    log_divider

    check_privileges
    check_network

    PANEL_DIR=$(find_panel_directory)
    if [ -z "$PANEL_DIR" ]; then
        log_error "No zPanel installation could be found. Please install zPanel first (Option 1)."
        return 1
    fi

    log_info "Detected installation directory: $PANEL_DIR"

    # Backup production data & configuration before pulling
    BACKUP_TIME=$(date +%Y%m%d_%H%M%S)
    BACKUP_TMP_DIR="/tmp/zpanel_backup_${BACKUP_TIME}"
    mkdir -p "$BACKUP_TMP_DIR"

    log_step "Creating safeguard backup of existing configuration..."
    if [ -f "$PANEL_DIR/.env" ]; then
        cp "$PANEL_DIR/.env" "$BACKUP_TMP_DIR/.env"
        log_success ".env backed up."
    fi
    if [ -d "$PANEL_DIR/.data" ]; then
        cp -r "$PANEL_DIR/.data" "$BACKUP_TMP_DIR/.data"
        log_success ".data database directory backed up."
    fi

    cd "$PANEL_DIR" || { log_error "Failed to switch to $PANEL_DIR"; return 1; }

    # Git update
    log_step "Fetching latest source code from repository..."
    git stash 2>/dev/null || true
    if ! git pull --ff-only; then
        log_error "git pull failed. Attempting to preserve existing code."
        log_info "Backup is safely located at: $BACKUP_TMP_DIR"
        return 1
    fi

    # Restore .env and data
    if [ -f "$BACKUP_TMP_DIR/.env" ]; then
        cp "$BACKUP_TMP_DIR/.env" "$PANEL_DIR/.env"
    fi
    if [ -d "$BACKUP_TMP_DIR/.data" ]; then
        cp -r "$BACKUP_TMP_DIR/.data" "$PANEL_DIR/"
    fi

    # Update dependencies
    log_step "Updating Node.js dependencies..."
    if ! npm install; then
        log_error "npm install encountered an error."
        return 1
    fi

    # Build updated code
    log_step "Rebuilding production assets..."
    if ! npm run build; then
        log_error "Build failed during update."
        return 1
    fi

    # Restart PM2 process
    log_step "Restarting PM2 process..."
    if command -v pm2 &>/dev/null; then
        pm2 restart "$PM2_APP_NAME" 2>/dev/null || pm2 restart all 2>/dev/null || true
        pm2 save 2>/dev/null || true
    fi

    # Health check
    log_step "Verifying updated application health..."
    if check_panel_health "$PANEL_PORT"; then
        log_success "Update completed successfully! zPanel is active on port $PANEL_PORT."
        rm -rf "$BACKUP_TMP_DIR"
    else
        log_warning "Update completed, but port $PANEL_PORT is not yet responding. Check: pm2 logs zpanel"
        log_info "Safeguard backup remains at: $BACKUP_TMP_DIR"
    fi
}

# ─────────────────────────────────────────────
#  [4] CREATE ADMIN USER
# ─────────────────────────────────────────────
create_admin_user() {
    print_banner
    echo -e "  ${BOLD}${CYAN}CREATE ADMIN USER${NC}\n"
    log_divider

    PANEL_DIR=$(find_panel_directory)
    if [ -z "$PANEL_DIR" ]; then
        log_error "zPanel installation was not found. Please install the panel first."
        return 1
    fi

    cd "$PANEL_DIR" || { log_error "Failed to enter $PANEL_DIR"; return 1; }

    log_info "Launching administrator creation script..."
    echo ""
    npm run createuser
    echo ""
    log_success "Operation finished."
}

# ─────────────────────────────────────────────
#  [5] RESTART zPanel
# ─────────────────────────────────────────────
restart_zpanel() {
    print_banner
    echo -e "  ${BOLD}${CYAN}RESTART zPanel${NC}\n"
    log_divider

    PANEL_DIR=$(find_panel_directory)
    if [ -z "$PANEL_DIR" ]; then
        log_error "zPanel installation was not found."
        return 1
    fi

    if ! command -v pm2 &>/dev/null; then
        log_error "PM2 is not installed on this system."
        return 1
    fi

    log_step "Restarting PM2 process '$PM2_APP_NAME'..."
    if ! pm2 restart "$PM2_APP_NAME" 2>/dev/null; then
        log_warning "Named process '$PM2_APP_NAME' not found, restarting all PM2 processes..."
        pm2 restart all 2>/dev/null || true
    fi
    pm2 save 2>/dev/null || true

    sleep 2
    if check_panel_health "$PANEL_PORT"; then
        log_success "zPanel restarted successfully and is listening on port $PANEL_PORT."
    else
        log_warning "Restart executed. Check status with: pm2 status"
    fi
}

# ─────────────────────────────────────────────
#  [6] UNINSTALL zPanel
# ─────────────────────────────────────────────
uninstall_zpanel() {
    print_banner
    echo -e "  ${BOLD}${RED}UNINSTALL zPanel${NC}\n"
    log_divider

    check_privileges
    PANEL_DIR=$(find_panel_directory)

    echo ""
    log_warning "This procedure will perform the following actions:"
    echo -e "    • Stop and remove the PM2 application '$PM2_APP_NAME'"
    echo -e "    • Optionally stop and disable the Cloudflare Tunnel service"
    echo -e "    • Optionally remove the zPanel application directory"
    echo ""
    log_warning "Shared system utilities (Node.js, npm, PM2, Java) will NOT be removed."
    log_warning "Cloudflare account tunnels, domains, and DNS records will NOT be deleted."
    echo ""

    if [ -n "$PANEL_DIR" ]; then
        echo -e "  ${BOLD}Target Installation Directory:${NC} ${RED}${PANEL_DIR}${NC}"
    else
        echo -e "  ${YELLOW}No active installation directory detected.${NC}"
    fi

    echo ""
    echo -e "  ${RED}${BOLD}To proceed, type 'UNINSTALL' in capital letters:${NC} \c"
    read -r CONFIRM_TEXT
    if [ "$CONFIRM_TEXT" != "UNINSTALL" ]; then
        log_info "Confirmation did not match. Uninstall cancelled."
        return 0
    fi

    # Stop and delete PM2 process
    if command -v pm2 &>/dev/null; then
        log_step "Removing zPanel from PM2..."
        pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
        pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
        pm2 save 2>/dev/null || true
        log_success "PM2 process cleaned up."
    fi

    # Option to stop tunnel
    echo ""
    echo -e "  ${CYAN}Stop and disable the Cloudflare Tunnel service as well? [y/N]:${NC} \c"
    read -r STOP_TUNNEL_CHOICE
    if [[ "$STOP_TUNNEL_CHOICE" =~ ^[Yy]$ ]]; then
        $SUDO systemctl stop "$CF_SERVICE" 2>/dev/null || true
        $SUDO systemctl disable "$CF_SERVICE" 2>/dev/null || true
        log_success "Cloudflare Tunnel service stopped and disabled."
    fi

    # Option to delete directory
    if [ -n "$PANEL_DIR" ]; then
        echo ""
        echo -e "  ${RED}Delete the application directory and server files (${PANEL_DIR})? [y/N]:${NC} \c"
        read -r DELETE_DIR_CHOICE
        if [[ "$DELETE_DIR_CHOICE" =~ ^[Yy]$ ]]; then
            # Safety check against root/system paths
            case "$PANEL_DIR" in
                "/"|"/root"|"/home"|"/etc"|"/var"|"/usr"|"/bin"|"/opt")
                    log_error "Refusing to delete unsafe root path: $PANEL_DIR"
                    ;;
                *)
                    $SUDO rm -rf "$PANEL_DIR"
                    log_success "Application directory deleted: $PANEL_DIR"
                    ;;
            esac
        else
            log_info "Application files preserved in: $PANEL_DIR"
        fi
    fi

    echo ""
    log_success "zPanel uninstallation has finished."
}

# ─────────────────────────────────────────────
#  MAIN INTERACTIVE MENU LOOP
# ─────────────────────────────────────────────
while true; do
    print_banner
    echo -e "  ${BOLD}INSTALLATION & MANAGEMENT${NC}"
    echo ""
    echo -e "    ${BOLD}[1]${NC} Install zPanel (Node.js + PM2) ${GREEN}[Recommended]${NC}"
    echo -e "    ${BOLD}[2]${NC} Cloudflare Tunnel Management"
    echo -e "    ${BOLD}[3]${NC} Update zPanel"
    echo -e "    ${BOLD}[4]${NC} Create Admin User"
    echo -e "    ${BOLD}[5]${NC} Restart zPanel"
    echo -e "    ${BOLD}[6]${NC} Uninstall zPanel"
    echo -e "    ${BOLD}[7]${NC} Exit"
    echo ""
    log_divider
    echo -e "  \c"
    read -p "Select an option [1-7]: " MAIN_CHOICE

    case "$MAIN_CHOICE" in
        1)
            install_zpanel
            echo ""
            read -p "  Press Enter to return to main menu..."
            ;;
        2)
            cloudflare_menu
            ;;
        3)
            update_zpanel
            echo ""
            read -p "  Press Enter to return to main menu..."
            ;;
        4)
            create_admin_user
            echo ""
            read -p "  Press Enter to return to main menu..."
            ;;
        5)
            restart_zpanel
            echo ""
            read -p "  Press Enter to return to main menu..."
            ;;
        6)
            uninstall_zpanel
            echo ""
            read -p "  Press Enter to return to main menu..."
            ;;
        7)
            echo ""
            echo -e "  ${CYAN}Exiting zPanel installer. Have a great day!${NC}\n"
            exit 0
            ;;
        *)
            log_error "Invalid selection '$MAIN_CHOICE'. Please choose between 1 and 7."
            sleep 1.2
            ;;
    esac
done
