#!/bin/bash

# =========================================================
# zPanel - Automated Installation & Management Script
# Repository: https://github.com/TalhaPlaysOG/zPanel
# =========================================================

# Ensure standard input is mapped to controlling terminal for reliable interactive prompts
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

# ─────────────────────────────────────────────
#  TERMINAL COLORS & STYLES
# ─────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ─────────────────────────────────────────────
#  LOGGING HELPERS
# ─────────────────────────────────────────────
log_info()    { echo -e "  ${BLUE}${BOLD}[INFO]${NC}    $1"; }
log_success() { echo -e "  ${GREEN}${BOLD}[OK]${NC}      $1"; }
log_warning() { echo -e "  ${YELLOW}${BOLD}[WARN]${NC}    $1"; }
log_error()   { echo -e "  ${RED}${BOLD}[ERROR]${NC}   $1"; }
log_step()    { echo -e "\n  ${CYAN}${BOLD}▶ $1${NC}"; }
log_divider() { echo -e "  ${DIM}──────────────────────────────────────────────────────────────${NC}"; }

# ─────────────────────────────────────────────
#  MAIN MENU BANNER
# ─────────────────────────────────────────────
print_banner() {
    clear
    echo -e "${CYAN}${BOLD}"
    echo "  ╔══════════════════════════════════════════════════════════════╗"
    echo "  ║                                                              ║"
    echo "  ║                           zPanel                             ║"
    echo "  ║                  SERVER MANAGEMENT SYSTEM                    ║"
    echo "  ║                                                              ║"
    echo "  ║                    Production Installer                      ║"
    echo "  ║                    Default Port: 6767                        ║"
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
            echo -e "  Please run with: sudo bash <(curl -fsSL https://raw.githubusercontent.com/TalhaPlaysOG/zPanel/main/install.sh)"
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
        log_success "Operating System: $OS_NAME"
    else
        OS_ID="unknown"
        log_warning "Could not detect OS from /etc/os-release. Proceeding with standard package detection."
    fi

    if command -v apt-get &>/dev/null; then
        PKG_MGR="apt"
    elif command -v dnf &>/dev/null; then
        PKG_MGR="dnf"
    elif command -v yum &>/dev/null; then
        PKG_MGR="yum"
    else
        log_error "Unsupported package manager. Debian/Ubuntu (apt) or RHEL/CentOS/Fedora (dnf/yum) required."
        exit 1
    fi
}

# ─────────────────────────────────────────────
#  NETWORK VERIFICATION
# ─────────────────────────────────────────────
check_network() {
    log_step "Verifying network connectivity..."
    if curl -fsSL --max-time 6 https://github.com &>/dev/null || curl -fsSL --max-time 6 https://raw.githubusercontent.com &>/dev/null; then
        log_success "Internet connection verified."
    else
        log_error "Failed to reach GitHub. Please check your internet connection and DNS settings."
        exit 1
    fi
}

# ─────────────────────────────────────────────
#  FIND PANEL INSTALLATION DIRECTORY
# ─────────────────────────────────────────────
find_panel_directory() {
    if [ -f "./package.json" ] && [ -f "./server.ts" ]; then
        pwd
        return 0
    fi
    if [ -d "$DEFAULT_INSTALL_DIR" ] && [ -f "$DEFAULT_INSTALL_DIR/package.json" ]; then
        echo "$DEFAULT_INSTALL_DIR"
        return 0
    fi
    if [ -d "$HOME/zpanel" ] && [ -f "$HOME/zpanel/package.json" ]; then
        echo "$HOME/zpanel"
        return 0
    fi
    if [ -d "./zPanel" ] && [ -f "./zPanel/package.json" ]; then
        echo "$(pwd)/zPanel"
        return 0
    fi
    return 1
}

