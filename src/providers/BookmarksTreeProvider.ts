import BookmarkTreeItem from './BookmarksTreeItem';
import BaseTreeProvider from './BaseTreeProvider';
import {ProviderResult, TreeItemCollapsibleState} from 'vscode';
import {BookmarkGroupByListType, BookmarksGroupedByFileType} from '../types';
import {resolveBookmarkController} from '../bootstrap';
import BookmarksController from '../controllers/BookmarksController';
import {BookmarksGroupedByWorkspaceType, IBookmark} from '../stores/bookmark';

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
    if (this.controller.viewType === 'list') {
      return this.getChildrenByList(element);
    }

    if (this.controller.viewType === 'tree') {
      if (this.controller.groupView === 'default') {
        return this.getChildrenByFile(element);
      }

      if (this.controller.groupView === 'color') {
        return this.getChildrenByColor(element);
      }

      if (this.controller.groupView === 'workspace') {
        return this.getChildrenByWorkspace(element);
      }
    }
  }

  getChildrenByFile(element?: BookmarkTreeItem | undefined) {
    if (!element) {
      const bookmarkRootStoreArr = this.controller.groupedByFileBookmarks;
      const children = bookmarkRootStoreArr.map(it => {
        let label = this.isRelativePath
          ? this.getRelativePath(it.fileName)
          : it.fileName;
        return new BookmarkTreeItem(
          label,
          TreeItemCollapsibleState.Collapsed,
          'file',
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
            'bookmark',
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
          'bookmark',
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
      const store = this.controller.groupedByColorBookmarks;
      const children = store.map(it => {
        return new BookmarkTreeItem(
          it.color,
          TreeItemCollapsibleState.Collapsed,
          'color',
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
            'bookmark',
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
      const store = this.controller.groupedByWorkspaceFolders;
      const children = store.map(it => {
        return new BookmarkTreeItem(
          it.workspace.name!,
          TreeItemCollapsibleState.Collapsed,
          'workspace',
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
              'file',
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
              'bookmark',
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
}
