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

  constructor(viewName: string, provider: BaseTreeProvider<T, C>) {
    this._controller = provider.controller;
    this._provider = provider;
    this._bookmarkTreeView = window.createTreeView(viewName, {
      treeDataProvider: this._provider,
      showCollapseAll: true,
      canSelectMany: false,
    });
    this._buildViewBadge();
    // 当书签发生改变时, 刷新treeProvider
    this._disposables.push(
      this._controller.onDidChangeEvent(() => {
        this._provider.refresh();
        this._buildViewBadge();
      }),
    );
  }

  /**
   * 构建treeView中的 Badge
   */
  private _buildViewBadge() {
    const totalBookmarksNum = this._controller.totalCount;
    this._bookmarkTreeView.badge =
      totalBookmarksNum === 0
        ? undefined
        : {
            tooltip: '', // TODO: 增加为更多的信息
            value: totalBookmarksNum,
          };
  }

  dispose() {
    dispose(this._disposables);
  }
}
