import {Uri, workspace} from 'vscode';
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
export enum TreeViewStyleEnum {
  TREE = 'tree',
  LIST = 'list',
}

/**
 * 视图排序方式
 */
export enum TreeViewSortedEnum {
  LINENUMBER = 'linenumber',
  /**
   * 当选择自定义排序的时候, 优先级最高, 将忽略其他排序方式
   */
  CUSTOM = 'custom',
  CREATED_TIME = 'createdTime',
  UPDATED_TIME = 'updatedTime',
}

/**
 * 视图分组枚举
 */
export enum TreeViewGroupEnum {
  FILE = 'file',
  COLOR = 'color',
  DEFAULT = 'default',
  WORKSPACE = 'workspace',
  CUSTOM = 'custom',
}
