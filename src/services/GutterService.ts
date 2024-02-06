import {Disposable, Uri} from 'vscode';
import {ServiceManager} from './ServiceManager';

export interface Gutter {
  [key: string]: Uri | string;
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

  private _initial() {}

  dispose() {}
}
