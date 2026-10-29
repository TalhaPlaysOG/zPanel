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
#  [2] CLOUDFLARE TUNNEL
# ─────────────────────────────────────────────

# Step 1: Install cloudflared
install_cloudflared() {
    # Check whether cloudflared is already installed before installing it again
    if command -v cloudflared &>/dev/null; then
        log_success "cloudflared is already installed: $(cloudflared --version 2>/dev/null | head -1)"
        return 0
    fi

    log_step "Installing cloudflared..."
    check_privileges

    if ! command -v apt-get &>/dev/null; then
        log_error "apt-get is required to install cloudflared via official Cloudflare repository."
        return 1
    fi

    if ! $SUDO mkdir -p --mode=0755 /usr/share/keyrings; then
        log_error "Failed to create directory /usr/share/keyrings"
        return 1
    fi

    if ! $SUDO curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg -o /usr/share/keyrings/cloudflare-main.gpg; then
        log_error "Failed to download Cloudflare GPG key"
        return 1
    fi

    if ! $SUDO chmod 0644 /usr/share/keyrings/cloudflare-main.gpg; then
        log_error "Failed to set permissions on /usr/share/keyrings/cloudflare-main.gpg"
        return 1
    fi

    if ! $SUDO bash -c "echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' > /etc/apt/sources.list.d/cloudflared.list"; then
        log_error "Failed to create /etc/apt/sources.list.d/cloudflared.list"
        return 1
    fi

    if ! $SUDO apt-get update; then
        log_error "Failed to update package lists (apt-get update)"
        return 1
    fi

    if ! $SUDO apt-get install -y cloudflared; then
        log_error "Failed to install cloudflared package"
        return 1
    fi

    if command -v cloudflared &>/dev/null; then
        log_success "cloudflared installed successfully: $(cloudflared --version 2>/dev/null | head -1)"
        return 0
    else
        log_error "cloudflared binary not found after installation."
        return 1
    fi
}

# Step 2 & Step 3: Ask for Tunnel Token & Connect Automatically
setup_cloudflare_tunnel() {
    # Never expose token through shell tracing
    set +x

    # Step 2: Ask for the Tunnel Token
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL SETUP${NC}\n"
    log_divider
    echo ""
    echo "  Paste your Cloudflare Tunnel token below."
    echo "  Get your token from your existing tunnel in the Cloudflare Zero Trust dashboard."
    echo ""
    echo -ne "  ${BOLD}Tunnel Token:${NC} "
    read -r TUNNEL_TOKEN

    # Validate that the input is not empty
    TUNNEL_TOKEN="$(echo "$TUNNEL_TOKEN" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    if [ -z "$TUNNEL_TOKEN" ]; then
        log_error "Tunnel token cannot be empty."
        return 1
    fi

    # Step 3: Connect Automatically
    log_step "Configuring Cloudflare Tunnel service..."
    check_privileges

    # Handle an existing cloudflared service without creating duplicate services
    if systemctl list-unit-files 2>/dev/null | grep -q "^cloudflared\.service" || [ -f /etc/systemd/system/cloudflared.service ] || [ -f /lib/systemd/system/cloudflared.service ]; then
        log_info "Existing cloudflared service detected. Safely removing old service..."
        $SUDO systemctl stop cloudflared 2>/dev/null || true
        $SUDO cloudflared service uninstall 2>/dev/null || true
        $SUDO rm -f /etc/systemd/system/cloudflared.service /etc/systemd/system/multi-user.target.wants/cloudflared.service 2>/dev/null || true
        $SUDO systemctl daemon-reload 2>/dev/null || true
    fi

    # Execute official cloudflared service install safely without printing or logging the token
    local INSTALL_OUT
    INSTALL_OUT=$($SUDO cloudflared service install "$TUNNEL_TOKEN" 2>&1)
    local INSTALL_CODE=$?

    if [ $INSTALL_CODE -ne 0 ]; then
        local REDACTED_ERR
        REDACTED_ERR=$(echo "$INSTALL_OUT" | sed "s|${TUNNEL_TOKEN}|[REDACTED_TOKEN]|g")
        log_error "Failed to install cloudflared service."
        [ -n "$REDACTED_ERR" ] && echo -e "  ${RED}${REDACTED_ERR}${NC}"
        return 1
    fi

    # Enable and start the service as required
    $SUDO systemctl daemon-reload 2>/dev/null || true
    $SUDO systemctl enable cloudflared 2>/dev/null || true
    $SUDO systemctl restart cloudflared 2>/dev/null || $SUDO systemctl start cloudflared 2>/dev/null || true

    # Verify actual service status and connection after installation
    log_step "Verifying tunnel connection status..."
    local IS_CONNECTED=false
    local ERROR_MSG=""

    for ((i=1; i<=15; i++)); do
        sleep 1

        if ! systemctl is-active --quiet cloudflared 2>/dev/null; then
            ERROR_MSG="cloudflared service stopped unexpectedly."
            local JERR
            JERR=$(journalctl -u cloudflared -n 15 --no-pager 2>/dev/null | grep -iE 'error|fatal|unauthorized|failed' | tail -n 5)
            [ -n "$JERR" ] && ERROR_MSG="$ERROR_MSG"$'\n'"$JERR"
            IS_CONNECTED=false
            break
        fi

        local JLOGS
        JLOGS=$(journalctl -u cloudflared -n 30 --no-pager 2>/dev/null)

        if echo "$JLOGS" | grep -qiE 'registered tunnel connection|connection [0-9a-f-]+ registered|registered connindex'; then
            IS_CONNECTED=true
            break
        fi

        if echo "$JLOGS" | grep -qiE 'unauthorized|cannot fetch tunnel|invalid token|validation failed|quitting due to error'; then
            ERROR_MSG=$(echo "$JLOGS" | grep -iE 'error|fatal|unauthorized|failed' | tail -n 5)
            IS_CONNECTED=false
            break
        fi
    done

    if [ "$IS_CONNECTED" = false ] && [ -z "$ERROR_MSG" ]; then
        if systemctl is-active --quiet cloudflared 2>/dev/null; then
            local JLOGS
            JLOGS=$(journalctl -u cloudflared -n 30 --no-pager 2>/dev/null)
            if echo "$JLOGS" | grep -qiE 'error|fatal|unauthorized|failed'; then
                ERROR_MSG=$(echo "$JLOGS" | grep -iE 'error|fatal|unauthorized|failed' | tail -n 5)
                IS_CONNECTED=false
            else
                IS_CONNECTED=true
            fi
        else
            ERROR_MSG="Service is inactive or failed to start."
            IS_CONNECTED=false
        fi
    fi

    # If the tunnel fails to connect, show the actual error and allow the user to retry
    if [ "$IS_CONNECTED" = false ]; then
        local CLEAN_MSG
        CLEAN_MSG=$(echo "$ERROR_MSG" | sed "s|${TUNNEL_TOKEN}|[REDACTED_TOKEN]|g")
        log_error "Cloudflare Tunnel failed to connect."
        [ -n "$CLEAN_MSG" ] && echo -e "  ${RED}${CLEAN_MSG}${NC}"
        echo ""
        echo -ne "  ${YELLOW}Would you like to retry? [Y/n]:${NC} "
        read -r RETRY_INPUT
        if [[ ! "$RETRY_INPUT" =~ ^[Nn]$ ]]; then
            setup_cloudflare_tunnel
            return $?
        else
            return 1
        fi
    fi

    log_success "Cloudflare Tunnel connected successfully."
    return 0
}

