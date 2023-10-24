import * as vscode from 'vscode';
import { BookmarksTreeView } from './views/BookmarksTreeView';
import logger from './utils/logger';
import { EXTENSION_ID } from './constants';
import {
  disposeAllDiscorations,
  initDecorations,
  updateActiveEditorAllDecorations,
} from './decorations';
import {
  disablAllEvents,
  updateBookmarkInfoWhenTextChangeListener,
  updateChangeActiveTextEditorListener,
  updateChangeBreakpointsListener,
  updateChangeVisibleTextEidtorsListener,
  updateCursorChangeListener,
  updateSaveTextDocumentListener,
} from './events';
import { BookmarksController } from './controllers/BookmarksController';
import { registerCommands } from './commands';

export function activate(context: vscode.ExtensionContext) {
  logger.log(`${EXTENSION_ID} is now active!`);

  new BookmarksTreeView(context, BookmarksController.getInstance(context));
  registerCommands(context);
  // 监听插件配置的变化
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((ev) => {
      if (!ev.affectsConfiguration(EXTENSION_ID)) {
        return;
      }
      updateEverything(context);
    })
  );
  initDecorations(context);

  updateCursorChangeListener();
  updateChangeActiveTextEditorListener();
  updateChangeBreakpointsListener();
  updateChangeVisibleTextEidtorsListener();
  updateSaveTextDocumentListener();
  updateBookmarkInfoWhenTextChangeListener();
}

function updateEverything(context: vscode.ExtensionContext) {
  initDecorations(context);
  updateCursorChangeListener();
  updateChangeActiveTextEditorListener();
  updateChangeBreakpointsListener();
  updateChangeVisibleTextEidtorsListener();
  updateSaveTextDocumentListener();
  updateActiveEditorAllDecorations();
  updateBookmarkInfoWhenTextChangeListener();
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
