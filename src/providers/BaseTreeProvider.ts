import {
  Event,
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
} from 'vscode';
import BaseTreeItem from './BaseTreeItem';
import {BookmarkManagerConfigure} from '../types';
import {getRelativePath} from '../utils';
import IController from '../controllers/IController';
import resolveServiceManager, {
  ServiceManager,
} from '../services/ServiceManager';

export default class BaseTreeProvider<
  T extends BaseTreeItem,
  C extends IController,
> implements TreeDataProvider<T>
{
  private _onDidChangeEvent = new EventEmitter<T>();

  private _extensionConfiguration: BookmarkManagerConfigure | undefined;

  private _controller: C;

  private _serviceManager: ServiceManager;

  get datasource() {
    return this._controller.datasource;
  }

  get controller(): C {
    return this._controller;
  }

  get isRelativePath() {
    return this._extensionConfiguration?.relativePath || false;
  }

  get extensionCOnfiguration() {
    return this._extensionConfiguration;
  }

  get configService() {
    return this.serviceManager.configService;
  }

  get serviceManager() {
    return this._serviceManager;
  }

  constructor(controller: C) {
    this._controller = controller;
    this._serviceManager = resolveServiceManager();
    this._extensionConfiguration = this.configService.configuration;

    // 监听插件的配置变化
    this.configService?.onExtensionConfigChange(
      (config: BookmarkManagerConfigure) => {
        this._extensionConfiguration = config;
      },
    );

    // 当书签的数据发生变化时, 刷新 provider
    this._controller.onDidChangeEvent(() => {
      this.refresh();
      if (!this.controller.datasource) {return;}
      const needClear = this.controller.datasource.bookmarks.length === 0;
      this._serviceManager.decorationService.updateActiveEditorAllDecorations(
        needClear,
      );
    });
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
