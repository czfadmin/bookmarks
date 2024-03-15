import BaseTreeItem from '../providers/BaseTreeItem';
import BaseTreeProvider from '../providers/BaseTreeProvider';
import {Disposable, TreeDragAndDropController, TreeView, window} from 'vscode';
import {dispose} from '../utils';
import IController from '../controllers/IController';
import resolveServiceManager, {
  ServiceManager,
} from '../services/ServiceManager';
import {IBookmark} from '../stores';
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

  private _serviceManager: ServiceManager;
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
    this._serviceManager = resolveServiceManager();

    this._dndController = this._buildDndController();
    this._bookmarkTreeView = window.createTreeView(viewName, {
      treeDataProvider: this._provider,
      showCollapseAll: true,
      canSelectMany: false,
      dragAndDropController: this._dndController,
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
        if (self._controller.groupView === 'color') {
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
          const sourceContextValue = draggedSource.contextValue;
          const targetContextValue = target.contextValue;
          if (!sourceContextValue || !targetContextValue) {
            return;
          }

          if (
            targetContextValue === 'bookmark' &&
            ['file', 'workspace'].includes(sourceContextValue)
          ) {
            return;
          }

          // 1. 对于顶层级进行拖拽, 顶层进行排序
          // 2. 第二层级中 进行排序
          console.log(draggedSource, target);
        }
      },
    };
  }
  dispose() {
    this._bookmarkTreeView.dispose();
    dispose(this._disposables);
  }
}
