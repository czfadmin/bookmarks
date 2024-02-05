import {ExtensionContext} from 'vscode';
import ConfigService from './ConfigService';
import DecorationService from './DecorationService';
import {IDisposable} from '../utils';
export interface IServiceManager {
  readonly configService: ConfigService;
  readonly decorationService: DecorationService;
}

let _serviceManager: ServiceManager;

export class ServiceManager implements IServiceManager, IDisposable {
  readonly configService: ConfigService;
  readonly decorationService: DecorationService;

  private _context: ExtensionContext;
  constructor(context: ExtensionContext) {
    this._context = context;
    this.configService = new ConfigService(this);
    this.decorationService = new DecorationService(this);
  }
  dispose(): void {
    this.configService.dispose();
    this.decorationService.dispose();
  }
}

export function initServiceManager(context: ExtensionContext) {
  _serviceManager = new ServiceManager(context);
}

const resolveServiceManager = () => _serviceManager;
export default resolveServiceManager;
