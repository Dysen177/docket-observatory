const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('guoIntelDesktop', {
  isDesktop: true,
  secureStorage: () => ipcRenderer.invoke('guo-intel-secure-storage-status'),
})
