import {Uri, DecorationOptions, Selection} from 'vscode';

export type StringIndexType<T> = {[key: string]: T};
export type BookmarkColor = string | 'none';

export type LineBookmarkContext =
  | Uri
  | {uri: Uri; lineNumber: number}
  | undefined;

export interface BaseMeta {
  id: string;
  label?: string;
  color: BookmarkColor;
}
export interface BookmarkMeta extends BaseMeta {
  id: string;
  fileId: string;
  fileName: string;
  fileUri: Uri;
  type: 'line' | 'selection';
  color: BookmarkColor;
  selection: Selection;
  label?: string;
  selectionContent?: string;
  description?: string;
  languageId?: string;
  rangesOrOptions: DecorationOptions;
}

export enum UniversalBookmarkType {
  URI = 0,
  FILE,
  TEXT,
}

/**
 * 根据文件名来分组
 * ```json
 * {
 *   fileId
 *   fileUri,
 *   fileName,
 *   bookmarks: []
 * }
 * ```
 */
export type BookmarkStoreType = {
  /**
   * fileUri.fsPath
   */
  fileId: string;
  fileUri: Uri;
  fileName: string;
  bookmarks: BookmarkMeta[];
};

/**
 * 根据工作区间来分组
 * ```json
 * {
 *   workspace,
 *   bookmarks: []
 * }
 * ```
 */
export type BookmarkStoreRootType = {
  /**
   * 根据当前的工作区目录信息
   */
  workspace: string;
  bookmarks: BookmarkMeta[];
};

export interface CreateDecorationOptions {
  showGutterIcon: boolean;
  showGutterInOverviewRuler: boolean;
  showTextDecoration?: boolean;
  alwaysUseDefaultColor?: boolean;
  fontWeight: 'normal' | 'bold' | 'bolder' | 'unset';
  wholeLine: boolean;
  textDecorationLine: string;
  textDecorationStyle: string;
  textDecorationThickness: string;
  highlightBackground: boolean;
  showBorder: boolean;
  border: string;
  showOutline: boolean;
  outline: string;
}

export type BookmarkManagerConfigure = CreateDecorationOptions & {
  colors: StringIndexType<string>;
  lineBlame: boolean;
  relativePath: boolean;
  enableClick: boolean;
  defaultBookmarkIconColor?: string;
};

export type BookmarkDecorationKey = string | 'default';
