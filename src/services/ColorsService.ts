import {ServiceManager} from './ServiceManager';
import {EXTENSION_ID} from '../constants';
import {BaseService} from './BaseService';

/**
 * @zh 书签颜色的一个管理服务类, 间接操作对应的store
 */
export default class ColorsService extends BaseService {
  constructor(sm: ServiceManager) {
    super(ColorsService.name, sm);

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
