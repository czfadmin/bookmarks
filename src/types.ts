import { Uri, DecorationOptions, Selection } from 'vscode';

export type StringIndexType<T> = { [key: string]: T };
export type BookmarkColor = string | 'none';

export type LineBookmarkContext =
  | Uri
  | { uri: Uri; lineNumber: number }
  | undefined;

export interface BookmarkMeta {
  id: string;
  fileUri: Uri;
  color: BookmarkColor;
  selection: Selection;
  label?: string;
  selectionContent?: string;
  description?: string;
  fileUriHash?: string;
  languageId?: string;
  rangesOrOptions: DecorationOptions;
}

/**
 * 根据文件名来分组
 * ```json
 * {
 *   id
 *   file,
 *   bookmarks: []
 * }
 * ```
 */
export type BookmarkStoreType = {
  /**
   * 根据`当前打开的文件(Uri) + 当前行(Uri)` 进行生成hash 作为id
   */
  id: string;
  fileUri: Uri;
  filename: string;
  bookmarks: BookmarkMeta[];
};

/**
 * 根据工作区间来分组
 * ```json
 * {
 *   workspace,
 *   data: []
 * }
 * ```
 */
export type BookmarkStoreRootType = {
  /**
   * 根据当前的工作区目录信息生成的hash
   */
  workspace: string;
  data: BookmarkStoreType[];
};

export interface CreateDecorationOptions {
  showGutterIcon: boolean;
  showGutterInOverviewRuler: boolean;
}

export type BookmarkDecorationKey = string | 'default';
