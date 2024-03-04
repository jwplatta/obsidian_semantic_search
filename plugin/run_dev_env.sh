#!/bin/bash

if [ -f ".env" ]; then
    source .env
else
    echo ".env file does not exist."
    exit 1
fi

echo "Creating symbolic link for the semantic_search plugin in the Obsidian development plugins directory..."

# Check if the symbolic link already exists
if [ -L "$LINK_NAME" ]; then
    echo "The symbolic link already exists. Removing it..."
    rm "$LINK_NAME"
fi

ln -s "$MY_PLUGINS_PATH" "$LINK_NAME"

echo "Symbolic link created successfully."

cleanup() {
    echo "Removing symbolic link..."
    rm -f "$LINK_NAME"
    echo "Cleanup completed."
}
trap cleanup INT TERM

npm run dev