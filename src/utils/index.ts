import * as vscode from 'vscode';
import {v4 as uuid} from 'uuid';

export * from './command';
export * from './resources';
export * from './bookmark';
export * from './icon';
export * from './translate';

export interface IDisposable {
  dispose(): void;
}

export function generateUUID() {
  return uuid();
}

export function getRelativePath(p: string) {
  return vscode.workspace.asRelativePath(p);
}

export function dispose<T extends IDisposable>(disposables: T[] | T) {
  if (Array.isArray(disposables)) {
    disposables.forEach(it => it.dispose());
    return;
  }
  disposables.dispose();
}
