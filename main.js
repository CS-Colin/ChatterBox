const {app, BrowserWindow, WebContentsView, Menu, Tray, nativeImage, shell, ipcMain, dialog, session} = require('electron');
const {autoUpdater} = require('electron-updater');
const fs = require('node:fs');
const path = require('node:path');
const {readActivation} = require('./licensing/verify');
const {normalizeAccounts,partitionFor,newAccount} = require('./accounts');
const {reclaimView,reclaimBrowserMemory,memoryMegabytes,shouldReclaim} = require('./memory');
const disabledFeatures=app.commandLine.getSwitchValue('disable-features').split(',').filter(Boolean);
if(!disabledFeatures.includes('SpareRendererForSitePerProcess')) disabledFeatures.push('SpareRendererForSitePerProcess');
app.commandLine.appendSwitch('disable-features',disabledFeatures.join(','));
const accountViews = new Map();
let reclaiming=false,memoryTimer,startupTimer;
let lastInputAt=Date.now(),activeDownloads=0,lastCleanup=null;
let accountState;
let activation;
let win, chat, tray, prefs, accountEditor, editorAccountId, quitting = false;
const configPath = () => path.join(app.getPath('userData'), 'settings.json');
function settings() { try { return JSON.parse(fs.readFileSync(configPath(), 'utf8')); } catch { return {}; } }
function saveSettings(patch) { fs.writeFileSync(configPath(),JSON.stringify({...settings(),...patch},null,2)); }
function sendAccounts() { win.webContents.send('accounts',accountState); buildMenu(); }
function status(text) { if(win && !win.isDestroyed()) win.webContents.send('status', text); }
function trusted(url) { try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === 'web.whatsapp.com'; } catch { return false; } }
function external(url) { try { if(['https:', 'http:', 'mailto:'].includes(new URL(url).protocol)) shell.openExternal(url); } catch {} }
function layout() { if(!chat) return; const [width,height] = win.getContentSize(); chat.setBounds({x:0,y:64,width,height:Math.max(0,height-64)}); }
function openAccountEditor(id=null) {
  if(accountEditor && !accountEditor.isDestroyed()) return accountEditor.focus();
  editorAccountId=id;
  accountEditor=new BrowserWindow({parent:win,modal:true,width:480,height:320,resizable:false,autoHideMenuBar:true,title:id?'Rename account':'Add WhatsApp account',backgroundColor:'#101b23',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  accountEditor.loadFile(path.join(__dirname,'ui/account.html'));
  accountEditor.on('closed',()=>{accountEditor=null;editorAccountId=null;});
}
function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'Chatterbox',submenu:[{label:'Reload WhatsApp',accelerator:'CmdOrCtrl+R',click:()=>chat.webContents.reload()},{label:'Reclaim unused memory',click:()=>reclaimMemory(true)},{label:'Check for updates',click:checkUpdates},{type:'separator'},{role:'quit'}]},
    {label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
    {label:'Accounts',id:'accounts-menu',submenu:[
      ...accountState.accounts.map(a=>({id:`account-${a.id}`,label:a.name.replace(/&/g,'&&'),type:'radio',checked:a.id===accountState.activeAccount,click:()=>switchAccount(a.id)})),
      {type:'separator'},
      {id:'accounts-add',label:'Add account…',accelerator:'CmdOrCtrl+Shift+N',click:()=>openAccountEditor()},
      {id:'accounts-rename',label:'Rename selected account…',click:()=>openAccountEditor(accountState.activeAccount)}
    ]}
  ]));
}
function show() { win.show(); win.restore(); win.focus(); }
async function reclaimMemory(manual=false) {
  if(reclaiming || quitting) return;
  const beforeMB=memoryMegabytes(app.getAppMetrics());
  const audible=[...accountViews.values()].some(view=>!view.webContents.isDestroyed() && view.webContents.isCurrentlyAudible());
  if(!manual && !shouldReclaim({megabytes:beforeMB,idleMilliseconds:Date.now()-lastInputAt,audible,downloading:activeDownloads>0,editing:!!accountEditor})) return;
  if(audible || activeDownloads) {if(manual) status('Memory cleanup will wait until playback, calls and downloads finish.');return {deferred:true};}
  reclaiming=true;
  try {
    const browserCleaned=await reclaimBrowserMemory(win.webContents);
    let pagesCleaned=0;
    for(const view of accountViews.values()) {
      if(quitting) break;
      if(await reclaimView(view)) pagesCleaned++;
    }
    await new Promise(resolve=>setTimeout(resolve,750));
    lastCleanup={beforeMB,afterMB:memoryMegabytes(app.getAppMetrics()),browserCleaned,pagesCleaned,time:Date.now()};
    if(manual) status(`Cleanup complete · ${lastCleanup.afterMB} MB app private memory · All accounts remain connected`);
    return lastCleanup;
  } finally {reclaiming=false;}
}
function loadBackgroundAccounts() {
  const next=accountState.accounts.find(a=>!accountViews.has(a.id));
  if(!next || quitting) return;
  accountViews.set(next.id,createAccountView(next));
  startupTimer=setTimeout(loadBackgroundAccounts,2000);
}
async function checkUpdates() {
  const feed = settings().githubRepo;
  const bundledFeed = fs.existsSync(path.join(process.resourcesPath,'app-update.yml'));
  if(!feed && !bundledFeed) return status('Set your GitHub repository in Settings to enable updates.');
  if(!app.isPackaged) return status('Update checks are available in the installed app.');
  if(feed) {const [owner,repo]=feed.split('/'); autoUpdater.setFeedURL({provider:'github',owner,repo});}
  status('Checking for updates…');
  try { await autoUpdater.checkForUpdates(); } catch { status('Could not check for updates. Check your connection and release server.'); }
}
function createAccountView(account) {
  const view = new WebContentsView({webPreferences:{partition:partitionFor(account.id),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:true}});
  view.setVisible(false);
  const wc=view.webContents;
  wc.on('before-input-event',()=>{lastInputAt=Date.now();});
  wc.setUserAgent(wc.getUserAgent().replace(/ Electron\/\S+/g,'').replace(/ chatterbox-desktop\/\S+/gi,''));
  const ses = wc.session;
  const allowed = new Set(['notifications','media','clipboard-sanitized-write','fullscreen']);
  ses.setPermissionRequestHandler((wc,permission,callback,details) => callback(trusted(details.requestingUrl || wc.getURL()) && allowed.has(permission)));
  ses.setPermissionCheckHandler((wc,permission,origin) => trusted(origin) && allowed.has(permission));
  wc.setWindowOpenHandler(({url}) => {external(url); return {action:'deny'};});
  wc.on('will-navigate',(event,url) => { if(!trusted(url)) {event.preventDefault(); external(url);} });
  wc.on('did-fail-load',(_e,code,_desc,url,main) => {if(view === chat && main && code !== -3) status('WhatsApp could not load. Check your connection, then press Reload.');});
  wc.on('did-finish-load',() => {if(view === chat) status('Your personal WhatsApp companion');});
  const onDownload=async (_e,item)=>{
    activeDownloads++;item.once('done',()=>{activeDownloads=Math.max(0,activeDownloads-1);});
    try {const result=await dialog.showSaveDialog(win,{defaultPath:path.join(app.getPath('downloads'),path.basename(item.getFilename()))});if(result.canceled)item.cancel();else item.setSavePath(result.filePath);}catch{item.cancel();}
  };
  ses.on('will-download',onDownload);
  wc.once('destroyed',()=>ses.removeListener('will-download',onDownload));
  wc.loadURL('https://web.whatsapp.com').catch(()=>{});
  return view;
}
function switchAccount(id) {
  const account=accountState.accounts.find(a=>a.id===id);
  if(!account) throw new Error('Account not found');
  if(chat && accountState.activeAccount===id && !chat.webContents.isDestroyed()) return accountState;
  if(chat) {chat.setVisible(false);win.contentView.removeChildView(chat);chat.setBounds({x:0,y:0,width:1,height:1});}
  if(!accountViews.has(id)) accountViews.set(id,createAccountView(account));
  chat=accountViews.get(id);
  win.contentView.addChildView(chat);
  accountState.activeAccount=id;
  saveSettings(accountState);
  layout();
  chat.setVisible(true);
  win.setTitle(`${account.name} — Chatterbox`);
  status(`${account.name} · Your personal WhatsApp companion`);
  sendAccounts();
  return accountState;
}
function create() {
  accountState=normalizeAccounts(settings());
  win = new BrowserWindow({width:1260,height:860,minWidth:800,minHeight:600,title:'Chatterbox',backgroundColor:'#101b23',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.loadFile(path.join(__dirname,'ui/index.html'));
  switchAccount(accountState.activeAccount);
  startupTimer=setTimeout(loadBackgroundAccounts,2000);
  memoryTimer=setInterval(()=>{reclaimMemory().catch(()=>{});},60*1000);
  win.webContents.on('before-input-event',()=>{lastInputAt=Date.now();});
  win.on('hide',()=>{if(chat)chat.setVisible(false);});
  win.on('minimize',()=>{if(chat)chat.setVisible(false);});
  win.on('show',()=>{if(chat)chat.setVisible(true);});
  win.on('restore',()=>{if(chat)chat.setVisible(true);});
  win.on('resize',layout);
  win.on('close',event => {if(!quitting && tray) {event.preventDefault(); win.hide();}});
  // Use a raster icon for Windows tray compatibility.
  const pixels = Buffer.alloc(32*32*4);
  for(let y=0;y<32;y++) for(let x=0;x<32;x++) {const i=(y*32+x)*4;const white=x>6&&x<25&&y>7&&y<23; pixels[i]=white?255:151; pixels[i+1]=white?255:185; pixels[i+2]=white?255:24; pixels[i+3]=255;}
  const icon = nativeImage.createFromBitmap(pixels,{width:32,height:32});
  win.setIcon(icon); tray = new Tray(icon); tray.setToolTip('Chatterbox');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'Open Chatterbox',click:show},{label:'Check for updates',click:checkUpdates},{type:'separator'},{label:'Quit',click:() => app.quit()}]));
  tray.on('double-click',show);
  buildMenu();
  if(settings().githubRepo || fs.existsSync(path.join(process.resourcesPath,'app-update.yml'))) setTimeout(checkUpdates,15000);
}
ipcMain.handle('action',async (event,action,value) => {
  if(![win.webContents,prefs?.webContents,accountEditor?.webContents].includes(event.sender) || event.senderFrame !== event.sender.mainFrame) return;
  if(action === 'account-editor-state') return {id:editorAccountId,name:accountState.accounts.find(a=>a.id===editorAccountId)?.name || ''};
  if(action === 'account-editor-save' && event.sender === accountEditor?.webContents) {
    const name=newAccount(value).name;
    if(editorAccountId) {
      const account=accountState.accounts.find(a=>a.id===editorAccountId);
      if(!account) throw new Error('Account not found');
      account.name=name; saveSettings(accountState); sendAccounts();
      win.setTitle(`${name} — Chatterbox`); status(`${name} · Your personal WhatsApp companion`);
    } else {
      const account=newAccount(name);accountState.accounts.push(account);switchAccount(account.id);
    }
    accountEditor.close();return accountState;
  }
  if(action === 'accounts') return accountState;
  if(action === 'account-switch') return switchAccount(value);
  if(action === 'account-add') {
    const account=newAccount(value);
    accountState.accounts.push(account);
    return switchAccount(account.id);
  }
  if(action === 'account-rename') {
    const name=newAccount(value).name;
    accountState.accounts.find(a=>a.id===accountState.activeAccount).name=name;
    saveSettings(accountState); sendAccounts();
    win.setTitle(`${name} — Chatterbox`);
    return accountState;
  }
  if(action === 'open-settings') {
    if(prefs && !prefs.isDestroyed()) return prefs.focus();
    prefs = new BrowserWindow({parent:win,width:540,height:580,resizable:false,title:'Chatterbox Settings',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
    prefs.loadFile(path.join(__dirname,'ui/settings.html')); prefs.on('closed',() => {prefs=null;}); return;
  }
  if(action === 'reload') chat.webContents.reload();
  if(action === 'updates') return checkUpdates();
  if(action === 'memory-reclaim') return reclaimMemory(true);
  if(action === 'settings') return {githubRepo:settings().githubRepo || '',version:app.getVersion(),startup:app.getLoginItemSettings().openAtLogin,memory:{megabytes:memoryMegabytes(app.getAppMetrics()),connected:accountViews.size,total:accountState.accounts.length,lastCleanup},activation:activation ? {name:activation.name,id:activation.id} : null};
  if(action === 'save') {
    const githubRepo = String(value.githubRepo || '').trim().replace(/^https:\/\/github\.com\//,'').replace(/\/$/,'');
    if(githubRepo && !/^[\w.-]+\/[\w.-]+$/.test(githubRepo)) throw new Error('Use owner/repository.');
    saveSettings({githubRepo});
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
  app.on('before-quit',() => {quitting=true;clearInterval(memoryTimer);clearTimeout(startupTimer);for(const view of accountViews.values()) if(!view.webContents.isDestroyed()) view.webContents.close();});
  app.on('window-all-closed',() => app.quit());
}

