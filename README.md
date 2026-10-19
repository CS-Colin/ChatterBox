# Chatterbox for Windows

Your personal WhatsApp Web desktop companion. Independent software, not affiliated with WhatsApp or Meta.

## Run and build

Install Node.js, then run `npm install` in this folder. Use `npm start` to run locally and `npm run dist` to create the Windows installer in `release/`. The installer supports a per-user installation, a desktop shortcut, an uninstaller and a selectable destination.

Scan WhatsApp's QR code through Linked devices on your phone. Sign-in data stays in the app's dedicated local profile. Closing the window keeps the app in the tray; choose Quit to exit. WhatsApp Web determines available messaging and calling features.

## Updates

GitHub Releases hosts updates. In the first local installer, open Settings and enter `owner/chatterbox` or your repository URL. Use a public repository so installed apps can download releases without credentials. GitHub-built installers automatically include their repository as the update destination; the setting is an optional override. Never embed GitHub tokens in the app.

Upload this project to the repository root, excluding node_modules, build-cache and release (already ignored). The included Windows release workflow builds and publishes the installer, blockmap and latest.yml on a version tag such as `v1.0.0`. It can also be started manually in GitHub Actions. Increase package.json's version and update package-lock.json before tagging subsequent releases. The workflow uses GitHub's built-in scoped token; no token is stored in the installed app. For a local release build, set GITHUB_REPOSITORY to owner/repository and GH_TOKEN in your shell, then run `npm run release`.

Installed builds check at startup when a repository is configured. Check for updates runs a manual check. Downloads and restarts require confirmation. Connecting and publishing the repository is still required. A complete update test requires two hosted versions and an installed app.

This initial personal build is unsigned. Signing requires a Windows signing identity. Verify the installer and updater on your own machine before wider distribution.
