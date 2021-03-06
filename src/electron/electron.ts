import { app, BrowserWindow, Menu } from 'electron';
import * as path from 'path';

// declare a variable to hold the browser window
let win: BrowserWindow | null

function createWindow() {
    // create a browser window
    win = new BrowserWindow({
        width: 1024,
        height: 800,
        // remove the default minimize, maximize, and close buttons
        // so we can have more control over our app's theming
        frame: false, 
        webPreferences: {
            // enable node integration for the browser so we
            // can do node things like use the file system
            nodeIntegration: true,
            webSecurity: false
        }
    });

    if (process.env.NODE_ENV === 'production') {
        // if we are in production mode, load the file
        // from the static, compiled source
        win.loadFile(path.resolve(__dirname, '../render/index.html'));
    } else {
        // if in development, point at the webpack-dev-server
        // so we can do hot reloading, and show the the dev tools
        win.loadURL('http://localhost:9000');
        win.webContents.openDevTools();
    }

    // use different menus for macos and window/linux
    if (process.platform === 'darwin') {
        Menu.setApplicationMenu(Menu.buildFromTemplate([
            {
                label: "Astroflux",
                submenu: [
                    {
                        label: "Quit Astroflux",
                        role: "quit"
                    }
                ]
            }
        ]));
    } else {
        Menu.setApplicationMenu(Menu.buildFromTemplate([
            {
                label: "File",
                submenu: [
                    {
                        label: "Close",
                        role: "quit"
                    }
                ]
            }
        ]));
    }

    // dereference our window when it closes
    win.on('closed', () => {
        win = null;
    });
}

// kick everything off when the app is ready
app.on('ready', createWindow);
