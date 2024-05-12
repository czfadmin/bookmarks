import {
  ConfigurationChangeEvent,
  Disposable,
  Event,
  EventEmitter,
  commands,
  workspace,
} from 'vscode';
import {EXTENSION_ID} from '../constants';
import {registerExtensionCustomContextByKey} from '../context';
import {ServiceManager} from './ServiceManager';
import {
  IBookmarkManagerConfigure,
  IRootConfigureModel,
  RootConfigureModel,
} from '../stores/configure';
import {ICreateDecorationOptions} from '../stores/decoration';
import {StringIndexType} from '../types';
import {destroy} from 'mobx-state-tree';

/**
 * 插件的用户配置,以及全局配置, 并监听配置的改动
 */
export default class ConfigService implements Disposable {
  private _onDecorationConfigChangeEvent =
    new EventEmitter<ICreateDecorationOptions>();

  private _onExtensionConfigChangeEvent =
    new EventEmitter<IBookmarkManagerConfigure>();

  private _onDidChangeConfigurationEvent: EventEmitter<ConfigurationChangeEvent> =
    new EventEmitter<ConfigurationChangeEvent>();
  private _configuration: IBookmarkManagerConfigure | undefined;

  private _decorationConfiguration: ICreateDecorationOptions | undefined;

  private _serviceManager: ServiceManager;

  private _store!: IRootConfigureModel;
  onDidChangeConfiguration: Event<ConfigurationChangeEvent> =
    this._onDidChangeConfigurationEvent.event;

  onDecorationConfigChange = this._onDecorationConfigChangeEvent.event;

  onExtensionConfigChange = this._onExtensionConfigChangeEvent.event;

  get colors() {
    const _colors = {} as StringIndexType<string>;
    this._store.configure!.colors.forEach((value, key) => {
      // @ts-ignore
      _colors[key as string] = value;
    });
    return _colors;
  }

  get customColors() {
    return this._store.configure!.customColors;
  }

  get configuration() {
    if (!this._configuration) {
      this._configuration = this._getExtensionConfiguration();
    }
    return this._configuration;
  }

  get decorationConfiguration() {
    if (!this._decorationConfiguration) {
      this._decorationConfiguration = this._getCreateDecorationOptions();
    }
    return this._decorationConfiguration;
  }

  constructor(sm: ServiceManager) {
    this._serviceManager = sm;

    this._initStore();

    workspace.onDidChangeConfiguration(ev => {
      if (!ev.affectsConfiguration(EXTENSION_ID)) {
        return;
      }
      // 需要手动刷新配置中的数据
      this._store.refresh();
      this._init();
      this.fire(ev);
    });

    this._init();
  }

  private _init() {
    this._configuration = this._getExtensionConfiguration();
    this._registerContextKey();
  }

  private _initStore() {
    this._store = RootConfigureModel.create();
  }
  /**
   * 将用户配置的内容注册到`context`中
   */
  private _registerContextKey() {
    this._registerExtensionCustomContext();
    registerExtensionCustomContextByKey('toggleBookmarkWithSelection', false);
  }

  /**
   * 获取用户自定义的书签装饰器配置
   * @returns 返回一个书签装饰的配置
   */
  private _getCreateDecorationOptions(): ICreateDecorationOptions {
    return this._store.decoration!;
  }

  /**
   * 获取插件的所有配置
   *  - 装饰器配置
   *  - 额外配置
   * @returns
   */
  private _getExtensionConfiguration(): IBookmarkManagerConfigure {
    return this._store.configure!;
  }

  /**
   * 注册插件自定义上下文
   */
  private _registerExtensionCustomContext() {
    const _configuration = this._getExtensionConfiguration();
    Object.entries(_configuration).forEach(([key, value]) => {
      if (typeof value !== 'boolean') {
        return;
      }
      commands.executeCommand('setContext', `${EXTENSION_ID}.${key}`, value);
    });
    registerExtensionCustomContextByKey('toggleBookmarkWithSelection', false);
  }

  /**
   * 获取插件全局配置
   * @param key
   * @param defaultValue
   * @returns
   */
  getGlobalValue<T>(key: string, defaultValue: T) {
    return (
      this._serviceManager.context.globalState.get<T>(
        `bookmark-manager.global.configuration.${key}`,
      ) || defaultValue
    );
  }

  /**
   * 设置插件全局配置
   * @param key
   * @param value
   */
  updateGlobalValue(key: string, value: any) {
    this._serviceManager.context.globalState.update(
      `bookmark-manager.global.configuration.${key}`,
      value,
    );
  }

  fire(ev: ConfigurationChangeEvent) {
    this._configuration = this._getExtensionConfiguration();
    this._decorationConfiguration = this._getCreateDecorationOptions();
    this._onDecorationConfigChangeEvent.fire(this._decorationConfiguration);
    this._onExtensionConfigChangeEvent.fire(this._configuration);
    this._onDidChangeConfigurationEvent.fire(ev);
    this._registerContextKey();
  }

  dispose() {
    this._onDidChangeConfigurationEvent.dispose();
    this._onDecorationConfigChangeEvent.dispose();
    this._onExtensionConfigChangeEvent.dispose();
    destroy(this._store);
  }
}
