import {IDisposable} from '../utils';
import {LoggerService} from './LoggerService';
import {ServiceManager} from './ServiceManager';

export class BaseService implements IDisposable {
  public readonly _sm: ServiceManager;
  public readonly _logger: LoggerService;

  public get store() {
    return this._sm.store;
  }

  public get configure() {
    return this._sm.connfigure;
  }

  constructor(name: string, sm: ServiceManager) {
    this._sm = sm;
    this._logger = new LoggerService(name);
  }

  dispose(): void {}
}
