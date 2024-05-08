import {BaseService} from './BaseService';
import {ServiceManager} from './ServiceManager';

/**
 * 用于对存储版本的内容进行迁移工作
 */
export class MigrateService extends BaseService {
  constructor(sm: ServiceManager) {
    super(sm);
  }
}
