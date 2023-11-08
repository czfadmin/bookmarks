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
import {ensureEmojis} from './emojis';

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

  registerCommands(context);

  await ensureEmojis();

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

  // const provider = new (class implements vscode.TextDocumentContentProvider {
  //   onDidChangeEmitter: vscode.EventEmitter<vscode.Uri> =
  //     new vscode.EventEmitter<vscode.Uri>();
  //   onDidChange?: vscode.Event<vscode.Uri> = this.onDidChangeEmitter.event;
  //   provideTextDocumentContent(
  //     uri: vscode.Uri,
  //     token: vscode.CancellationToken,
  //   ): vscode.ProviderResult<string> {
  //     // TODO
  //     return 'Hello';
  //   }
  // })();

  // context.subscriptions.push(
  //   vscode.workspace.registerTextDocumentContentProvider(
  //     VIRTUAL_SCHEMA,
  //     provider,
  //   ),
  // );

  initDecorations(context);

  updateCursorChangeListener();
  updateChangeActiveTextEditorListener();
  updateChangeBreakpointsListener();
  updateChangeVisibleTextEidtorsListener();
  updateBookmarkInfoWhenTextChangeListener();
  updateFilesRenameAndDeleteListeners();
}

function updateEverything(context: vscode.ExtensionContext) {
  initDecorations(context);
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
