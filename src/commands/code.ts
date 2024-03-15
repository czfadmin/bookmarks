import {
  QuickPickItem,
  Selection,
  TextEditorRevealType,
  Uri,
  l10n,
  window,
  workspace,
} from 'vscode';
import {
  CMD_BOOKMARK_ADD_MORE_MEMO,
  CMD_CHANGE_BOOKMARK_COLOR,
  CMD_CHANGE_BOOKMARK_COLOR_NAME,
  CMD_CLEAR_ALL,
  CMD_DELETE_BOOKMARK,
  CMD_EDIT_LABEL,
  CMD_GO_TO_SOURCE_LOCATION,
  CMD_JUMP_TO_BOOKMARK,
  CMD_OPEN_IN_EDITOR,
  CMD_TOGGLE_BOOKMARK_WITH_LABEL,
  CMD_TOGGLE_BOOKMARK_WITH_SECTIONS,
  CMD_TOGGLE_LINE_BOOKMARK,
} from '../constants';
import {registerCommand} from '../utils';

import {LineBookmarkContext} from '../types';

import {resolveBookmarkController} from '../bootstrap';
import BookmarkTreeItem from '../providers/BookmarksTreeItem';
import resolveServiceManager from '../services/ServiceManager';
import {
  checkIfBookmarksIsInCurrentEditor,
  chooseBookmarkColor,
  deleteBookmark,
  getBookmarkFromLineNumber,
  getBookmarksFromFileUri,
  getLineInfoStrFromBookmark,
  gotoSourceLocation,
  quicklyJumpToBookmark,
  toggleBookmark,
  toggleBookmarksWithSelections,
} from '../utils/bookmark';
import {IBookmark} from '../stores/bookmark';

/**
 * 从`context`获取书签数据

 * @param cb
 * @returns
 */
