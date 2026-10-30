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
#  ERROR HANDLING & CLEANUP TRAP
# ─────────────────────────────────────────────
cleanup_on_exit() {
    local exit_code=$?
    # Clean up any temporary node installation directory
    rm -rf /tmp/zpanel_node_install 2>/dev/null || true
    if [ "$exit_code" -ne 0 ]; then
        log_error "Installer exited with code $exit_code. Some operations may not have completed."
    fi
    exit "$exit_code"
}
trap cleanup_on_exit EXIT

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
#  INSTALL NODE.JS >= 22 LTS (Robust)
# ─────────────────────────────────────────────
install_nodejs() {
    log_step "Verifying Node.js runtime..."
    local NEED_NODE=0
    local NODE_INSTALL_DIR="/tmp/zpanel_node_install"
    local NODE_ARCHIVE=""
    local NODE_VER_RAW=""
    local NODE_MAJOR=0
    local NODE_MINOR=0

    # Check existing Node.js
    if command -v node &>/dev/null; then
        NODE_VER_RAW=$(node -v 2>/dev/null | tr -d 'v')
        NODE_MAJOR=$(echo "$NODE_VER_RAW" | cut -d'.' -f1)
        NODE_MINOR=$(echo "$NODE_VER_RAW" | cut -d'.' -f2)
        if [ "$NODE_MAJOR" -ge 22 ]; then
            log_success "Node.js $NODE_VER_RAW already installed (meets >= 22 requirement)."
            return 0
        elif [ "$NODE_MAJOR" -ge 20 ] && [ "${NODE_MINOR:-0}" -ge 19 ]; then
            log_warning "Node.js $NODE_VER_RAW installed but below recommended 22.x LTS. Proceeding anyway."
            return 0
        else
            log_info "Node.js $NODE_VER_RAW is below requirement. Upgrading to Node.js 22.x LTS..."
            NEED_NODE=1
        fi
    else
        NEED_NODE=1
    fi

    if [ "$NEED_NODE" -eq 0 ]; then
        return 0
    fi

    # Check disk space (need at least 500MB in /tmp and /usr/local)
    local AVAIL_KB
    AVAIL_KB=$(df -k /tmp 2>/dev/null | awk 'NR==2 {print $4}')
    if [ -n "$AVAIL_KB" ] && [ "$AVAIL_KB" -lt 512000 ]; then
        log_error "Insufficient disk space in /tmp (need at least 500MB, have ${AVAIL_KB}KB)."
        return 1
    fi

    # Create temp directory for download
    rm -rf "$NODE_INSTALL_DIR" 2>/dev/null || true
    mkdir -p "$NODE_INSTALL_DIR" || {
        log_error "Failed to create temporary directory $NODE_INSTALL_DIR."
        return 1
    }

    # Detect architecture
    local ARCH
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64)  NODE_ARCH="x64" ;;
        aarch64) NODE_ARCH="arm64" ;;
        armv7l)  NODE_ARCH="armv7l" ;;
        *)       NODE_ARCH="x64" ;;
    esac

    NODE_PKG="node-v22.14.0-linux-${NODE_ARCH}"
    NODE_ARCHIVE="$NODE_INSTALL_DIR/${NODE_PKG}.tar.xz"
    local NODE_URL="https://nodejs.org/dist/v22.14.0/${NODE_PKG}.tar.xz"

    log_info "Downloading Node.js 22.x LTS ($NODE_ARCH)..."
    if ! curl -fL --connect-timeout 30 --max-time 300 --retry 3 --retry-delay 5 \
        -o "$NODE_ARCHIVE" "$NODE_URL"; then
        log_error "Failed to download Node.js archive from $NODE_URL."
        log_info "Trying NodeSource repository method as fallback..."
        # Fallback to NodeSource
        if [ "$PKG_MGR" = "apt" ]; then
            if ! curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash - 2>/dev/null; then
                log_error "NodeSource setup failed."
                rm -rf "$NODE_INSTALL_DIR" 2>/dev/null || true
                return 1
            fi
            if ! $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs 2>/dev/null; then
                log_error "apt-get install nodejs failed."
                rm -rf "$NODE_INSTALL_DIR" 2>/dev/null || true
                return 1
            fi
        elif [ "$PKG_MGR" = "yum" ] || [ "$PKG_MGR" = "dnf" ]; then
            if ! curl -fsSL https://rpm.nodesource.com/setup_22.x | $SUDO bash - 2>/dev/null; then
                log_error "NodeSource setup failed."
                rm -rf "$NODE_INSTALL_DIR" 2>/dev/null || true
                return 1
            fi
            if ! $SUDO $PKG_MGR install -y nodejs 2>/dev/null; then
                log_error "$PKG_MGR install nodejs failed."
                rm -rf "$NODE_INSTALL_DIR" 2>/dev/null || true
                return 1
            fi
        else
            log_error "Unsupported package manager for Node.js fallback."
            rm -rf "$NODE_INSTALL_DIR" 2>/dev/null || true
            return 1
        fi
        rm -rf "$NODE_INSTALL_DIR" 2>/dev/null || true
        if command -v node &>/dev/null && command -v npm &>/dev/null; then
            log_success "Node.js $(node -v) & npm v$(npm -v) installed via package manager."
            return 0
        else
            log_error "Node.js installation failed. Cannot continue."
            return 1
        fi
    fi

    # Validate downloaded archive
    if [ ! -f "$NODE_ARCHIVE" ] || [ ! -s "$NODE_ARCHIVE" ]; then
        log_error "Node.js archive is empty or missing after download."
        rm -rf "$NODE_INSTALL_DIR" 2>/dev/null || true
        return 1
    fi

    # Verify it's a valid xz archive
    if ! file "$NODE_ARCHIVE" | grep -qi "xz"; then
        log_error "Downloaded Node.js archive is not a valid xz file."
        rm -rf "$NODE_INSTALL_DIR" 2>/dev/null || true
        return 1
    fi

    log_info "Extracting Node.js archive..."
    if ! tar -xJf "$NODE_ARCHIVE" -C "$NODE_INSTALL_DIR" 2>/dev/null; then
        log_error "Failed to extract Node.js archive."
        rm -rf "$NODE_INSTALL_DIR" 2>/dev/null || true
        return 1
    fi

    # Find the extracted directory
    local EXTRACTED_DIR
    EXTRACTED_DIR=$(find "$NODE_INSTALL_DIR" -maxdepth 1 -type d -name "node-*" 2>/dev/null | head -1)
    if [ -z "$EXTRACTED_DIR" ] || [ ! -x "$EXTRACTED_DIR/bin/node" ]; then
        log_error "Node.js binary not found in extracted archive."
        rm -rf "$NODE_INSTALL_DIR" 2>/dev/null || true
        return 1
    fi

    log_info "Installing Node.js to /usr/local..."
    if ! $SUDO cp -r "$EXTRACTED_DIR"/* /usr/local/ 2>/dev/null; then
        log_error "Failed to copy Node.js files to /usr/local."
        rm -rf "$NODE_INSTALL_DIR" 2>/dev/null || true
        return 1
    fi

    # Verify installation
    if ! command -v node &>/dev/null; then
        # Try direct path
        if [ -x /usr/local/bin/node ]; then
            export PATH="/usr/local/bin:$PATH"
        else
            log_error "Node.js binary not found after installation."
            rm -rf "$NODE_INSTALL_DIR" 2>/dev/null || true
            return 1
        fi
    fi

    # Clean up temp directory
    rm -rf "$NODE_INSTALL_DIR" 2>/dev/null || true

    if command -v node &>/dev/null && command -v npm &>/dev/null; then
        log_success "Node.js $(node -v) & npm v$(npm -v) confirmed."
    else
        log_error "Node.js installation failed. Cannot continue."
        return 1
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
install_java_runtimes() {
    log_step "Checking Java runtimes for Minecraft servers..."

    # Track which Java versions are available
    JAVA_21_AVAILABLE=0
    JAVA_25_AVAILABLE=0
    JAVA_ANY_AVAILABLE=0

    # Helper: check if a specific Java major version is available
    check_java_version() {
        local target_ver="$1"
        if command -v java &>/dev/null; then
            local cur_ver
            cur_ver=$(java -version 2>&1 | head -1 | awk -F '"' '{print $2}' | cut -d'.' -f1)
            # Handle "1.8.0" style (Java 8 -> "1")
            if [ "$cur_ver" = "1" ]; then cur_ver="8"; fi
            if [ "$cur_ver" -ge "$target_ver" ] 2>/dev/null; then
                return 0
            fi
        fi
        # Check common install directories
        local jvm_dir
        for jvm_dir in /usr/lib/jvm/jdk-${target_ver}* /usr/lib/jvm/java-${target_ver}-openjdk* /usr/local/lib/jvm/jdk-${target_ver}* /opt/java/openjdk-${target_ver}*; do
            if [ -x "$jvm_dir/bin/java" ] 2>/dev/null; then
                return 0
            fi
        done
        return 1
    }

    # Check existing Java
    if check_java_version 25; then
        JAVA_25_AVAILABLE=1
        JAVA_ANY_AVAILABLE=1
        log_success "Java 25 is already installed: $(java -version 2>&1 | head -1 2>/dev/null || /usr/lib/jvm/jdk-25/bin/java -version 2>&1 | head -1)"
    elif check_java_version 21; then
        JAVA_21_AVAILABLE=1
        JAVA_ANY_AVAILABLE=1
        log_success "Java 21 is already installed: $(java -version 2>&1 | head -1 2>/dev/null || /usr/lib/jvm/jdk-21/bin/java -version 2>&1 | head -1)"
    elif command -v java &>/dev/null; then
        local cur_ver
        cur_ver=$(java -version 2>&1 | head -1 | awk -F '"' '{print $2}' | cut -d'.' -f1)
        if [ "$cur_ver" = "1" ]; then cur_ver="8"; fi
        log_warning "Found Java $cur_ver but Minecraft 1.20.5+ requires Java 21 or higher."
    else
        log_info "No Java runtime found. Will install Java 21 and Java 25."
    fi

    # Install Java 21 if not available
    if [ "$JAVA_21_AVAILABLE" -eq 0 ]; then
        log_info "Installing Java 21 (required for Minecraft 1.20.5+)..."
        ARCH=$(uname -m)
        case "$ARCH" in
            x86_64)  JAVA_ARCH="x64" ;;
            aarch64) JAVA_ARCH="aarch64" ;;
            *)       JAVA_ARCH="x64" ;;
        esac

        # Try Adoptium Eclipse Temurin for Java 21 (reputable, maintained)
        local TEMURIN_URL="https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.5%2B11/OpenJDK21U-jre_aarch64_linux_hotspot_21.0.5_11.tar.gz"
        if [ "$JAVA_ARCH" = "x64" ]; then
            TEMURIN_URL="https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.5%2B11/OpenJDK21U-jre_x64_linux_hotspot_21.0.5_11.tar.gz"
        fi

        local JAVA21_DIR="/usr/lib/jvm/jdk-21"
        $SUDO mkdir -p /usr/lib/jvm
        log_info "Downloading Java 21 ($JAVA_ARCH) from Adoptium..."
        if curl -fsSL "$TEMURIN_URL" -o /tmp/jdk21.tar.gz 2>/dev/null && [ -f "/tmp/jdk21.tar.gz" ] && [ -s "/tmp/jdk21.tar.gz" ]; then
            $SUDO rm -rf "$JAVA21_DIR"
            $SUDO mkdir -p "$JAVA21_DIR"
            $SUDO tar -xzf /tmp/jdk21.tar.gz -C "$JAVA21_DIR" --strip-components=1 2>/dev/null || true
            rm -f /tmp/jdk21.tar.gz
        fi

        if [ -x "$JAVA21_DIR/bin/java" ] 2>/dev/null; then
            $SUDO update-alternatives --install /usr/bin/java java "$JAVA21_DIR/bin/java" 1500 2>/dev/null || true
            $SUDO ln -sf "$JAVA21_DIR/bin/java" /usr/local/bin/java 2>/dev/null || true
            if ! grep -q "JAVA_HOME=$JAVA21_DIR" /etc/environment 2>/dev/null; then
                echo "JAVA_HOME=$JAVA21_DIR" | $SUDO tee -a /etc/environment >/dev/null
            fi
            JAVA_21_AVAILABLE=1
            JAVA_ANY_AVAILABLE=1
            log_success "Java 21 installed: $($JAVA21_DIR/bin/java -version 2>&1 | head -1)"
        else
            # Fallback to package manager
            log_info "Direct download failed; trying package manager for Java 21..."
            if [ "$PKG_MGR" = "apt" ]; then
                $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y openjdk-21-jre-headless 2>/dev/null || true
            elif [ "$PKG_MGR" = "yum" ] || [ "$PKG_MGR" = "dnf" ]; then
                $SUDO $PKG_MGR install -y java-21-openjdk-headless 2>/dev/null || true
            fi
            if check_java_version 21; then
                JAVA_21_AVAILABLE=1
                JAVA_ANY_AVAILABLE=1
                log_success "Java 21 installed via package manager."
            else
                log_warning "Java 21 installation failed. Minecraft 1.20.5+ servers will not start until Java is installed."
            fi
        fi
    fi

    # Install Java 25 if not available (for Minecraft 1.22+)
    if [ "$JAVA_25_AVAILABLE" -eq 0 ]; then
        log_info "Installing Java 25 (required for Minecraft 1.22+)..."
        ARCH=$(uname -m)
        case "$ARCH" in
            x86_64)  JAVA_ARCH="x64" ;;
            aarch64) JAVA_ARCH="aarch64" ;;
            *)       JAVA_ARCH="x64" ;;
        esac

        local JAVA25_DIR="/usr/lib/jvm/jdk-25"
        $SUDO mkdir -p /usr/lib/jvm
        log_info "Downloading Java 25 ($JAVA_ARCH) from Java.net early access..."
        local JAVA25_URL="https://download.java.net/java/early_access/jdk25/11/GPL/openjdk-25-ea+11_linux-${JAVA_ARCH}_bin.tar.gz"
        if curl -fsSL "$JAVA25_URL" -o /tmp/jdk25.tar.gz 2>/dev/null && [ -f "/tmp/jdk25.tar.gz" ] && [ -s "/tmp/jdk25.tar.gz" ]; then
            $SUDO rm -rf "$JAVA25_DIR"
            $SUDO mkdir -p "$JAVA25_DIR"
            $SUDO tar -xzf /tmp/jdk25.tar.gz -C "$JAVA25_DIR" --strip-components=1 2>/dev/null || true
            rm -f /tmp/jdk25.tar.gz
        fi

        if [ -x "$JAVA25_DIR/bin/java" ] 2>/dev/null; then
            $SUDO update-alternatives --install /usr/bin/java java "$JAVA25_DIR/bin/java" 2000 2>/dev/null || true
            $SUDO ln -sf "$JAVA25_DIR/bin/java" /usr/local/bin/java 2>/dev/null || true
            if ! grep -q "JAVA_HOME=$JAVA25_DIR" /etc/environment 2>/dev/null; then
                echo "JAVA_HOME=$JAVA25_DIR" | $SUDO tee -a /etc/environment >/dev/null
            fi
            JAVA_25_AVAILABLE=1
            JAVA_ANY_AVAILABLE=1
            log_success "Java 25 installed: $($JAVA25_DIR/bin/java -version 2>&1 | head -1)"
        else
            log_warning "Java 25 direct download failed. Java 25 is optional (only needed for Minecraft 1.22+). Java 21 remains available for Minecraft 1.20.5-1.21."
        fi
    fi

    # Final status
    if [ "$JAVA_ANY_AVAILABLE" -eq 1 ]; then
        log_success "Java runtime(s) available for Minecraft servers."
    else
        log_warning "No Java runtime could be installed automatically. Panel features will work, but local Minecraft servers cannot start until Java is installed manually."
        log_info "Run: sudo apt update && sudo apt install -y openjdk-21-jre-headless  (or use the panel's Java Runtime section after install)"
    fi
}

setup_java_env() {
    local env_file="$1"
    if [ -z "$env_file" ]; then
        env_file="${TARGET_DIR:-$(pwd)}/.env"
    fi

    local java_path=""
    if command -v java &>/dev/null; then
        java_path=$(command -v java)
    elif [ -x /usr/lib/jvm/jdk-21/bin/java ]; then
        java_path="/usr/lib/jvm/jdk-21/bin/java"
    elif [ -x /usr/lib/jvm/jdk-25/bin/java ]; then
        java_path="/usr/lib/jvm/jdk-25/bin/java"
    fi

    if [ -n "$java_path" ] && [ -f "$env_file" ]; then
        if ! grep -q "^JAVA_BIN=" "$env_file"; then
            echo "JAVA_BIN=$java_path" >> "$env_file"
        else
            sed -i "s|^JAVA_BIN=.*|JAVA_BIN=$java_path|" "$env_file"
        fi
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

    # Record Java path in .env
    setup_java_env "$env_file"

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
    local INSTALL_MODE="${1:-nodejs}"
    print_banner
    case "$INSTALL_MODE" in
        docker)
            echo -e "  ${BOLD}${CYAN}INSTALLATION — Node.js + Docker Support${NC}\n"
            ;;
        dev)
            echo -e "  ${BOLD}${CYAN}INSTALLATION — Development Mode${NC}\n"
            ;;
        *)
            echo -e "  ${BOLD}${CYAN}INSTALLATION — Node.js + PM2 [Recommended]${NC}\n"
            ;;
    esac
    log_divider

    check_privileges
    check_network
    detect_os
    install_system_packages
    install_nodejs
    install_pm2
    install_java_runtimes

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

    # Setup environment
    setup_application_env "$TARGET_DIR"

    # Configure Docker support if requested
    if [ "$INSTALL_MODE" = "docker" ]; then
        log_step "Configuring Docker support..."
        if command -v docker &>/dev/null; then
            log_success "Docker is available."
            if ! grep -q "^ENABLE_DOCKER=true" "$TARGET_DIR/.env" 2>/dev/null; then
                echo "ENABLE_DOCKER=true" >> "$TARGET_DIR/.env"
            fi
        else
            log_warning "Docker not installed. Installing Docker..."
            if [ "$PKG_MGR" = "apt" ]; then
                $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io 2>/dev/null || true
            elif [ "$PKG_MGR" = "yum" ] || [ "$PKG_MGR" = "dnf" ]; then
                $SUDO $PKG_MGR install -y docker 2>/dev/null || true
            fi
            if command -v docker &>/dev/null; then
                $SUDO systemctl enable docker 2>/dev/null || true
                $SUDO systemctl start docker 2>/dev/null || true
                echo "ENABLE_DOCKER=true" >> "$TARGET_DIR/.env"
                log_success "Docker installed and started."
            else
                log_warning "Docker installation failed. Continuing with local runtime only."
            fi
        fi
    elif [ "$INSTALL_MODE" = "dev" ]; then
        log_step "Configuring Development Mode..."
        if ! grep -q "^VITE_ENABLE_DEVELOPER_PANEL=true" "$TARGET_DIR/.env" 2>/dev/null; then
            echo "VITE_ENABLE_DEVELOPER_PANEL=true" >> "$TARGET_DIR/.env"
        fi
        echo "NODE_ENV=development" >> "$TARGET_DIR/.env"
        log_success "Development mode configured."
    fi

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
#  Install zPanel with Docker Support
# ─────────────────────────────────────────────
install_zpanel_docker() {
    install_zpanel "docker"
}

# ─────────────────────────────────────────────
#  Install zPanel Development Mode
# ─────────────────────────────────────────────
install_zpanel_dev() {
    install_zpanel "dev"
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

    # Step 2: Ask for the Tunnel Token (accept a raw token or a full command)
    print_banner
    echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL SETUP${NC}\n"
    log_divider
    echo ""
    echo "  Paste your Cloudflare Tunnel token below."
    echo "  You can also paste the full command from the Cloudflare dashboard, e.g.:"
    echo "    sudo cloudflared service install eyJhIjoi..."
    echo ""
    echo "  (Enter 0 to return to Main Menu)"
    echo ""
    echo -ne "  ${BOLD}Tunnel Token or Command [or 0 to return]:${NC} "
    read -r TUNNEL_INPUT

    # Validate that the input is not empty
    TUNNEL_INPUT="$(printf '%s' "$TUNNEL_INPUT" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    if [ "$TUNNEL_INPUT" = "0" ]; then
        log_info "Returning to main menu..."
        CF_CANCELLED=1
        return 0
    fi
    if [ -z "$TUNNEL_INPUT" ]; then
        log_error "Tunnel token cannot be empty."
        return 1
    fi

    # Accept either a raw token or a full `cloudflared service install TOKEN`
    # command. Parse the arguments directly (never eval / bash -c).
    TUNNEL_TOKEN=""
    if [[ "$TUNNEL_INPUT" == *"cloudflared"* && "$TUNNEL_INPUT" == *"install"* ]]; then
        read -r -a CF_PARTS <<< "$TUNNEL_INPUT"
        for ((i=0; i<${#CF_PARTS[@]}; i++)); do
            if [ "${CF_PARTS[$i]}" = "install" ]; then
                TUNNEL_TOKEN="${CF_PARTS[$((i+1))]:-}"
                break
            fi
        done
        if [ -z "$TUNNEL_TOKEN" ]; then
            log_error "Could not find a token after 'install' in the command."
            return 1
        fi
    elif [[ "$TUNNEL_INPUT" =~ [[:space:]] ]]; then
        log_error "Invalid input. Paste only the token, or the full 'cloudflared service install ...' command."
        return 1
    else
        TUNNEL_TOKEN="$TUNNEL_INPUT"
    fi

    # Strip surrounding quotes that are sometimes copied along with the token.
    TUNNEL_TOKEN="${TUNNEL_TOKEN%\"}"; TUNNEL_TOKEN="${TUNNEL_TOKEN#\"}"
    TUNNEL_TOKEN="${TUNNEL_TOKEN%\'}"; TUNNEL_TOKEN="${TUNNEL_TOKEN#\'}"

    # Cloudflare tunnel tokens are base64url/JWT-style strings. Reject anything
    # containing shell metacharacters or whitespace.
    if [[ ! "$TUNNEL_TOKEN" =~ ^[A-Za-z0-9+/=_.-]{20,4096}$ ]]; then
        log_error "That does not look like a valid Cloudflare Tunnel token."
        return 1
    fi

    # Step 3: Connect Automatically
    log_step "Configuring Cloudflare Tunnel service..."
    check_privileges

    local CLOUDFLARED_BIN
    CLOUDFLARED_BIN="$(command -v cloudflared 2>/dev/null || true)"
    if [ -z "$CLOUDFLARED_BIN" ]; then
        log_error "cloudflared binary not found. Please install it first."
        return 1
    fi

    # Handle an existing cloudflared service without creating duplicate
    # services: stop it, then rewrite its configuration in place.
    if systemctl list-unit-files 2>/dev/null | grep -q "^cloudflared\.service" || [ -f /etc/systemd/system/cloudflared.service ]; then
        log_info "Existing cloudflared service detected. Reusing it with the new token..."
        $SUDO systemctl stop cloudflared 2>/dev/null || true
    fi

    # Store the token in a root-only file. The token is passed via stdin, so it
    # never appears in the process list, shell history or logs.
    if ! $SUDO mkdir -p -m 0700 /etc/cloudflared; then
        log_error "Failed to create /etc/cloudflared"
        return 1
    fi
    if ! printf '%s' "$TUNNEL_TOKEN" | $SUDO tee /etc/cloudflared/token >/dev/null; then
        log_error "Failed to write /etc/cloudflared/token"
        return 1
    fi
    $SUDO chmod 600 /etc/cloudflared/token
    $SUDO chown root:root /etc/cloudflared/token 2>/dev/null || true

    # Write a single systemd unit that reads the token from the protected file.
    local UNIT_FILE="/etc/systemd/system/cloudflared.service"
    if ! $SUDO tee "$UNIT_FILE" >/dev/null <<EOF
[Unit]
Description=Cloudflare Tunnel
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
TimeoutStartSec=0
ExecStart=${CLOUDFLARED_BIN} --no-autoupdate tunnel run --token-file /etc/cloudflared/token
Restart=on-failure
RestartSec=5s
User=root

[Install]
WantedBy=multi-user.target
EOF
    then
        log_error "Failed to write $UNIT_FILE"
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
        echo -e "    ${BOLD}[1]${NC} Retry Cloudflare Tunnel setup"
        echo -e "    ${BOLD}[0]${NC} Back to Main Menu"
        echo ""
        log_divider
        echo -ne "  Choose an option [0-1]: "
        read -r RETRY_INPUT
        if [ "$RETRY_INPUT" = "1" ]; then
            setup_cloudflare_tunnel
            return $?
        else
            CF_CANCELLED=1
            return 0
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

    if [ -f /etc/cloudflared/token ]; then
        echo -e "  ${BOLD}Token${NC}          : ${GREEN}Configured${NC} (/etc/cloudflared/token, mode 600)"
    else
        echo -e "  ${BOLD}Token${NC}          : ${RED}Not Configured${NC}"
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
    echo -e "    ${BOLD}[0]${NC} Back to Main Menu"
    echo ""
    log_divider
    echo -ne "  Choose an option [0-2]: "
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
        0)
            CF_RETURN_MAIN=1
            return 0
            ;;
        *)
            log_error "Invalid selection. Please choose 0, 1 or 2."
            ;;
    esac
}

# Step 4: Return to the Main Menu
show_cloudflare_menu() {
    while true; do
        local CF_INSTALL="${RED}Not Installed${NC}"
        local CF_SVC="${RED}Stopped${NC}"
        local CF_BOOT="${YELLOW}Disabled${NC}"
        local CF_TOKEN="${RED}Not Configured${NC}"

        if command -v cloudflared &>/dev/null; then
            CF_INSTALL="${GREEN}Installed${NC}"
        fi
        if systemctl is-active --quiet cloudflared 2>/dev/null; then
            CF_SVC="${GREEN}Running${NC}"
        fi
        if systemctl is-enabled --quiet cloudflared 2>/dev/null; then
            CF_BOOT="${GREEN}Enabled${NC}"
        fi
        if [ -f /etc/cloudflared/token ]; then
            CF_TOKEN="${GREEN}Configured${NC}"
        fi

        print_banner
        echo -e "  ${BOLD}${CYAN}CLOUDFLARE TUNNEL${NC}\n"
        log_divider
        echo ""
        printf "    %-16s : %b\n" "Installation" "$CF_INSTALL"
        printf "    %-16s : %b\n" "Service" "$CF_SVC"
        printf "    %-16s : %b\n" "Auto Startup" "$CF_BOOT"
        printf "    %-16s : %b\n" "Token" "$CF_TOKEN"
        echo ""
        log_divider
        echo ""
        echo -e "    ${BOLD}[1]${NC} Check Status"
        echo -e "    ${BOLD}[2]${NC} Reconnect Tunnel"
        echo -e "    ${BOLD}[0]${NC} Back to Main Menu"
        echo ""
        log_divider
        echo -ne "  Choose an option [0-2]: "
        read -r CF_OPTION

        case "$CF_OPTION" in
            1)
                cf_check_status
                echo ""
                read -p "  Press Enter to continue..."
                ;;
            2)
                CF_RETURN_MAIN=0
                cf_reconnect_tunnel
                echo ""
                if [ "${CF_RETURN_MAIN:-0}" = "1" ]; then
                    CF_RETURN_MAIN=0
                    return 0
                fi
                read -p "  Press Enter to continue..."
                ;;
            0)
                return 0
                ;;
            *)
                log_error "Invalid selection. Please choose 0, 1 or 2."
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
        echo -e "    ${BOLD}[0]${NC} Back to Main Menu"
        echo ""
        log_divider
        echo -ne "  Choose an option [0-2]: "
        read -r CF_EX_CHOICE
        case "$CF_EX_CHOICE" in
            1)
                show_cloudflare_menu
                return 0
                ;;
            2)
                # Proceed to token setup
                ;;
            0)
                return 0
                ;;
            *)
                log_error "Invalid selection. Please choose 0, 1 or 2."
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
    CF_CANCELLED=0
    if ! setup_cloudflare_tunnel; then
        echo ""
        read -p "  Press Enter to return to main menu..."
        return 1
    fi

    if [ "${CF_CANCELLED:-0}" = "1" ]; then
        return 0
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

    # Detect current installation
    PANEL_DIR=$(find_panel_directory)
    if [ -z "$PANEL_DIR" ]; then
        log_error "No zPanel installation found. Please install zPanel first (Option 1)."
        return 1
    fi

    log_info "Detected installation: $PANEL_DIR"

    # Detect current version
    local CURRENT_VERSION="unknown"
    if [ -f "$PANEL_DIR/package.json" ]; then
        CURRENT_VERSION=$(grep -o '"version": *"[^"]*"' "$PANEL_DIR/package.json" 2>/dev/null | head -1 | cut -d'"' -f4)
    fi
    log_info "Current version: $CURRENT_VERSION"

    # Create backup
    local BACKUP_TIME
    BACKUP_TIME=$(date +%Y%m%d_%H%M%S)
    local BACKUP_DIR="/tmp/zpanel_backup_${BACKUP_TIME}"
    mkdir -p "$BACKUP_DIR"

    log_step "Backing up configuration and data before update..."
    [ -f "$PANEL_DIR/.env" ] && cp "$PANEL_DIR/.env" "$BACKUP_DIR/.env"
    [ -d "$PANEL_DIR/.data" ] && cp -r "$PANEL_DIR/.data" "$BACKUP_DIR/.data"
    [ -f "$PANEL_DIR/package.json" ] && cp "$PANEL_DIR/package.json" "$BACKUP_DIR/package.json"
    [ -f "$PANEL_DIR/ecosystem.config.cjs" ] && cp "$PANEL_DIR/ecosystem.config.cjs" "$BACKUP_DIR/ecosystem.config.cjs"
    # Backup server data
    if [ -d "$PANEL_DIR/.data/servers" ]; then
        cp -r "$PANEL_DIR/.data/servers" "$BACKUP_DIR/servers" 2>/dev/null || true
    fi
    log_success "Backup saved to $BACKUP_DIR"

    cd "$PANEL_DIR" || { log_error "Failed to enter directory $PANEL_DIR"; return 1; }

    # Stop panel before update
    log_step "Stopping zPanel before update..."
    if command -v pm2 &>/dev/null; then
        pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
        pm2 save 2>/dev/null || true
        log_success "zPanel stopped."
    fi

    # Fetch latest version
    log_step "Fetching latest version from repository..."
    git stash 2>/dev/null || true
    if ! git pull --ff-only; then
        log_error "git pull failed. Restoring from backup..."
        # Rollback
        [ -f "$BACKUP_DIR/.env" ] && cp "$BACKUP_DIR/.env" "$PANEL_DIR/.env"
        [ -d "$BACKUP_DIR/.data" ] && cp -r "$BACKUP_DIR/.data" "$PANEL_DIR/"
        [ -f "$BACKUP_DIR/package.json" ] && cp "$BACKUP_DIR/package.json" "$PANEL_DIR/package.json"
        if command -v pm2 &>/dev/null; then
            pm2 start "$PANEL_DIR/ecosystem.config.cjs" 2>/dev/null || true
            pm2 save 2>/dev/null || true
        fi
        log_error "Update rolled back. Backup is at $BACKUP_DIR"
        return 1
    fi

    # Restore preserved files (never overwrite user config with defaults)
    [ -f "$BACKUP_DIR/.env" ] && cp "$BACKUP_DIR/.env" "$PANEL_DIR/.env"
    [ -d "$BACKUP_DIR/.data" ] && cp -r "$BACKUP_DIR/.data" "$PANEL_DIR/"
    [ -d "$BACKUP_DIR/servers" ] && cp -r "$BACKUP_DIR/servers" "$PANEL_DIR/.data/servers" 2>/dev/null || true

    # Install dependencies and rebuild
    log_step "Updating dependencies and rebuilding..."
    if ! npm install; then
        log_error "npm install failed. Rolling back..."
        rollback_update "$PANEL_DIR" "$BACKUP_DIR"
        return 1
    fi
    if ! npm run build; then
        log_error "Build failed. Rolling back..."
        rollback_update "$PANEL_DIR" "$BACKUP_DIR"
        return 1
    fi

    # Restart PM2
    log_step "Restarting PM2 process..."
    if command -v pm2 &>/dev/null; then
        pm2 restart "$PM2_APP_NAME" 2>/dev/null || pm2 start ecosystem.config.cjs 2>/dev/null || true
        pm2 save 2>/dev/null || true
    fi

    # Health check
    log_step "Verifying panel is responding after update..."
    if check_panel_health "$PANEL_PORT"; then
        log_success "Update completed successfully! zPanel is active on port $PANEL_PORT."
        rm -rf "$BACKUP_DIR"
    else
        log_warning "Update completed but panel may still be loading. Check: pm2 logs zpanel"
        log_info "Backup preserved at $BACKUP_DIR in case rollback is needed."
    fi
}

# Rollback helper for update failures
rollback_update() {
    local panel_dir="$1"
    local backup_dir="$2"
    log_step "Rolling back to previous version..."
    [ -f "$backup_dir/.env" ] && cp "$backup_dir/.env" "$panel_dir/.env"
    [ -d "$backup_dir/.data" ] && cp -r "$backup_dir/.data" "$panel_dir/"
    if command -v pm2 &>/dev/null; then
        pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
        pm2 start "$panel_dir/ecosystem.config.cjs" 2>/dev/null || true
        pm2 save 2>/dev/null || true
    fi
    log_warning "Rollback complete. Backup is at $backup_dir"
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
#  [6] UNINSTALL zPanel (Complete Removal)
# ─────────────────────────────────────────────
uninstall_zpanel() {
    print_banner
    echo -e "  ${BOLD}${RED}UNINSTALL zPanel${NC}\n"
    log_divider

    # ── Step 1: Detect the real zPanel installation directory ──
    PANEL_DIR=""
    if [ -f "./package.json" ] && [ -f "./server.ts" ]; then
        PANEL_DIR="$(pwd)"
    elif [ -d "$DEFAULT_INSTALL_DIR" ] && [ -f "$DEFAULT_INSTALL_DIR/package.json" ]; then
        PANEL_DIR="$DEFAULT_INSTALL_DIR"
    elif [ -d "$HOME/zpanel" ] && [ -f "$HOME/zpanel/package.json" ]; then
        PANEL_DIR="$HOME/zpanel"
    elif [ -d "./zPanel" ] && [ -f "./zPanel/package.json" ]; then
        PANEL_DIR="$(pwd)/zPanel"
    fi

    if [ -z "$PANEL_DIR" ]; then
        log_error "zPanel installation was not found. Nothing to uninstall."
        return 1
    fi

    # ── Safety: verify this is genuinely a zPanel install ──
    if [ ! -f "$PANEL_DIR/package.json" ]; then
        log_error "Cannot verify zPanel at $PANEL_DIR (no package.json). Refusing to delete an unverified path."
        return 1
    fi
    IS_ZPANEL=0
    if grep -qiE "zpanel" "$PANEL_DIR/package.json" 2>/dev/null; then
        IS_ZPANEL=1
    fi
    if [ -f "$PANEL_DIR/server.ts" ] || [ -f "$PANEL_DIR/server.js" ]; then
        IS_ZPANEL=1
    fi
    if [ "$IS_ZPANEL" -eq 0 ]; then
        log_error "Path $PANEL_DIR does not appear to be a zPanel installation. Refusing to delete."
        return 1
    fi

    log_info "Verified zPanel installation at: ${BOLD}$PANEL_DIR${NC}"

    # ── Step 2: Pre-uninstall inspection ──
    echo ""
    log_step "Inspecting zPanel installation..."

    # Detect panel config files
    PANEL_CONFIG_FILES=""
    [ -f "$PANEL_DIR/.env" ] && PANEL_CONFIG_FILES="$PANEL_CONFIG_FILES $PANEL_DIR/.env"
    [ -f "$PANEL_DIR/ecosystem.config.cjs" ] && PANEL_CONFIG_FILES="$PANEL_CONFIG_FILES $PANEL_DIR/ecosystem.config.cjs"
    [ -f "$PANEL_DIR/package.json" ] && PANEL_CONFIG_FILES="$PANEL_CONFIG_FILES $PANEL_DIR/package.json"

    # Detect zPanel-owned database files
    PANEL_DB_FILES=""
    if [ -d "$PANEL_DIR/.data" ]; then PANEL_DB_FILES="$PANEL_DB_FILES $PANEL_DIR/.data"; fi
    if [ -d "$PANEL_DIR/database" ]; then PANEL_DB_FILES="$PANEL_DB_FILES $PANEL_DIR/database"; fi
    for db in "$PANEL_DIR"/*.db "$PANEL_DIR"/*.sqlite "$PANEL_DIR"/*.sqlite3 "$PANEL_DIR/database.db" "$PANEL_DIR/panel.db"; do
        [ -f "$db" ] && PANEL_DB_FILES="$PANEL_DB_FILES $db"
    done

    # Detect zPanel-owned systemd services
    PANEL_SYSTEMD_SVC=""
    if [ -f /etc/systemd/system/zpanel.service ]; then
        PANEL_SYSTEMD_SVC="zpanel"
    elif systemctl list-unit-files 2>/dev/null | grep -qE "^zpanel\.service"; then
        PANEL_SYSTEMD_SVC="zpanel"
    fi

    # Detect Nova tunnel service (panel-owned temporary tunnel)
    NOVA_TUNNEL_SVC=""
    if [ -f /etc/systemd/system/nova-tunnel.service ]; then
        NOVA_TUNNEL_SVC="nova-tunnel"
    elif systemctl list-unit-files 2>/dev/null | grep -qE "^nova-tunnel\.service"; then
        NOVA_TUNNEL_SVC="nova-tunnel"
    fi

    # Detect zPanel-specific reverse-proxy configs
    PANEL_PROXY_CONF=""
    for conf in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/* /etc/apache2/sites-enabled/* /etc/httpd/conf.d/*; do
        [ -f "$conf" ] || continue
        if grep -qE "zpanel|6767|$PANEL_DIR" "$conf" 2>/dev/null; then
            PANEL_PROXY_CONF="$PANEL_PROXY_CONF $conf"
        fi
    done

    # Detect PM2 process
    PANEL_PM2_RUNNING=0
    if command -v pm2 &>/dev/null && pm2 list 2>/dev/null | grep -q "$PM2_APP_NAME"; then
        PANEL_PM2_RUNNING=1
    fi

    # Detect Docker containers
    DOCKER_CONTAINERS=""
    if command -v docker &>/dev/null; then
        for cname in zpanel zpanel-app zpanel-server; do
            if $SUDO docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^${cname}$"; then
                DOCKER_CONTAINERS="$DOCKER_CONTAINERS $cname"
            fi
        done
    fi

    # Detect server data directories
    SERVER_DATA_DIRS=""
    if [ -d "$PANEL_DIR/.data/servers" ]; then
        for sdir in "$PANEL_DIR/.data/servers"/*/; do
            [ -d "$sdir" ] && SERVER_DATA_DIRS="$SERVER_DATA_DIRS $sdir"
        done
    fi

    # Cloudflare Tunnel preservation check
    CF_TUNNEL_PRESENT=0
    if [ -d /etc/cloudflared ] || command -v cloudflared &>/dev/null || [ -f /etc/systemd/system/cloudflared.service ]; then
        CF_TUNNEL_PRESENT=1
    fi

    # ── Display inspection summary ──
    echo ""
    echo -e "  ${CYAN}${BOLD}DETECTED RESOURCES:${NC}"
    echo -e "    Installation directory: ${BOLD}$PANEL_DIR${NC}"
    echo -e "    Panel config files: $([ -n "$PANEL_CONFIG_FILES" ] && echo "$PANEL_CONFIG_FILES" || echo "none found")"
    echo -e "    Panel data/database: $([ -n "$PANEL_DB_FILES" ] && echo "$PANEL_DB_FILES" || echo "none found")"
    echo -e "    PM2 process '$PM2_APP_NAME': $([ "$PANEL_PM2_RUNNING" = "1" ] && echo "running" || echo "not running")"
    echo -e "    Systemd service: ${PANEL_SYSTEMD_SVC:-none}"
    echo -e "    Nova tunnel service: ${NOVA_TUNNEL_SVC:-none}"
    echo -e "    Nginx/Apache proxy configs: $([ -n "$PANEL_PROXY_CONF" ] && echo "$PANEL_PROXY_CONF" || echo "none found")"
    echo -e "    Docker containers: ${DOCKER_CONTAINERS:-none}"
    echo -e "    Server data directories: $([ -n "$SERVER_DATA_DIRS" ] && echo "$SERVER_DATA_DIRS" || echo "none found")"
    echo -e "    Cloudflare Tunnel: $([ "$CF_TUNNEL_PRESENT" = "1" ] && echo "PRESENT - WILL BE PRESERVED" || echo "not detected")"
    echo ""

    # ── Uninstall mode selection ──
    echo -e "  ${BOLD}${YELLOW}SELECT UNINSTALL SCOPE:${NC}"
    echo -e "    ${BOLD}[1]${NC} Remove zPanel application only (safest - default)"
    echo -e "    ${BOLD}[2]${NC} Remove zPanel application and its database"
    echo -e "    ${BOLD}[3]${NC} Remove zPanel application, database, and panel-managed server data"
    echo -e "    ${BOLD}[4]${NC} Cancel and return to installer menu"
    echo ""
    echo -ne "  Choose an option [1-4]: "
    read -r UNINSTALL_MODE

    case "$UNINSTALL_MODE" in
        1) UNINSTALL_MODE="app_only" ;;
        2) UNINSTALL_MODE="app_and_db" ;;
        3) UNINSTALL_MODE="app_db_and_servers" ;;
        4)
            log_info "Uninstall cancelled."
            return 0
            ;;
        *)
            log_error "Invalid selection. Uninstall cancelled."
            return 1
            ;;
    esac

    # ── Step 3: Strong confirmation ──
    echo ""
    echo -e "  ${RED}${BOLD}⚠  FINAL CONFIRMATION REQUIRED${NC}"
    echo -e "  ${RED}This action is IRREVERSIBLE.${NC}"
    echo -e "  ${RED}Selected scope: $UNINSTALL_MODE${NC}"
    echo ""
    echo -e "  ${YELLOW}Will be PRESERVED regardless of scope:${NC}"
    echo -e "    • Cloudflare Tunnel (/etc/cloudflared/, cloudflared.service, credentials)"
    echo -e "    • Shared Node.js, PM2, Docker, Java, and other system dependencies"
    echo -e "    • Ubuntu, SSH, and network configuration"
    echo -e "    • Unrelated applications, databases, and websites"
    echo ""
    echo -e "  Type exactly: ${BOLD}UNINSTALL ZPANEL${NC}"
    echo -e "  (Any other input cancels the operation.)"
    echo ""
    echo -ne "  Confirmation phrase: "
    read -r CONFIRM_PHRASE

    if [ "$CONFIRM_PHRASE" != "UNINSTALL ZPANEL" ]; then
        log_info "Confirmation phrase did not match. Uninstall cancelled."
        return 0
    fi

    # For modes that delete data, require a second confirmation
    if [ "$UNINSTALL_MODE" = "app_and_db" ] || [ "$UNINSTALL_MODE" = "app_db_and_servers" ]; then
        if [ -n "$PANEL_DB_FILES" ]; then
            echo ""
            echo -e "  ${RED}${BOLD}⚠  DATABASE CONFIRMATION${NC}"
            echo -e "  ${RED}The following database/data will be permanently destroyed:${NC}$PANEL_DB_FILES"
            echo -e "  Type exactly: ${BOLD}DELETE DATABASE${NC}"
            echo ""
            echo -ne "  Database confirmation: "
            read -r CONFIRM_DB
            if [ "$CONFIRM_DB" != "DELETE DATABASE" ]; then
                log_info "Database confirmation did not match. Proceeding with application-only removal."
                UNINSTALL_MODE="app_only"
            fi
        fi
    fi

    if [ "$UNINSTALL_MODE" = "app_db_and_servers" ]; then
        if [ -n "$SERVER_DATA_DIRS" ]; then
            echo ""
            echo -e "  ${RED}${BOLD}⚠  SERVER DATA CONFIRMATION${NC}"
            echo -e "  ${RED}The following Minecraft server data will be permanently destroyed:${NC}$SERVER_DATA_DIRS"
            echo -e "  This includes worlds, plugins, configurations, and backups."
            echo -e "  Type exactly: ${BOLD}DELETE SERVER DATA${NC}"
            echo ""
            echo -ne "  Server data confirmation: "
            read -r CONFIRM_SVR
            if [ "$CONFIRM_SVR" != "DELETE SERVER DATA" ]; then
                log_info "Server data confirmation did not match. Proceeding without server data removal."
                if [ "$UNINSTALL_MODE" = "app_db_and_servers" ]; then
                    UNINSTALL_MODE="app_and_db"
                fi
            fi
        fi
    fi

    # ── Step 4: Stop panel processes safely ──
    echo ""
    log_step "Stopping zPanel services..."

    if [ "$PANEL_PM2_RUNNING" = "1" ] && command -v pm2 &>/dev/null; then
        log_info "Stopping PM2 process '$PM2_APP_NAME'..."
        pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
        sleep 2
        # Verify stopped
        if pm2 list 2>/dev/null | grep -q "$PM2_APP_NAME"; then
            log_warning "PM2 process still running. Forcing termination..."
            pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
        fi
        pm2 save 2>/dev/null || true
        log_success "PM2 process '$PM2_APP_NAME' stopped."
    else
        log_info "PM2 process '$PM2_APP_NAME' not running or PM2 not found."
    fi

    # ── Step 5: Remove zPanel-specific systemd service ──
    if [ -n "$PANEL_SYSTEMD_SVC" ]; then
        log_step "Removing zPanel systemd service '$PANEL_SYSTEMD_SVC'..."
        $SUDO systemctl stop "$PANEL_SYSTEMD_SVC" 2>/dev/null || true
        $SUDO systemctl disable "$PANEL_SYSTEMD_SVC" 2>/dev/null || true
        $SUDO rm -f "/etc/systemd/system/$PANEL_SYSTEMD_SVC.service" 2>/dev/null || true
        $SUDO systemctl daemon-reload 2>/dev/null || true
        log_success "zPanel systemd service removed."
    fi

    # ── Step 6: Remove Nova tunnel service (only if confirmed panel-owned) ──
    if [ -n "$NOVA_TUNNEL_SVC" ]; then
        log_step "Removing Nova tunnel service '$NOVA_TUNNEL_SVC'..."
        $SUDO systemctl stop "$NOVA_TUNNEL_SVC" 2>/dev/null || true
        $SUDO systemctl disable "$NOVA_TUNNEL_SVC" 2>/dev/null || true
        $SUDO rm -f "/etc/systemd/system/$NOVA_TUNNEL_SVC.service" 2>/dev/null || true
        $SUDO systemctl daemon-reload 2>/dev/null || true
        log_success "Nova tunnel service removed."
    fi

    # ── Step 7: Remove zPanel-specific reverse-proxy configs ──
    if [ -n "$PANEL_PROXY_CONF" ]; then
        log_step "Removing zPanel reverse-proxy configurations..."
        for conf in $PANEL_PROXY_CONF; do
            $SUDO rm -f "$conf" 2>/dev/null || true
        done
        # Also remove enabled symlinks
        for conf in $PANEL_PROXY_CONF; do
            local conf_name
            conf_name=$(basename "$conf")
            # Remove symlink from sites-enabled if it points to sites-available
            if [ -L "/etc/nginx/sites-enabled/$conf_name" ]; then
                $SUDO rm -f "/etc/nginx/sites-enabled/$conf_name" 2>/dev/null || true
            fi
        done
        if command -v nginx &>/dev/null; then
            if $SUDO nginx -t 2>/dev/null; then
                $SUDO systemctl reload nginx 2>/dev/null || true
                log_success "Nginx configuration reloaded."
            else
                log_warning "Nginx configuration test failed. Nginx not reloaded."
            fi
        fi
        log_success "zPanel reverse-proxy configurations removed."
    fi

    # ── Step 8: Remove PM2 startup hook ──
    if command -v pm2 &>/dev/null; then
        log_step "Removing PM2 startup hook..."
        pm2 unstartup 2>/dev/null || true
        pm2 save 2>/dev/null || true
        log_success "PM2 startup hook removed."
    fi

    # ── Step 9: Remove application files ──
    log_step "Removing zPanel application files from $PANEL_DIR..."
    if [ -d "$PANEL_DIR" ]; then
        $SUDO rm -rf "$PANEL_DIR"
        log_success "Panel directory removed."
    fi

    # ── Step 10: Remove database (mode 2 and 3) ──
    if [ "$UNINSTALL_MODE" = "app_and_db" ] || [ "$UNINSTALL_MODE" = "app_db_and_servers" ]; then
        if [ -n "$PANEL_DB_FILES" ]; then
            log_step "Removing zPanel database and panel data..."
            for item in $PANEL_DB_FILES; do
                if [ -e "$item" ]; then
                    $SUDO rm -rf "$item" 2>/dev/null || true
                fi
            done
            log_success "Panel database and data removed."
        fi
    fi

    # ── Step 11: Remove server data (mode 3 only) ──
    if [ "$UNINSTALL_MODE" = "app_db_and_servers" ]; then
        if [ -n "$SERVER_DATA_DIRS" ]; then
            log_step "Removing panel-managed server data..."
            for sdir in $SERVER_DATA_DIRS; do
                if [ -d "$sdir" ]; then
                    $SUDO rm -rf "$sdir" 2>/dev/null || true
                fi
            done
            log_success "Panel-managed server data removed."
        fi
    fi

    # ── Step 12: Remove Docker containers (zPanel-owned only) ──
    if command -v docker &>/dev/null && [ -n "$DOCKER_CONTAINERS" ]; then
        log_step "Removing zPanel-owned Docker containers..."
        for cname in $DOCKER_CONTAINERS; do
            $SUDO docker rm -f "$cname" 2>/dev/null || true
        done
        log_success "zPanel Docker containers removed."
    fi

    # ── Step 13: Clean up temporary installation files ──
    log_step "Cleaning up temporary installation files..."
    $SUDO rm -rf /tmp/zpanel* /tmp/node22.tar.xz /tmp/jdk25.tar.gz /tmp/zpanel_node_install 2>/dev/null || true
    log_success "Temporary files cleaned."

    # ── Step 14: Verify removal ──
    echo ""
    log_step "Verifying uninstallation..."
    VERIFY_OK=1
    if [ -d "$PANEL_DIR" ]; then
        log_error "Panel directory still exists at $PANEL_DIR"
        VERIFY_OK=0
    fi
    if command -v pm2 &>/dev/null && pm2 list 2>/dev/null | grep -q "$PM2_APP_NAME"; then
        log_error "PM2 process '$PM2_APP_NAME' still running."
        VERIFY_OK=0
    fi
    if [ -n "$PANEL_SYSTEMD_SVC" ] && systemctl list-unit-files 2>/dev/null | grep -qE "^$PANEL_SYSTEMD_SVC\.service"; then
        log_error "zPanel systemd service still present."
        VERIFY_OK=0
    fi

    log_divider
    if [ "$VERIFY_OK" -eq 1 ]; then
        echo -e "  ${GREEN}${BOLD}✔ zPanel has been completely uninstalled.${NC}"
    else
        echo -e "  ${YELLOW}${BOLD}⚠ Uninstallation completed with warnings. Some items may remain.${NC}"
    fi
    echo ""
    echo -e "  ${BOLD}Cloudflare Tunnel was NOT touched and remains operational.${NC}"
    echo -e "  ${BOLD}SSH, networking, and unrelated services remain intact.${NC}"
    echo ""
}

