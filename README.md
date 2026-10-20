# Chatterbox for Windows

Your personal WhatsApp Web desktop companion. Independent software, not affiliated with WhatsApp or Meta.

## Multiple WhatsApp accounts (1.2)

Open **Accounts** beside **Edit** in the top menu. Choose **Add account**, enter a label such as Work, and scan the new QR code from that number's WhatsApp Linked devices screen. Choose a name in the Accounts menu to switch; **Rename selected account** changes its label. A checkmark identifies the selected account. WhatsApp uses the full window width. Each number has its own saved browser session. The original Personal account uses the same storage as previous versions, preserving the existing login. The last selected account reopens on launch. All saved accounts load shortly after startup, staggered two seconds apart, and remain running for desktop notifications until the app quits. To sign out of a number, use WhatsApp's own Log out command while that account is selected. Activation covers the app and does not need repeating for additional WhatsApp accounts.

## Memory and desktop notifications (1.2.3)

All saved account pages stay loaded for desktop notifications. Hardware acceleration remains enabled. Inactive pages are explicitly hidden and their drawing surfaces reduced; switching back restores the normal viewport without signing out or reloading. Closing to the tray or minimizing hides the selected page while its connection remains running.

The app checks memory every minute. Above 384 MiB of total private memory, after 30 seconds without keyboard input, it asks Chromium to reclaim discardable browser/image caches and collects unreachable JavaScript objects. It defers during audible playback/calls, downloads, and account editing. It neither freezes nor discards account pages, deletes storage, disables network connections, nor sets a JavaScript heap cap. No spare renderer is kept for faster window creation.

Use Chatterbox > Reclaim unused memory, or the button in Settings, for manual cleanup. Settings shows approximate app private memory and the most recent before/after readings. All-account notifications still depend on WhatsApp, Windows notification permissions, connectivity and linked sessions. Reclaimable caches can grow again as they are used. Active WhatsApp data cannot be eliminated while keeping all accounts online, so no fixed RAM target or guaranteed saving is promised.

## Invitations (version 1.1 and later)

The installer requires a signed invitation code from Colin. It verifies the signature offline before proceeding, stores activation in the current Windows user's app data, and the app verifies it again before loading WhatsApp. Settings shows the activated recipient name and invitation ID. Existing valid activations carry over to updates and reinstalls. First-time silent installs without activation exit before changing the installation. Users upgrading from 1.0 must run the 1.1 installer interactively and enter their invitation once.

The private invitation generator and signing key are maintained separately by the owner, outside this repository. Never commit a private key or a real invitation code. Only public verification keys are shipped here. Invitation codes are perpetual and reusable, with no online revocation, device binding, or one-use enforcement. Because this is an open-source app, a modified build can remove the checks. Version 1.0 remains unrestricted.

## Run and build

Install Node.js, then run `npm install` in this folder. Use `npm start` to run locally and `npm run dist` to create the Windows installer in `release/`. The installer supports a per-user installation, a desktop shortcut, an uninstaller and a selectable destination.

Scan WhatsApp's QR code through Linked devices on your phone. Sign-in data stays in the app's dedicated local profile. Closing the window keeps the app in the tray; choose Quit to exit. WhatsApp Web determines available messaging and calling features.

## Updates

GitHub Releases hosts updates. In the first local installer, open Settings and enter `owner/chatterbox` or your repository URL. Use a public repository so installed apps can download releases without credentials. GitHub-built installers automatically include their repository as the update destination; the setting is an optional override. Never embed GitHub tokens in the app.

Upload this project to the repository root, excluding node_modules, build-cache and release (already ignored). The included Windows release workflow builds and publishes the installer, blockmap and latest.yml on a version tag such as `v1.0.0`. It can also be started manually in GitHub Actions. Increase package.json's version and update package-lock.json before tagging subsequent releases. The workflow uses GitHub's built-in scoped token; no token is stored in the installed app. For a local release build, set GITHUB_REPOSITORY to owner/repository and GH_TOKEN in your shell, then run `npm run release`.

Installed builds check at startup when a repository is configured. Check for updates runs a manual check. Downloads and restarts require confirmation. Connecting and publishing the repository is still required. A complete update test requires two hosted versions and an installed app.

This initial personal build is unsigned. Signing requires a Windows signing identity. Verify the installer and updater on your own machine before wider distribution.

