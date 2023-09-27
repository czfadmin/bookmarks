import * as vscode from 'vscode';
import { BookmarksTreeView } from './views/BookmarksTreeView';
import logger from './utils/logger';
import { EXTENSION_ID } from './constants';
import { disposeAllDiscorations, initDecorations } from './decorations';
import {
  disablAllEvents,
  updateChangeActiveTextEditorListener,
  updateChangeBreakpointsListener,
  // updateChangeVisibleTextEidtorsListener,
  // updateCursorChangeListener,
  // updateSaveTextDocumentListener,
} from './events';
import { BookmarksController } from './controllers/BookmarksController';

export function activate(context: vscode.ExtensionContext) {
  logger.log(`${EXTENSION_ID} is now active!`);

  new BookmarksTreeView(context, BookmarksController.getInstance(context));
  // 监听插件配置的变化
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((ev) => {
      if (!ev.affectsConfiguration(EXTENSION_ID)) {
        return;
      }
      updateEverything();
    })
  );
  initDecorations(context);
  // TODO
  updateChangeActiveTextEditorListener();
  updateChangeBreakpointsListener();
  // updateChangeVisibleTextEidtorsListener();
  // updateCursorChangeListener();
  // updateSaveTextDocumentListener();
}

function updateEverything() {}

function disposeAll() {
  disablAllEvents();
  disposeAllDiscorations();
}

export function deactivate() {
  disposeAll();
}
