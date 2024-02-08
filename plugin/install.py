import os
import shutil

if __name__ == "__main__":
    vault_path = input("Enter the Obsidian vault path: ")
    print("Vault path: " + vault_path)
    if not os.path.exists(vault_path):
        print("Vault path does not exist.")
        exit(1)

    plugins_path = os.path.join(vault_path, ".obsidian", "plugins")
    if not os.path.exists(plugins_path):
        print("Plugins path does not exist.")
        exit(1)

    plugin_path = os.path.join(plugins_path, "instruct")
    if os.path.exists(plugin_path):
        answer = input("Plugin already installed. Reinstall? (y/n): ")
        if answer != "y":
            print("Exiting.")
            exit(1)
    else:
        os.mkdir(plugin_path)

    print("Installing plugin...")

    os.system("npm install")
    os.system("npm run build")

    current_dir = os.getcwd()
    installFiles = [
        "main.js",
        "manifest.json",
        "styles.css",
        "LICENSE",
        "README.md",
    ]

    for file_name in installFiles:
        filepath = os.path.join(current_dir, file_name)
        if os.path.isfile(filepath):
            shutil.copy(filepath, plugin_path)

    print("Plugin installed.")
