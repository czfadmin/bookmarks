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
  }

  initial(): void {}

  dispose() {}
}
