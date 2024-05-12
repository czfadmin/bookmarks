import {LoggerService} from './LoggerService';
import {ServiceManager} from './ServiceManager';

export class BaseService {
  private readonly _sm: ServiceManager;
  private readonly _logger: LoggerService;
  constructor(name: string, sm: ServiceManager) {
    this._sm = sm;
    this._logger = new LoggerService(name);
  }
}
