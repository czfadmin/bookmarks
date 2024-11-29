import {IDisposer} from 'mobx-state-tree';
import {IDisposable, ILifecyle} from '../utils';
import {LoggerService} from './LoggerService';
import {ServiceManager} from './ServiceManager';

export abstract class BaseService implements ILifecyle {
  public readonly sm: ServiceManager;
  public readonly logger: LoggerService;

  public readonly _disposers: (IDisposable | IDisposer)[] = [];

  public get store() {
    return this.sm.store;
  }

  public get configure() {
    return this.sm.configure;
  }

  constructor(name: string, sm: ServiceManager) {
    this.sm = sm;
    this.logger = new LoggerService(name);
  }

  initial() {}

  dispose() {
    this._disposers.forEach(it => {
      if (typeof it === 'function') {
        it();
        return;
      }
      it.dispose();
    });
  }

  addToDisposers(disposable: IDisposable | IDisposer) {
    this._disposers.push(disposable);
  }

  saveToDisk(p: string, data: any) {
    this.sm.fileService.saveToDisk(p, data);
  }
}
