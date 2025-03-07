import {
  window,
  l10n,
  Selection,
  QuickPickItem,
  workspace,
  Uri,
  commands,
  Position,
} from 'vscode';
import {resolveBookmarkController} from '../../bootstrap';
import resolveServiceManager from '../../services/ServiceManager';
import {
  BookmarksGroupedByColorType,
  BookmarksGroupedByIconType,
  IBookmark,
} from '../../stores';
import {
  BookmarksGroupedByFileType,
  BookmarkTypeEnum,
  BookmarkActionContext,
} from '../../types';
import {
  checkIfBookmarksIsInCurrentEditor,
  chooseBookmarkColor,
  deleteBookmark as deleteBookmarkUtil,
  getBookmarksFromFileUri,
  getLineInfoStrFromBookmark,
  gotoSourceLocation as gotoSourceLocationUtil,
  quicklyJumpToBookmark,
  toggleBookmark,
  getBookmarkFromCtx,
  getBookmarkColorFromCtx,
  toggleBookmarksWithSelections,
  highlightSelection,
} from '../../utils';
import {range} from 'lodash';

/**
 * 开启行书签, 使用默认颜色且无标签等相关信息
 */
export function toggleLineBookmark(args: BookmarkActionContext) {
  toggleBookmark(args, {type: BookmarkTypeEnum.LINE});
}

/**
 * 开启带有标签的行书签
 */
export async function toggleLineBookmarkWithLabel(
  context: BookmarkActionContext,
) {
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
    type: BookmarkTypeEnum.LINE,
  });
}

/**
 * 开启行书签,并可以指定书签颜色
 */
export function toggleLineBookmarkWithColor(context: BookmarkActionContext) {
  toggleBookmark(context, {
    withColor: true,
    type: BookmarkTypeEnum.LINE,
  });
}

/**
 * 清除所有的书签
 */
export function clearAllBookmarks(args: any) {
  const controller = resolveBookmarkController();
  if (!controller) {
    return;
  }
  controller.clearAll();
}
/**
 * 通过命令行删除书签
 * - 从`command palette` 上调用删除操作, context 为undefined
 * - 从 左侧通过gutter的菜单上下文调用删除操作, context 类型为 LineBookmarkContext
 * - 从 文本编辑器中的菜单上下文调用删除操作, context 类型为 当前打开的文件的uri
 * - 从树视图中调用删除操作, context 类型为 BookmarkTreeItem
 */
export function deleteBookmark(context: BookmarkActionContext) {
  const controller = resolveBookmarkController();
  if (!controller) {
    return;
  }

  deleteBookmarkUtil(context);
}

/**
 * 编辑书签
 * 从`editor`中追加书签的情况下
 *  - 如果存在, 更新书签的label
 *  - 如果不存在, 创建书签并追加label
 */
export async function editLabel(context: BookmarkActionContext) {
  let bookmark: IBookmark | undefined = getBookmarkFromCtx(context);
  if (!bookmark) {
    window.showInformationMessage(
      l10n.t('Please select the bookmark before proceeding.'),
      {},
    );
    return;
  }
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
    toggleBookmark(context as BookmarkActionContext | undefined, {
      label,
      type: BookmarkTypeEnum.LINE,
    });
  } else {
    bookmark.updateLabel(label);
  }
}

/**
 * 定位书签位置,并跳转到书签位置
 */
export function gotoSourceLocation(args: any) {
  const sm = resolveServiceManager();
  const {enableClick} = sm.configure.configure;

  // 表示点击TreeView中的定位图标进入此方法, 反之为单击书签跳转到书签位置
  if (args.meta || (args && enableClick)) {
    gotoSourceLocationUtil(args.meta || args);
  }
}

/**
 * 为选中的区域增加书签
 */
export function toggleBookmarkWithSelection(ctx: BookmarkActionContext) {
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
}

/**
 * 快速跳转到书签位置,并预览书签
 */
export function quickJumpTo() {
  quicklyJumpToBookmark();
}

/**
 *  改变书签颜色
 */
