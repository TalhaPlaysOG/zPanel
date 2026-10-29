#!/bin/bash

# =========================================================
# zPanel - Automated Installation & Management Script
# Repository: https://github.com/JishnuTheGamer/Jtg
# =========================================================

set -e

# Colors for UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_banner() {
    clear
    echo -e "${CYAN}${BOLD}"
    echo "  ========================================================"
    echo "   _____ _____ _____   _____                  _           "
    echo "  |_   _|_   _/ ____| |  __ \                | |          "
    echo "    | |   | | | |  __ | |__) |__ _ n  ___| |          "
    echo "    | |   | | | | |_ ||  ___/ _ \ ' \/ _ \ |          "
    echo "   _| |_  | | | |__| || |  |  __/ | | |  __/ |          "
    echo "  |_____| |_|  \____||_|   \___|_| |_|\___|_|          "
    echo "                                                          "
    echo "            zPanel MANAGEMENT & INSTALLER                 "
    echo "            Main Panel Default Port: 6767                 "
    echo "  ========================================================"
    echo -e "${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_warning "This script is recommended to be run as root or with sudo."
    fi
}

install_panel() {
    local INSTALL_MODE=$1
    print_banner
    
    if [ "$INSTALL_MODE" = "node" ]; then
        echo -e "${BOLD}--- [1] Install Panel (Node.js Only) ---${NC}\n"
    elif [ "$INSTALL_MODE" = "docker" ]; then
        echo -e "${BOLD}--- [2] Install Panel (Node.js + Docker) ---${NC}\n"
    elif [ "$INSTALL_MODE" = "dev" ]; then
        echo -e "${BOLD}--- [3] Install Panel (Dev Mode) ---${NC}\n"
    fi

    check_root
    log_info "Checking system environment and repairing package manager if needed..."

    # Auto-repair broken dpkg / apt state if apt exists
    if command -v apt-get &> /dev/null; then
        sudo dpkg --configure -a 2>/dev/null || true
        sudo apt-get install -f -y 2>/dev/null || true
        sudo apt-get update -y || true
        sudo apt-get install -y curl git build-essential ca-certificates tar xz-utils || log_warning "Some system packages failed to install, continuing..."

        # Optional Java Installation
        echo -e "\n${CYAN}Would you like to install Java (openjdk-21-jre-headless) for local Minecraft servers? (y/n)${NC}"
        read -r INSTALL_JAVA
        if [[ "$INSTALL_JAVA" =~ ^[Yy]$ ]]; then
            log_info "Installing Java..."
            sudo apt-get install -y openjdk-21-jre-headless || log_warning "Failed to install Java, continuing..."
        else
            log_info "Skipping Java installation."
        fi
    elif command -v yum &> /dev/null; then
        sudo yum update -y || true
        sudo yum install -y curl git make gcc-c++ ca-certificates tar xz || log_warning "Some system packages failed to install, continuing..."
    fi

    # Ensure Node.js is installed and version is >= 22 (or >= 20.19)
    NEED_NODE_UPGRADE=0
    if ! command -v node &> /dev/null; then
        NEED_NODE_UPGRADE=1
    else
        NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
        NODE_MINOR=$(node -v | cut -d'.' -f2)
        if [ "$NODE_MAJOR" -lt 22 ]; then
            if [ "$NODE_MAJOR" -lt 20 ] || [ "$NODE_MINOR" -lt 19 ]; then
                NEED_NODE_UPGRADE=1
            fi
        fi
    fi

    if [ "$NEED_NODE_UPGRADE" -eq 1 ]; then
        log_info "Installing / Upgrading to Node.js 22.x..."
        
        # Try Nodesource first
        if command -v apt-get &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - 2>/dev/null || true
            sudo apt-get install -y nodejs 2>/dev/null || true
        fi

        
    # Install Java for Local Runtime support
    log_info "Installing OpenJDK 21 for Local Server support..."
    export DEBIAN_FRONTEND=noninteractive
    sudo apt-get update -y || apt-get update -y
    sudo apt-get install -y openjdk-21-jre-headless || apt-get install -y openjdk-21-jre-headless || log_error "Failed to install Java. Local servers may not work."

    # Check if node upgraded properly
        CURRENT_NODE_MAJOR=0
        if command -v node &> /dev/null; then
            CURRENT_NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
        fi

        # Fallback to direct Node.js v22 binary installation if apt/nodesource failed
        if [ "$CURRENT_NODE_MAJOR" -lt 22 ]; then
            log_info "Installing Node.js 22.13.1 directly from binary tarball..."
            ARCH=$(uname -m)
            case "$ARCH" in
                x86_64) NODE_ARCH="x64" ;;
                aarch64) NODE_ARCH="arm64" ;;
                armv7l) NODE_ARCH="armv7l" ;;
                *) NODE_ARCH="x64" ;;
            esac
            
            NODE_DIST="node-v22.13.1-linux-${NODE_ARCH}"
            curl -fsSL "https://nodejs.org/dist/v22.13.1/${NODE_DIST}.tar.xz" -o /tmp/node22.tar.xz || true
            if [ -f "/tmp/node22.tar.xz" ]; then
                sudo tar -xJf /tmp/node22.tar.xz -C /usr/local --strip-components=1 2>/dev/null || tar -xJf /tmp/node22.tar.xz -C /usr/local --strip-components=1 2>/dev/null || true
                rm -f /tmp/node22.tar.xz
            fi
        fi
    fi

    if command -v node &> /dev/null; then
        log_success "Node.js $(node -v) is ready."
    else
        log_error "Node.js installation could not be completed automatically."
    fi
    
    # Install PM2 globally
    if ! command -v pm2 &> /dev/null; then
        log_info "Installing PM2 locally and globally..."
        sudo npm install -g pm2 || true
        npm install pm2 -D
    else
        log_success "PM2 is already installed."
    fi



    echo -e "\${YELLOW}Which default runtime mode should the panel use for new servers?\${NC}"
    echo -e "1) Docker (Stable, Recommended)"
    echo -e "2) Local Process (Beta, Uses host networking)"
    read -p "Select [1-2] (default 1): " RUNTIME_CHOICE
    if [ "$RUNTIME_CHOICE" == "2" ]; then
        DEFAULT_RUNTIME="local"
        log_info "Default runtime set to Local Process."
    else
        DEFAULT_RUNTIME="docker"
        log_info "Default runtime set to Docker."
    fi

    # Save to .env
    if grep -q "DEFAULT_RUNTIME=" .env 2>/dev/null; then
        sed -i "s/^DEFAULT_RUNTIME=.*/DEFAULT_RUNTIME=\$DEFAULT_RUNTIME/" .env
    else
        echo "DEFAULT_RUNTIME=\$DEFAULT_RUNTIME" >> .env
    fi

    # Java Setup for Local Process Mode (Beta)
    log_info "Installing Java 21 for Local Process (Beta)..."
    if ! command -v java &> /dev/null; then
        sudo apt update || true
        sudo apt install -y openjdk-21-jre-headless || true
    else
        log_success "Java is already installed."
    fi

    # Verify Java and add to .env
    if command -v java &> /dev/null; then
        JAVA_BIN_PATH=$(which java)
        log_success "Java path detected: $JAVA_BIN_PATH"
        if ! grep -q "JAVA_BIN=" .env 2>/dev/null; then
            echo "JAVA_BIN=$JAVA_BIN_PATH" >> .env
        fi
    else
        log_error "Java installation failed or Java is not in PATH. Local Process mode may not work."
    fi

    # Docker Setup
    if [ "$INSTALL_MODE" = "docker" ]; then
        log_info "Installing Docker..."
        if ! command -v docker &> /dev/null; then
            curl -fsSL https://get.docker.com | sh || true
            if command -v systemctl &> /dev/null; then
                sudo systemctl enable --now docker || true
            fi
        else
            log_success "Docker is already installed."
        fi
    fi

    log_info "Downloading and setting up zPanel..."
    
    # Check if we are already in the Jtg directory
    if [ -f "package.json" ] && grep -q "react-example" "package.json" 2>/dev/null; then
        log_info "Running setup in current directory..."
        WORK_DIR="."
    elif [ -d "Jtg" ]; then
        log_info "The 'Jtg' folder already exists. Running setup inside it..."
        WORK_DIR="Jtg"
    else
        log_info "Cloning from GitHub..."
        git clone https://github.com/JishnuTheGamer/Jtg
        WORK_DIR="Jtg"
    fi
    
    # Navigate into the directory
    cd "$WORK_DIR" || { log_error "Failed to enter the directory!"; return; }
    
    # Ensure .env exists
    log_info "Setting up .env file..."
    if [ "$INSTALL_MODE" = "dev" ]; then
        echo "PORT=3000" > .env
        echo "ENABLE_DOCKER=false" >> .env
        echo "VITE_ENABLE_DEV_MODE=true" >> .env
    elif [ "$INSTALL_MODE" = "docker" ]; then
        echo "PORT=6767" > .env
        echo "ENABLE_DOCKER=true" >> .env
    else
        echo "PORT=6767" > .env
        echo "ENABLE_DOCKER=false" >> .env
    fi
    echo "JWT_SECRET=$(head -c 32 /dev/urandom | base64)" >> .env
    
    # Ensure ecosystem.config.cjs exists for PM2
    if [ "$INSTALL_MODE" = "dev" ]; then
        log_info "Creating PM2 ecosystem file for dev mode..."
