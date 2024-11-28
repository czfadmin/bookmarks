import {
  Disposable,
  FileCreateEvent,
  FileWillCreateEvent,
  TextEditor,
  TextEditorDecorationType,
  Uri,
  window,
  workspace,
} from 'vscode';

import {
  getBookmarkFromLineNumber,
  updateBookmarksGroupByChangedLine,
} from './utils/bookmark';
import {registerExtensionCustomContextByKey} from './context';
import {resolveBookmarkController} from './bootstrap';
import resolveServiceManager from './services/ServiceManager';

let onDidChangeVisibleTextEditors: Disposable | undefined;
let onDidSaveTextDocumentDisposable: Disposable | undefined;
let onDidCursorChangeDisposable: Disposable | undefined;
let onDidChangeBreakpoints: Disposable | undefined;
let onDidChangeTextDocumentDisposable: Disposable | undefined;
let onDidRenameFilesDisposable: Disposable | undefined;
let onDidDeleteFilesDisposable: Disposable | undefined;
let onDidTextSelectionDisposable: Disposable | undefined;

export const locker = {
  refactoring: false,
  didCreate: false,
  willCreate: false,
  didDelete: false,
  willDelete: false,
  didRename: false,
  willRename: false,
};

export function updateChangeActiveTextEditorListener() {
  const sm = resolveServiceManager();
  // 当打开多个editor group时,更新每个editor的中的decorations
  let visibleTextEditors = window.visibleTextEditors;
  if (visibleTextEditors.length) {
    visibleTextEditors.forEach(editor => {
      sm.decorationService.updateDecorationsByEditor(editor, true);
    });
  }
}

/**
 * @zh 监听`onDidChangeVisibleTextEditors`事件: 当打开的`editor` 发生变化, 更新所有打开的`TextEditor`上的装饰器
 */
export function updateChangeVisibleTextEditorsListener() {
  onDidChangeVisibleTextEditors?.dispose();
  const sm = resolveServiceManager();
  onDidChangeVisibleTextEditors = window.onDidChangeVisibleTextEditors(
    editors => {
      for (let editor of editors) {
        sm.decorationService.updateDecorationsByEditor(editor, true);
      }
    },
  );
}

let lastPositionLine = -1;
let decoration: TextEditorDecorationType | undefined;

/**
 * @zh 跟随鼠标移动,显示鼠标所在行的书签的 `lineBlame` 信息
 */
export function updateCursorChangeListener() {
  onDidCursorChangeDisposable?.dispose();
  decoration?.dispose();
  lastPositionLine = -1;
  const sm = resolveServiceManager();
  const enableLineBlame =
    (sm.configure.configure.lineBlame as boolean) || false;

  const activeEditor = window.activeTextEditor;

  if (activeEditor) {
    updateLineBlame(activeEditor, enableLineBlame);
  }
  onDidCursorChangeDisposable = window.onDidChangeTextEditorSelection(ev => {
    const editor = ev.textEditor;
    updateLineBlame(editor, enableLineBlame);
  });
}

/**
 * 更新LineBlame
 * @param editor {TextEditor}
 * @param enableLineBlame {boolean}
 * @returns
 */
function updateLineBlame(editor: TextEditor, enableLineBlame: boolean) {
  if (!enableLineBlame) {
    decoration && editor.setDecorations(decoration, []);
    decoration?.dispose();
    lastPositionLine = -1;
    return;
  }
  const controller = resolveBookmarkController();
  const section = editor.selections[0];
  const bookmarks = controller.getBookmarkStoreByFileUri(editor.document.uri);
  if (!bookmarks.length) {
    decoration?.dispose();
  }
  if (
    editor.selections.length === 1 &&
    section.isEmpty &&
    section.isSingleLine
  ) {
    const bookmark = getBookmarkFromLineNumber(section.active.line);
    if (!bookmark || !bookmark.label) {
      decoration?.dispose();
      return;
    }
    if (section.active.line !== lastPositionLine) {
      lastPositionLine = section.active.line;
    }
    decoration?.dispose();
    decoration = window.createTextEditorDecorationType({
      isWholeLine: true,
    });

    editor.setDecorations(decoration, [
      {
        range: section,
        renderOptions: {
          after: {
            color: '#ffffff40',
            margin: '0 16px 0 16px',
            contentText: bookmark.lineBlame,
            contentIconPath: bookmark.iconPath,
          },
        },
      },
    ]);
  }
}

/**
 * @zh 当文档变化时 进行对文档中的书签
 */
