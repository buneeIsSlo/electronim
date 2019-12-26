const {BrowserView, Menu, MenuItem, shell} = require('electron');
const {APP_EVENTS} = require('../constants');
const settings = require('../settings');
const {contextMenuHandler} = require('../spell-check');

let activeTab = null;
const tabs = {};

const webPreferences = {
  preload: `${__dirname}/preload.js`
};

const handleRedirect = browserView => (e, url) => {
  if (new URL(url).origin !== new URL(browserView.webContents.getURL()).origin) {
    e.preventDefault();
    shell.openExternal(url);
  }
};

const handlePageTitleUpdated = (ipcSender, tabId) => (e, title) => {
  ipcSender.send(APP_EVENTS.setTabTitle, {id: tabId, title: title});
};

const extractFavicon = async browserView => {
  let favicons = await browserView.webContents
    .executeJavaScript('Array.from(document.querySelectorAll(\'link[rel="shortcut icon"]\')).map(el => el.href)');
  if (favicons.length === 0) {
    favicons = await browserView.webContents
      .executeJavaScript('Array.from(document.querySelectorAll(\'link[rel*="icon"]\')).map(el => el.href)');
  }
  return favicons;
};

const handlePageFaviconUpdated = (browserView, ipcSender, tabId) => async (e, favicons) => {
  if (favicons.length === 0) {
    favicons = await extractFavicon(browserView);
  }
  if (favicons.length > 0) {
    ipcSender.send(APP_EVENTS.setTabFavicon, {id: tabId, favicon: favicons[favicons.length - 1]});
  }
};

const handleContextMenu = browserView => (event, params) => {
  const {webContents} = browserView;
  const menu = new Menu();
  const spellingSuggestions = contextMenuHandler(event, params, webContents);
  if (spellingSuggestions.length > 0) {
    spellingSuggestions.forEach(mi => menu.append(mi));
    menu.append(new MenuItem({type: 'separator'}));
  }
  menu.append(new MenuItem({label: 'DevTools', click: () => webContents.openDevTools()}));
  const {x, y} = params;
  menu.popup({x, y});
};

const addTabs = ipcSender => tabsMetadata => {
  tabsMetadata.forEach(({id, url}) => {
    const tab = new BrowserView({webPreferences});
    tab.setAutoResize({width: true, height: true});

    tab.webContents.loadURL(url);

    const handleRedirectForCurrentUrl = handleRedirect(tab);
    tab.webContents.on('will-navigate', handleRedirectForCurrentUrl);
    tab.webContents.on('new-window', handleRedirectForCurrentUrl);

    const handlePageTitleUpdatedForCurrentTab = handlePageTitleUpdated(ipcSender, id);
    tab.webContents.on('page-title-updated', handlePageTitleUpdatedForCurrentTab);
    const handlePageFaviconUpdatedForCurrentTab = handlePageFaviconUpdated(tab, ipcSender, id);
    tab.webContents.on('page-favicon-updated', handlePageFaviconUpdatedForCurrentTab);

    tab.webContents.on('context-menu', handleContextMenu(tab));

    tabs[id.toString()] = tab;
  });
  ipcSender.send(APP_EVENTS.addTabs, tabsMetadata);
};

const getTab = tabId => (tabId ? tabs[tabId.toString()] : null);

const getActiveTab = () => activeTab;

const setActiveTab = tabId => {
  activeTab = tabId.toString();
  settings.updateSettings({activeTab});
};

const reload = () => Object.values(tabs).forEach(browserView => browserView.webContents.reload());

module.exports = {
  addTabs, getTab, getActiveTab, setActiveTab, reload
};
