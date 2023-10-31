import * as vscode from 'vscode';
import { EXTENSION_VIEW_ID } from '../constants';
import { BookmarksController } from '../controllers/BookmarksController';
import {
  BookmarksTreeItem,
  BookmarksTreeProvider,
} from '../providers/BookmarksTreeProvider';
import { dispose } from '../utils';

export class BookmarksTreeView implements vscode.Disposable {
  private _provider: BookmarksTreeProvider;
  private _controller: BookmarksController;
  private _dnDController: vscode.TreeDragAndDropController<BookmarksTreeItem>;

  private _bookmarkTreeView: vscode.TreeView<BookmarksTreeItem>;

  private _disposables: vscode.Disposable[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    controller: BookmarksController
  ) {
    this._controller = controller;
    this._provider = new BookmarksTreeProvider(controller);
    this._dnDController = this.createTreeDnDController();
    this._bookmarkTreeView = vscode.window.createTreeView(EXTENSION_VIEW_ID, {
      treeDataProvider: this._provider,
      showCollapseAll: true,
      canSelectMany: false,
      dragAndDropController: this._dnDController,
    });
    this._buildViewBadge();
    // 当书签发生改变时, 刷新treeProvider
    this._disposables.push(
      this._controller.onDidChangeEvent(() => {
        this._provider.refresh();
        this._buildViewBadge();
      })
    );
  }

  /**
   * 构建treeView中的 Badge
   */
  private _buildViewBadge() {
    const totalBookmarksNum = this._controller.totalBookmarksNum;
    this._bookmarkTreeView.badge =
      totalBookmarksNum === 0
        ? undefined
        : {
            tooltip: '', // TODO: 增加为更多的信息
            value: totalBookmarksNum,
          };
  }

  /**
   * 创建一个DnDController
   * @returns {vscode.TreeDragAndDropController}
   */
  private createTreeDnDController(): vscode.TreeDragAndDropController<BookmarksTreeItem> {
    return {
      dropMimeTypes: [],
      dragMimeTypes: [],
      handleDrag(source, dataTransfer, token) {},
      handleDrop(target, dataTransfer, token) {},
    };
  }

  dispose() {
    dispose(this._disposables);
  }
}
