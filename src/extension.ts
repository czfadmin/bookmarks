import * as vscode from 'vscode';
import {registerCommands} from './commands';
import {EXTENSION_ID, VIRTUAL_SCHEMA} from './constants';
import {BookmarksController} from './controllers/BookmarksController';
import {
  disposeAllDiscorations,
  initDecorations,
  updateActiveEditorAllDecorations,
} from './decorations';
import {
  disablAllEvents,
  updateFilesRenameAndDeleteListeners,
  updateBookmarkInfoWhenTextChangeListener,
  updateChangeActiveTextEditorListener,
  updateChangeBreakpointsListener,
  updateChangeVisibleTextEidtorsListener,
  updateCursorChangeListener,
  updateTextEditorSelectionListener,
} from './events';
import logger from './utils/logger';
import {BookmarksTreeView} from './views/BookmarksTreeView';
import {updateStatusBarItem} from './statusbar';
import {getExtensionConfiguration} from './configurations';
import {registerExtensionCustomContext} from './context';

/**
 * 插件上下文
 */
let _context: vscode.ExtensionContext;

/**
 * 获取插件的上下文
 * @returns context
 */
export const getExtensionContext = (): vscode.ExtensionContext => _context;

export async function activate(context: vscode.ExtensionContext) {
  _context = context;
  logger.log(`${EXTENSION_ID} is now active!`);

  const configuration = getExtensionConfiguration();

  // TODO: 虚拟文档
  // const virtualContentProvider = new (class
  //   implements vscode.TextDocumentContentProvider
  // {
  //   onDidChange?: vscode.Event<vscode.Uri> | undefined;
  //   onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  //   provideTextDocumentContent(
  //     uri: vscode.Uri,
  //     token: vscode.CancellationToken,
  //   ): vscode.ProviderResult<string> {
  //     return undefined;
  //   }
  // })();

  // context.subscriptions.push(
  //   vscode.workspace.registerTextDocumentContentProvider(
  //     VIRTUAL_SCHEMA,
  //     virtualContentProvider,
  //   ),
  // );

  registerExtensionCustomContext(configuration);

  // 注册书签管理器视图
  context.subscriptions.push(
    new BookmarksTreeView(context, BookmarksController.getInstance(context)),
  );

  // 监听插件配置的变化
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(ev => {
      if (!ev.affectsConfiguration(EXTENSION_ID)) {
        return;
      }
      updateEverything(context);
    }),
  );

  // 注册命令
  registerCommands(context);

  // 首次激活时更新全局的一些监听器和装饰器填充步骤
  updateEverything(context, false);
}

/**
 * 更新全局的监听器以及填充装饰器
 * @param context
 * @param needRefresh 是否需要刷新书签的树视图
 */
function updateEverything(
  context: vscode.ExtensionContext,
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
  needRefresh && BookmarksController.instance.refresh();
}

/**
 * 销毁所以的事件监听以及文本装饰器
 */
function disposeAll() {
  disablAllEvents();
  disposeAllDiscorations();
  logger.log(`${EXTENSION_ID} is now deactive!`);
}

export function deactivate() {
  disposeAll();
}
