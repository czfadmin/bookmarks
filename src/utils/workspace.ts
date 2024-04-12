import {l10n, ThemeIcon, window, workspace, WorkspaceFolder} from 'vscode';

/**
 * 提供一个QuickPick 让用户选择一个工作区
 * @returns {WorkspaceFolder | undefined}
 */
export async function showWorkspaceFolderQuickPick() {
  const workspaceFolders = workspace.workspaceFolders || [];
  const pickItems = workspaceFolders.map(folder => ({
    label: folder.name,
    description: folder.uri.fsPath,
    iconPath: ThemeIcon.Folder,
  }));

  const selectedWorkspaceFolder = await window.showQuickPick(pickItems, {
    placeHolder: l10n.t('Select a workspace folder'),
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!selectedWorkspaceFolder) {
    return;
  }
  return workspaceFolders.find(it => it.name === selectedWorkspaceFolder.label);
}
