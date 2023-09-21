import { Disposable } from 'vscode';

export interface IBookmarkDecoration extends Disposable {
  readonly key: string;
}
