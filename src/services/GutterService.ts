import {Disposable} from 'vscode';
import {ServiceManager} from './ServiceManager';
import {EXTENSION_ID} from '../constants';

/**
 * Gutter 服务
 */
export default class GutterService implements Disposable {
  private readonly _sm: ServiceManager;

  constructor(sm: ServiceManager) {
    this._sm = sm;

    this._initial();
    this._sm.configService.onDidChangeConfiguration(ev => {
      if (
        ev.affectsConfiguration(`${EXTENSION_ID}.defaultBookmarkIconColor`) ||
        ev.affectsConfiguration(`${EXTENSION_ID}.colors`) ||
        ev.affectsConfiguration(`${EXTENSION_ID}.useBuiltInColors`)
      ) {
        // this._initial();
      }
    });
  }

  /**
   * 初始化gutter
   */
  private _initial() {}

  dispose() {}
}
