import {IBookmark, IMyUriType} from '../stores/bookmark';
export type BookmarkDecorationKey = string | 'default';

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
  fileUri: IMyUriType;
  fileName: string;
  bookmarks: IBookmark[];
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
  bookmarks: IBookmark[];
};