# Check Tunnel Status
cf_check_status() {
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL STATUS${NC}\n"
    log_divider
    echo ""

    if command -v cloudflared &>/dev/null; then
        echo -e "  ${BOLD}Installation${NC}   : ${GREEN}Completed${NC} ($(cloudflared --version 2>/dev/null | awk '{print $3}' | head -1))"
    else
        echo -e "  ${BOLD}Installation${NC}   : ${RED}Not Installed${NC}"
    fi

    local SVC_ACTIVE=false
    if command -v systemctl &>/dev/null && systemctl is-active --quiet cloudflared 2>/dev/null; then
        SVC_ACTIVE=true
        echo -e "  ${BOLD}Service${NC}        : ${GREEN}Running${NC}"
    else
        echo -e "  ${BOLD}Service${NC}        : ${RED}Inactive / Stopped${NC}"
    fi

    if command -v systemctl &>/dev/null && systemctl is-enabled --quiet cloudflared 2>/dev/null; then
        echo -e "  ${BOLD}Auto Startup${NC}   : ${GREEN}Enabled${NC}"
    else
        echo -e "  ${BOLD}Auto Startup${NC}   : ${YELLOW}Disabled${NC}"
    fi

    if $SVC_ACTIVE; then
        local JLOGS
        JLOGS=$(journalctl -u cloudflared -n 30 --no-pager 2>/dev/null)
        if echo "$JLOGS" | grep -qiE 'error|fatal|unauthorized|failed' && ! echo "$JLOGS" | grep -qiE 'registered tunnel connection|connection [0-9a-f-]+ registered'; then
            echo -e "  ${BOLD}Connection${NC}     : ${RED}Failed to Connect${NC}"
            local ERR_SNIP
            ERR_SNIP=$(echo "$JLOGS" | grep -iE 'error|fatal|unauthorized|failed' | tail -n 2)
            [ -n "$ERR_SNIP" ] && echo -e "  ${RED}${ERR_SNIP}${NC}"
        else
            echo -e "  ${BOLD}Connection${NC}     : ${GREEN}Connected${NC}"
        fi
    else
        echo -e "  ${BOLD}Connection${NC}     : ${RED}Disconnected${NC}"
    fi

    echo ""
    log_divider
}

