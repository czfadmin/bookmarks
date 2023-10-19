import { Disposable, debug, window, workspace } from 'vscode';

import { updateDecorationsByEditor } from './decorations';
import { BookmarksController } from './controllers/BookmarksController';
import { getBookmarkFromRanges } from './utils/bookmark';

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
    const { contentChanges, document, reason } = e;

    // 代表存在文档发生变化
    if (contentChanges.length) {
      const bookmarkStore =
        BookmarksController.instance.getBookmarkStoreByFileUri(document.uri);
      if (!bookmarkStore) return;
      console.log(contentChanges.length, contentChanges);
      for (let change of contentChanges) {
        const bookmark = getBookmarkFromRanges(bookmarkStore, [change.range]);
        if (!bookmark) {
          // TODO: 1. 在存在是否在书签的上方发生了改动 ,如果是的话, 更新在当前range改动下方的书签选区; 2. 在下方的时候不用草最
          // TODO: 1. 删除行 2. 删除 某些选择区域; 3. 新增.
          // TODO: 1. 删除书签所在行, 删除行书签 2. 删除区域书签的部分或者全部区域, 删除当前所涉及的区域的 区域书签
          continue;
        }
        // 当前编辑的地方命中书签的区域中
        // 表示换行
        if (/\r\n(\s.*?)/.test(change.text)) {
          console.log('换行了: ', change);
          // TODO: 如果是行书签 将 行书签转换成 区域标签; 如果是在区域书签中的range中, 扩大 区域书签的 selection
        }
        // 判断在行中进行编辑, 将当前行的书签range 重新设置当前行
        if (/(\s.*?)/.test(change.text)) {
          console.log('增加空格', change);
          // TODO: 如果行书签, 重新选择当前行
        }

        // TODO: 1. 删除书签所在行, 删除行书签 2. 删除区域书签的部分或者全部区域, 删除当前区域书签的所涉及的区域的选区
      }
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
