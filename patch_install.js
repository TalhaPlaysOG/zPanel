const fs = require('fs');
let content = fs.readFileSync('install.sh', 'utf8');

// Replace the line that unconditionally installs java
content = content.replace(
  /sudo apt-get install -y curl git build-essential ca-certificates tar xz-utils openjdk-21-jre-headless/,
  `sudo apt-get install -y curl git build-essential ca-certificates tar xz-utils

        # Optional Java Installation
        echo -e "\n\${CYAN}Would you like to install Java (openjdk-21-jre-headless) for local Minecraft servers? (y/n)\${NC}"
        read -r INSTALL_JAVA
        if [[ "\$INSTALL_JAVA" =~ ^[Yy]$ ]]; then
            log_info "Installing Java..."
            sudo apt-get install -y openjdk-21-jre-headless || log_warning "Failed to install Java, continuing..."
        else
            log_info "Skipping Java installation."
        fi`
);

fs.writeFileSync('install.sh', content);
