const fs = require('fs');
let content = fs.readFileSync('install.sh', 'utf8');

// Prompt for default runtime
const promptBlock = `
    echo -e "\\\${YELLOW}Which default runtime mode should the panel use for new servers?\\\${NC}"
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
        sed -i "s/^DEFAULT_RUNTIME=.*/DEFAULT_RUNTIME=\\$DEFAULT_RUNTIME/" .env
    else
        echo "DEFAULT_RUNTIME=\\$DEFAULT_RUNTIME" >> .env
    fi
`;

// Insert the prompt before the Java/Docker setup
content = content.replace(
    /    # Java Setup for Local Process Mode \(Beta\)/,
    promptBlock + '\n    # Java Setup for Local Process Mode (Beta)'
);

fs.writeFileSync('install.sh', content);
