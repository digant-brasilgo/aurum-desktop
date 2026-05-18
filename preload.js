const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('isElectron', true);

contextBridge.exposeInMainWorld('aurum', {
  db: {
    getAll:  ()       => ipcRenderer.invoke('db:getAll'),
    setAll:  (data)   => ipcRenderer.invoke('db:setAll', data),
    get:     (key)    => ipcRenderer.invoke('db:get', key),
    set:     (k, v)   => ipcRenderer.invoke('db:set', k, v),
  },
  company: {
    list:      ()        => ipcRenderer.invoke('company:list'),
    setActive: (id)      => ipcRenderer.invoke('company:setActive', id),
    getActive: ()        => ipcRenderer.invoke('company:getActive'),
    add:       (data)    => ipcRenderer.invoke('company:add', data),
    update:    (id,data) => ipcRenderer.invoke('company:update', id, data),
    delete:    (id)      => ipcRenderer.invoke('company:delete', id),
    dataPath:  (id)      => ipcRenderer.invoke('company:dataPath', id),
  },
  auth: {
    login:          (u, p, cid)     => ipcRenderer.invoke('auth:login', u, p, cid),
    getUsers:       ()              => ipcRenderer.invoke('auth:getUsers'),
    addUser:        (data)          => ipcRenderer.invoke('auth:addUser', data),
    updateUser:     (id, data)      => ipcRenderer.invoke('auth:updateUser', id, data),
    deleteUser:     (id)            => ipcRenderer.invoke('auth:deleteUser', id),
    changePassword: (uid, old, nw)  => ipcRenderer.invoke('auth:changePassword', uid, old, nw),
    verifyPassword: (uid, pwd)      => ipcRenderer.invoke('auth:verifyPassword', uid, pwd),
    adminResetPassword: (uid, nw)   => ipcRenderer.invoke('auth:adminResetPassword', uid, nw),
  },
  file: {
    exportJSON:        ()     => ipcRenderer.invoke('file:exportJSON'),
    importJSON:        ()     => ipcRenderer.invoke('file:importJSON'),
    openBackupFolder:  ()     => ipcRenderer.invoke('file:openBackupFolder'),
  },
  backup: {
    now:             ()      => ipcRenderer.invoke('backup:now'),
    list:            ()      => ipcRenderer.invoke('backup:list'),
    restore:         (file)  => ipcRenderer.invoke('backup:restore', file),
    toFlashDrive:    ()      => ipcRenderer.invoke('backup:toFlashDrive'),
    fromFlashDrive:  ()      => ipcRenderer.invoke('backup:fromFlashDrive'),
    gStatus:         ()      => ipcRenderer.invoke('backup:gStatus'),
    setDrive:        (drive) => ipcRenderer.invoke('backup:setDrive', drive),
  },
  fy: {
    getCurrent: () => ipcRenderer.invoke('fy:getCurrent'),
    getAll:     () => ipcRenderer.invoke('fy:getAll'),
  },
  news: {
    get: () => ipcRenderer.invoke('news:get'),
  },
  prices: {
    get:      () => ipcRenderer.invoke('prices:get'),
    refresh:  () => ipcRenderer.invoke('prices:refresh'),
    debug:    () => ipcRenderer.invoke('prices:debug'),
    onUpdate: (fn) => {
      const sub = (_, p) => fn(p);
      ipcRenderer.on('prices:update', sub);
      return () => ipcRenderer.removeListener('prices:update', sub);
    },
  },
  settings: {
    get: ()    => ipcRenderer.invoke('settings:get'),
    set: (s)   => ipcRenderer.invoke('settings:set', s),
  },
  lan: {
    info: () => ipcRenderer.invoke('lan:info'),
  },
  window: {
    minimize:    () => ipcRenderer.invoke('window:minimize'),
    maximize:    () => ipcRenderer.invoke('window:maximize'),
    close:       () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
  help: {
    captureScreen:  ()        => ipcRenderer.invoke('help:captureScreen'),
    saveScreenshot: (dataUrl) => ipcRenderer.invoke('help:saveScreenshot', dataUrl),
    openWhatsApp:   (message) => ipcRenderer.invoke('help:openWhatsApp', message),
  },
  on: (channel, fn) => {
    const sub = (_, ...args) => fn(...args);
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.removeListener(channel, sub);
  },
});