export async function changeBookmarkColor(ctx: BookmarkActionContext) {
  let bookmark: IBookmark | undefined = getBookmarkFromCtx(ctx);
  if (!bookmark) {
    window.showInformationMessage(
      l10n.t('Please select the bookmark before proceeding.'),
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
  bookmark.updateColor(newColor);
}

export async function changeBookmarkColorName(ctx: BookmarkActionContext) {
  let bookmark: IBookmark | undefined = getBookmarkColorFromCtx(ctx);
  if (!bookmark) {
    window.showInformationMessage(
      l10n.t('Please select the bookmark before proceeding.'),
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
  bookmark.updateColor(newColorName);
}

/**
 * 删除当前打开的文档中的已存在的书签
 */
export function clearAllBookmarksInCurrentFile(args: any) {
  const controller = resolveBookmarkController();
  if (!controller) {
    return;
  }

  if (args && args.meta) {
    const meta = args.meta as BookmarksGroupedByFileType;
    controller.clearAllBookmarkInFile(Uri.file(meta.fileId));
  } else {
    const activeEditor = window.activeTextEditor;
    if (!activeEditor) {
      return;
    }
    if (checkIfBookmarksIsInCurrentEditor(activeEditor)) {
      controller.clearAllBookmarkInFile(activeEditor.document.uri);
    }
  }
}

/**
 * 为书签增加备注信息
 */
export function editDescription(ctx: BookmarkActionContext) {
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
}

/**
 * 列出当前文件中的所有信息
 */
export async function listBookmarksInCurrentFile(ctx: BookmarkActionContext) {
  const editor = window.activeTextEditor;
  const controller = resolveBookmarkController();

  if (!editor || !controller.store) {
    return;
  }

  const bookmarks = getBookmarksFromFileUri(editor.document.uri);
  if (!bookmarks.length) {
    return;
  }
  const pickItems = bookmarks.map((it: IBookmark) => {
    return {
      label:
        it.label || it.description || it.selectionContent?.slice(0, 120) || '',
      description: getLineInfoStrFromBookmark(it),
      detail: it.fileUri.fsPath,
      iconPath: it.iconPath,
      meta: {
        value: it,
        selection: new Selection(it.selection.anchor, it.selection.active),
      },
    };
  });

  const chosenBookmarks = await window.showQuickPick(pickItems, {
    title: l10n.t('Select a bookmark to jump to the corresponding location.'),
    placeHolder: l10n.t('Please select the bookmark you want to open'),
    canPickMany: false,
    ignoreFocusOut: false,
    async onDidSelectItem(
      item: QuickPickItem & {meta: {value: IBookmark; selection: Selection}},
    ) {
      // @ts-ignore
      let bookmark = typeof item === 'object' ? item.meta : undefined;
      if (bookmark) {
        const {value: _bookmark, selection} = item.meta;

        const openedUri = Uri.from({
          scheme: 'file',
          path: _bookmark.fileId,
        });

        const doc = await workspace.openTextDocument(openedUri);

        const editor = await window.showTextDocument(doc, {
          preview: true,
          preserveFocus: true,
        });

        const range = selection || _bookmark.rangesOrOptions?.range;
        const {start, end} = range;
        highlightSelection(
          editor,
          range,
          new Position(start.line, start.character),
          new Position(end.line, end.character),
        );
      }
    },
  });
  if (!chosenBookmarks) {
    return;
  }
}

/**
 * @TODO 注册命令在 `editor` 中打开书签管理器中的数据
 */
export function openInEditor(args: any) {
  window.showInformationMessage(
    l10n.t('This feature has not been developed yet, thanks!'),
  );
}

export function clearAllBookmarksInColor(args: any) {
  if (!args || !args.meta) {
    return;
  }
  const controller = resolveBookmarkController();
  if (!controller) {
    return;
  }

  const meta = args.meta as BookmarksGroupedByColorType;
  controller.clearAllBookmarksInColor(meta.color);
}

export function clearAllBookmarksInIconGroup(args: any) {
  if (!args || !args.meta) {
    return;
  }
  const controller = resolveBookmarkController();
  if (!controller) {
    return;
  }

  const meta = args.meta as BookmarksGroupedByIconType;
  controller.clearAllBookmarksInIconGroup(meta.icon);
}

/**
 * 打开交互指南
 * @param args
 */
export function showWalkthroughs(args: any) {
  commands.executeCommand(
    'welcome.showAllWalkthroughs',
    '@ext:czfadmin.bookmark-manager',
  );
}

export function revealInExplorer(args: BookmarkActionContext) {}