cat << 'EOF2' > ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "jtg-panel-dev",
      script: "npm",
      args: "run dev",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        ENABLE_DOCKER: "false"
      }
    }
  ]
};
EOF2
    else
        log_info "Creating PM2 ecosystem file for production mode..."
cat << 'EOF2' > ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "jtg-panel",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 6767,
        ENABLE_DOCKER: process.env.ENABLE_DOCKER || "false"
      }
    }
  ]
};
EOF2
    fi

    log_info "Installing Node.js dependencies..."
    npm i 
    
    if [ "$INSTALL_MODE" != "dev" ]; then
        log_info "Building panel..."
        npm run build
    fi
    
    log_info "Creating admin user..."
    npm run createuser
    
    log_info "Starting panel with PM2..."
    npx pm2 start ecosystem.config.cjs
    npx pm2 save || true
    
    log_success "=========================================="
    log_success " Panel successfully installed and started!"
    if [ "$INSTALL_MODE" = "dev" ]; then
        log_success " Access URL: http://<YOUR-SERVER-IP>:3000"
    else
        log_success " Access URL: http://<YOUR-SERVER-IP>:6767"
    fi
    log_success "=========================================="
    
    # Return to the main directory
    if [ "$WORK_DIR" = "Jtg" ]; then
        cd ..
    fi
}

