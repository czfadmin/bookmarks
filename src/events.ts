import {
  Disposable,
  Position,
  Selection,
  debug,
  window,
  workspace,
} from 'vscode';

import {
  updateActiveEditorAllDecorations,
  updateDecorationsByEditor,
} from './decorations';
import { BookmarksController } from './controllers/BookmarksController';
import {
  getBookmarkFromRanges,
  updateBookmarksGroupByChangedLine,
} from './utils/bookmark';

let onDidChangeActiveTextEditor: Disposable | undefined;
let onDidChangeVisibleTextEditors: Disposable | undefined;
let onDidSaveTextDocumentDisposable: Disposable | undefined;
let onDidCursorChangeDisposable: Disposable | undefined;
let onDidChangeBreakpoints: Disposable | undefined;
let onDidChangeTextDocumentDisposable: Disposable | undefined;
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

/**
 * 监听`onDidChangeVisibleTextEditors`事件: 当打开的`editor` 发生变化, 更新所有打开的`TextEditor`上的装饰器
 */
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
  // onDidCursorChangeDisposable = window.onDidChangeTextEditorSelection((ev) => {
  //   const { kind } = ev;
  //   const section = ev.selections[0];
  //   if (ev.selections.length === 1 && section.isEmpty && section.isSingleLine) {
  //     // logger.info(
  //     //   'singleLine',
  //     //   ev.selections,
  //     //   ev.textEditor.document.getText(ev.selections[0])
  //     // );
  //     // TODO: 更新bookmark的位置
  //   }

  //   if (!ev.textEditor.document.isUntitled) {
  //     const cursorPos = ev.selections[0].active;
  //     if (cursorPos.character === 0) {
  //       commands.executeCommand(
  //         'setContext',
  //         `${EXTENSION_ID}.currentLineHasBookmark`,
  //         false
  //       );
  //     }
  //   }
  // });
}

export function updateBookmarkInfoWhenTextChangeListener() {
  onDidChangeTextDocumentDisposable?.dispose();
  onDidChangeTextDocumentDisposable = workspace.onDidChangeTextDocument((e) => {
    const { contentChanges, document } = e;
    // 代表存在文档发生变化
    if (contentChanges.length) {
      const bookmarkStore =
        BookmarksController.instance.getBookmarkStoreByFileUri(document.uri);
      if (!bookmarkStore) return;
      console.log(contentChanges.length, contentChanges);
      for (let change of contentChanges) {
        updateBookmarksGroupByChangedLine(
          bookmarkStore,
          e,
          change,
        );
      }
      updateActiveEditorAllDecorations();
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
  onDidChangeTextDocumentDisposable?.dispose();
}
