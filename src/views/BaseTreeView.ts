import BaseTreeItem from '@/providers/BaseTreeItem';
import BaseTreeProvider from '@/providers/BaseTreeProvider';
import {Disposable, TreeDragAndDropController, TreeView, window} from 'vscode';
import {dispose} from '../utils';
import IController from '@/controllers/IController';
import resolveServiceManager, {
  ServiceManager,
} from '../services/ServiceManager';
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
    const self = this;
    this._dndController = {
      dragMimeTypes: ['application/vnd.code.tree.bookmark-manager'],
      dropMimeTypes: ['application/vnd.code.tree.bookmark-manager'],
      handleDrag(source, dataTransfer, token) {
        self._draggingSource = [...source];
      },
      handleDrop(target, dataTransfer, token) {
        const draggedSource = self._draggingSource[0];
        if (self._controller.groupView !== 'color' || !target) {
          return;
        }

        // 整个树进行拖拽
        if (
          draggedSource.meta.bookmarks &&
          draggedSource.meta.bookmarks.length &&
          draggedSource.meta.color !== target.meta.color
        ) {
          for (let item of draggedSource.meta.bookmarks) {
            self._controller.update(item.id, {
              color: target.meta.color,
            });
          }
          return;
        }

        if (draggedSource.meta.color !== target.meta.color) {
          self._controller.update(draggedSource.meta.id, {
            color: target.meta.color,
          });
        }
      },
    };
    this._bookmarkTreeView = window.createTreeView(viewName, {
      treeDataProvider: this._provider,
      showCollapseAll: true,
      canSelectMany: false,
      dragAndDropController: this._dndController,
    });
    this.disposables.push(
      this.controller.onDidChangeEvent(() => {
        this.provider.refresh();
        this._serviceManager.decorationService.updateActiveEditorAllDecorations();
      }),
    );
  }

  dispose() {
    dispose(this._disposables);
  }
}
