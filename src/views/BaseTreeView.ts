import BaseTreeItem from '@/providers/BaseTreeItem';
import BaseTreeProvider from '@/providers/BaseTreeProvider';
import {Disposable, TreeView, window} from 'vscode';
import {dispose} from '../utils';
import IController from '@/controllers/IController';
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
    this._bookmarkTreeView = window.createTreeView(viewName, {
      treeDataProvider: this._provider,
      showCollapseAll: true,
      canSelectMany: false,
    });
    this.disposables.push(
      this.controller.onDidChangeEvent(() => {
        this.provider.refresh();
      }),
    );
  }

  dispose() {
    dispose(this._disposables);
  }
}
