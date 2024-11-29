import {WorkspaceFolder, Event, EventEmitter, extensions} from 'vscode';
import {ServiceManager} from './ServiceManager';
import {BaseService} from './BaseService';
import {API, GitExtension} from '../types';

/**
 * Git 相关的服务类
 */
export default class GitService extends BaseService {
  repos: WorkspaceFolder[] = [];
  private _onDidReposChangeEvent: EventEmitter<WorkspaceFolder[]> =
    new EventEmitter<WorkspaceFolder[]>();

  private _gitExtension: GitExtension | undefined;

  private _git: API | undefined;

  onDidReposChangeEvent: Event<WorkspaceFolder[]> =
    this._onDidReposChangeEvent.event;

  private _branch: string = '';

  get branch() {
    return this._branch;
  }

  get git() {
    if (!this._git) {
      this._git = this._gitExtension?.getAPI(1);
    }
    return this._git;
  }

  get gitExtension() {
    if (!this._gitExtension) {
      try {
        this._gitExtension =
          extensions.getExtension<GitExtension>('vscode.git')!.exports;
      } catch (e) {
        this.logger.error(e);
      }
    }
    return this._gitExtension;
  }

  constructor(sm: ServiceManager) {
    super(GitService.name, sm);
    this._init();
  }

  private _init() {
    const _gitExt = extensions.all.find(it => it.id === 'vscode.git');
    if (_gitExt) {
      if (!_gitExt.isActive) {
        _gitExt.activate().then(e => {
          this._gitExtension = e as GitExtension;
          this._git = this._gitExtension.getAPI(1);
        });
      } else {
        this._gitExtension =
          extensions.getExtension<GitExtension>('vscode.git')!.exports;
        this._git = this._gitExtension.getAPI(1);
      }
    }

    this.addToDisposers(
      extensions.onDidChange(e => {
        try {
          const _gitExtension = extensions.all.find(
            it => it.id === 'vscode.git',
          );
          if (!_gitExtension || _gitExtension.isActive || this._gitExtension) {
            return;
          }

          this._gitExtension =
            extensions.getExtension<GitExtension>('vscode.git')!.exports;
          this._git = this._gitExtension.getAPI(1);
        } catch (error) {
          this.logger.error(error);
        }
      }),
    );
  }

  dispose() {}
}
