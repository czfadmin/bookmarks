import { Uri, DecorationOptions, Selection } from 'vscode';

export type BookmarkLevel = 'low' | 'normal' | 'high' | 'none';

export interface BookmarkMeta {
  id: string;
  fileUri: Uri;
  level: BookmarkLevel;
  selection: Selection;
  label?: string;
  description?: string;
  fileUriHash?: string;
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
