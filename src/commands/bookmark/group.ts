import {window, l10n} from 'vscode';
import {resolveBookmarkController} from '../../bootstrap';
import {DEFAULT_BOOKMARK_COLOR} from '../../constants';
import {DEFAULT_BOOKMARK_GROUP_ID} from '../../constants/bookmark';
import {IBookmarkGroup} from '../../stores';
import {BookmarksGroupedByCustomType} from '../../types';
import {
  showGroupQuickPick,
  getBookmarkFromCtx,
  gotoSourceLocation,
  showBookmarksQuickPick,
} from '../../utils';
import {IBookmarkCommand, IBookmarkCommandContext} from '../../types/command';
import {showWorkspaceFolderQuickPick} from '../../utils/workspace';

export const BookmarkGroupCommands: IBookmarkCommand[] = [
  {
    name: 'clearAllBookmarksInGroup',
    docs: '清除在一个组中的所有书签',
    callback: async (ctx: IBookmarkCommandContext, args: any) => {
      let meta: IBookmarkGroup | undefined;
      if (!args || !args.meta) {
        meta = await showGroupQuickPick(true);
        if (!meta) {
          return;
        }
      } else {
        meta = (args.meta as BookmarksGroupedByCustomType).group!;
      }
      const controller = resolveBookmarkController();
      controller.clearAllBookmarksInGroup(meta.id);
    },
  },
  {
    name: 'deleteBookmarkGroup',
    docs: '删除分组',
    callback: async (ctx: IBookmarkCommandContext, args: any) => {
      let meta: IBookmarkGroup | undefined;
      if (!args || !args.meta) {
        meta = await showGroupQuickPick(false);
        if (!meta) {
          return;
        }
      } else {
        meta = (args.meta as BookmarksGroupedByCustomType).group!;
      }
      if (meta.id === DEFAULT_BOOKMARK_GROUP_ID) {
        window.showInformationMessage(l10n.t("Can't delete default group"));
        return;
      }
      const controller = resolveBookmarkController();
      controller.deleteGroup(meta.id);
    },
  },
  {
    name: 'changeBookmarkGroupColor',
    callback: async (ctx: IBookmarkCommandContext, args: any) => {
      let meta: IBookmarkGroup | undefined;
      if (!args || !args.meta) {
        meta = await showGroupQuickPick(false);
        if (!meta) {
          return;
        }
      } else {
        meta = (args.meta as BookmarksGroupedByCustomType).group!;
      }
      if (meta.id === DEFAULT_BOOKMARK_GROUP_ID) {
        window.showInformationMessage(l10n.t("Can't delete default group"));
        return;
      }
      const controller = resolveBookmarkController();
      controller.deleteGroup(meta.id);
    },
  },
  {
    name: 'changeBookmarkGroupLabel',
    callback: async (ctx: IBookmarkCommandContext, args: any) => {
      let meta: IBookmarkGroup | undefined;
      if (!args || !args.meta) {
        meta = await showGroupQuickPick(false);
        if (!meta) {
          return;
        }
      } else {
        meta = (args.meta as BookmarksGroupedByCustomType).group!;
      }

      if (meta.id === DEFAULT_BOOKMARK_GROUP_ID) {
        window.showInformationMessage(
          l10n.t('Can not change default group label'),
        );
        return;
      }
      const newGroupLabel = await window.showInputBox({
        title: l10n.t('Change group label'),
        placeHolder: l10n.t('Please input new group name'),
      });
      if (!newGroupLabel) {
        return;
      }
      meta.changeLabel(newGroupLabel);
    },
  },
  {
    name: 'addBookmarkGroup',
    docs: ` * 通过命令创建分组 * - 可支持自定义分组名称(非按照颜色分组,同时之前未分组的归为Default组) * - 分组拖拽移动 * - 分组拖拽排序`,
    callback: async (ctx: IBookmarkCommandContext, args: any) => {
      let selectedWorkspaceFolder;
      console.log(args);
      // 此时从命令面板或者视图顶部的菜单中选择调用此命令,以及当存在多个工作区间, 需要用户选择工作区进行操作.
      if (!args || (args && args.contextValue !== 'workspace')) {
        selectedWorkspaceFolder = await showWorkspaceFolderQuickPick();
      }

      // 当在工作区间分组样式时, 进行增加分组,此时该组绑定到该工作区间
      if (args && args.contextValue === 'workspace') {
        selectedWorkspaceFolder = args.meta.workspace;
      }

      const userInput = await window.showInputBox({
        placeHolder: l10n.t('Please input new group name'),
      });

      if (!userInput) {
        return;
      }

      const controller = resolveBookmarkController();

      controller.addBookmarkGroup(
        userInput,
        DEFAULT_BOOKMARK_COLOR,
        selectedWorkspaceFolder,
      );
    },
  },
  {
    name: 'groupedByColor',
    docs: '按颜色分组',
    callback: async (ctx: IBookmarkCommandContext, args: any) => {
      const controller = resolveBookmarkController();
      controller.changeGroupView('color');
    },
  },
  {
    name: 'groupedByDefault',
    docs: `默认排序分组`,
    callback: async (ctx: IBookmarkCommandContext, args: any) => {
      const controller = resolveBookmarkController();
      controller.changeGroupView('default');
    },
  },
  {
    name: 'groupedByWorkspace',
    docs: '按照工作区间分组',
    callback: async (ctx: IBookmarkCommandContext, args: any) => {
      const controller = resolveBookmarkController();
      controller.changeGroupView('workspace');
    },
  },
  {
    name: 'groupedByCustom',
    docs: '按照用户自定义分组方式分组, 默认未分组放到 `Default` 组中',
    callback: async (ctx: IBookmarkCommandContext, args: any) => {
      const controller = resolveBookmarkController();
      controller.changeGroupView('custom');
    },
  },
];

/**
 * 设置默认激活组, 此时可以将默认创建的书签放到此分组中
 * @param args
 */
export async function setAsDefaultActivedGroup(args: any) {
  let meta: IBookmarkGroup | undefined;
  if (!args || !args.meta) {
    meta = await showGroupQuickPick(false);
    if (!meta) {
      return;
    }
  } else {
    meta = (args.meta as BookmarksGroupedByCustomType).group!;
  }
  const controller = resolveBookmarkController();
  controller.setAsDefaultActivedGroup(meta);
}

/**
 * 更改书签分组
 * @param args
 */
export async function changeBookmarkGroup(args: any) {
  const bookmark = getBookmarkFromCtx(args);
  if (!bookmark) {
    return;
  }
  const newGroup = await showGroupQuickPick(true, bookmark.groupId);
  if (!newGroup) {
    return;
  }
  bookmark.changeGroupId(newGroup.id);
}

export async function listBookmarksInSelectedGroup(args: any) {
  const group = await showGroupQuickPick(true);
  if (!group) {
    return;
  }

  const controller = resolveBookmarkController();

  const bookmarks =
    (
      controller.store
        .getBookmarksGroupedByCustom as BookmarksGroupedByCustomType[]
    ).find(it => it.id === group.id)?.bookmarks || [];

  const selectedBookmark = await showBookmarksQuickPick(bookmarks);
  if (!selectedBookmark) {
    return;
  }
  // @ts-ignore
  gotoSourceLocation(selectedBookmark.meta);
}
