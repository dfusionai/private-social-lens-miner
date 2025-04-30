import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { environment } from '../../environments/environment';

export function configureAutoUpdater() {
  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Production settings
  autoUpdater.allowPrerelease = false;
  autoUpdater.disableWebInstaller = false;
  autoUpdater.allowDowngrade = false;

  // Set update server URL from environment configuration
  log.info('configureAutoUpdater environment', JSON.stringify(environment));
  // https://www.electron.build/auto-update#quick-setup-guide
  // don't set feed url
  // autoUpdater.setFeedURL(environment.updateFeed);
}