export function updateBookmarkInfoWhenTextChangeListener() {
  onDidChangeTextDocumentDisposable?.dispose();
  const controller = resolveBookmarkController();
  onDidChangeTextDocumentDisposable = workspace.onDidChangeTextDocument(e => {
    const {contentChanges, document} = e;
    // 代表存在文档发生变化
    if (contentChanges.length) {
      const bookmarks = controller.getBookmarkStoreByFileUri(document.uri);
      if (!bookmarks.length) {
        return;
      }
      for (let change of contentChanges) {
        updateBookmarksGroupByChangedLine(e, change);
      }
    }
  });
}

/**
 * 创建文件系统监听器,并在文件改动时更改书签数据
 */
export function updateFilesRenameAndDeleteListeners() {
  onDidRenameFilesDisposable?.dispose();
  onDidDeleteFilesDisposable?.dispose();
  const controller = resolveBookmarkController();
  // 监听文件重命名, 同步修改书签的对应的文件信息
  onDidRenameFilesDisposable = workspace.onDidRenameFiles(e => {
    const {files} = e;
    if (!files) {
      return;
    }
    let file: {readonly oldUri: Uri; readonly newUri: Uri};
    for (file of files) {
      const bookmarks = controller.getBookmarkStoreByFileUri(file.oldUri);
      if (!bookmarks.length) {
        continue;
      }
      bookmarks.forEach(it => {
        it.updateFileUri(file.newUri);
      });
    }
  });

  workspace.onWillRenameFiles(e => {});

  // 监听文件删除
  onDidDeleteFilesDisposable = workspace.onDidDeleteFiles(e => {
    const {files} = e;
    const excludeFolders = ['node_modules', '.vscode', 'dist', '.git'];
    if (!files.length) {
      return;
    }
    let file,
      _files = files.filter(
        it => !excludeFolders.some(folder => it.fsPath.includes(folder)),
      );
    for (file of _files) {
      controller.clearAllBookmarkInFile(file);
    }
  });

  workspace.onWillDeleteFiles(e => {});

  /**
   * 在进行refactor中将文件移动到一个新的文件,
   * - 通过对当前的打开的文档激活的行, 判断当前行时候存在书签,
   * - 如果有书签, 需要当前的书签的数据移动到新的文件, 此时进行对当前行的内容和新的文件中的内容进行正则匹配, 完成书签位置调整
   * - 如果没用, 更新当前激活的文件中的存在的书签的数据, 此时已经有`updateBookmarkInfoWhenTextChangeListener` 监听的事件进行处理.
   */
  workspace.onDidCreateFiles((e: FileCreateEvent) => {
    const {files} = e;
    console.log(
      'workspace.onDidCreateFiles:',
      files,
      window.activeTextEditor?.selection.active.line,
    );

    locker.willCreate = false;

    const activeTextEditor = window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }

    const activeLine = activeTextEditor.selection.active.line;

    const existingBookmark = getBookmarkFromLineNumber(activeLine);

    console.log('当前书签: ', existingBookmark);

    if (!existingBookmark) {
      return;
    }

    existingBookmark.updateFileUri(files[0]);
  });

  workspace.onWillCreateFiles((e: FileWillCreateEvent) => {
    const {files} = e;
    console.log(
      'workspace.onWillCreateFiles:',
      files,
      window.activeTextEditor?.selection.active.line,
    );
    locker.willCreate = true;
  });

  // workspace.onWillSaveTextDocument(e => {
  //   console.log("workspace.onWillSaveTextDocument:", e, window.activeTextEditor?.selection.active.line)
  // })
}

/**
 * 监听文档的选择变化, 借此判断用户是否选择一些内容, 用以支持`bookmark-manager.toggleBookmarkWithSelection`命令是否可以在`命令面板`中展示
 * 主要通过`bookmark-manager.editorHasSelection`自定义上下文控制
 */
export function updateTextEditorSelectionListener() {
  onDidTextSelectionDisposable?.dispose();
  onDidTextSelectionDisposable = window.onDidChangeTextEditorSelection(ev => {
    const editor = ev.textEditor;
    if (!editor) {
      return;
    }
    const selection = editor.selection;
    registerExtensionCustomContextByKey(
      'editorHasSelection',
      !selection.isEmpty,
    );
  });
}

export function disableAllEvents() {
  onDidChangeBreakpoints?.dispose();
  onDidCursorChangeDisposable?.dispose();
  onDidSaveTextDocumentDisposable?.dispose();
  onDidChangeVisibleTextEditors?.dispose();
  onDidChangeTextDocumentDisposable?.dispose();
  onDidDeleteFilesDisposable?.dispose();
  onDidRenameFilesDisposable?.dispose();
  onDidTextSelectionDisposable?.dispose();
  decoration?.dispose();
}
