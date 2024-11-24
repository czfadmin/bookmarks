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
import {IBookmarkManagerConfigure} from '../stores/configure';
import {CreateDecorationOptionsType} from '../stores/decoration';
import {StringIndexType} from '../types';
import {BaseService} from './BaseService';

/**
 * 插件的用户配置,以及全局配置, 并监听配置的改动
 */
export default class ConfigService extends BaseService {
  private _onDecorationConfigChangeEvent =
    new EventEmitter<CreateDecorationOptionsType>();

  private _onExtensionConfigChangeEvent =
    new EventEmitter<IBookmarkManagerConfigure>();

  private _onDidChangeConfigurationEvent: EventEmitter<ConfigurationChangeEvent> =
    new EventEmitter<ConfigurationChangeEvent>();
  onDidChangeConfiguration: Event<ConfigurationChangeEvent> =
    this._onDidChangeConfigurationEvent.event;

  onDecorationConfigChange = this._onDecorationConfigChangeEvent.event;

  onExtensionConfigChange = this._onExtensionConfigChangeEvent.event;

  get colors() {
    const _colors = {} as StringIndexType<string>;
    this.configure.configure.colors.forEach((value, key) => {
      // @ts-ignore
      _colors[key as string] = value;
    });
    return _colors;
  }

  get customColors() {
    return this.configure!.configure?.customColors;
  }

  get decorationConfiguration() {
    return this.configure.decoration;
  }
  get configuration() {
    return this.configure.configure;
  }

  constructor(sm: ServiceManager) {
    super(ConfigService.name, sm);

    workspace.onDidChangeConfiguration(ev => {
      if (!ev.affectsConfiguration(EXTENSION_ID)) {
        return;
      }
      // 需要手动刷新配置中的数据
      this.configure.refresh();
      this._init();
      this.fire(ev);
    });

    this._init();

    this._disposers.push(this._onDecorationConfigChangeEvent);
    this._disposers.push(this._onDidChangeConfigurationEvent);
    this._disposers.push(this._onExtensionConfigChangeEvent);
  }

  private _init() {
    this._registerContextKey();
  }

  /**
   * 将用户配置的内容注册到`context`中
   */
  private _registerContextKey() {
    this._registerExtensionCustomContext();
    registerExtensionCustomContextByKey('toggleBookmarkWithSelection', false);
  }

  /**
   * 注册插件自定义上下文
   */
  private _registerExtensionCustomContext() {
    Object.entries(this.configure.configure).forEach(([key, value]) => {
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
      this.sm.context.globalState.get<T>(
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
    this.sm.context.globalState.update(
      `bookmark-manager.global.configuration.${key}`,
      value,
    );
  }

  fire(ev: ConfigurationChangeEvent) {
    this._onDecorationConfigChangeEvent.fire(this.configure.decoration);
    this._onExtensionConfigChangeEvent.fire(this.configure.configure);
    this._onDidChangeConfigurationEvent.fire(ev);
    this._registerContextKey();
  }
}