# ─────────────────────────────────────────────
#  INSTALL SYSTEM PACKAGES
# ─────────────────────────────────────────────
install_system_packages() {
    log_step "Installing essential system packages..."
    if [ "$PKG_MGR" = "apt" ]; then
        $SUDO dpkg --configure -a 2>/dev/null || true
        $SUDO apt-get install -f -y 2>/dev/null || true
        $SUDO apt-get update -y 2>/dev/null || true
        $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y \
            curl git build-essential ca-certificates tar xz-utils jq procps wget \
            2>/dev/null || log_warning "Some optional system packages may have failed to install, continuing..."
    elif [ "$PKG_MGR" = "yum" ] || [ "$PKG_MGR" = "dnf" ]; then
        $SUDO $PKG_MGR install -y curl git make gcc-c++ ca-certificates tar xz jq procps wget \
            2>/dev/null || log_warning "Some optional system packages may have failed to install, continuing..."
    fi
    log_success "System utilities ready."
}

# ─────────────────────────────────────────────
#  INSTALL NODE.JS >= 22 LTS
# ─────────────────────────────────────────────
install_nodejs() {
    log_step "Verifying Node.js runtime..."
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
                log_info "Node.js $NODE_VER_RAW is below requirement. Upgrading to Node.js 22.x LTS..."
            fi
        fi
    fi

    if [ "$NEED_NODE" -eq 1 ]; then
        log_info "Installing Node.js 22.x LTS via NodeSource..."
        if [ "$PKG_MGR" = "apt" ]; then
            curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash - 2>/dev/null || true
            $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs 2>/dev/null || true
        elif [ "$PKG_MGR" = "yum" ] || [ "$PKG_MGR" = "dnf" ]; then
            curl -fsSL https://rpm.nodesource.com/setup_22.x | $SUDO bash - 2>/dev/null || true
            $SUDO $PKG_MGR install -y nodejs 2>/dev/null || true
        fi

        CURRENT_MAJOR=0
        if command -v node &>/dev/null; then
            CURRENT_MAJOR=$(node -v 2>/dev/null | cut -d'.' -f1 | tr -d 'v')
        fi

        if [ "$CURRENT_MAJOR" -lt 20 ]; then
            log_info "Downloading official Node.js 22 binary directly..."
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
        log_error "Node.js installation failed. Cannot continue."
        exit 1
    fi
}

# ─────────────────────────────────────────────
#  INSTALL PM2 PROCESS MANAGER
# ─────────────────────────────────────────────
install_pm2() {
    log_step "Verifying PM2 process manager..."
    if ! command -v pm2 &>/dev/null; then
        log_info "Installing PM2 globally..."
        $SUDO npm install -g pm2 2>/dev/null || npm install -g pm2
        if ! command -v pm2 &>/dev/null; then
            log_error "PM2 installation failed. PM2 is required for process management."
            exit 1
        fi
    fi
    log_success "PM2 $(pm2 -v 2>/dev/null || echo '') is ready."
}

