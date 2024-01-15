import {ExtensionContext, workspace} from 'vscode';
import BookmarksController from './controllers/BookmarksController';
import UniversalBookmarkController from './controllers/UniversalBookmarkController';
import {BookmarksTreeView} from './views/BookmarksTreeView';
import {UniversalBookmarksTreeView} from './views/UniversalBookmarksTreeView';
import {getExtensionConfiguration} from './configurations';
import {registerExtensionCustomContext} from './context';
import {EXTENSION_ID} from './constants';
import {initDecorations, updateActiveEditorAllDecorations} from './decorations';
import {
  updateCursorChangeListener,
  updateChangeActiveTextEditorListener,
  updateChangeBreakpointsListener,
  updateChangeVisibleTextEidtorsListener,
  updateBookmarkInfoWhenTextChangeListener,
  updateFilesRenameAndDeleteListeners,
  updateTextEditorSelectionListener,
} from './events';
import {updateStatusBarItem} from './statusbar';
import {registerCodeCommands, registerUniversalCommands} from './commands';

let controllerManager: any = {};

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
function updateEverything(
  context: ExtensionContext,
  needRefresh: boolean = true,
) {
  initDecorations(context);
  updateStatusBarItem();
  updateCursorChangeListener();
  updateChangeActiveTextEditorListener();
  updateChangeBreakpointsListener();
  updateChangeVisibleTextEidtorsListener();
  updateActiveEditorAllDecorations();
  updateBookmarkInfoWhenTextChangeListener();
  updateFilesRenameAndDeleteListeners();
  updateTextEditorSelectionListener();
  if (needRefresh) {
    const controller = resolveBookmarkController();
    controller.refresh();
  }
}

function initialController(context: ExtensionContext) {
  // controllerManager['bookmarks'] && controllerManager['bookmarks'].dispose();
  // controllerManager['universal'] && controllerManager['universal'].dispose();
  const bookmarksController = new BookmarksController(context);
  const universalControlelr = new UniversalBookmarkController(context);
  controllerManager['bookmarks'] = bookmarksController;
  controllerManager['universal'] = universalControlelr;
}

export default function bootstrap(context: ExtensionContext) {
  initialController(context);
  const configuration = getExtensionConfiguration();

  registerExtensionCustomContext(configuration);

  // 监听插件配置的变化
  context.subscriptions.push(
    workspace.onDidChangeConfiguration(ev => {
      if (!ev.affectsConfiguration(EXTENSION_ID)) {
        return;
      }
      // initialController(context);
      updateEverything(context);
    }),
  );
  registerAllTreeView(context);

  // 注册命令
  registerAllCommands();

  // 首次激活时更新全局的一些监听器和装饰器填充步骤
  updateEverything(context, false);
}

export function resolveBookmarkController(): BookmarksController {
  return controllerManager['bookmarks'];
}
export function resolveUniversalController(): UniversalBookmarkController {
  return controllerManager['universal'];
}
