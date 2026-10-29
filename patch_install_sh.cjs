const fs = require('fs');
let content = fs.readFileSync('install.sh', 'utf8');

const javaInstallBlock = `
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
`;

content = content.replace(
/    # Docker Setup/m,
javaInstallBlock + "\n    # Docker Setup"
);

fs.writeFileSync('install.sh', content);
