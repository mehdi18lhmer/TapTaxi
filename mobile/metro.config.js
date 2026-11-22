const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const config = getDefaultConfig(__dirname);
// The pure money/ledger module is shared with the existing web app.
config.watchFolders = [path.resolve(__dirname, '..')];
module.exports = config;
