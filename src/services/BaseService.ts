import {ServiceManager} from './ServiceManager';

export class BaseService {
  private readonly _sm: ServiceManager;
  constructor(sm: ServiceManager) {
    this._sm = sm;
  }
}
