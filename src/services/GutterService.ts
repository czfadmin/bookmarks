import {Disposable} from 'vscode';
import {ServiceManager} from './ServiceManager';
import {EXTENSION_ID} from '../constants';
import {BaseService} from './BaseService';

/**
 * Gutter 服务
 */
export default class GutterService extends BaseService {
  constructor(sm: ServiceManager) {
    super(GutterService.name, sm);
    // this._sm.configService.onDidChangeConfiguration(ev => {
    //   if (
    //     ev.affectsConfiguration(`${EXTENSION_ID}.defaultBookmarkIconColor`) ||
    //     ev.affectsConfiguration(`${EXTENSION_ID}.colors`) ||
    //     ev.affectsConfiguration(`${EXTENSION_ID}.useBuiltInColors`)
    //   ) {
    //     // this._initial();
    //   }
    // });
  }

  initial(): void {}

  dispose() {}
}
