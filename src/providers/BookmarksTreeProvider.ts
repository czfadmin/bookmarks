import BookmarkTreeItem from './BookmarksTreeItem';
import BaseTreeProvider from './BaseTreeProvider';
import {ProviderResult, TreeItemCollapsibleState} from 'vscode';
import {
  BookmarkGroupByListType,
  BookmarksGroupedByCustomType,
  BookmarksGroupedByFileType,
  BookmarkTreeItemCtxValueEnum,
  TreeViewGroupEnum,
  TreeViewStyleEnum,
} from '../types';
import {resolveBookmarkController} from '../bootstrap';
import BookmarksController from '../controllers/BookmarksController';
import {
  BookmarksGroupedByIconType,
  BookmarksGroupedByColorType,
  BookmarksGroupedByWorkspaceType,
  IBookmark,
} from '../stores/bookmark';

export class BookmarksTreeProvider extends BaseTreeProvider<
  BookmarkTreeItem,
  BookmarksController
> {
  constructor() {
    super(resolveBookmarkController());
  }

  /**
   * 如果 viewType=== tree
   *    - groupType === default 时 显示默认的数据展示显示
   *    - groupType === 'color' 时,显示按照颜色的格式分类展示
   * 如果 viewType === 'list'
   *    显示列表数据展示格式
   */
  getChildren(
    element?: BookmarkTreeItem | undefined,
  ): ProviderResult<BookmarkTreeItem[]> {
    const {groupView, viewType} = this.controller;
    if (viewType === TreeViewStyleEnum.LIST) {
      return this.getChildrenByList(element);
    }

    if (viewType === TreeViewStyleEnum.TREE) {
      if (
        groupView === TreeViewGroupEnum.DEFAULT ||
        groupView === TreeViewGroupEnum.FILE
      ) {
        return this.getChildrenByFile(element);
      }

      if (groupView === TreeViewGroupEnum.COLOR) {
        return this.getChildrenByColor(element);
      }

      if (groupView === TreeViewGroupEnum.WORKSPACE) {
        return this.getChildrenByWorkspace(element);
      }

      if (groupView === TreeViewGroupEnum.CUSTOM) {
        return this.getChildrenByCustomGroup(element);
      }

      if (groupView === TreeViewGroupEnum.ICON) {
        return this.getChildrenByIcon(element);
      }
    }
  }

  getChildrenByFile(element?: BookmarkTreeItem | undefined) {
    if (!element) {
      const bookmarkRootStoreArr = this.controller
        .groupedBookmarks as BookmarksGroupedByFileType[];
      const children = bookmarkRootStoreArr.map(it => {
        let label = this.isRelativePath
          ? this.getRelativePath(it.fileName)
          : it.fileName;
        return new BookmarkTreeItem(
          label,
          TreeItemCollapsibleState.Collapsed,
          BookmarkTreeItemCtxValueEnum.FILE,
          it,
          this.serviceManager,
        );
      });

      return Promise.resolve(children);
    }
    let children: BookmarkTreeItem[] = [];
    try {
      children = (element.meta as BookmarksGroupedByFileType).bookmarks.map(
        it => {
          return new BookmarkTreeItem(
            it.label || it.selectionContent || it.id,
            TreeItemCollapsibleState.None,
            BookmarkTreeItemCtxValueEnum.BOOKMARK,
            it,
            this.serviceManager,
          );
        },
      );
      return Promise.resolve(children);
    } catch (error) {
      return Promise.resolve([]);
    }
  }

  getChildrenByList(element?: BookmarkTreeItem | undefined) {
    if (!element) {
      const children = (
        this.datastore as BookmarkGroupByListType
      )?.bookmarks.map((it: IBookmark) => {
        return new BookmarkTreeItem(
          it.label || it.selectionContent || it.id,
          TreeItemCollapsibleState.None,
          BookmarkTreeItemCtxValueEnum.BOOKMARK,
          it,
          this.serviceManager,
        );
      });
      return Promise.resolve(children);
    }
    return Promise.resolve([]);
  }
  getChildrenByColor(element?: BookmarkTreeItem | undefined) {
    if (!element) {
      const store = this.controller
        .groupedBookmarks as BookmarksGroupedByColorType[];
      const children = store.map(it => {
        return new BookmarkTreeItem(
          it.color,
          TreeItemCollapsibleState.Collapsed,
          BookmarkTreeItemCtxValueEnum.COLOR,
          it,
          this.serviceManager,
        );
      });

      return Promise.resolve(children);
    }
    let children: BookmarkTreeItem[] = [];
    try {
      children = (element.meta as BookmarksGroupedByFileType).bookmarks.map(
        it => {
          return new BookmarkTreeItem(
            it.label || it.selectionContent || it.id,
            TreeItemCollapsibleState.None,
            BookmarkTreeItemCtxValueEnum.BOOKMARK,
            it,
            this.serviceManager,
          );
        },
      );
      return Promise.resolve(children);
    } catch (error) {
      return Promise.resolve([]);
    }
  }

  getChildrenByWorkspace(element?: BookmarkTreeItem | undefined) {
    if (!element) {
      const store = this.controller
        .groupedBookmarks as BookmarksGroupedByWorkspaceType[];
      const children = store.map(it => {
        return new BookmarkTreeItem(
          it.workspace.name!,
          TreeItemCollapsibleState.Collapsed,
          BookmarkTreeItemCtxValueEnum.WORKSPACE,
          it,
          this.serviceManager,
        );
      });

      return Promise.resolve(children);
    }
    let children: BookmarkTreeItem[] = [];
    try {
      if ('files' in element.meta) {
        children = (element.meta as BookmarksGroupedByWorkspaceType).files.map(
          it => {
            return new BookmarkTreeItem(
              it.fileId,
              TreeItemCollapsibleState.Collapsed,
              BookmarkTreeItemCtxValueEnum.FILE,
              it,
              this.serviceManager,
            );
          },
        );
        return Promise.resolve(children);
      } else {
        children = (element.meta as BookmarksGroupedByFileType).bookmarks.map(
          it => {
            return new BookmarkTreeItem(
              it.label || it.selectionContent || it.id,
              TreeItemCollapsibleState.None,
              BookmarkTreeItemCtxValueEnum.BOOKMARK,
              it,
              this.serviceManager,
            );
          },
        );
        return Promise.resolve(children);
      }
    } catch (error) {
      return Promise.resolve([]);
    }
  }

  getChildrenByCustomGroup(element?: BookmarkTreeItem | undefined) {
    if (!element) {
      const store = this.controller
        .groupedBookmarks as BookmarksGroupedByCustomType[];
      const children = store.map(it => {
        return new BookmarkTreeItem(
          it.label!,
          TreeItemCollapsibleState.Collapsed,
          BookmarkTreeItemCtxValueEnum.CUSTOM,
          it,
          this.serviceManager,
        );
      });

      return Promise.resolve(children);
    }
    let children: BookmarkTreeItem[] = [];
    try {
      children = (element.meta as BookmarksGroupedByCustomType).bookmarks.map(
        it => {
          return new BookmarkTreeItem(
            it.label || it.selectionContent || it.id,
            TreeItemCollapsibleState.None,
            BookmarkTreeItemCtxValueEnum.BOOKMARK,
            it,
            this.serviceManager,
          );
        },
      );
      return Promise.resolve(children);
    } catch (error) {
      return Promise.resolve([]);
    }
  }

  getChildrenByIcon(element?: BookmarkTreeItem | undefined) {
    if (!element) {
      const store = this.controller
        .groupedBookmarks as BookmarksGroupedByIconType[];
      const children = store.map(it => {
        return new BookmarkTreeItem(
          it.icon,
          TreeItemCollapsibleState.Collapsed,
          BookmarkTreeItemCtxValueEnum.ICON,
          it,
          this.serviceManager,
        );
      });

      return Promise.resolve(children);
    }
    let children: BookmarkTreeItem[] = [];
    try {
      children = (element.meta as BookmarksGroupedByFileType).bookmarks.map(
        it => {
          return new BookmarkTreeItem(
            it.label || it.selectionContent || it.id,
            TreeItemCollapsibleState.None,
            BookmarkTreeItemCtxValueEnum.BOOKMARK,
            it,
            this.serviceManager,
          );
        },
      );
      return Promise.resolve(children);
    } catch (error) {
      return Promise.resolve([]);
    }
  }
}
