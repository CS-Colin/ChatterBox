const {app, BrowserWindow, WebContentsView, Menu, Tray, nativeImage, shell, ipcMain, dialog, session} = require('electron');
const {autoUpdater} = require('electron-updater');
const fs = require('node:fs');
const path = require('node:path');
const {readActivation} = require('./licensing/verify');
let activation;
let win, chat, tray, prefs, quitting = false;
const configPath = () => path.join(app.getPath('userData'), 'settings.json');
function settings() { try { return JSON.parse(fs.readFileSync(configPath(), 'utf8')); } catch { return {}; } }
function status(text) { if(win && !win.isDestroyed()) win.webContents.send('status', text); }
function trusted(url) { try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === 'web.whatsapp.com'; } catch { return false; } }
function external(url) { try { if(['https:', 'http:', 'mailto:'].includes(new URL(url).protocol)) shell.openExternal(url); } catch {} }
function layout() { const [width,height] = win.getContentSize(); chat.setBounds({x:0,y:64,width,height:Math.max(0,height-64)}); }
function show() { win.show(); win.restore(); win.focus(); }
async function checkUpdates() {
  const feed = settings().githubRepo;
  const bundledFeed = fs.existsSync(path.join(process.resourcesPath,'app-update.yml'));
  if(!feed && !bundledFeed) return status('Set your GitHub repository in Settings to enable updates.');
  if(!app.isPackaged) return status('Update checks are available in the installed app.');
  if(feed) {const [owner,repo]=feed.split('/'); autoUpdater.setFeedURL({provider:'github',owner,repo});}
  status('Checking for updates…');
  try { await autoUpdater.checkForUpdates(); } catch { status('Could not check for updates. Check your connection and release server.'); }
}
function create() {
  win = new BrowserWindow({width:1260,height:860,minWidth:800,minHeight:600,title:'Chatterbox',backgroundColor:'#101b23',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.loadFile('ui/index.html');
  chat = new WebContentsView({webPreferences:{partition:'persist:whatsapp',contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.contentView.addChildView(chat); layout();
  chat.webContents.setUserAgent(chat.webContents.getUserAgent().replace(/ Electron\/\S+/g,'').replace(/ chatterbox-desktop\/\S+/gi,''));
  const ses = session.fromPartition('persist:whatsapp');
  const allowed = new Set(['notifications','media','clipboard-sanitized-write','fullscreen']);
  ses.setPermissionRequestHandler((wc,permission,callback,details) => callback(trusted(details.requestingUrl || wc.getURL()) && allowed.has(permission)));
  ses.setPermissionCheckHandler((wc,permission,origin) => trusted(origin) && allowed.has(permission));
  chat.webContents.setWindowOpenHandler(({url}) => {external(url); return {action:'deny'};});
  chat.webContents.on('will-navigate',(event,url) => { if(!trusted(url)) {event.preventDefault(); external(url);} });
  chat.webContents.on('did-fail-load',(_e,code,_desc,url,main) => {if(main && code !== -3) status('WhatsApp could not load. Check your connection, then press Reload.');});
  chat.webContents.on('did-finish-load',() => status('Your personal WhatsApp companion'));
  ses.on('will-download',async (_e,item) => {
    const result = await dialog.showSaveDialog(win,{defaultPath:path.join(app.getPath('downloads'),path.basename(item.getFilename()))});
    if(result.canceled) item.cancel(); else item.setSavePath(result.filePath);
  });
  chat.webContents.loadURL('https://web.whatsapp.com');
  win.on('resize',layout);
  win.on('close',event => {if(!quitting && tray) {event.preventDefault(); win.hide();}});
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="18" fill="#18b997"/><path d="M15 17h34v25H29L19 51v-9h-4z" fill="white"/><circle cx="25" cy="30" r="3" fill="#18b997"/><circle cx="39" cy="30" r="3" fill="#18b997"/></svg>';
  // Use a raster icon for Windows tray compatibility.
  const pixels = Buffer.alloc(32*32*4);
  for(let y=0;y<32;y++) for(let x=0;x<32;x++) {const i=(y*32+x)*4;const white=x>6&&x<25&&y>7&&y<23; pixels[i]=white?255:151; pixels[i+1]=white?255:185; pixels[i+2]=white?255:24; pixels[i+3]=255;}
  const icon = nativeImage.createFromBitmap(pixels,{width:32,height:32});
  win.setIcon(icon); tray = new Tray(icon); tray.setToolTip('Chatterbox');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'Open Chatterbox',click:show},{label:'Check for updates',click:checkUpdates},{type:'separator'},{label:'Quit',click:() => app.quit()}]));
  tray.on('double-click',show);
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Chatterbox',submenu:[{label:'Reload WhatsApp',accelerator:'CmdOrCtrl+R',click:() => chat.webContents.reload()},{label:'Check for updates',click:checkUpdates},{type:'separator'},{role:'quit'}]},{label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]}]));
  if(settings().githubRepo || fs.existsSync(path.join(process.resourcesPath,'app-update.yml'))) setTimeout(checkUpdates,15000);
}
ipcMain.handle('action',async (event,action,value) => {
  if(![win.webContents,prefs?.webContents].includes(event.sender) || event.senderFrame !== event.sender.mainFrame) return;
  if(action === 'open-settings') {
    if(prefs && !prefs.isDestroyed()) return prefs.focus();
    prefs = new BrowserWindow({parent:win,width:540,height:580,resizable:false,title:'Chatterbox Settings',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
    prefs.loadFile('ui/settings.html'); prefs.on('closed',() => {prefs=null;}); return;
  }
  if(action === 'reload') chat.webContents.reload();
  if(action === 'updates') return checkUpdates();
  if(action === 'settings') return {githubRepo:settings().githubRepo || '',version:app.getVersion(),startup:app.getLoginItemSettings().openAtLogin,activation:activation ? {name:activation.name,id:activation.id} : null};
  if(action === 'save') {
    const githubRepo = String(value.githubRepo || '').trim().replace(/^https:\/\/github\.com\//,'').replace(/\/$/,'');
    if(githubRepo && !/^[\w.-]+\/[\w.-]+$/.test(githubRepo)) throw new Error('Use owner/repository.');
    fs.writeFileSync(configPath(),JSON.stringify({githubRepo},null,2));
    app.setLoginItemSettings({openAtLogin:!!value.startup});
    status('Settings saved');
  }
});
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.on('error',() => status('Update failed. Try again later.'));
autoUpdater.on('update-not-available',() => status('You have the latest version.'));
autoUpdater.on('update-available',async info => {const r=await dialog.showMessageBox(win,{type:'info',message:`Chatterbox ${info.version} is available.`,buttons:['Download update','Later'],cancelId:1});if(r.response===0) autoUpdater.downloadUpdate().catch(() => status('Download failed. Try again later.'));});
autoUpdater.on('download-progress',p => status(`Downloading update: ${Math.round(p.percent)}%`));
autoUpdater.on('update-downloaded',async () => {const r=await dialog.showMessageBox(win,{message:'Update ready. Restart Chatterbox to install it?',buttons:['Restart and install','Later'],cancelId:1}); if(r.response===0) {quitting=true;autoUpdater.quitAndInstall();}});
if(!app.requestSingleInstanceLock()) app.quit(); else {
  app.on('second-instance',() => {if(win) show();});
  app.whenReady().then(() => {
    activation = readActivation(path.join(app.getPath('userData'),'activation.code'));
    if(!activation) {
      dialog.showErrorBox('Chatterbox invitation required','Install Chatterbox with a valid invitation code from Colin to activate this app.');
      app.quit(); return;
    }
    create();
  });
  app.on('before-quit',() => {quitting=true;});
  app.on('window-all-closed',() => app.quit());
}

