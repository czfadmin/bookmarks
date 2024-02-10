import {Disposable, Uri} from 'vscode';
import {ServiceManager} from './ServiceManager';
import {createBookmarkIcon, createTagIcon, svgToUri} from '../utils';
import {DEFAULT_BOOKMARK_COLOR} from '../constants';

export interface Gutter {
  [key: string]: {
    color: string;
    iconPath: Uri | string;
  };
}

/**
 * Gutter 服务
 */
export default class GutterService implements Disposable {
  private readonly _sm: ServiceManager;
  private _gutters: Gutter;
  public get gutters(): Gutter {
    return this._gutters;
  }

  private _tagGutters: Gutter;
  public get tagGutters(): Gutter {
    return this._tagGutters;
  }

  constructor(sm: ServiceManager) {
    this._sm = sm;
    this._gutters = {};
    this._tagGutters = {};
    this._initial();
    this._sm.configService.onDidChangeConfiguration(ev => {
      this._initial();
    });
  }

  /**
   * 初始化gutter
   */
  private _initial() {
    const configService = this._sm.configService;
    const colors = configService.colors;
    Object.entries(colors).forEach(([key, value]) => {
      this._gutters[key] = {
        color: value,
        iconPath: svgToUri(createBookmarkIcon(value || DEFAULT_BOOKMARK_COLOR)),
      };
      this._tagGutters[key] = {
        color: value,
        iconPath: svgToUri(createTagIcon(value || DEFAULT_BOOKMARK_COLOR)),
      };
    });
  }

  dispose() {}
}