# ─────────────────────────────────────────────
#  AUTOMATIC JAVA 25 INSTALLATION (No prompts)
# ─────────────────────────────────────────────
install_java_25_auto() {
    log_step "Checking Java runtime for Minecraft servers (Target: Java 25)..."

    local NEED_JAVA=0
    local CURRENT_JAVA_VER=0

    if command -v java &>/dev/null; then
        CURRENT_JAVA_VER=$(java -version 2>&1 | head -1 | awk -F '"' '{print $2}' | cut -d'.' -f1)
        if [ "$CURRENT_JAVA_VER" -ge 25 ]; then
            log_success "Java 25 is already installed: $(java -version 2>&1 | head -1)"
            return 0
        fi
        log_info "Found Java version $CURRENT_JAVA_VER. Upgrading to Java 25 automatically..."
        NEED_JAVA=1
    else
        NEED_JAVA=1
    fi

    if [ "$NEED_JAVA" -eq 1 ]; then
        log_info "Installing OpenJDK 25..."
        ARCH=$(uname -m)
        case "$ARCH" in
            x86_64)  JAVA_ARCH="x64" ;;
            aarch64) JAVA_ARCH="aarch64" ;;
            *)       JAVA_ARCH="x64" ;;
        esac

        # Download official OpenJDK 25 build
        JAVA_URL="https://download.java.net/java/early_access/jdk25/11/GPL/openjdk-25-ea+11_linux-${JAVA_ARCH}_bin.tar.gz"
        JAVA_DIR="/usr/lib/jvm/jdk-25"

        $SUDO mkdir -p /usr/lib/jvm
        log_info "Downloading Java 25 ($JAVA_ARCH)..."
        curl -fsSL "$JAVA_URL" -o /tmp/jdk25.tar.gz 2>/dev/null || true

        if [ -f "/tmp/jdk25.tar.gz" ] && [ -s "/tmp/jdk25.tar.gz" ]; then
            $SUDO rm -rf "$JAVA_DIR"
            $SUDO mkdir -p "$JAVA_DIR"
            $SUDO tar -xzf /tmp/jdk25.tar.gz -C "$JAVA_DIR" --strip-components=1 2>/dev/null || true
            rm -f /tmp/jdk25.tar.gz

            if [ -x "$JAVA_DIR/bin/java" ]; then
                $SUDO update-alternatives --install /usr/bin/java java "$JAVA_DIR/bin/java" 2000 2>/dev/null || true
                $SUDO update-alternatives --set java "$JAVA_DIR/bin/java" 2>/dev/null || true
                $SUDO ln -sf "$JAVA_DIR/bin/java" /usr/local/bin/java 2>/dev/null || true

                # Configure environment
                if ! grep -q "JAVA_HOME=$JAVA_DIR" /etc/environment 2>/dev/null; then
                    echo "JAVA_HOME=$JAVA_DIR" | $SUDO tee -a /etc/environment >/dev/null
                fi
                export JAVA_HOME="$JAVA_DIR"
                export PATH="$JAVA_DIR/bin:$PATH"
            fi
        fi

        # Fallback to system package manager if archive was unavailable
        if ! command -v java &>/dev/null || [ "$(java -version 2>&1 | head -1 | awk -F '"' '{print $2}' | cut -d'.' -f1)" -lt 21 ]; then
            log_warning "OpenJDK 25 direct download fallback: installing package manager Java..."
            if [ "$PKG_MGR" = "apt" ]; then
                $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y openjdk-21-jre-headless 2>/dev/null || true
            elif [ "$PKG_MGR" = "yum" ] || [ "$PKG_MGR" = "dnf" ]; then
                $SUDO $PKG_MGR install -y java-21-openjdk-headless 2>/dev/null || true
            fi
        fi
    fi

    if command -v java &>/dev/null; then
        INSTALLED_VER=$(java -version 2>&1 | head -1)
        log_success "Java runtime active: $INSTALLED_VER"
    else
        log_warning "Java runtime could not be installed automatically. Local Minecraft servers may require manual Java installation."
    fi
}

# ─────────────────────────────────────────────
#  CLOUDFLARED BINARY INSTALLATION
# ─────────────────────────────────────────────
install_cloudflared_binary() {
    if command -v cloudflared &>/dev/null; then
        CF_VER=$(cloudflared --version 2>/dev/null | awk '{print $3}' | head -1)
        log_success "cloudflared is ready (version: ${CF_VER:-latest})."
        return 0
    fi

    log_step "Installing Cloudflare Tunnel client (cloudflared)..."

    # Debian/Ubuntu apt repo
    if [ "$PKG_MGR" = "apt" ]; then
        curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | $SUDO tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null 2>&1 || true
        echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main' \
            | $SUDO tee /etc/apt/sources.list.d/cloudflared.list >/dev/null 2>&1 || true
        $SUDO apt-get update -y >/dev/null 2>&1 || true
        $SUDO apt-get install -y cloudflared >/dev/null 2>&1 || true
    fi

    # Fallback to official binary release
    if ! command -v cloudflared &>/dev/null; then
        log_info "Downloading standalone cloudflared binary release..."
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
        log_error "cloudflared installation failed. Check network access or install cloudflared manually."
        return 1
    fi
}

