import fs from 'node:fs';
import path from 'node:path';
import {
  Disposable,
  workspace,
  WorkspaceFolder,
  Event,
  EventEmitter,
  FileSystemWatcher,
} from 'vscode';
import {ServiceManager} from './ServiceManager';
import {BaseService} from './BaseService';

/**
 * Git 相关的服务类
 */
export default class GitService extends BaseService {
  repos: WorkspaceFolder[] = [];
  private _fsWatcher: FileSystemWatcher | undefined;
  private _onDidReposChangeEvent: EventEmitter<WorkspaceFolder[]> =
    new EventEmitter<WorkspaceFolder[]>();
  onDidReposChangeEvent: Event<WorkspaceFolder[]> =
    this._onDidReposChangeEvent.event;

  constructor(sm: ServiceManager) {
    super(GitService.name, sm);
    this._init();
    workspace.onDidChangeWorkspaceFolders(ev => {
      const {added, removed} = ev;
      let isChanged = false;
      for (let wsFolder of added) {
        if (this._checkFolderIsRepo(wsFolder.uri.fsPath)) {
          this.repos.push(wsFolder);
          if (!isChanged) {
            isChanged = true;
          }
        }
      }
      for (let wsFolder of removed) {
        if (this._checkFolderIsRepo(wsFolder.uri.fsPath)) {
          this.repos = this.repos.filter(
            it => it.uri.fsPath === wsFolder.uri.fsPath,
          );
          if (!isChanged) {
            isChanged = true;
          }
        }
      }
      if (isChanged) {
        this._onDidReposChangeEvent.fire(this.repos);
      }
    });
  }

  private _init() {
    const workspaceFolders = workspace.workspaceFolders || [];
    if (!workspaceFolders.length) {
      return;
    }
    for (let wsFolder of workspaceFolders) {
      const wsPath = wsFolder.uri.fsPath;
      if (
        this._checkFolderIsRepo(wsFolder.uri.fsPath) &&
        !this.repos.find(it => it.uri.fsPath === wsPath)
      ) {
        this.repos.push(wsFolder);
      }
    }
  }

  private _checkFolderIsRepo(p: string) {
    return fs.existsSync(path.resolve(p, '.git'));
  }

  dispose() {
    this._fsWatcher?.dispose();
  }
}
