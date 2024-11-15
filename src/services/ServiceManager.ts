import {ExtensionContext} from 'vscode';
import ConfigService from './ConfigService';
import DecorationService from './DecorationService';
import {IDisposable} from '../utils';
import StatusbarService from './StatusbarService';
import GutterService from './GutterService';
import WorkspaceService from './WorkspaceService';
import GitService from './GitService';

export interface IServiceManager {
  readonly configService: ConfigService;
  readonly decorationService: DecorationService;
  readonly gutterService: GutterService;
  readonly workspaceService: WorkspaceService;
  readonly gitService: GitService;
  readonly statusbarService: StatusbarService | undefined;
}

let _serviceManager: ServiceManager;

export class ServiceManager implements IServiceManager, IDisposable {
  readonly configService: ConfigService;
  readonly decorationService: DecorationService;
  readonly gutterService: GutterService;
  readonly workspaceService: WorkspaceService;
  readonly gitService: GitService;
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
    this.gitService = new GitService(this);
  }

  registerStatusbarService() {
    this._statusbarService = new StatusbarService(this);
  }

  dispose(): void {
    this.configService.dispose();
    this.decorationService.dispose();
    this.workspaceService.dispose();
    this.gutterService.dispose();
    this.gitService.dispose();
  }
}

export function initServiceManager(
  context: ExtensionContext,
  udpateCb: () => void,
): Promise<ServiceManager> {
  return new Promise((resolve, reject) => {
    try {
      _serviceManager = new ServiceManager(context);
      _serviceManager.configService.onDecorationConfigChange(() => {
        udpateCb();
      });
      resolve(_serviceManager);
    } catch (error) {
      reject(error);
    }
  });
}

export function postInitController() {
  _serviceManager.decorationService.setupAllDecorations();
  _serviceManager.registerStatusbarService();
}

const resolveServiceManager = () => _serviceManager;
export const resolveGutterService = () => _serviceManager.gutterService;
export const resolveConfigurationService = () => _serviceManager.configService;
export const resolveDecorationService = () => _serviceManager.decorationService;
export const resolveWorkspaceService = () => _serviceManager.workspaceService;
export const resolveGitService = () => _serviceManager.gitService;

export default resolveServiceManager;
