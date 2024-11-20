import {ILifecyle} from '../utils';
import {LoggerService} from './LoggerService';
import {ServiceManager} from './ServiceManager';

export abstract class BaseService implements ILifecyle {
  public readonly sm: ServiceManager;
  public readonly _logger: LoggerService;

  public get store() {
    return this.sm.store;
  }

  public get configure() {
    return this.sm.configure;
  }

  constructor(name: string, sm: ServiceManager) {
    this.sm = sm;
    this._logger = new LoggerService(name);
  }

  initial() {}
  abstract dispose(): void;

  saveToDisk(p: string, data: any) {
    this.sm.fileService.saveToDisk(p, data);
  }
}
