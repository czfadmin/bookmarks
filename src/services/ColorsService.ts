import {ServiceManager} from './ServiceManager';
import {IDisposable} from '../utils';
import {LoggerService} from './LoggerService';
import {EXTENSION_ID} from '../constants';

/**
 * @zh 书签颜色的一个管理服务类, 间接操作对应的store
 */
export default class ColorsService implements IDisposable {
  private _logger: LoggerService;
  private _sm: ServiceManager;
  constructor(sm: ServiceManager) {
    this._sm = sm;
    this._logger = new LoggerService(ColorsService.name);
    this._sm.configService.onDidChangeConfiguration(ev => {
      if (
        ev.affectsConfiguration(`${EXTENSION_ID}.defaultBookmarkIconColor`) ||
        ev.affectsConfiguration(`${EXTENSION_ID}.colors`) ||
        ev.affectsConfiguration(`${EXTENSION_ID}.useBuiltInColors`)
      ) {
      }
    });
  }

  dispose(): void {}
}
