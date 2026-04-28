#!/bin/bash

# Navigate to pipeline directory
cd "$(dirname "$0")"

echo "--- Starting ASHA Data Pipeline ---"

# Step 1: Run the Scraper
echo "[1/2] Extracting data from NHSRC..."
python3 scraper.py

if [ $? -eq 0 ]; then
    echo "Extraction successful."
else
    echo "Extraction failed. Check internet connection or site structure."
    exit 1
fi

# Step 2: Start the API Server (if not already running)
# We use nohup to keep it running in the background
echo "[2/2] Starting API Layer..."
if lsof -Pi :5005 -sTCP:LISTEN -t >/dev/null ; then
    echo "API Server is already running on port 5005."
else
    nohup node api.js > pipeline.log 2>&1 &
    echo "API Server started in background. Logs: pipeline.log"
fi

echo "--- Pipeline Task Complete ---"
