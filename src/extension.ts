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

  // 虚拟文档
  const virtualContentProvider = new (class
    implements vscode.TextDocumentContentProvider
  {
    onDidChange?: vscode.Event<vscode.Uri> | undefined;
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    provideTextDocumentContent(
      uri: vscode.Uri,
      token: vscode.CancellationToken,
    ): vscode.ProviderResult<string> {
      return undefined;
    }
  })();

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      VIRTUAL_SCHEMA,
      virtualContentProvider,
    ),
  );

  vscode.commands.registerCommand(
    'bookmark-manager.openInExplorer',
    async args => {
      const uri = vscode.Uri.parse(`${VIRTUAL_SCHEMA}:`);
    },
  );

  vscode.commands.executeCommand(
    'setContext',
    'bookmark-manager.enableClick',
    configuration.enableClick,
  );

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

  initDecorations(context);
  updateStatusBarItem();
  updateCursorChangeListener();
  updateChangeActiveTextEditorListener();
  updateChangeBreakpointsListener();
  updateChangeVisibleTextEidtorsListener();
  updateBookmarkInfoWhenTextChangeListener();
  updateFilesRenameAndDeleteListeners();
}

function updateEverything(context: vscode.ExtensionContext) {
  initDecorations(context);
  updateStatusBarItem();
  updateCursorChangeListener();
  updateChangeActiveTextEditorListener();
  updateChangeBreakpointsListener();
  updateChangeVisibleTextEidtorsListener();
  updateActiveEditorAllDecorations();
  updateBookmarkInfoWhenTextChangeListener();
  updateFilesRenameAndDeleteListeners();
  BookmarksController.instance.refresh();
}

function disposeAll() {
  disablAllEvents();
  disposeAllDiscorations();
  logger.log(`${EXTENSION_ID} is now deactive!`);
}

export function deactivate() {
  disposeAll();
}
