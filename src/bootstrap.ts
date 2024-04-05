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
import {registerTelemetryLogger} from './utils';
import logger from './utils/logger';

import {
  ServiceManager,
  initServiceManager,
  postInitController,
} from './services/ServiceManager';

import registerAllBookmarksCommands from './commands';

let controllerManager: {
  bookmarks?: BookmarksController;
  universal?: UniversalBookmarkController;
} = {};

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
function registerAllCommands(context: ExtensionContext) {
  registerAllBookmarksCommands(context);
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

function initialController(
  context: ExtensionContext,
  serviceManager: ServiceManager,
) {
  const bookmarksController = new BookmarksController(context, serviceManager);
  const universalController = new UniversalBookmarkController(
    context,
    serviceManager,
  );
  controllerManager.bookmarks = bookmarksController;
  controllerManager.universal = universalController;
}

export default async function bootstrap(context: ExtensionContext) {
  if (!workspace.workspaceFolders) {
    return;
  }
  context.subscriptions.push(registerTelemetryLogger());

  logger.log(`${EXTENSION_ID} is now active!`);
  try {
    const sm = await initServiceManager(context, updateEverything);
    initialController(context, sm);
    postInitController();
    registerAllTreeView(context);
    registerAllCommands(context);
    updateEverything();
  } catch (error) {
    logger.error(error);
  }
}

export function resolveBookmarkController(): BookmarksController {
  return controllerManager.bookmarks!;
}

export function resolveUniversalController(): UniversalBookmarkController {
  return controllerManager.universal!;
}
