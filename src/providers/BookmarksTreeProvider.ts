import BookmarksTreeItem from './BookmarksTreeItem';
import BaseTreeProvider from './BaseTreeProvider';
import {ProviderResult, Selection, TreeItemCollapsibleState} from 'vscode';
import {BookmarkMeta, BookmarkStoreRootType, BookmarkStoreType} from '../types';
import {resolveBookmarkController} from '../bootstrap';
import BookmarksController from '../controllers/BookmarksController';
import {ServiceManager} from '../services/ServiceManager';

export class BookmarksTreeProvider extends BaseTreeProvider<
  BookmarksTreeItem,
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
    element?: BookmarksTreeItem | undefined,
  ): ProviderResult<BookmarksTreeItem[]> {
    if (this.controller.viewType === 'list') {
      return this.getChildrenByList(element);
    }

    if (
      this.controller.groupView === 'default' &&
      this.controller.viewType === 'tree'
    ) {
      return this.getChildrenByFile(element);
    }

    if (
      this.controller.viewType === 'tree' &&
      this.controller.groupView === 'color'
    ) {
      return this.getChildrenByColor(element);
    }
  }

  getChildrenByFile(element?: BookmarksTreeItem | undefined) {
    if (!element) {
      const bookmarkRootStoreArr = this.controller.groupedByFileBookmarks;
      const children = bookmarkRootStoreArr.map(it => {
        let label = this.isRelativePath
          ? this.getRelativePath(it.fileName)
          : it.fileName;
        return new BookmarksTreeItem(
          label,
          TreeItemCollapsibleState.Collapsed,
          'file',
          it,
          this.configService,
        );
      });

      return Promise.resolve(children);
    }
    let children: BookmarksTreeItem[] = [];
    try {
      children = (element.meta as BookmarkStoreType).bookmarks.map(it => {
        const selection = new Selection(
          it.selection.anchor,
          it.selection.active,
        );

        return new BookmarksTreeItem(
          it.label || it.selectionContent || it.id,
          TreeItemCollapsibleState.None,
          'bookmark',
          {
            ...it,
            selection,
          },
          this.configService,
        );
      });
      return Promise.resolve(children);
    } catch (error) {
      return Promise.resolve([]);
    }
  }

  getChildrenByList(element?: BookmarksTreeItem | undefined) {
    if (!element) {
      const children = (
        this.datasource as BookmarkStoreRootType
      )?.bookmarks.map((it: BookmarkMeta) => {
        const selection = new Selection(
          it.selection.anchor,
          it.selection.active,
        );

        return new BookmarksTreeItem(
          it.label || it.selectionContent || it.id,
          TreeItemCollapsibleState.None,
          'bookmark',
          {
            ...it,
            selection,
          },
          this.configService,
        );
      });
      return Promise.resolve(children);
    }
    return Promise.resolve([]);
  }
  getChildrenByColor(element?: BookmarksTreeItem | undefined) {
    if (!element) {
      const store = this.controller.groupedByColorBookmarks;
      const children = store.map(it => {
        return new BookmarksTreeItem(
          it.color,
          TreeItemCollapsibleState.Collapsed,
          'color',
          it,
          this.configService,
        );
      });

      return Promise.resolve(children);
    }
    let children: BookmarksTreeItem[] = [];
    try {
      children = (element.meta as BookmarkStoreType).bookmarks.map(it => {
        const selection = new Selection(
          it.selection.anchor,
          it.selection.active,
        );

        return new BookmarksTreeItem(
          it.label || it.selectionContent || it.id,
          TreeItemCollapsibleState.None,
          'bookmark',
          {
            ...it,
            selection,
          },
          this.configService,
        );
      });
      return Promise.resolve(children);
    } catch (error) {
      return Promise.resolve([]);
    }
  }
}
