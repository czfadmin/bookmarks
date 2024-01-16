import {Uri} from 'vscode';

export type StringIndexType<T> = {[key: string]: T};
export type BookmarkColor = string | 'none';

export interface BaseMeta {
  id: string;
  label?: string;
  color: BookmarkColor;
}

export type LineBookmarkContext =
  | Uri
  | {uri: Uri; lineNumber: number}
  | undefined;
