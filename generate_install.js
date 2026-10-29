const fs = require('fs');

let installSh = fs.readFileSync('install.sh', 'utf8');

const installPanelReplacement = `
install_panel() {
    local INSTALL_MODE=\$1
    print_banner
    
    if [ "\$INSTALL_MODE" = "node" ]; then
        echo -e "\${BOLD}--- [1] Install Panel (Node.js Only) ---\${NC}\n"
    elif [ "\$INSTALL_MODE" = "docker" ]; then
        echo -e "\${BOLD}--- [2] Install Panel (Node.js + Docker) ---\${NC}\n"
    elif [ "\$INSTALL_MODE" = "dev" ]; then
        echo -e "\${BOLD}--- [3] Install Panel (Dev Mode) ---\${NC}\n"
    fi

    check_root
    log_info "Checking system environment and repairing package manager if needed..."

    # Auto-repair broken dpkg / apt state if apt exists
    if command -v apt-get &> /dev/null; then
        sudo dpkg --configure -a 2>/dev/null || true
        sudo apt-get install -f -y 2>/dev/null || true
        sudo apt-get update -y || true
        sudo apt-get install -y curl git build-essential ca-certificates tar xz-utils || log_warning "Some system packages failed to install, continuing..."
    elif command -v yum &> /dev/null; then
        sudo yum update -y || true
        sudo yum install -y curl git make gcc-c++ ca-certificates tar xz || log_warning "Some system packages failed to install, continuing..."
    fi

    # Ensure Node.js is installed and version is >= 22 (or >= 20.19)
    NEED_NODE_UPGRADE=0
    if ! command -v node &> /dev/null; then
        NEED_NODE_UPGRADE=1
    else
        NODE_MAJOR=\$(node -v | cut -d'.' -f1 | tr -d 'v')
        NODE_MINOR=\$(node -v | cut -d'.' -f2)
        if [ "\$NODE_MAJOR" -lt 22 ]; then
            if [ "\$NODE_MAJOR" -lt 20 ] || [ "\$NODE_MINOR" -lt 19 ]; then
                NEED_NODE_UPGRADE=1
            fi
        fi
    fi

    if [ "\$NEED_NODE_UPGRADE" -eq 1 ]; then
        log_info "Installing / Upgrading to Node.js 22.x..."
        
        if command -v apt-get &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - 2>/dev/null || true
            sudo apt-get install -y nodejs 2>/dev/null || true
        fi

        CURRENT_NODE_MAJOR=0
        if command -v node &> /dev/null; then
            CURRENT_NODE_MAJOR=\$(node -v | cut -d'.' -f1 | tr -d 'v')
        fi

        if [ "\$CURRENT_NODE_MAJOR" -lt 22 ]; then
            log_info "Installing Node.js 22.13.1 directly from binary tarball..."
            ARCH=\$(uname -m)
            case "\$ARCH" in
                x86_64) NODE_ARCH="x64" ;;
                aarch64) NODE_ARCH="arm64" ;;
                armv7l) NODE_ARCH="armv7l" ;;
                *) NODE_ARCH="x64" ;;
            esac
            
            NODE_DIST="node-v22.13.1-linux-\${NODE_ARCH}"
            curl -fsSL "https://nodejs.org/dist/v22.13.1/\${NODE_DIST}.tar.xz" -o /tmp/node22.tar.xz || true
            if [ -f "/tmp/node22.tar.xz" ]; then
                sudo tar -xJf /tmp/node22.tar.xz -C /usr/local --strip-components=1 2>/dev/null || tar -xJf /tmp/node22.tar.xz -C /usr/local --strip-components=1 2>/dev/null || true
                rm -f /tmp/node22.tar.xz
            fi
        fi
    fi

    if command -v node &> /dev/null; then
        log_success "Node.js \$(node -v) is ready."
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

    # Docker Setup
    if [ "\$INSTALL_MODE" = "docker" ]; then
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

    log_info "Downloading and setting up the JTG Panel..."
    
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
    
    cd "\$WORK_DIR" || { log_error "Failed to enter the directory!"; return; }
    
    log_info "Setting up .env file..."
    if [ "\$INSTALL_MODE" = "dev" ]; then
        echo "PORT=3000" > .env
        echo "ENABLE_DOCKER=false" >> .env
        echo "VITE_ENABLE_DEV_MODE=true" >> .env
    elif [ "\$INSTALL_MODE" = "docker" ]; then
        echo "PORT=6767" > .env
        echo "ENABLE_DOCKER=true" >> .env
    else
        echo "PORT=6767" > .env
        echo "ENABLE_DOCKER=false" >> .env
    fi
    echo "JWT_SECRET=\$(head -c 32 /dev/urandom | base64)" >> .env
    
    # Ensure ecosystem.config.cjs exists for PM2
    if [ "\$INSTALL_MODE" = "dev" ]; then
        log_info "Creating PM2 ecosystem file for dev mode..."
cat << 'EOF' > ecosystem.config.cjs
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