# ─────────────────────────────────────────────
#  MAIN INTERACTIVE MENU LOOP (0-6)
# ─────────────────────────────────────────────
while true; do
    print_banner
    echo -e "  ${BOLD}zPanel MANAGEMENT & INSTALLER${NC}"
    echo ""
    echo -e "    ${BOLD}[1]${NC} Install Panel (Node.js Only)"
    echo -e "    ${BOLD}[2]${NC} Install Panel (Node.js + Docker Support)"
    echo -e "    ${BOLD}[3]${NC} Install Panel (Development Mode)"
    echo -e "    ${BOLD}[4]${NC} Update Panel"
    echo -e "    ${BOLD}[5]${NC} Cloudflare Tunnel"
    echo -e "    ${BOLD}[6]${NC} Create Admin User"
    echo -e "    ${BOLD}[7]${NC} Restart Panel"
    echo -e "    ${BOLD}${RED}[8]${NC} ${RED}Uninstall Panel${NC}"
    echo -e "    ${BOLD}[0]${NC} Exit"
    echo ""
    log_divider
    echo -e "  \c"
    read -p "Choose an option [0-8]: " MAIN_CHOICE

    case "$MAIN_CHOICE" in
        1)
            install_zpanel "nodejs"
            echo ""
            read -p "  Press Enter to return to main menu..."
            ;;
        2)
            install_zpanel "docker"
            echo ""
            read -p "  Press Enter to return to main menu..."
            ;;
        3)
            install_zpanel "dev"
            echo ""
            read -p "  Press Enter to return to main menu..."
            ;;
        4)
            update_zpanel
            echo ""
            read -p "  Press Enter to return to main menu..."
            ;;
        5)
            cloudflare_tunnel_option
            ;;
        6)
            create_admin_user
            echo ""
            read -p "  Press Enter to return to main menu..."
            ;;
        7)
            restart_zpanel
            echo ""
            read -p "  Press Enter to return to main menu..."
            ;;
        8)
            uninstall_zpanel
            echo ""
            read -p "  Press Enter to return to main menu..."
            ;;
        0)
            echo ""
            echo -e "  ${CYAN}Exiting zPanel installer. Have a great day!${NC}\n"
            exit 0
            ;;
        *)
            log_error "Invalid selection '$MAIN_CHOICE'. Please choose between 0 and 8."
            sleep 1
            ;;
    esac
done
