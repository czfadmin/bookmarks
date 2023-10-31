import * as vscode from 'vscode';
import { v4 as uuid } from 'uuid';
export * from './command';
export * from './logger';
export * from './resources';
export function createID() {
  return uuid();
}

export function getRelativePath(p: string) {
  return vscode.workspace.asRelativePath(p);
}
export interface IDisposable {
  dispose(): void;
}
export function dispose<T extends IDisposable>(disposables: T[] | T) {
  if (Array.isArray(disposables)) {
    disposables.forEach((it) => it.dispose());
    return;
  }
  disposables.dispose();
}
