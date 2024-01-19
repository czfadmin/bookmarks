import {
  Event,
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
} from 'vscode';
import BaseTreeItem from './BaseTreeItem';
import {BookmarkManagerConfigure} from '../types';
import {getExtensionConfiguration} from '../configurations';
import {getRelativePath} from '../utils';
import IController from '@/controllers/IController';

export default class BaseTreeProvider<
  T extends BaseTreeItem,
  C extends IController,
> implements TreeDataProvider<T>
{
  private _onDidChangeEvent = new EventEmitter<T>();

  private _extensionConfiguration: BookmarkManagerConfigure | undefined;

  private _controller: C;

  constructor(controller: C) {
    this._controller = controller;
  }

  get datasource() {
    return this._controller.datasource;
  }

  get controller(): C {
    return this._controller;
  }
  get extensionConfiguration() {
    if (!this._extensionConfiguration) {
      this._extensionConfiguration = getExtensionConfiguration();
    }
    return this._extensionConfiguration;
  }

  get isRelativePath() {
    return this.extensionConfiguration.relativePath;
  }

  onDidChangeTreeData?: Event<void | T | T[] | null | undefined> | undefined =
    this._onDidChangeEvent.event;

  getTreeItem(element: T): TreeItem | Thenable<TreeItem> {
    return element;
  }

  getChildren(element?: T | undefined): ProviderResult<T[]> | undefined | null {
    return [];
  }

  getRelativePath(p: string) {
    return getRelativePath(p);
  }

  public refresh() {
    // @ts-ignore
    this._onDidChangeEvent.fire();
  }
}
