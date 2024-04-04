import {IBookmark, IBookmarkGroup} from '../stores';

/**
 * 表示保存到`bookmark-manager.json`文件类型
 */
export interface IBookmarkStoreInfo {
  version: string;
  workspace: string;
  /**
   * 更新日期
   */
  updatedDate: string;
  /**
   * @deprecated 使用bookmarks字段代替
   */
  content?: IBookmark[];

  /**
   * 书签列表
   */
  bookmarks: IBookmark[];

  /**
   * 自定义分组类型
   */
  groups: Pick<IBookmarkGroup, 'id' | 'label' | 'sortedIndex'>[];
}

/**
 * 代表`treeView`中 自定义分组类型
 */
export type BookmarksGroupedByCustomType = {
  /**
   * 分组ID
   */
  id: string;
  /**
   * 分组标签名称
   */
  label: string;
  /**
   * 分组信息
   */
  group: IBookmarkGroup;
  /**
   * 分组书签信息
   */
  bookmarks: IBookmark[];
};