function getBookmarkFromCtx(context: LineBookmarkContext, cb?: () => void) {
  let bookmark: IBookmark | undefined;
  if (
    context &&
    'contextValue' in context &&
    context.contextValue === 'bookmark'
  ) {
    bookmark = context.meta as IBookmark;
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
 * 从`context`获取书签数据

 * @param cb
 * @returns
 */
function getBookmarkColorFromCtx(
  context: LineBookmarkContext | BookmarkTreeItem | undefined,
  cb?: () => void,
) {
  let bookmark: IBookmark | undefined;
  if (
    context &&
    'contextValue' in context &&
    context.contextValue === 'color'
  ) {
    bookmark = context.meta as IBookmark;
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
  changeBookmarkColorName();
  clearAllBookmarksInCurrentFile();
  addMoreMemo();
  openInEditor();
  listBookmarksInCurrentFile();
  viewAsList();
  viewAsTree();
  groupedByColor();
  groupedByDefault();
  groupedByWorkspace();
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
 * 清除所有的书签
 */
function clearAllBookmarks() {
  registerCommand(CMD_CLEAR_ALL, args => {
    const controller = resolveBookmarkController();
    if (!controller) {
      return;
    }
    controller.clearAll();
  });
}
/**
 * 通过命令行删除书签
 * - 从`command palette` 上调用删除操作, context 为undefined
 * - 从 左侧通过gutter的菜单上下文调用删除操作, context 类型为 LineBookmarkContext
 * - 从 文本编辑器中的菜单上下文调用删除操作, context 类型为 当前打开的文件的uri
 * - 从树视图中调用删除操作, context 类型为 BookmarkTreeItem
 */
function deleteBookmarkCMD() {
  registerCommand(CMD_DELETE_BOOKMARK, (context: LineBookmarkContext) => {
    const controller = resolveBookmarkController();
    if (!controller) {
      return;
    }

    deleteBookmark(context);
  });
}

/**
 * 编辑书签
 * 从`editor`中追加书签的情况下
 *  - 如果存在, 更新书签的label
 *  - 如果不存在, 创建书签并追加label
 */
function editBookmark() {
  registerCommand(CMD_EDIT_LABEL, async (context: LineBookmarkContext) => {
    let bookmark: IBookmark | undefined = getBookmarkFromCtx(context);
    const label = await window.showInputBox({
      placeHolder: l10n.t('Type a label for your bookmarks'),
      title: l10n.t(
        'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
      ),
      value: bookmark?.label || '',
    });
    if (!label) {
      return;
    }
    if (!bookmark) {
      toggleBookmark(context as LineBookmarkContext | undefined, {
        label,
        type: 'line',
      });
    } else {
      bookmark.updateLabel(label);
    }
  });
}

/**
 * 定位书签位置,并跳转到书签位置
 */
function goToBookmark() {
  registerCommand(CMD_GO_TO_SOURCE_LOCATION, args => {
    const sm = resolveServiceManager();
    const {enableClick} = sm.configService.configuration;

    // 表示点击TreeView中的定位图标进入此方法, 反之为单击书签跳转到书签位置
    if (args.meta || (args && enableClick)) {
      gotoSourceLocation(args.meta || args);
    }
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

/**
 *  改变书签颜色
 */
function changeBookmarkColor() {
  registerCommand(
    CMD_CHANGE_BOOKMARK_COLOR,
    async (ctx: LineBookmarkContext) => {
      let bookmark: IBookmark | undefined = getBookmarkFromCtx(ctx);
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
      if (!controller) {
        return;
      }
      bookmark.updateColor({
        ...bookmark.customColor,
        name: newColor,
      });
    },
  );
}

function changeBookmarkColorName() {
  registerCommand(
    CMD_CHANGE_BOOKMARK_COLOR_NAME,
    async (ctx: LineBookmarkContext) => {
      let bookmark: IBookmark | undefined = getBookmarkColorFromCtx(ctx);
      if (!bookmark) {
        window.showInformationMessage(
          l10n.t('Please select bookmark color'),
          {},
        );
        return;
      }

      const newColorName = await window.showInputBox({
        placeHolder: l10n.t('Type a name for your bookmarks color'),
        title: l10n.t(
          'Bookmark Color Name (Press `Enter` to confirm or press `Escape` to cancel)',
        ),
        value: bookmark.color,
      });

      if (!newColorName) {
        return;
      }

      const controller = resolveBookmarkController();
      if (!controller) {
        return;
      }
      bookmark.updateColor({
        ...bookmark.customColor,
        name: newColorName,
      });
    },
  );
}

/**
 * 删除当前打开的文档中的已存在的书签
 */
function clearAllBookmarksInCurrentFile() {
  registerCommand('clearAllBookmarksInCurrentFile', async args => {
    const controller = resolveBookmarkController();
    if (!controller) {
      return;
    }

    if (args && args.meta) {
      controller.clearAllBookmarkInFile(args.meta.fileUri);
    } else {
      const activeEditor = window.activeTextEditor;
      if (!activeEditor) {
        return;
      }
      if (checkIfBookmarksIsInCurrentEditor(activeEditor)) {
        controller.clearAllBookmarkInFile(activeEditor.document.uri);
      }
    }
  });
}

/**
 * 为书签增加备注信息
 */
function addMoreMemo() {
  registerCommand(CMD_BOOKMARK_ADD_MORE_MEMO, (ctx: LineBookmarkContext) => {
    let bookmark: IBookmark | undefined = getBookmarkFromCtx(ctx);
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

        bookmark!.updateDescription(description);
      });
  });
}

/**
 * 列出当前文件中的所有信息
 */
export function listBookmarksInCurrentFile() {
  registerCommand(
    'listBookmarksInCurrentFile',
    async (ctx: LineBookmarkContext) => {
      const editor = window.activeTextEditor;
      const controller = resolveBookmarkController();
      const sm = resolveServiceManager();

      const bookmarkDS = controller.store;
      if (!editor || !bookmarkDS) {
        return;
      }
      const bookmarks = getBookmarksFromFileUri(editor.document.uri);
      if (!bookmarks.length) {
        return;
      }
      const tagGutters = sm.gutterService.tagGutters;
      const gutters = sm.gutterService.gutters;
      const pickItems = bookmarks.map((it: any) => {
        const iconPath = it.label
          ? tagGutters[it.color] || tagGutters['default']
          : gutters[it.color] || gutters['default'];
        return {
          label:
            it.label ||
            it.description ||
            it.selectionContent?.slice(0, 120) ||
            '',
          description: getLineInfoStrFromBookmark(it),
          detail: it.fileUri.fsPath,
          iconPath: iconPath.iconPath as any,
          meta: {
            ...it,
            selection: new Selection(it.selection.anchor, it.selection.active),
          },
        };
      });

      const chosenBookmarks = await window.showQuickPick(pickItems, {
        title: l10n.t(
          'Select a bookmark to jump to the corresponding location.',
        ),
        placeHolder: l10n.t('Please select the bookmark you want to open'),
        canPickMany: false,
        ignoreFocusOut: false,
        async onDidSelectItem(item: QuickPickItem & {meta: IBookmark}) {
          // @ts-ignore
          let bookmark = typeof item === 'object' ? item.meta : undefined;
          if (bookmark) {
            const doc = await workspace.openTextDocument(
              Uri.parse(bookmark.fileName),
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
      if (!chosenBookmarks) {
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

/**
 * 按照工作区间分组
 */
function groupedByWorkspace() {
  registerCommand('groupedByWorkspace', args => {
    const controller = resolveBookmarkController();
    controller.changeGroupView('workspace');
  });
}
