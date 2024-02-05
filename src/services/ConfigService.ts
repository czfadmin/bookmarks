import {
  ConfigurationChangeEvent,
  Disposable,
  Event,
  EventEmitter,
  commands,
  workspace,
} from 'vscode';
import {BookmarkManagerConfigure, CreateDecorationOptions} from '../types';
import {EXTENSION_ID} from '../constants';
import {getAllColors} from '../configurations';
import {registerExtensionCustomContextByKey} from '../context';
import {ServiceManager} from './ServiceManager';

/**
 * 插件的用户配置,以及全局配置, 并监听配置的改动
 */
export default class ConfigService implements Disposable {
  private _onDecorationConfigChangeEvent =
    new EventEmitter<CreateDecorationOptions>();

  private _onExtensionConfigChangeEvent =
    new EventEmitter<BookmarkManagerConfigure>();

  private _onDidChangeConfigurationEvent: EventEmitter<ConfigurationChangeEvent> =
    new EventEmitter<ConfigurationChangeEvent>();
  private _configuration: BookmarkManagerConfigure | undefined;

  private _decorationConfiguration: CreateDecorationOptions | undefined;

  private _serviceManager: ServiceManager;
  onDidChangeConfiguration: Event<ConfigurationChangeEvent> =
    this._onDidChangeConfigurationEvent.event;

  onDecorationConfigChange = this._onDecorationConfigChangeEvent.event;

  onExtensionConfigChange = this._onExtensionConfigChangeEvent.event;

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
    workspace.onDidChangeConfiguration(ev => {
      if (!ev.affectsConfiguration(EXTENSION_ID)) {
        return;
      }

      this.fire(ev);
    });
    this._init();
  }

  private _init() {
    this._configuration = this._getExtensionConfiguration();
    this._registerContextKey();
  }

  private _registerContextKey() {
    this._registerExtensionCustomContext();
    registerExtensionCustomContextByKey('toggleBookmarkWithSelection', false);
  }

  /**
   * 获取用户自定义的书签装饰器配置
   * @returns 返回一个书签装饰的配置
   */
  private _getCreateDecorationOptions(): CreateDecorationOptions {
    const configuration = this._getConfiguration();
    return {
      showGutterIcon: configuration.get('showGutterIcon') || false,
      showGutterInOverviewRuler:
        configuration.get('showGutterInOverviewRuler') || false,
      alwaysUseDefaultColor:
        configuration.get('alwaysUseDefaultColor') || false,
      showTextDecoration: configuration.get('showTextDecoration'),
      fontWeight: configuration.get('fontWeight') || 'bold',
      wholeLine: configuration.get('wholeLine') || false,
      textDecorationLine:
        configuration.get('textDecorationLine') || 'underline',
      textDecorationStyle: configuration.get('textDecorationStyle') || 'wavy',
      textDecorationThickness:
        configuration.get('textDecorationThickness') || 'auto',
      highlightBackground: configuration.get('highlightBackground') || false,
      showBorder: configuration.get('showBorder') || false,
      border: configuration.get('border') || '1px solid',
      showOutline: configuration.get('showOutline') || false,
      outline: configuration.get('outline') || '1px solid',
      createJsonFile: configuration.get('createJsonFile') || false,
    } as CreateDecorationOptions;
  }

  private _getExtensionConfiguration(): BookmarkManagerConfigure {
    const configuration = this._getConfiguration();
    const createDecoration = this._getCreateDecorationOptions();
    const colors = getAllColors();
    return {
      ...createDecoration,
      colors,
      lineBlame: configuration.get('lineBlame') || false,
      relativePath: configuration.get('relativePath') || false,
      defaultBookmarkIconColor: configuration.get('defaultBookmarkIconColor'),
      enableClick: configuration.get('enableClick') || false,
    };
  }

  private _getConfiguration() {
    return workspace.getConfiguration(EXTENSION_ID);
  }

  /**
   * 注册插件自定义上下文
   */
  private _registerExtensionCustomContext() {
    const _configuration =
      this._configuration || this._getExtensionConfiguration();
    Object.entries(_configuration).forEach(([key, value]) => {
      if (typeof value !== 'boolean') {return;}
      commands.executeCommand('setContext', `${EXTENSION_ID}.${key}`, value);
    });
    registerExtensionCustomContextByKey('toggleBookmarkWithSelection', false);
  }

  fire(ev: ConfigurationChangeEvent) {
    this._configuration = this._getExtensionConfiguration();
    this._decorationConfiguration = this._getCreateDecorationOptions();
    this._registerContextKey();
    this._onDecorationConfigChangeEvent.fire(this._decorationConfiguration);
    this._onExtensionConfigChangeEvent.fire(this._configuration);
    this._onDidChangeConfigurationEvent.fire(ev);
  }

  dispose() {
    this._onDidChangeConfigurationEvent.dispose();
    this._onDecorationConfigChangeEvent.dispose();
    this._onExtensionConfigChangeEvent.dispose();
  }
}
