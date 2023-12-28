import {ExtensionContext, l10n, window} from 'vscode';
import {registerCommand} from './utils';
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
} from './constants';

import {updateActiveEditorAllDecorations} from './decorations';
import {BookmarkMeta, LineBookmarkContext} from './types';
import {BookmarksController} from './controllers/BookmarksController';

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
} from './utils/bookmark';
import {BookmarksTreeItem} from './providers/BookmarksTreeItem';

/**
 * 从`context`获取书签数据
 * @param context
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
    bookmark = getBookmarkFromLineNumber(undefined);
  }

  if (!bookmark && cb) {
    cb();
    return;
  }
  return bookmark;
}

/**
 * 注册所需要的命令
 * @param context
 */
export function registerCommands(context: ExtensionContext) {
  toggleLineBookmark(context);
  toggleLineBookmarkWithLabel(context);
  toggleLineBookmarkWithColor(context);
  clearAllBookmarks(context);
  deleteBookmarkCMD(context);
  editBookmark(context);
  goToBookmark(context);
  toggleSelectionBookmark(context);
  quickPreviewOrJumpToBookmark(context);
  changeBookmarkColor(context);
  clearAllBookmarksInCurrentFile(context);
  addMoreMemo(context);
  openInEditor(context);
}

/**
 * 开启行书签, 使用默认颜色且无标签等相关信息
 * @param context
 */
function toggleLineBookmark(context: ExtensionContext) {
  registerCommand(
    context,
    CMD_TOGGLE_LINE_BOOKMARK,
    async (args: LineBookmarkContext) => {
      toggleBookmark(args, {type: 'line'});
    },
  );
}

/**
 * 开启带有标签的行书签
 * @param context
 */
function toggleLineBookmarkWithLabel(context: ExtensionContext) {
  registerCommand(
    context,
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
 * @param context
 */
function toggleLineBookmarkWithColor(context: ExtensionContext) {
  registerCommand(
    context,
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
 * @param context
 */
function clearAllBookmarks(context: ExtensionContext) {
  registerCommand(context, CMD_CLEAR_ALL, args => {
    updateActiveEditorAllDecorations(true);
    let fileUri,
      clearAll = false;
    if (args && args.meta) {
      fileUri = args.meta.fileUri;
      BookmarksController.instance.clearAllBookmarkInFile(fileUri);
    } else {
      BookmarksController.instance.clearAll();
      clearAll = true;
    }
    updateActiveEditorAllDecorations(clearAll);
  });
}

function deleteBookmarkCMD(context: ExtensionContext) {
  // 删除书签
  registerCommand(
    context,
    CMD_DELETE_BOOKMARK,
    (context: LineBookmarkContext | BookmarksTreeItem) => {
      if (!context) {
        return;
      }
      updateActiveEditorAllDecorations(true);
      // 从treeView中执行此命令
      if ('meta' in context && 'color' in context.meta) {
        BookmarksController.instance.remove(context.meta);
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
 * @param context
 */
function editBookmark(context: ExtensionContext) {
  // 编辑书签标签
  registerCommand(
    context,
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
 * @param context
 */
function goToBookmark(context: ExtensionContext) {
  registerCommand(context, CMD_GO_TO_SOURCE_LOCATION, args => {
    gotoSourceLocation(args.meta || args);
  });
}

/**
 * 为选中的区域增加书签
 * @param context
 */
function toggleSelectionBookmark(context: ExtensionContext) {
  registerCommand(context, CMD_TOGGLE_BOOKMARK_WITH_SECTIONS, ctx => {
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
 * @param context
 */
function quickPreviewOrJumpToBookmark(context: ExtensionContext) {
  registerCommand(context, CMD_JUMP_TO_BOOKMARK, args => {
    quicklyJumpToBookmark();
  });
}

function changeBookmarkColor(context: ExtensionContext) {
  // 改变书签颜色
  registerCommand(
    context,
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
      BookmarksController.instance.update(bookmark, {
        color: newColor,
      });
      updateActiveEditorAllDecorations();
    },
  );
}

/**
 * 删除当前打开的文档中的已存在的书签
 * @param context
 */
function clearAllBookmarksInCurrentFile(context: ExtensionContext) {
  registerCommand(context, 'clearAllBookmarksInCurrentFile', async args => {
    const activedEditor = window.activeTextEditor;
    if (!activedEditor) return;
    if (checkIfBookmarksIsInCurrentEditor(activedEditor)) {
      BookmarksController.instance.clearAllBookmarkInFile(
        activedEditor.document.uri,
      );
      updateActiveEditorAllDecorations();
    }
  });
}

/**
 * 为书签增加备注信息
 * @param context
 */
function addMoreMemo(context: ExtensionContext) {
  registerCommand(
    context,
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
 * @TODO 注册命令在 `editor` 中打开书签管理器中的数据
 * @param context
 */
export function openInEditor(context: ExtensionContext) {
  registerCommand(context, CMD_OPEN_IN_EDITOR, args => {
    window.showInformationMessage(
      l10n.t('This feature has not been developed yet, thanks!'),
    );
  });
}
