import {
  Event,
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
} from 'vscode';
import BaseTreeItem from './BaseTreeItem';
import {getRelativePath} from '../utils';
import IController from '../controllers/IController';
import resolveServiceManager, {
  ServiceManager,
} from '../services/ServiceManager';
import {IBookmarkManagerConfigure} from '../stores';

export default class BaseTreeProvider<
  T extends BaseTreeItem,
  C extends IController,
> implements TreeDataProvider<T>
{
  private _onDidChangeEvent = new EventEmitter<T>();

  private _extensionConfiguration: IBookmarkManagerConfigure | undefined;

  private _controller: C;

  private _serviceManager: ServiceManager;

  get datastore() {
    return this._controller.store;
  }

  get controller(): C {
    return this._controller;
  }

  get isRelativePath() {
    return this._extensionConfiguration?.relativePath || false;
  }

  get extensionConfiguration() {
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

    // 监听插件的配置变化, 同时刷新TreeView
    this.configService?.onExtensionConfigChange(
      (config: IBookmarkManagerConfigure) => {
        this._extensionConfiguration = config;
        this.refresh();
      },
    );

    // 当书签的数据发生变化时, 刷新 provider
    this._controller.onDidChangeEvent(() => {
      this.refresh();
      if (!this.controller.store) {
        return;
      }
      this._serviceManager.decorationService.updateActiveEditorAllDecorations(
        true,
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