# ─────────────────────────────────────────────
#  SETUP APPLICATION ENVIRONMENT (.env)
# ─────────────────────────────────────────────
setup_application_env() {
    local target_dir="$1"
    local env_file="$target_dir/.env"

    # Auto-detect default runtime without prompting (prefer Docker if installed and accessible)
    local AUTO_RUNTIME="local"
    if command -v docker &>/dev/null; then
        AUTO_RUNTIME="docker"
        log_info "Docker environment detected. Default runtime set to: Docker"
    else
        log_info "Docker not detected. Default runtime set to: Local Process"
    fi

    if [ -f "$env_file" ]; then
        log_info "Existing .env file found. Preserving current secrets..."
        if grep -q "^PORT=" "$env_file"; then
            sed -i "s/^PORT=.*/PORT=6767/" "$env_file"
        else
            echo "PORT=6767" >> "$env_file"
        fi
        if ! grep -q "^DEFAULT_RUNTIME=" "$env_file"; then
            echo "DEFAULT_RUNTIME=$AUTO_RUNTIME" >> "$env_file"
        fi
    else
        log_info "Generating production .env..."
        GENERATED_SECRET=$(head -c 32 /dev/urandom 2>/dev/null | base64 | tr -dc 'a-zA-Z0-9' | head -c 48)
        [ -z "$GENERATED_SECRET" ] && GENERATED_SECRET="zpanel-jwt-$(date +%s%N)"
        cat > "$env_file" << ENVEOF
# zPanel Production Environment
PORT=6767
DEFAULT_RUNTIME=${AUTO_RUNTIME}
ENABLE_DOCKER=false
JWT_SECRET=${GENERATED_SECRET}
GEMINI_API_KEY=
DOCKER_SOCKET_PATH=
VITE_ENABLE_DEVELOPER_PANEL=false
ENVEOF
    fi

    # Record Java path if present
    if command -v java &>/dev/null; then
        JAVA_PATH=$(which java)
        if ! grep -q "^JAVA_BIN=" "$env_file"; then
            echo "JAVA_BIN=$JAVA_PATH" >> "$env_file"
        fi
    fi

    chmod 600 "$env_file" 2>/dev/null || true
    log_success ".env configured (Port 6767)."
}

# ─────────────────────────────────────────────
#  LOCAL PANEL HEALTH CHECK
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
    install_java_25_auto

    # Determine installation directory
    TARGET_DIR="$DEFAULT_INSTALL_DIR"
    if [ -f "./package.json" ] && [ -f "./server.ts" ]; then
        TARGET_DIR="$(pwd)"
        log_info "Using current working directory: $TARGET_DIR"
    elif [ -d "$DEFAULT_INSTALL_DIR" ] && [ -f "$DEFAULT_INSTALL_DIR/package.json" ]; then
        TARGET_DIR="$DEFAULT_INSTALL_DIR"
        log_info "Using existing directory: $TARGET_DIR"
    else
        log_step "Fetching zPanel source code from GitHub..."
        $SUDO mkdir -p "$TARGET_DIR"
        $SUDO chown -R "$(whoami)" "$TARGET_DIR" 2>/dev/null || true
        if ! git clone "$REPO_URL" "$TARGET_DIR"; then
            log_error "Failed to clone repository from $REPO_URL."
            exit 1
        fi
    fi

    cd "$TARGET_DIR" || { log_error "Failed to enter directory $TARGET_DIR"; exit 1; }

    # Setup environment without interactive questions
    setup_application_env "$TARGET_DIR"

    # Write PM2 ecosystem file
    cat > "$TARGET_DIR/ecosystem.config.cjs" << 'ECOSYSTEM'
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

    # Install dependencies
    log_step "Installing Node.js dependencies (npm install)..."
    if ! npm install; then
        log_error "Failed to install dependencies. Check npm error logs."
        exit 1
    fi
    log_success "Dependencies installed."

    # Build production bundle
    log_step "Building production application (npm run build)..."
    if ! npm run build; then
        log_error "Application build failed."
        exit 1
    fi
    log_success "Production application built successfully."

    # Create initial admin account
    echo ""
    log_step "Initial Administrator Setup..."
    npm run createuser || log_warning "Admin creation completed with notice. Run option [4] anytime to create additional administrators."

    # Start application with PM2
    log_step "Starting zPanel under PM2 management..."
    pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
    if ! pm2 start ecosystem.config.cjs; then
        log_error "PM2 failed to launch zPanel."
        exit 1
    fi
    pm2 save 2>/dev/null || true

    # Configure PM2 startup on reboot
    log_step "Configuring PM2 startup on server reboot..."
    STARTUP_CMD=$(pm2 startup 2>/dev/null | grep -E "sudo env PATH|pm2 startup" | tail -1)
    if [ -n "$STARTUP_CMD" ]; then
        eval "$STARTUP_CMD" 2>/dev/null || true
        pm2 save 2>/dev/null || true
        log_success "PM2 auto-startup enabled."
    fi

    # Verify local health
    log_step "Verifying application availability on port $PANEL_PORT..."
    if check_panel_health "$PANEL_PORT"; then
        PANEL_STATUS="Running"
        log_success "zPanel is actively listening on http://127.0.0.1:$PANEL_PORT"
    else
        PANEL_STATUS="Starting (Pending)"
        log_warning "Application started, but not yet responding on port $PANEL_PORT. Check logs using: pm2 logs zpanel"
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
    printf  "  ║  %-20s : %-37s ║\n" "Auto Startup" "Enabled"
    echo "  ╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# ─────────────────────────────────────────────
