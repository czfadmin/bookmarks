import { Disposable, debug, window, workspace } from 'vscode';

import { updateDecorationsByEditor } from './decorations';

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
    (ev) => {}
  );
}

export function updateSaveTextDocumentListener() {
  onDidSaveTextDocumentDisposable?.dispose();
  onDidSaveTextDocumentDisposable = workspace.onDidSaveTextDocument((ev) => {});
}

export function updateCursorChangeListener() {
  onDidCursorChangeDisposable?.dispose();
  onDidCursorChangeDisposable = window.onDidChangeTextEditorSelection(
    (ev) => {}
  );
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
