import {
  Disposable,
  Position,
  Selection,
  TextEditorDecorationType,
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
  getBookmarkFromLineNumber,
  getBookmarkFromRanges,
  getBookmarkFromSelection,
  updateBookmarksGroupByChangedLine,
} from './utils/bookmark';
import { getAllPrettierConfiguration } from './configurations';
import { BookmarkMeta } from './types';

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

let lastPositionLine = -1;
let decoration: TextEditorDecorationType | undefined;
/**
 * 跟随鼠标移动,显示鼠标所在行的鼠标的信息
 */
export function updateCursorChangeListener() {
  onDidCursorChangeDisposable?.dispose();
  decoration?.dispose();
  lastPositionLine = -1;
  const enableLineBlame = getAllPrettierConfiguration().lineBlame;
  onDidCursorChangeDisposable = window.onDidChangeTextEditorSelection((ev) => {
    const editor = ev.textEditor;
    if (!enableLineBlame) {
      decoration && editor.setDecorations(decoration, []);
      decoration?.dispose();
      lastPositionLine = -1;
      return;
    }
    const section = ev.selections[0];
    const store = BookmarksController.instance.getBookmarkStoreByFileUri(
      editor.document.uri
    );
    if (!store) {
      decoration?.dispose();
    }
    if (ev.selections.length === 1 && section.isEmpty && section.isSingleLine) {
      const bookmark = getBookmarkFromLineNumber(store, section.active.line);
      if (!bookmark || !bookmark.label) {
        decoration?.dispose();
        return;
      }
      if (section.active.line !== lastPositionLine) {
        lastPositionLine = section.active.line;
        decoration?.dispose();
      }
      decoration = window.createTextEditorDecorationType({
        isWholeLine: false,
      });

      editor.setDecorations(decoration, [
        {
          range: section,
          renderOptions: {
            after: {
              color: '#ffffff40',
              margin: '0 6px 0 6px',
              contentText: buildLineBlameInfo(bookmark),
            },
          },
        },
      ]);
    }
  });
}

function buildLineBlameInfo(bookmark: BookmarkMeta) {
  if (bookmark.label && bookmark.description) {
    return `${bookmark.label} - ${bookmark.description}`;
  }
  if (bookmark.label && !bookmark.description) {
    return bookmark.label;
  }
  if (bookmark.description && !bookmark.label) {
    return bookmark.description;
  }
  return '';
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
        updateBookmarksGroupByChangedLine(bookmarkStore, e, change);
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
