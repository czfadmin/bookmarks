import {ExtensionContext} from 'vscode';
import ConfigService from './ConfigService';
import DecorationService from './DecorationService';
import {IDisposable} from '../utils';
import StatusbarService from './StatusbarService';
import GutterService from './GutterService';
import WorkspaceService from './WorksapceService';

export interface IServiceManager {
  readonly configService: ConfigService;
  readonly decorationService: DecorationService;
}

let _serviceManager: ServiceManager;

export class ServiceManager implements IServiceManager, IDisposable {
  readonly configService: ConfigService;
  readonly decorationService: DecorationService;

  readonly gutterService: GutterService;
  readonly workspaceService: WorkspaceService;

  private _statusbarService: StatusbarService | undefined;
  public get statusbarService(): StatusbarService | undefined {
    return this._statusbarService;
  }

  private _context: ExtensionContext;
  public get context(): ExtensionContext {
    return this._context;
  }

  constructor(context: ExtensionContext) {
    this._context = context;
    this.configService = new ConfigService(this);
    this.gutterService = new GutterService(this);
    this.decorationService = new DecorationService(this);
    this.workspaceService = new WorkspaceService(this);
  }

  registerStatusbarService() {
    this._statusbarService = new StatusbarService(this);
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
