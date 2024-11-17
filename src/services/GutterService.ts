import {Disposable, Uri} from 'vscode';
import {ServiceManager} from './ServiceManager';
import {createBookmarkIcon, createTagIcon, svgToUri} from '../utils';
import {DEFAULT_BOOKMARK_COLOR, EXTENSION_ID} from '../constants';

/**
 * Gutter 服务
 */
export default class GutterService implements Disposable {
  private readonly _sm: ServiceManager;
  private _gutters: Map<string, {color: string; iconPath: Uri | string}>;
  public get gutters(): Map<string, {color: string; iconPath: Uri | string}> {
    return this._gutters;
  }
  private _tagGutters: Map<string, {color: string; iconPath: Uri | string}>;

  public get tagGutters(): Map<
    string,
    {color: string; iconPath: Uri | string}
  > {
    return this._tagGutters;
  }

  constructor(sm: ServiceManager) {
    this._sm = sm;
    this._gutters = new Map();
    this._tagGutters = new Map();
    this._initial();
    this._sm.configService.onDidChangeConfiguration(ev => {
      if (
        ev.affectsConfiguration(`${EXTENSION_ID}.defaultBookmarkIconColor`) ||
        ev.affectsConfiguration(`${EXTENSION_ID}.colors`) ||
        ev.affectsConfiguration(`${EXTENSION_ID}.useBuiltInColors`)
      ) {
        this._initial();
      }
    });
  }

  /**
   * 初始化gutter
   */
  private _initial() {
    const configService = this._sm.configService;
    const colors = configService.colors;
    if (this._gutters.size) {
      this._gutters.clear();
    }
    if (this._tagGutters.size) {
      this._gutters.clear();
    }
    Object.entries(colors).forEach(([key, value]: [string, string]) => {
      this._gutters.set(key, {
        color: value,
        iconPath: svgToUri(createBookmarkIcon(value || DEFAULT_BOOKMARK_COLOR)),
      });
      this._tagGutters.set(key, {
        color: value,
        iconPath: svgToUri(createTagIcon(value || DEFAULT_BOOKMARK_COLOR)),
      });
    });
  }

  public getGutter(key: string) {
    return this._gutters.get(key) || this._gutters.get('default')!;
  }

  public getTagGutter(key: string) {
    return this._tagGutters.get(key) || this._tagGutters.get('default')!;
  }

  dispose() {
    this._gutters.clear();
    this._tagGutters.clear();
  }
}
