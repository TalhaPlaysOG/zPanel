#!/bin/bash
echo "=== JTG Panel Local Runtime Update Logs & Code ===" > data_logs.txt
echo "" >> data_logs.txt

for file in server.ts install.sh src/server/services/local.ts src/server/services/runtime.ts src/server/services/jarDownloader.ts src/server/controllers/servers.ts src/pages/CreateServer.tsx; do
    echo "==================================================" >> data_logs.txt
    echo "File: $file" >> data_logs.txt
    echo "==================================================" >> data_logs.txt
    cat "$file" >> data_logs.txt
    echo "" >> data_logs.txt
    echo "" >> data_logs.txt
done
