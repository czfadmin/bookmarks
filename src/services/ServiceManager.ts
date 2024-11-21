import {ExtensionContext} from 'vscode';
import ConfigService from './ConfigService';
import DecorationService from './DecorationService';
import {IDisposable} from '../utils';
import StatusbarService from './StatusbarService';
import GutterService from './GutterService';
import WorkspaceService from './WorkspaceService';
import GitService from './GitService';
import {FileService} from './FileService';
import {createGlobalStore, GlobalStore} from '../stores';
import {IconsService} from './IconsService';
import ColorsService from './ColorsService';
import {Instance} from 'mobx-state-tree';

export interface IServiceManager {
  readonly configService: ConfigService;
  readonly decorationService: DecorationService;
  readonly gutterService: GutterService;
  readonly workspaceService: WorkspaceService;
  readonly gitService: GitService;
  readonly statusbarService: StatusbarService | undefined;
  readonly iconsService: IconsService;
  readonly colorsService: ColorsService;
  readonly fileService: FileService;
}

export class ServiceManager implements IServiceManager, IDisposable {
  readonly configService: ConfigService;
  readonly decorationService: DecorationService;
  readonly gutterService: GutterService;
  readonly workspaceService: WorkspaceService;
  readonly gitService: GitService;

  readonly iconsService: IconsService;

  readonly colorsService: ColorsService;
  private _statusbarService: StatusbarService | undefined;

  public readonly fileService: FileService;

  private static _instance: ServiceManager;

  public static get instance() {
    return this._instance;
  }

  public get statusbarService(): StatusbarService | undefined {
    return this._statusbarService;
  }

  private _context: ExtensionContext;
  public get context(): ExtensionContext {
    return this._context;
  }

  private _store: Instance<typeof GlobalStore>;

  public get store() {
    if (!this._store) {
      this._store = createGlobalStore();
    }
    return this._store;
  }

  public get configure() {
    return this._store.configure;
  }

  public get colors() {
    return this.configure.configure?.colors;
  }

  public get icons() {
    return this.store.icons;
  }

  constructor(context: ExtensionContext) {
    this._context = context;
    this._store = createGlobalStore();
    this.fileService = new FileService(this);
    this.iconsService = new IconsService(this);
    this.configService = new ConfigService(this);
    this.colorsService = new ColorsService(this);
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
    this.iconsService.dispose();
    this.colorsService.dispose();
  }

  static initial(context) {
    this._instance = new ServiceManager(context);
  }
}

export function initServiceManager(
  context: ExtensionContext,
  udpateCb: () => void,
): Promise<ServiceManager> {
  return new Promise((resolve, reject) => {
    try {
      ServiceManager.initial(context);
      ServiceManager.instance.configService.onDecorationConfigChange(() => {
        udpateCb();
      });
      resolve(ServiceManager.instance);
    } catch (error) {
      reject(error);
    }
  });
}

export function postInitController() {
  // _serviceManager.decorationService.setupAllDecorations();
  ServiceManager.instance.registerStatusbarService();
}

const resolveServiceManager = () => ServiceManager.instance;

export default resolveServiceManager;
