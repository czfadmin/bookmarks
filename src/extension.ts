import * as vscode from 'vscode';
import { BookmarksTreeView } from './providers/BookmarksTreeProvider';
import logger from './utils/logger';
import { EXTENSION_ID } from './constants';
import { disposeAllDiscorations } from './decorations';
import {
  disablAllEvents,
  // updateChangeActiveTextEditorListener,
  // updateChangeBreakpointsListener,
  // updateChangeVisibleTextEidtorsListener,
  // updateCursorChangeListener,
  // updateSaveTextDocumentListener,
} from './events';

export function activate(context: vscode.ExtensionContext) {
  logger.log(`${EXTENSION_ID} is now active!`);
  new BookmarksTreeView(context);
  // 监听插件配置的变化
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((ev) => {
      if (!ev.affectsConfiguration(EXTENSION_ID)) {
        return;
      }
      updateEverything();
    })
  );
  // TODO
  // updateChangeActiveTextEditorListener();
  // updateChangeBreakpointsListener();
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
