const {contextBridge,ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('chatterbox',{
  action:(name,value) => ipcRenderer.invoke('action',name,value),
  onStatus:callback => ipcRenderer.on('status',(_event,text) => callback(text)),
  onAccounts:callback => ipcRenderer.on('accounts',(_event,state) => callback(state))
});
