import {ExtensionContext} from 'vscode';
import BookmarksController from './controllers/BookmarksController';
import UniversalBookmarkController from './controllers/UniversalBookmarkController';
import {BookmarksTreeView} from './views/BookmarksTreeView';
import {UniversalBookmarksTreeView} from './views/UniversalBookmarksTreeView';
import {EXTENSION_ID} from './constants';
import {
  updateCursorChangeListener,
  updateChangeActiveTextEditorListener,
  updateChangeVisibleTextEidtorsListener,
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
 * @param needRefresh 是否需要刷新书签的树视图
 */
function updateEverything(needRefresh: boolean = true) {
  updateCursorChangeListener();
  updateChangeActiveTextEditorListener();
  updateChangeVisibleTextEidtorsListener();
  updateBookmarkInfoWhenTextChangeListener();
  updateFilesRenameAndDeleteListeners();
  updateTextEditorSelectionListener();
  // if (needRefresh) {
  //   const controller = resolveBookmarkController();
  //   controller.refresh();
  // }
}

function initialController(context: ExtensionContext) {
  controllerManager['bookmarks'] && controllerManager['bookmarks'].dispose();
  controllerManager['universal'] && controllerManager['universal'].dispose();
  const bookmarksController = new BookmarksController(context);
  const universalControlelr = new UniversalBookmarkController(context);
  controllerManager['bookmarks'] = bookmarksController;
  controllerManager['universal'] = universalControlelr;
}

export default function bootstrap(context: ExtensionContext) {
  context.subscriptions.push(registerTelemetryLogger());

  logger.log(`${EXTENSION_ID} is now active!`);

  initServiceManager(context);
  initialController(context);

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
  updateEverything(false);
}

export function resolveBookmarkController(): BookmarksController {
  return controllerManager['bookmarks'];
}

export function resolveUniversalController(): UniversalBookmarkController {
  return controllerManager['universal'];
}
