import {DecorationOptions, Selection, Uri, WorkspaceFolder} from 'vscode';
import {BaseMeta, BookmarkColor} from './common';
export type BookmarkDecorationKey = string | 'default';

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
  tag?: string;
  workspaceFolder?: WorkspaceFolder;
  rangesOrOptions: DecorationOptions;
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
  bookmarks: BookmarkMeta[];
};
