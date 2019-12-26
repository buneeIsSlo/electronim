const {BrowserView} = require('electron');
const fs = require('fs');
const path = require('path');
const HOME_DIR = require('os').homedir();

const APP_DIR = '.electronim';
const SETTINGS_FILE = 'settings.json';
const DEFAULT_SETTINGS = {tabs: [], enabledDictionaries: []};

const webPreferences = {
  preload: `${__dirname}/preload.js`,
  partition: 'persist:electronim'
};

const appDir = path.join(HOME_DIR, APP_DIR);
const settingsPath = path.join(appDir, SETTINGS_FILE);

const initAppDir = () => fs.mkdirSync(appDir, {recursive: true});

const loadSettings = () => {
  initAppDir();
  let loadedSettings = {};
  if (fs.existsSync(settingsPath)) {
    loadedSettings = JSON.parse(fs.readFileSync(settingsPath));
  }
  return Object.assign(DEFAULT_SETTINGS, loadedSettings);
};

const writeSettings = settings => {
  initAppDir();
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
};

const updateSettings = settings => writeSettings({...loadSettings(), ...settings});

const openSettingsDialog = mainWindow => {
  const settingsView = new BrowserView({webPreferences});
  mainWindow.setBrowserView(settingsView);
  const {width, height} = mainWindow.getContentBounds();
  settingsView.setBounds({x: 0, y: 0, width, height});
  settingsView.setAutoResize({width: true, horizontal: true, height: true, vertical: true});
  settingsView.webContents.loadURL(`file://${__dirname}/index.html`);
};

module.exports = {loadSettings, updateSettings, openSettingsDialog};
