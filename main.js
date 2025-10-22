const { app, BrowserWindow } = require('electron');
const path = require('path');


function createWindow() {
const win = new BrowserWindow({
    width: 1100,
    height: 700,
    autoHideMenuBar: true,   // nasconde la menubar
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
    }
});


win.loadFile('index.html');
// win.webContents.openDevTools(); // decommenta se vuoi la console
}


app.whenReady().then(() => {
createWindow();


app.on('activate', () => {
if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
});


app.on('window-all-closed', () => {
if (process.platform !== 'darwin') app.quit();
});