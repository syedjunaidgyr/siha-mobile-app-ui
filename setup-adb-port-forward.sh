#!/bin/bash

# Script to set up ADB port forwarding for Android emulator
# This allows the emulator to connect to the backend running on localhost:3000

echo "Setting up ADB port forwarding..."
echo "Forwarding port 3000 from emulator to host..."

# Forward port 3000
adb reverse tcp:3000 tcp:3000

# Verify forwarding
echo ""
echo "Port forwarding status:"
adb reverse --list

echo ""
echo "✅ Port forwarding set up successfully!"
echo "The Android emulator can now connect to http://localhost:3000"
echo ""
echo "Note: Run this script each time you restart the emulator."

