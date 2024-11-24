import {IBookmarkStoreInfo} from '../types';
import {BaseService} from './BaseService';
import {ServiceManager} from './ServiceManager';

/**
 * 用于对存储版本的内容进行迁移工作
 */
export class MigrateService extends BaseService {
  constructor(sm: ServiceManager) {
    super(MigrateService.name, sm);
  }

  /**
   * @zh 对之前版本的书签保存的内容进行迁移工作
   * @param data 
   * @returns 
   */
  migrate(data: IBookmarkStoreInfo) {
    if (!data.version ||  data.version <= '0.0.36') {
      data.bookmarks = data.bookmarks.map(it => {
        return {
          ...it,
          sortedInfo: {
            ...it.sortedInfo,
            icon: 0,
          },
        };
      });
      if (!data.version) {
        data.version = process.env.version!
      }
    }
    return data;
  }
  initial(): void {}
  dispose(): void {}
}