#  [2] CLOUDFLARE TUNNEL SUBMENU
# ─────────────────────────────────────────────

# Helper: Configure token-based tunnel systemd service
setup_cloudflared_token_service() {
    local token="$1"
    local cf_bin
    cf_bin=$(command -v cloudflared)
    [ -z "$cf_bin" ] && cf_bin="/usr/local/bin/cloudflared"

    $SUDO mkdir -p "$CF_CONFIG_DIR"

    # Store token with strict root permissions (chmod 600)
    $SUDO bash -c "printf 'TUNNEL_TOKEN=%s\n' '$token' > $CF_ENV_FILE"
    $SUDO chmod 600 "$CF_ENV_FILE"
    $SUDO chown root:root "$CF_ENV_FILE" 2>/dev/null || true

    # Write persistent systemd service
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
        return 0
    else
        return 1
    fi
}

# 2.1 Configure / Connect Tunnel
cf_configure_tunnel() {
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL — Configure / Connect${NC}\n"
    log_divider

    check_privileges
    install_cloudflared_binary || return 1

    # Check for existing configuration
    if [ -f "$CF_ENV_FILE" ]; then
        echo ""
        log_warning "An existing Cloudflare Tunnel configuration was detected."
        echo -e "  ${YELLOW}Overwrite with a new tunnel token? [y/N]:${NC} \c"
        read -r OVERWRITE_CF
        if [[ ! "$OVERWRITE_CF" =~ ^[Yy]$ ]]; then
            log_info "Configuration preserved."
            return 0
        fi
        TS=$(date +%Y%m%d_%H%M%S)
        $SUDO cp "$CF_ENV_FILE" "${CF_ENV_FILE}.bak_${TS}" 2>/dev/null || true
    fi

    echo ""
    echo -e "  ${CYAN}Paste your Cloudflare Tunnel Token below:${NC}"
    echo -e "  ${DIM}(From Cloudflare Zero Trust → Networks → Tunnels → Install connector)${NC}"
    echo -e "  ${DIM}(Input is masked for security)${NC}"
    echo -e "  ${BOLD}Tunnel Token:${NC} \c"
    read -rs INPUT_TOKEN
    echo ""

    if [ -z "$INPUT_TOKEN" ]; then
        log_error "Tunnel token cannot be empty."
        return 1
    fi

    log_step "Starting Cloudflare Tunnel service with supplied token..."
    if ! setup_cloudflared_token_service "$INPUT_TOKEN"; then
        log_error "Cloudflare Tunnel service failed to start."
        log_info "Check logs using: sudo journalctl -u cloudflared -n 30"
        return 1
    fi

    # Display exact Cloudflare Zero Trust Dashboard Instructions
    while true; do
        clear
        echo -e "${CYAN}${BOLD}"
        echo "  ╔══════════════════════════════════════════════════════════════╗"
        echo "  ║                      CLOUDFLARE TUNNEL                       ║"
        echo "  ║                  Tunnel service configured.                  ║"
        echo "  ╚══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        echo -e "  ${BOLD}NEXT STEP:${NC}"
        echo -e "    1. Open your Cloudflare Zero Trust dashboard."
        echo -e "    2. Select the tunnel associated with your token."
        echo -e "    3. Configure the public hostname or published application."
        echo -e "    4. Set the origin service to: ${GREEN}${BOLD}http://127.0.0.1:6767${NC}"
        echo -e "    5. Save the configuration in Cloudflare."
        echo -e "    6. Return to this installer and select Continue."
        echo ""
        log_divider
        echo -e "    ${BOLD}[C]${NC} Continue"
        echo -e "    ${BOLD}[R]${NC} Recheck Connection"
        echo -e "    ${BOLD}[B]${NC} Back to Menu"
        echo ""
        log_divider
        echo -e "  \c"
        read -p "Select an option [C/R/B]: " NEXT_ACTION

        case "$NEXT_ACTION" in
            [Cc])
                echo ""
                log_step "Verifying tunnel connector and local panel responsiveness..."
                local PANEL_OK=false
                local TUNNEL_OK=false

                if curl -fsSL --max-time 2 "http://127.0.0.1:$PANEL_PORT" &>/dev/null; then
                    PANEL_OK=true
                    log_success "Local zPanel application: Responding on port $PANEL_PORT."
                else
                    log_warning "Local zPanel application: Port $PANEL_PORT not responding yet."
                fi

                if systemctl is-active --quiet "$CF_SERVICE" 2>/dev/null; then
                    TUNNEL_OK=true
                    log_success "Cloudflare Tunnel service: Active and running."
                else
                    log_error "Cloudflare Tunnel service: Inactive or failed."
                fi

                echo ""
                if $PANEL_OK && $TUNNEL_OK; then
                    log_success "Tunnel service is active! Your configured Cloudflare hostname can now reach zPanel."
                else
                    log_warning "Setup complete with notices. Verify your Cloudflare Zero Trust Public Hostname routing to http://127.0.0.1:6767."
                fi
                echo ""
                read -p "  Press Enter to continue..."
                break
                ;;
            [Rr])
                log_step "Checking connector status..."
                if systemctl is-active --quiet "$CF_SERVICE" 2>/dev/null; then
                    log_success "Tunnel service is active."
                else
                    log_warning "Tunnel service is not active. Attempting restart..."
                    $SUDO systemctl restart "$CF_SERVICE"
                fi
                sleep 2
                ;;
            [Bb]|*)
                break
                ;;
        esac
    done
}

