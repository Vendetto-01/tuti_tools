#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

FFMPEG_VERSION="7.0.2" # Updated to match the downloaded version
FFMPEG_TARBALL_URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
# Fallback URL if the above changes, you might need to find a new one.
# FFMPEG_TARBALL_URL_ALT="https://www.johnvansickle.com/ffmpeg/old-releases/ffmpeg-7.0.2-amd64-static.tar.xz" # Example if needed

BIN_DIR="./bin"
FFMPEG_DIR_NAME="ffmpeg-${FFMPEG_VERSION}-amd64-static" # This should now correctly be ffmpeg-7.0.2-amd64-static

echo "--- Setting up FFmpeg ---"

# Create bin directory if it doesn't exist
mkdir -p "$BIN_DIR"
cd "$BIN_DIR"

echo "Downloading FFmpeg from $FFMPEG_TARBALL_URL..."
if curl -L "$FFMPEG_TARBALL_URL" -o ffmpeg.tar.xz; then
    echo "Download successful."
else
    echo "Primary download failed. Trying alternative URL..."
    # if curl -L "$FFMPEG_TARBALL_URL_ALT" -o ffmpeg.tar.xz; then
    #     echo "Alternative download successful."
    # else
        echo "ERROR: Failed to download FFmpeg from all sources."
        exit 1
    # fi
fi


echo "Extracting FFmpeg..."
# Extract only ffmpeg and ffprobe to the current directory (which is $BIN_DIR)
# The path inside the tarball is usually like 'ffmpeg-X.Y-amd64-static/ffmpeg'
if tar -xvf ffmpeg.tar.xz --strip-components=1 "${FFMPEG_DIR_NAME}/ffmpeg" "${FFMPEG_DIR_NAME}/ffprobe"; then
    echo "Extraction successful."
else
    echo "ERROR: Failed to extract ffmpeg/ffprobe. The tarball structure might have changed."
    echo "Please check the tarball contents and update the script."
    # Attempt to list contents if extraction fails
    echo "Listing tarball contents for debugging:"
    tar -tvf ffmpeg.tar.xz || echo "Failed to list tarball contents."
    exit 1
fi


echo "Setting execute permissions..."
chmod +x ffmpeg ffprobe

echo "Cleaning up downloaded tarball..."
rm ffmpeg.tar.xz

echo "FFmpeg setup complete. Binaries are in $(pwd)"
ls -l # List contents to verify

echo "--- Checking FFmpeg capabilities ---"
echo "Available Muxers (looking for m4a/mp4/ipod):"
./ffmpeg -muxers 2>&1 | grep -E 'm4a|mp4|ipod' || echo "No m4a/mp4/ipod muxer found."
echo "Available Encoders (looking for aac):"
./ffmpeg -encoders 2>&1 | grep aac || echo "No aac encoder found."
echo "------------------------------------"


cd .. # Go back to backend directory

echo "--- FFmpeg setup finished ---"