import {EventEmitter, WorkspaceFoldersChangeEvent, workspace} from 'vscode';
import {ServiceManager} from './ServiceManager';
import {registerExtensionCustomContextByKey} from '../context';

export default class WorkspaceService {
  private _sm: ServiceManager;

  private _onDidChangeWorkspaceFoldersEvent =
    new EventEmitter<WorkspaceFoldersChangeEvent>();

  onDidChangeWorkspaceFolders = this._onDidChangeWorkspaceFoldersEvent.event;

  constructor(sm: ServiceManager) {
    this._sm = sm;

    this._restoreContextKey();

    // 当工作区间的文件夹发生改变时
    workspace.onDidChangeWorkspaceFolders(ev => {
      this._restoreContextKey();
      this._onDidChangeWorkspaceFoldersEvent.fire(ev);
    });
  }

  private _restoreContextKey() {
    // 当时多个工作区间的话, 设置自定义`multiRootWorkspaces`上下文为True
    registerExtensionCustomContextByKey(
      'multiRootWorkspaces',
      workspace.workspaceFolders && workspace.workspaceFolders.length > 1,
    );
  }
}
