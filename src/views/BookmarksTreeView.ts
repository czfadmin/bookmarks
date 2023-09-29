import * as vscode from 'vscode';
import {
  EXTENSION_VIEW_ID,
} from '../constants';
import { BookmarksController } from '../controllers/BookmarksController';
import { BookmarksTreeProvider } from '../providers/BookmarksTreeProvider';

export class BookmarksTreeView {
  private _provider: BookmarksTreeProvider;
  private _controller: BookmarksController;

  constructor(
    private context: vscode.ExtensionContext,
    controller: BookmarksController
  ) {
    this._controller = controller;
    this._provider = new BookmarksTreeProvider(controller);

    vscode.window.createTreeView(EXTENSION_VIEW_ID, {
      treeDataProvider: new BookmarksTreeProvider(controller),
      showCollapseAll: true,
      canSelectMany: false,
    });
  }
}
