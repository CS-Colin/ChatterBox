# Chatterbox for Windows

Your personal WhatsApp Web desktop companion. Independent software, not affiliated with WhatsApp or Meta.

## Saved accounts, one running account (1.2.3.1)

Open Accounts beside Edit in the top menu. Add account saves a new profile and opens its QR code. Choose a saved account to switch. Rename selected account changes its label. Only the selected account runs. On switching, Chatterbox flushes sign-in storage, stops the previous account's service workers and connections, and destroys its page before creating the next one. Inactive accounts do not receive desktop notifications. Their cookies and IndexedDB data remain saved so switching back normally does not require another QR scan. The original Personal account retains the legacy partition and login. The last selected account opens next time. Switching is deferred while a download is running. Switching also closes any call or media in the old account.

## Memory management

The app keeps just one account page loaded, preserving the existing account menu and activation codes. Hardware acceleration stays enabled. Background throttling and idle browser-cache/JavaScript cleanup remain available. Settings shows that only the selected account receives notifications, saved account count, approximate private memory, and before/after cleanup readings. Active WhatsApp itself still consumes RAM; there is no fixed memory cap.

The requested display and Windows file version is 1.2.3.1. The package/updater version and Git tag are 1.2.4 / v1.2.4 because the updater uses three-part semantic versions. The GitHub release title and installer filename display 1.2.3.1.

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

