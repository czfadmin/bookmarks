import BaseTreeItem from '../providers/BaseTreeItem';
import BaseTreeProvider from '../providers/BaseTreeProvider';
import {Disposable, TreeDragAndDropController, TreeView, window} from 'vscode';
import {dispose} from '../utils';
import IController from '../controllers/IController';
import resolveServiceManager, {
  ServiceManager,
} from '../services/ServiceManager';
import {IBookmark} from '../stores';
import {
  BookmarksGroupedByCustomType,
  BookmarkTreeItemCtxValueEnum,
  TreeViewGroupEnum,
} from '../types';
export enum TreeViewEnum {
  BASE = 0,
  UNIVERSAL,
  CODE,
}

export default class BaseTreeView<T extends BaseTreeItem, C extends IController>
  implements Disposable
{
  type: TreeViewEnum = TreeViewEnum.BASE;

  private _provider: BaseTreeProvider<T, C>;

  private _controller: IController;

  private _bookmarkTreeView: TreeView<T>;

  private _disposables: Disposable[] = [];

  private _dndController: TreeDragAndDropController<T> | undefined;

  private _draggingSource: T[] = [];

  private _sm: ServiceManager;
  get disposables() {
    return this._disposables;
  }

  get controller() {
    return this._controller;
  }

  get provider() {
    return this._provider;
  }

  get bookmarkTreeView() {
    return this._bookmarkTreeView;
  }

  constructor(viewName: string, provider: BaseTreeProvider<T, C>) {
    this._controller = provider.controller;
    this._provider = provider;
    this._sm = resolveServiceManager();

    this._dndController = this._buildDndController();
    this._bookmarkTreeView = window.createTreeView(viewName, {
      treeDataProvider: this._provider,
      showCollapseAll: true,
      canSelectMany: false,
      dragAndDropController: this._buildDndController(),
    });
  }

  private _buildDndController(): TreeDragAndDropController<any> {
    const self = this;
    return {
      dragMimeTypes: ['application/vnd.code.tree.bookmark-manager'],
      dropMimeTypes: ['application/vnd.code.tree.bookmark-manager'],
      handleDrag(source, dataTransfer, token) {
        self._draggingSource = [...source];
      },
      handleDrop(target, dataTransfer, token) {
        const draggedSource = self._draggingSource[0];
        if (!target) {
          return;
        }

        // 按照颜色进行分类时 支持拖拽调整颜色, 拖拽调整顺序
        if (self._controller.groupView === TreeViewGroupEnum.COLOR) {
          // 整个树进行拖拽
          if (
            draggedSource.meta.bookmarks &&
            draggedSource.meta.bookmarks.length &&
            draggedSource.meta.color !== target.meta.color
          ) {
            for (let bookmark of draggedSource.meta.bookmarks) {
              (bookmark as IBookmark).updateColor({
                ...bookmark.customColor,
                name: target.meta.color,
              });
            }
            return;
          }

          // 不同树的之间拖拽
          if (draggedSource.meta.color !== target.meta.color) {
            const bookmark = draggedSource.meta as IBookmark;
            bookmark.updateColor({
              ...bookmark.customColor,
              name: target.meta.color,
            });
            return;
          }
          // 同层级的书签多拽
          if (draggedSource.meta.color === target.meta.color) {
            return;
          }
        } else {
          // groupView 为default, workspace 以及 file情况下, 第二级 支持拖拽排序, 第一级支持拖拽排序
          const sourceContextValue =
            draggedSource.contextValue as BookmarkTreeItemCtxValueEnum;
          const targetContextValue =
            target.contextValue as BookmarkTreeItemCtxValueEnum;
          if (!sourceContextValue || !targetContextValue) {
            return;
          }

          if (
            targetContextValue === BookmarkTreeItemCtxValueEnum.BOOKMARK &&
            [
              BookmarkTreeItemCtxValueEnum.FILE,
              BookmarkTreeItemCtxValueEnum.WORKSPACE,
            ].includes(sourceContextValue)
          ) {
            return;
          }

          // 分组情况下进行拖拽操作
          if (
            sourceContextValue === BookmarkTreeItemCtxValueEnum.BOOKMARK &&
            targetContextValue === BookmarkTreeItemCtxValueEnum.CUSTOM
          ) {
            const meta = draggedSource.meta as IBookmark;
            const targetMeta = target.meta as BookmarksGroupedByCustomType;
            // 同一分组时 不允许拖拽
            if (meta.groupId === targetMeta.id) {
              return;
            }
            meta.changeGroupId(targetMeta.id);
          }

          // 分组拖拽调整顺序
          if (
            sourceContextValue === BookmarkTreeItemCtxValueEnum.CUSTOM &&
            targetContextValue === BookmarkTreeItemCtxValueEnum.CUSTOM
          ) {
            const sourceMeta =
              draggedSource.meta as BookmarksGroupedByCustomType;
            const targetMeta = target.meta as BookmarksGroupedByCustomType;
            if (sourceMeta.id === targetMeta.id) {
              return;
            }
            const sourceGroupIndex = sourceMeta.group.sortedIndex;
            sourceMeta.group.setSortedIndex(targetMeta.group.sortedIndex);
            targetMeta.group.setSortedIndex(sourceGroupIndex);
          }
          // TODO: 同组进行排序
          const sourceMeta = draggedSource.meta as IBookmark;
          const targetMeta = target.meta as IBookmark;

          if (
            targetContextValue === BookmarkTreeItemCtxValueEnum.BOOKMARK &&
            sourceContextValue === BookmarkTreeItemCtxValueEnum.BOOKMARK
          ) {
            if (sourceMeta.groupId === targetMeta.groupId) {
              self._controller.updateBookmarkSortedInfo(
                sourceMeta,
                targetMeta.sortedInfo[self._controller.groupView],
              );
            }
          }
        }
      },
    };
  }
  dispose() {
    this._bookmarkTreeView.dispose();
    dispose(this._disposables);
  }
}