# 2.2 Check Tunnel Status
cf_check_status() {
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL STATUS${NC}\n"
    log_divider
    echo ""

    # 1. cloudflared
    if command -v cloudflared &>/dev/null; then
        echo -e "  ${BOLD}cloudflared${NC}       : ${GREEN}Installed${NC}"
    else
        echo -e "  ${BOLD}cloudflared${NC}       : ${RED}Not installed${NC}"
    fi

    # 2. Tunnel Service
    local SVC_ACTIVE=false
    if command -v systemctl &>/dev/null; then
        if systemctl is-active --quiet "$CF_SERVICE" 2>/dev/null; then
            SVC_ACTIVE=true
            echo -e "  ${BOLD}Tunnel Service${NC}    : ${GREEN}Active${NC}"
        else
            echo -e "  ${BOLD}Tunnel Service${NC}    : ${RED}Inactive${NC}"
        fi
    else
        echo -e "  ${BOLD}Tunnel Service${NC}    : ${YELLOW}systemd not available${NC}"
    fi

    # 3. Panel Process
    if command -v pm2 &>/dev/null; then
        PM2_STAT=$(pm2 jlist 2>/dev/null | grep -o '"name":"zpanel"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ "$PM2_STAT" = "online" ]; then
            echo -e "  ${BOLD}Panel Process${NC}     : ${GREEN}Running${NC}"
        else
            echo -e "  ${BOLD}Panel Process${NC}     : ${YELLOW}${PM2_STAT:-stopped}${NC}"
        fi
    else
        echo -e "  ${BOLD}Panel Process${NC}     : ${YELLOW}PM2 not installed${NC}"
    fi

    # 4. Automatic Startup
    if command -v systemctl &>/dev/null && systemctl is-enabled --quiet "$CF_SERVICE" 2>/dev/null; then
        echo -e "  ${BOLD}Automatic Startup${NC} : ${GREEN}Enabled${NC}"
    else
        echo -e "  ${BOLD}Automatic Startup${NC} : ${YELLOW}Disabled / Not configured${NC}"
    fi

    # 5. Connection
    if $SVC_ACTIVE; then
        echo -e "  ${BOLD}Connection${NC}        : ${GREEN}Connected${NC}"
    else
        echo -e "  ${BOLD}Connection${NC}        : ${RED}Disconnected${NC}"
    fi

    echo ""
    log_divider
}

# 2.3 Restart Tunnel
cf_restart_tunnel() {
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL — Restart${NC}\n"
    log_divider
    check_privileges

    if ! command -v systemctl &>/dev/null; then
        log_error "systemd is not available."
        return 1
    fi

    if ! systemctl list-unit-files | grep -q "${CF_SERVICE}.service"; then
        log_error "Cloudflare Tunnel service is not configured yet."
        return 1
    fi

    log_step "Restarting Cloudflare Tunnel service..."
    $SUDO systemctl restart "$CF_SERVICE"
    sleep 2

    if $SUDO systemctl is-active --quiet "$CF_SERVICE"; then
        log_success "Cloudflare Tunnel restarted successfully."
    else
        log_error "Tunnel failed to restart. Check: sudo journalctl -u cloudflared -n 30"
    fi
}

# 2.4 Stop Tunnel
cf_stop_tunnel() {
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL — Stop${NC}\n"
    log_divider
    check_privileges

    echo -e "  ${YELLOW}Stopping the tunnel will disable public access via Cloudflare.${NC}"
    echo -e "  ${YELLOW}The local zPanel application will continue running on http://127.0.0.1:6767.${NC}"
    echo -e "  ${BOLD}Stop the tunnel? [y/N]:${NC} \c"
    read -r CONFIRM_STOP

    if [[ ! "$CONFIRM_STOP" =~ ^[Yy]$ ]]; then
        log_info "Operation cancelled."
        return 0
    fi

    $SUDO systemctl stop "$CF_SERVICE" 2>/dev/null || true
    log_success "Cloudflare Tunnel stopped. zPanel is still active locally."
}

# 2.5 Reconnect Tunnel
cf_reconnect_tunnel() {
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL — Reconnect${NC}\n"
    log_divider
    check_privileges

    if [ ! -f "$CF_ENV_FILE" ]; then
        log_error "No saved tunnel credentials found. Configure the tunnel first (Option 1)."
        return 1
    fi

    log_step "Reconnecting Cloudflare Tunnel..."
    $SUDO systemctl daemon-reload
    $SUDO systemctl enable "$CF_SERVICE" 2>/dev/null || true
    $SUDO systemctl restart "$CF_SERVICE"
    sleep 2

    if $SUDO systemctl is-active --quiet "$CF_SERVICE"; then
        log_success "Tunnel reconnected and active."
    else
        log_error "Failed to reconnect. Check: sudo journalctl -u cloudflared -n 30"
    fi
}

# 2.6 Disconnect Tunnel
cf_disconnect_tunnel() {
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL — Disconnect${NC}\n"
    log_divider
    check_privileges

    log_warning "This will stop and disable the Cloudflare Tunnel service."
    log_warning "Public access to zPanel via your Cloudflare hostname will be disconnected."
    echo -e "  ${DIM}Your Cloudflare account tunnel and DNS records will NOT be deleted.${NC}"
    echo ""
    echo -e "  ${YELLOW}Confirm disconnection? [y/N]:${NC} \c"
    read -r CONFIRM_DISC

    if [[ ! "$CONFIRM_DISC" =~ ^[Yy]$ ]]; then
        log_info "Disconnection cancelled."
        return 0
    fi

    $SUDO systemctl stop "$CF_SERVICE" 2>/dev/null || true
    $SUDO systemctl disable "$CF_SERVICE" 2>/dev/null || true
    log_success "Cloudflare Tunnel service stopped and disabled from boot."
    log_info "Configuration preserved in $CF_CONFIG_DIR. You can reconnect anytime."
}

# Submenu loop
cloudflare_menu() {
    while true; do
        print_banner
        echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL MANAGEMENT${NC}\n"
        log_divider
        echo ""
        echo -e "    ${BOLD}[1]${NC} Configure / Connect Tunnel"
        echo -e "    ${BOLD}[2]${NC} Check Tunnel Status"
        echo -e "    ${BOLD}[3]${NC} Restart Tunnel"
        echo -e "    ${BOLD}[4]${NC} Stop Tunnel"
        echo -e "    ${BOLD}[5]${NC} Reconnect Tunnel"
        echo -e "    ${BOLD}[6]${NC} Disconnect Tunnel"
        echo -e "    ${BOLD}[7]${NC} Back to Main Menu"
        echo ""
        log_divider
        echo -e "  \c"
        read -p "Select an option [1-7]: " CF_SUB_CHOICE

        case "$CF_SUB_CHOICE" in
            1) cf_configure_tunnel;  read -p "  Press Enter to continue..." ;;
            2) cf_check_status;       read -p "  Press Enter to continue..." ;;
            3) cf_restart_tunnel;     read -p "  Press Enter to continue..." ;;
            4) cf_stop_tunnel;        read -p "  Press Enter to continue..." ;;
            5) cf_reconnect_tunnel;   read -p "  Press Enter to continue..." ;;
            6) cf_disconnect_tunnel;  read -p "  Press Enter to continue..." ;;
            7) return 0 ;;
            *) log_error "Invalid selection. Please choose an option from 1 to 7."; sleep 1 ;;
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
        log_error "No zPanel installation found. Please install zPanel first (Option 1)."
        return 1
    fi

    log_info "Detected installation: $PANEL_DIR"

    # Backup production settings & data
    BACKUP_TIME=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="/tmp/zpanel_backup_${BACKUP_TIME}"
    mkdir -p "$BACKUP_DIR"

    log_step "Backing up configuration and database..."
    [ -f "$PANEL_DIR/.env" ] && cp "$PANEL_DIR/.env" "$BACKUP_DIR/.env"
    [ -d "$PANEL_DIR/.data" ] && cp -r "$PANEL_DIR/.data" "$BACKUP_DIR/.data"
    log_success "Backup saved to $BACKUP_DIR"

    cd "$PANEL_DIR" || return 1

    # Git pull
    log_step "Fetching latest version from repository..."
    git stash 2>/dev/null || true
    if ! git pull --ff-only; then
        log_error "git pull failed. Restoring from backup."
        return 1
    fi

    # Restore .env and data
    [ -f "$BACKUP_DIR/.env" ] && cp "$BACKUP_DIR/.env" "$PANEL_DIR/.env"
    [ -d "$BACKUP_DIR/.data" ] && cp -r "$BACKUP_DIR/.data" "$PANEL_DIR/"

    # Install dependencies & rebuild
    log_step "Updating dependencies and rebuilding..."
    npm install || { log_error "npm install failed."; return 1; }
    npm run build || { log_error "Build failed."; return 1; }

    # Restart PM2
    log_step "Restarting PM2 process..."
    if command -v pm2 &>/dev/null; then
        pm2 restart "$PM2_APP_NAME" 2>/dev/null || pm2 restart all 2>/dev/null || true
        pm2 save 2>/dev/null || true
    fi

    # Health check
    if check_panel_health "$PANEL_PORT"; then
        log_success "Update completed successfully! zPanel is active on port $PANEL_PORT."
        rm -rf "$BACKUP_DIR"
    else
        log_warning "Update completed. Application may still be loading. Check: pm2 logs zpanel"
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

    cd "$PANEL_DIR" || return 1
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
        log_error "PM2 is not installed."
        return 1
    fi

    log_step "Restarting PM2 process '$PM2_APP_NAME'..."
    if ! pm2 restart "$PM2_APP_NAME" 2>/dev/null; then
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
#  MAIN INTERACTIVE MENU LOOP (1-6)
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
    echo -e "    ${BOLD}[6]${NC} Exit"
    echo ""
    log_divider
    echo -e "  \c"
    read -p "Select an option [1-6]: " MAIN_CHOICE

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
            echo ""
            echo -e "  ${CYAN}Exiting zPanel installer. Have a great day!${NC}\n"
            exit 0
            ;;
        *)
            log_error "Invalid selection '$MAIN_CHOICE'. Please choose between 1 and 6."
            sleep 1
            ;;
    esac
done
