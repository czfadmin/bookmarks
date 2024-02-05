import {
  Disposable,
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
import {BookmarkMeta} from './types';
import {registerExtensionCustomContextByKey} from './context';
import {resolveBookmarkController} from './bootstrap';
import resolveServiceManager from './services/ServiceManager';

let onDidChangeActiveTextEditor: Disposable | undefined;
let onDidChangeVisibleTextEditors: Disposable | undefined;
let onDidSaveTextDocumentDisposable: Disposable | undefined;
let onDidCursorChangeDisposable: Disposable | undefined;
let onDidChangeBreakpoints: Disposable | undefined;
let onDidChangeTextDocumentDisposable: Disposable | undefined;
let onDidRenameFilesDisposable: Disposable | undefined;
let onDidDeleteFilesDisposable: Disposable | undefined;
let onDidTextSelectionDisposable: Disposable | undefined;

export function updateChangeActiveTextEditorListener() {
  onDidChangeActiveTextEditor?.dispose();
  const sm = resolveServiceManager();
  // 当打开多个editor group时,更新每个editor的中的decorations
  const visibleTextEditors = window.visibleTextEditors;
  if (visibleTextEditors.length) {
    visibleTextEditors.forEach(editor => {
      sm.decorationService.updateDecorationsByEditor(editor);
    });
  }
  onDidChangeActiveTextEditor = window.onDidChangeActiveTextEditor(ev => {
    if (!ev) {
      return;
    }
    sm.decorationService.updateDecorationsByEditor(ev);
  });
}

/**
 * 监听`onDidChangeVisibleTextEditors`事件: 当打开的`editor` 发生变化, 更新所有打开的`TextEditor`上的装饰器
 */
export function updateChangeVisibleTextEidtorsListener() {
  onDidChangeVisibleTextEditors?.dispose();
  const sm = resolveServiceManager();
  onDidChangeVisibleTextEditors = window.onDidChangeVisibleTextEditors(
    editors => {
      for (let editor of editors) {
        sm.decorationService.updateDecorationsByEditor(editor);
      }
    },
  );
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
  const sm = resolveServiceManager();
  const configService = sm.configService;
  const enableLineBlame =
    (configService.configuration.lineBlame as boolean) || false;
  const activedEditor = window.activeTextEditor;
  if (activedEditor) {
    updateLineBlame(activedEditor, enableLineBlame);
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
            margin: '0 12px 0 12px',
            contentText: buildLineBlameInfo(bookmark),
          },
        },
      },
    ]);
  }
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
  const controller = resolveBookmarkController();
  const sm = resolveServiceManager();
  onDidChangeTextDocumentDisposable = workspace.onDidChangeTextDocument(e => {
    const {contentChanges, document} = e;
    // 代表存在文档发生变化
    if (contentChanges.length) {
      const bookmarks = controller.getBookmarkStoreByFileUri(document.uri);
      if (!bookmarks.length) {return;}
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
  const sm = resolveServiceManager();
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
      const filePathArr = file.newUri.path.split('/');
      bookmarks.map(it => {
        return {
          ...it,
          fileId: file.newUri.fsPath,
          fileUri: file.newUri,
          fileName: filePathArr[filePathArr.length - 1],
        };
      });
    }
    controller.save();
  });

  // 监听文件删除
  onDidDeleteFilesDisposable = workspace.onDidDeleteFiles(e => {
    const {files} = e;
    if (!files.length) {
      return;
    }
    let file;
    for (file of files) {
      controller.clearAllBookmarkInFile(file);
    }
  });
}

/**
 * 监听文档的选择变化, 借此判断用户是否选择一些内容, 用以支持`bookmark-manager.toggleBookmarkWithSelection`命令是否可以在`命令面板`中展示
 * 主要通过`bookmark-manager.editorHasSelection`自定义上下文控制
 */
export function updateTextEditorSelectionListener() {
  onDidTextSelectionDisposable?.dispose();
  onDidTextSelectionDisposable = window.onDidChangeTextEditorSelection(ev => {
    const editor = ev.textEditor;
    if (!editor) {return;}
    const selection = editor.selection;
    registerExtensionCustomContextByKey(
      'editorHasSelection',
      !selection.isEmpty,
    );
  });
}

export function disablAllEvents() {
  onDidChangeActiveTextEditor?.dispose();
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