update_panel() {
    print_banner
    echo -e "${BOLD}--- [4] Update zPanel ---${NC}\n"
    
    if [ -f "package.json" ] && grep -q "react-example" "package.json" 2>/dev/null; then
        WORK_DIR="."
    elif [ -d "Jtg" ]; then
        WORK_DIR="Jtg"
    else
        log_error "'Jtg' directory not found! Please install the panel first."
        return
    fi
    
    cd "$WORK_DIR" || { log_error "Failed to enter the directory!"; return; }
        
    log_info "Fetching updates from GitHub..."
    git stash || true
    git pull
    
    log_info "Installing updated dependencies..."
    npm i 
    
    log_info "Rebuilding panel..."
    npm run build 
    
    log_info "Restarting PM2 process..."
    npx pm2 restart jtg-panel || npx pm2 restart all
    
    log_success "Panel successfully updated and restarted!"
    
    if [ "$WORK_DIR" = "Jtg" ]; then
        cd ..
    fi
}

create_admin_user() {
    print_banner
    echo -e "${BOLD}--- [5] Create Admin User ---${NC}\n"
    
    if [ -f "package.json" ] && grep -q "react-example" "package.json" 2>/dev/null; then
        WORK_DIR="."
    elif [ -d "Jtg" ]; then
        WORK_DIR="Jtg"
    else
        log_error "'Jtg' directory not found!"
        return
    fi
    
    cd "$WORK_DIR" || { log_error "Failed to enter the directory!"; return; }
    
    log_info "Running admin creation script..."
    npm run createuser
    
    if [ "$WORK_DIR" = "Jtg" ]; then
        cd ..
    fi
    log_success "Admin user created!"
}

restart_panel() {
    print_banner
    echo -e "${BOLD}--- [6] Restart zPanel ---${NC}\n"
    
    log_info "Restarting panel..."
    if command -v pm2 &> /dev/null || npx pm2 -v &> /dev/null; then
        npx pm2 restart jtg-panel || npx pm2 restart all
        log_success "Panel restarted successfully!"
    else
        log_error "PM2 is not installed. Panel cannot be restarted via PM2."
    fi
}

# Main menu loop
while true; do
    print_banner
    echo -e "  ${BOLD}1)${NC} Install Panel (Node.js Only - Port 6767)"
    echo -e "  ${BOLD}2)${NC} Install Panel (Node.js + Docker Support - Port 6767)"
    echo -e "  ${BOLD}3)${NC} Install Panel (Development Mode - Port 3000)"
    echo -e "  ${BOLD}4)${NC} Update Panel"
    echo -e "  ${BOLD}5)${NC} Create Admin User"
    echo -e "  ${BOLD}6)${NC} Restart Panel"
    echo -e "  ${BOLD}7)${NC} Exit"
    echo -e "\n========================================================"
    read -p " Choose an option (1-7): " CHOICE

    case "$CHOICE" in
        1)
            install_panel "node"
            read -p "Press Enter to return to main menu..."
            ;;
        2)
            install_panel "docker"
            read -p "Press Enter to return to main menu..."
            ;;
        3)
            install_panel "dev"
            read -p "Press Enter to return to main menu..."
            ;;
        4)
            update_panel
            read -p "Press Enter to return to main menu..."
            ;;
        5)
            create_admin_user
            read -p "Press Enter to return to main menu..."
            ;;
        6)
            restart_panel
            read -p "Press Enter to return to main menu..."
            ;;
        7)
            echo -e "\n${YELLOW}Exiting script... Goodbye!${NC}\n"
            exit 0
            ;;
        *)
            log_error "Invalid option! Please enter 1-7."
            sleep 1.5
            ;;
    esac
done
