import {
  Disposable,
  TextEditorSelectionChangeKind,
  debug,
  window,
  workspace,
} from 'vscode';

import { updateDecorationsByEditor } from './decorations';
import logger from './utils/logger';

let onDidChangeActiveTextEditor: Disposable | undefined;
let onDidChangeVisibleTextEditors: Disposable | undefined;
let onDidSaveTextDocumentDisposable: Disposable | undefined;
let onDidCursorChangeDisposable: Disposable | undefined;
let onDidChangeBreakpoints: Disposable | undefined;

export function updateChangeActiveTextEditorListener() {
  onDidChangeActiveTextEditor?.dispose();
  // 当打开多个editor group时,更新每个editor的中的decorations
  const visibleTextEditors = window.visibleTextEditors;
  if (visibleTextEditors.length) {
    visibleTextEditors.forEach((editor) => {
      updateDecorationsByEditor(editor);
    });
  }
  onDidChangeActiveTextEditor = window.onDidChangeActiveTextEditor((ev) => {
    if (!ev) {
      return;
    }
    updateDecorationsByEditor(ev);
  });
}

export function updateChangeVisibleTextEidtorsListener() {
  onDidChangeVisibleTextEditors?.dispose();
  onDidChangeVisibleTextEditors = window.onDidChangeVisibleTextEditors(
    (editors) => {
      for (let editor of editors) {
        updateDecorationsByEditor(editor);
      }
    }
  );
}

export function updateSaveTextDocumentListener() {
  onDidSaveTextDocumentDisposable?.dispose();
  onDidSaveTextDocumentDisposable = workspace.onDidSaveTextDocument((ev) => {});
}

export function updateCursorChangeListener() {
  onDidCursorChangeDisposable?.dispose();
  let lastPositionLine = -1;
  onDidCursorChangeDisposable = window.onDidChangeTextEditorSelection((ev) => {
    const { kind } = ev;
    const section = ev.selections[0];
    if (
      ev.selections.length === 1 &&
      section.isEmpty &&
      section.isSingleLine &&
      kind === TextEditorSelectionChangeKind.Keyboard
    ) {
      // logger.info(ev);
      // TODO: 更新bookmark的位置
    }
  });
}

export function updateChangeBreakpointsListener() {
  onDidChangeBreakpoints?.dispose();
  onDidChangeBreakpoints = debug.onDidChangeBreakpoints((ev) => {});
}

export function disablAllEvents() {
  onDidChangeActiveTextEditor?.dispose();
  onDidChangeBreakpoints?.dispose();
  onDidCursorChangeDisposable?.dispose();
  onDidSaveTextDocumentDisposable?.dispose();
  onDidChangeVisibleTextEditors?.dispose();
}
