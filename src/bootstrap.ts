import {ExtensionContext, workspace} from 'vscode';
import BookmarksController from './controllers/BookmarksController';
import UniversalBookmarkController from './controllers/UniversalBookmarkController';
import {BookmarksTreeView} from './views/BookmarksTreeView';
import {UniversalBookmarksTreeView} from './views/UniversalBookmarksTreeView';
import {EXTENSION_ID} from './constants';
import {
  updateCursorChangeListener,
  updateChangeActiveTextEditorListener,
  updateChangeVisibleTextEditorsListener,
  updateBookmarkInfoWhenTextChangeListener,
  updateFilesRenameAndDeleteListeners,
  updateTextEditorSelectionListener,
} from './events';
import {registerCodeCommands, registerUniversalCommands} from './commands';
import {registerTelemetryLogger} from './utils';
import logger from './utils/logger';

import resolveServiceManager, {
  ServiceManager,
  initServiceManager,
  postInitController,
} from './services/ServiceManager';

let controllerManager: any = {};

let sm: ServiceManager;

/**
 * 注册所有的视图
 * @param context
 */
function registerAllTreeView(context: ExtensionContext) {
  context.subscriptions.push(
    new BookmarksTreeView(),
    new UniversalBookmarksTreeView(),
  );
}

/**
 * 注册所有的命令
 */
function registerAllCommands() {
  registerCodeCommands();
  registerUniversalCommands();
}

/**
 * 更新全局的监听器以及填充装饰器
 * @param context
 */
function updateEverything() {
  updateCursorChangeListener();
  updateChangeActiveTextEditorListener();
  updateChangeVisibleTextEditorsListener();
  updateBookmarkInfoWhenTextChangeListener();
  updateFilesRenameAndDeleteListeners();
  updateTextEditorSelectionListener();
}

function initialController(context: ExtensionContext) {
  controllerManager['bookmarks'] && controllerManager['bookmarks'].dispose();
  controllerManager['universal'] && controllerManager['universal'].dispose();
  const bookmarksController = new BookmarksController(context);
  const universalController = new UniversalBookmarkController(context);
  controllerManager['bookmarks'] = bookmarksController;
  controllerManager['universal'] = universalController;
}

export default function bootstrap(context: ExtensionContext) {
  if (!workspace.workspaceFolders) {
    return;
  }
  context.subscriptions.push(registerTelemetryLogger());

  logger.log(`${EXTENSION_ID} is now active!`);

  initServiceManager(context);
  initialController(context);
  postInitController(context);

  const serviceManager = resolveServiceManager();
  // 依赖bookmark controller 单独注册
  serviceManager.registerStatusbarService();

  if (!sm) {
    sm = resolveServiceManager();
  }

  sm.configService.onDidChangeConfiguration(() => {
    updateEverything();
  });

  registerAllTreeView(context);

  // 注册命令
  registerAllCommands();

  // 首次激活时更新全局的一些监听器和装饰器填充步骤
  updateEverything();
}

export function resolveBookmarkController(): BookmarksController {
  return controllerManager['bookmarks'];
}

export function resolveUniversalController(): UniversalBookmarkController {
  return controllerManager['universal'];
}
