import {
  QuickPickItem,
  Selection,
  TextEditorRevealType,
  Uri,
  l10n,
  window,
  workspace,
} from 'vscode';
import {registerCommand} from '../utils';
import {
  CMD_TOGGLE_LINE_BOOKMARK,
  CMD_TOGGLE_BOOKMARK_WITH_LABEL,
  CMD_CLEAR_ALL,
  CMD_DELETE_BOOKMARK,
  CMD_EDIT_LABEL,
  CMD_GO_TO_SOURCE_LOCATION,
  CMD_TOGGLE_BOOKMARK_WITH_SECTIONS,
  CMD_BOOKMARK_ADD_MORE_MEMO,
  CMD_JUMP_TO_BOOKMARK,
  CMD_CHANGE_BOOKMARK_COLOR,
  CMD_OPEN_IN_EDITOR,
} from '../constants';

import {updateActiveEditorAllDecorations} from '../decorations';
import {BookmarkMeta, LineBookmarkContext} from '../types';

import {
  checkIfBookmarksIsInCurrentEditor,
  chooseBookmarkColor,
  deleteBookmark,
  editBookmarkDescription,
  gotoSourceLocation,
  quicklyJumpToBookmark,
  toggleBookmarksWithSelections,
  toggleBookmark,
  editBookmarkLabel,
  getBookmarkFromLineNumber,
  getBookmarksFromFileUri,
  getLineInfoStrFromBookmark,
} from '../utils/bookmark';
import BookmarksTreeItem from '../providers/BookmarksTreeItem';
import gutters, {getTagGutters} from '../gutter';
import {resolveBookmarkController} from '../bootstrap';

/**
 * 从`context`获取书签数据

 * @param cb
 * @returns
 */
function getBookmarkFromCtx(
  context: LineBookmarkContext | BookmarksTreeItem | undefined,
  cb?: () => void,
) {
  let bookmark: BookmarkMeta | undefined;
  if (
    context &&
    'contextValue' in context &&
    context.contextValue === 'bookmark'
  ) {
    bookmark = context.meta as BookmarkMeta;
  } else {
    bookmark = getBookmarkFromLineNumber();
  }

  if (!bookmark && cb) {
    cb();
    return;
  }
  return bookmark;
}

/**
 * 注册所需要的代码相关命令
 */
export function registerCodeCommands() {
  toggleLineBookmark();
  toggleLineBookmarkWithLabel();
  toggleLineBookmarkWithColor();
  clearAllBookmarks();
  deleteBookmarkCMD();
  editBookmark();
  goToBookmark();
  toggleSelectionBookmark();
  quickPreviewOrJumpToBookmark();
  changeBookmarkColor();
  clearAllBookmarksInCurrentFile();
  addMoreMemo();
  openInEditor();
  listBookmarksInCurrentFile();
  viewAsList();
  viewAsTree();
  groupedByColor();
  groupedByDefault();
}

/**
 * 开启行书签, 使用默认颜色且无标签等相关信息
 */
function toggleLineBookmark() {
  registerCommand(
    CMD_TOGGLE_LINE_BOOKMARK,
    async (args: LineBookmarkContext) => {
      toggleBookmark(args, {type: 'line'});
    },
  );
}

/**
 * 开启带有标签的行书签
 */
function toggleLineBookmarkWithLabel() {
  registerCommand(
    CMD_TOGGLE_BOOKMARK_WITH_LABEL,
    async (context: LineBookmarkContext) => {
      const label = await window.showInputBox({
        placeHolder: l10n.t('Type a label for your bookmarks'),
        title: l10n.t(
          'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
        ),
      });
      if (!label) {
        return;
      }
      toggleBookmark(context, {
        label,
        type: 'line',
      });
    },
  );
}

/**
 * 开启行书签,并可以指定书签颜色
 */
function toggleLineBookmarkWithColor() {
  registerCommand(
    'toggleLineBookmarkWithColor',
    async (context: LineBookmarkContext) => {
      toggleBookmark(context, {
        withColor: true,
        type: 'line',
      });
    },
  );
}

/**
 * 清除书签
 */
