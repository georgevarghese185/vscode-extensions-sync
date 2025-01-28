(A long time ago, I used to use this self-made VS Code extension to sync all my installed extensions to a file to make restoring them on another system easier. Since then, VS Code has supported signing in with GitHub and syncing your settings and extensions to the cloud. I use that feature and no longer have use for this project so I've decided to archive it)

# Extensions Sync

Synchronizes a list of your installed extensions to a JSON file.

This JSON file can then be shared across systems so that all your VS Code instances share the same extensions.

## How it works:

* When you install/uninstall an extension in VSCode, this tool will automatically add it to/remove it from the JSON file.

* If a new extension is found in the JSON file when VS Code starts up (or when you manually run the `sync` command), that extension will automatically be installed.

* If an extension is found to be missing from the JSON file when VS Code starts up (or when you manually run the `sync` command), you will be asked if you want to add it back to the JSON or uninstall it from VSCode.

## JSON file location

The JSON file is stored in `<settings location>/Code/Users/globalStorage/georgevarghese185.extensions-sync/extensions.json` _(TO DO: make it configurable)_

`<settings location>` depends on [your OS](https://code.visualstudio.com/docs/getstarted/settings#_settings-file-locations)

## Installing

This extension hasn't been published to the Visual Studio Marketplace yet.

To install it, go to [Releases](https://github.com/georgevarghese185/vscode-extensions-sync/releases) and download the latest .vsix file.

Then use [VS Code's CLI](https://code.visualstudio.com/docs/editor/command-line) to install the extension:

```
code --install-extension ./extensions-sync-X.X.X.vsix
```

After installing, either restart VS Code or run the `sync` command to generate the `extensions.json` file.
