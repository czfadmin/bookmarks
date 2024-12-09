import {
  Disposable,
  FileCreateEvent,
  FileWillCreateEvent,
  Position,
  Range,
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
import resolveServiceManager, {ServiceManager} from './services/ServiceManager';
import {Locker} from './stores/EventLocker';

import levenshtein from 'fast-levenshtein';

let onDidChangeVisibleTextEditors: Disposable | undefined;
let onDidSaveTextDocumentDisposable: Disposable | undefined;
let onDidCursorChangeDisposable: Disposable | undefined;
let onDidChangeBreakpoints: Disposable | undefined;
let onDidChangeTextDocumentDisposable: Disposable | undefined;
let onDidRenameFilesDisposable: Disposable | undefined;
let onDidDeleteFilesDisposable: Disposable | undefined;
let onDidTextSelectionDisposable: Disposable | undefined;

export const locker = Locker.create({});

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
    if (!contentChanges.length || document.uri.scheme !== 'file') {
      return;
    }
    console.log('文档发生改变', contentChanges, document.uri.fsPath);

    const bookmarks = controller.getBookmarkStoreByFileUri(document.uri);

    if (!bookmarks.length) {
      return;
    }

    if (!locker.didCreate) {
      for (let change of contentChanges) {
        updateBookmarksGroupByChangedLine(e, change);
      }

      return;
    }

    if (
      locker.didCreate &&
      locker.didCreate.fromFileId === document.uri.fsPath
    ) {
      // 获取到所移动的书签, 移动到新的位置`text`长度为0 , rangeLength > 0
      const changes = contentChanges.filter(
        it => !it.text.length && it.rangeLength,
      );

      // 更新其他的书签
      if (!changes.length) {
        for (let change of contentChanges) {
          updateBookmarksGroupByChangedLine(e, change);
        }
        return;
      }

      // 更新移动到新文件的书签的 fileUri, 此时假设`changes`的数目仅为一个
      const _bookmarks = bookmarks.filter(it =>
        changes[0].range.contains(it.rangesOrOptions.range),
      );

      _bookmarks.forEach(it => it.updateFileUri(locker.didCreate!.fileId));

      return;
    }

    if (locker.didCreate.fileId === document.uri.fsPath) {
      for (let bookmark of bookmarks) {
        // 寻找第一个相同的内容的书签作为书签的新的 `range`
        for (let idx = 0; idx < document.lineCount; idx++) {
          const line = document.lineAt(idx);

          if (!line.text) {
            continue;
          }

          // TODO:方法有问题
          if (
            bookmark.selectionContent
              .replace(/\s+/g, '')
              .includes(line.text.replace(/\s+/g, '')) ||
            line.text
              .replace(/\s+/g, '')
              .includes(bookmark.selectionContent.replace(/\s+/g, ''))
          ) {
            bookmark.updateRangesOrOptions(line.range);
            break;
          }
        }
      }

      locker.removeDidCreate();
      return;
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

  // 监听文件删除
  onDidDeleteFilesDisposable = workspace.onDidDeleteFiles(e => {
    const {files} = e;
    const excludeFolders = ['node_modules', '.vscode', 'dist', '.git', 'out'];
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

  /**
   * 在进行refactor中将当前打开的文件中的书签移动到一个新的文件,
   * - 通过对当前的打开的文档激活的行, 判断当前行时候存在书签,
   * - 如果有书签, 需要当前的书签的数据移动到新的文件, 此时进行对当前行的内容和新的文件中的内容进行正则匹配, 完成书签位置调整
   * - 如果没用, 更新当前激活的文件中的存在的书签的数据, 此时已经有`updateBookmarkInfoWhenTextChangeListener` 监听的事件进行处理.
   */
  workspace.onDidCreateFiles((e: FileCreateEvent) => {
    const {files} = e;
    console.log(
      'workspace.onDidCreateFiles:',
      files,
      window.activeTextEditor?.document.uri.fsPath,
    );

    const activeTextEditor = window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }

    // 添加到正在创建的书签列表中
    locker.updateDidCreate(
      files[0].fsPath,
      activeTextEditor.document.uri.fsPath,
      [],
    );
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