function clearAllBookmarks() {
  registerCommand(CMD_CLEAR_ALL, args => {
    updateActiveEditorAllDecorations(true);
    let fileUri,
      clearAll = false;
    const controller = resolveBookmarkController();
    if (!controller) return;
    if (args && args.meta) {
      fileUri = args.meta.fileUri;
      controller.clearAllBookmarkInFile(fileUri);
    } else {
      controller.clearAll();
      clearAll = true;
    }
    updateActiveEditorAllDecorations(clearAll);
  });
}

function deleteBookmarkCMD() {
  // 删除书签
  registerCommand(
    CMD_DELETE_BOOKMARK,
    (context: LineBookmarkContext | BookmarksTreeItem) => {
      const controller = resolveBookmarkController();
      if (!context || !controller) {
        return;
      }
      updateActiveEditorAllDecorations(true);
      // 从treeView中执行此命令
      if ('meta' in context && 'color' in context.meta) {
        const _meta = context.meta as BookmarkMeta;
        controller.remove(_meta.id);
        updateActiveEditorAllDecorations();
        return;
      }
      // 从`decoration`或者`command palette`那边删除调用此命令
      if (!('bookmarks' in context)) {
        deleteBookmark(context as LineBookmarkContext);
      }
      updateActiveEditorAllDecorations();
    },
  );
}

/**
 * 编辑书签
 */
function editBookmark() {
  // 编辑书签标签
  registerCommand(
    CMD_EDIT_LABEL,
    (context: LineBookmarkContext | BookmarksTreeItem | undefined) => {
      let bookmark: BookmarkMeta | undefined = getBookmarkFromCtx(context);

      if (!bookmark) {
        window.showInformationMessage(
          l10n.t('Please select the bookmark before proceeding.'),
          {},
        );
        return;
      }

      window
        .showInputBox({
          placeHolder: l10n.t('Type a label for your bookmarks'),
          title: l10n.t(
            'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
          ),
          value: bookmark.label,
        })
        .then(label => {
          if (!label || !bookmark) {
            return;
          }
          editBookmarkLabel(bookmark, label);
        });
    },
  );
}

/**
 * 定位书签位置,并跳转到书签位置
 */
function goToBookmark() {
  registerCommand(CMD_GO_TO_SOURCE_LOCATION, args => {
    gotoSourceLocation(args.meta || args);
  });
}

/**
 * 为选中的区域增加书签
 */
function toggleSelectionBookmark() {
  registerCommand(CMD_TOGGLE_BOOKMARK_WITH_SECTIONS, ctx => {
    window
      .showInputBox({
        placeHolder: l10n.t('Type a label for your bookmarks'),
        title: l10n.t(
          'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
        ),
      })
      .then(label => {
        if (!label) {
          return;
        }

        toggleBookmarksWithSelections(label);
      });
  });
}

/**
 * 快速跳转到书签位置,并预览书签
 */
function quickPreviewOrJumpToBookmark() {
  registerCommand(CMD_JUMP_TO_BOOKMARK, args => {
    quicklyJumpToBookmark();
  });
}

function changeBookmarkColor() {
  // 改变书签颜色
  registerCommand(
    CMD_CHANGE_BOOKMARK_COLOR,
    async (ctx: LineBookmarkContext | BookmarksTreeItem | undefined) => {
      let bookmark: BookmarkMeta | undefined = getBookmarkFromCtx(ctx);
      if (!bookmark) {
        window.showInformationMessage(
          l10n.t('Please select bookmark color'),
          {},
        );
        return;
      }

      const newColor = await chooseBookmarkColor();
      if (!newColor) {
        return;
      }
      const controller = resolveBookmarkController();
      if (!controller) return;
      controller.update(bookmark.id, {
        color: newColor,
      });
      updateActiveEditorAllDecorations();
    },
  );
}

/**
 * 删除当前打开的文档中的已存在的书签
 */
function clearAllBookmarksInCurrentFile() {
  registerCommand('clearAllBookmarksInCurrentFile', async args => {
    const activedEditor = window.activeTextEditor;
    const controller = resolveBookmarkController();
    if (!activedEditor || !controller) return;
    if (checkIfBookmarksIsInCurrentEditor(activedEditor)) {
      controller.clearAllBookmarkInFile(activedEditor.document.uri);
      updateActiveEditorAllDecorations();
    }
  });
}

