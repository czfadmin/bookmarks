import {Uri} from 'vscode';
import BookmarkTreeItem from '../providers/BookmarksTreeItem';

export type StringIndexType<T> = {[key: string]: T};
export type BookmarkColor = string | 'none';

export interface BaseMeta {
  id: string;
  label?: string;
  color: BookmarkColor;
  sortedIndex?: number;
}

export type LineBookmarkContext =
  | Uri
  | {uri: Uri; lineNumber: number}
  | BookmarkTreeItem
  | undefined;

/**
 * 视图查看方式
 */
export type TreeViewType = 'tree' | 'list';

/**
 * 视图排序方式
 */
export type TreeViewSortedType =
  | 'linenumber'
  | 'custom'
  | 'createdTime'
  | 'updatedTime';

/**
 * 视图分组方式
 */
export type TreeViewGroupType = 'file' | 'color' | 'default' | 'workspace';