# Reconnect Tunnel
cf_reconnect_tunnel() {
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL — Reconnect${NC}\n"
    log_divider
    check_privileges

    if ! command -v cloudflared &>/dev/null; then
        log_error "cloudflared is not installed. Please complete Cloudflare Tunnel setup first."
        return 1
    fi

    echo -e "    ${BOLD}[1]${NC} Restart existing service and reconnect"
    echo -e "    ${BOLD}[2]${NC} Update tunnel token and reconnect"
    echo -e "    ${BOLD}[3]${NC} Cancel"
    echo ""
    log_divider
    echo -ne "  Choose an option [1-3]: "
    read -r RECONN_CHOICE

    case "$RECONN_CHOICE" in
        1)
            log_step "Restarting cloudflared service..."
            $SUDO systemctl daemon-reload 2>/dev/null || true
            $SUDO systemctl enable cloudflared 2>/dev/null || true
            $SUDO systemctl restart cloudflared 2>/dev/null || true
            sleep 3
            if systemctl is-active --quiet cloudflared 2>/dev/null; then
                log_success "Cloudflare Tunnel service is running."
            else
                log_error "Cloudflare Tunnel service failed to start. Check: sudo journalctl -u cloudflared -n 30"
            fi
            ;;
        2)
            setup_cloudflare_tunnel
            ;;
        *)
            log_info "Operation cancelled."
            return 0
            ;;
    esac
}

# Step 4: Return to the Main Menu
show_cloudflare_menu() {
    while true; do
        print_banner
        echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL${NC}\n"
        log_divider
        echo ""
        printf "    %-16s : %s\n" "Installation" "${GREEN}Completed${NC}"
        printf "    %-16s : %s\n" "Service" "${GREEN}Running${NC}"
        printf "    %-16s : %s\n" "Auto Startup" "${GREEN}Enabled${NC}"
        echo ""
        log_divider
        echo ""
        echo -e "    ${BOLD}[1]${NC} Back to Main Menu"
        echo -e "    ${BOLD}[2]${NC} Check Status"
        echo -e "    ${BOLD}[3]${NC} Reconnect Tunnel"
        echo ""
        log_divider
        echo -ne "  Choose an option: "
        read -r CF_OPTION

        case "$CF_OPTION" in
            1)
                return 0
                ;;
            2)
                cf_check_status
                echo ""
                read -p "  Press Enter to continue..."
                ;;
            3)
                cf_reconnect_tunnel
                echo ""
                read -p "  Press Enter to continue..."
                ;;
            *)
                log_error "Invalid selection. Please choose an option from 1 to 3."
                sleep 1
                ;;
        esac
    done
}

# Main Cloudflare Option Handler (Option 2)
cloudflare_tunnel_option() {
    check_privileges

    # If already installed and service is currently running, offer menu or token update
    if command -v cloudflared &>/dev/null && systemctl is-active --quiet cloudflared 2>/dev/null; then
        print_banner
        echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL${NC}\n"
        log_divider
        echo ""
        log_info "Cloudflare Tunnel service is already installed and running."
        echo ""
        echo -e "    ${BOLD}[1]${NC} Open Cloudflare Tunnel Menu (Status / Reconnect)"
        echo -e "    ${BOLD}[2]${NC} Update Tunnel Token & Reconnect"
        echo -e "    ${BOLD}[3]${NC} Back to Main Menu"
        echo ""
        log_divider
        echo -ne "  Choose an option [1-3]: "
        read -r CF_EX_CHOICE
        case "$CF_EX_CHOICE" in
            1)
                show_cloudflare_menu
                return 0
                ;;
            2)
                # Proceed to token setup
                ;;
            *)
                return 0
                ;;
        esac
    fi

    # Step 1: Install cloudflared
    if ! install_cloudflared; then
        echo ""
        read -p "  Press Enter to return to main menu..."
        return 1
    fi

    # Step 2 & Step 3: Ask for token and connect automatically
    if ! setup_cloudflare_tunnel; then
        echo ""
        read -p "  Press Enter to return to main menu..."
        return 1
    fi

    # Step 4: Show menu
    show_cloudflare_menu
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
    echo -e "  ${BOLD}zPanel MANAGEMENT & INSTALLER${NC}"
    echo ""
    echo -e "    ${BOLD}[1]${NC} Install zPanel (Node.js + PM2)"
    echo -e "    ${BOLD}[2]${NC} Cloudflare Tunnel"
    echo -e "    ${BOLD}[3]${NC} Update zPanel"
    echo -e "    ${BOLD}[4]${NC} Create Admin User"
    echo -e "    ${BOLD}[5]${NC} Restart zPanel"
    echo -e "    ${BOLD}[6]${NC} Exit"
    echo ""
    log_divider
    echo -e "  \c"
    read -p "Choose an option [1-6]: " MAIN_CHOICE

    case "$MAIN_CHOICE" in
        1)
            install_zpanel
            echo ""
            read -p "  Press Enter to return to main menu..."
            ;;
        2)
            cloudflare_tunnel_option
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