/**
 * 为书签增加备注信息
 */
function addMoreMemo() {
  registerCommand(
    CMD_BOOKMARK_ADD_MORE_MEMO,
    (ctx: LineBookmarkContext | BookmarksTreeItem | undefined) => {
      let bookmark: BookmarkMeta | undefined = getBookmarkFromCtx(ctx);
      if (!bookmark) {
        window.showInformationMessage(
          l10n.t('Please select the bookmark before proceeding.'),
          {},
        );
        return;
      }
      window
        .showInputBox({
          placeHolder: l10n.t('Type more info for your bookmarks'),
          title: l10n.t(
            'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
          ),
        })
        .then(description => {
          if (!description) {
            return;
          }

          editBookmarkDescription(bookmark!, description);
        });
    },
  );
}

/**
 * 列出当前文件中的所有信息
 */
export function listBookmarksInCurrentFile() {
  registerCommand(
    'listBookmarksInCurrentFile',
    async (ctx: LineBookmarkContext | BookmarksTreeItem | undefined) => {
      const editor = window.activeTextEditor;
      const controller = resolveBookmarkController();
      const bookmarkDS = controller.datasource;
      if (!editor || !bookmarkDS) return;
      const bookmarks = getBookmarksFromFileUri(editor.document.uri);
      if (!bookmarks.length) return;
      const tagGutters = getTagGutters();
      const pickItems = bookmarks.map((it: any) => {
        const iconPath = it.label
          ? tagGutters[it.color] || tagGutters['default']
          : gutters[it.color] || tagGutters['default'];
        return {
          label:
            it.label ||
            it.description ||
            it.selectionContent?.slice(0, 120) ||
            '',
          description: getLineInfoStrFromBookmark(it),
          detail: it.fileUri.fsPath,
          iconPath: iconPath as Uri,
          meta: {
            ...it,
            selection: new Selection(it.selection.anchor, it.selection.active),
          },
        };
      });

      const choosedBookmarks = await window.showQuickPick(pickItems, {
        title: l10n.t(
          'Select a bookmark to jump to the corresponding location.',
        ),
        placeHolder: l10n.t('Please select the bookmark you want to open'),
        canPickMany: false,
        ignoreFocusOut: false,
        async onDidSelectItem(item: QuickPickItem & {meta: BookmarkMeta}) {
          // @ts-ignore
          let bookmark = typeof item === 'object' ? item.meta : undefined;
          if (bookmark) {
            const doc = await workspace.openTextDocument(
              Uri.parse(bookmark.fileUri.path),
            );
            const editor = await window.showTextDocument(doc, {
              preview: true,
              preserveFocus: true,
            });
            editor.selection = new Selection(
              bookmark.selection.start,
              bookmark.selection.end,
            );
            editor.revealRange(
              bookmark.selection,
              TextEditorRevealType.InCenterIfOutsideViewport,
            );
          }
        },
      });
      if (!choosedBookmarks) {
        return;
      }
    },
  );
}

/**
 * @TODO 注册命令在 `editor` 中打开书签管理器中的数据
 */
export function openInEditor() {
  registerCommand(CMD_OPEN_IN_EDITOR, args => {
    window.showInformationMessage(
      l10n.t('This feature has not been developed yet, thanks!'),
    );
  });
}

/**
 * 按照树格式展示
 */
function viewAsTree() {
  registerCommand('viewAsTree', args => {
    const controller = resolveBookmarkController();
    controller.changeViewType('tree');
  });
}

/**
 * 按照列表方式显示
 */
function viewAsList() {
  registerCommand('viewAsList', args => {
    const controller = resolveBookmarkController();
    controller.changeViewType('list');
  });
}

/**
 * 按颜色分组
 */
function groupedByColor() {
  registerCommand('groupedByColor', args => {
    const controller = resolveBookmarkController();
    controller.changeGroupView('color');
  });
}

/**
 * 默认排序分组
 */
function groupedByDefault() {
  registerCommand('groupedByDefault', args => {
    const controller = resolveBookmarkController();
    controller.changeGroupView('default');
  });
}
