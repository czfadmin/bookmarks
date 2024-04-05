import {types, Instance} from 'mobx-state-tree';
import {DEFAULT_BOOKMARK_GROUP_COLOR} from '../constants';

export const BookmarkGroup = types
  .model('BookmarkGroup', {
    /**
     * 书签ID
     */
    id: types.string,
    /**
     * 书签标签
     */
    label: types.string,
    /**
     * 书签在视图中排序索引
     */
    sortedIndex: types.optional(types.number, 0),
    /**
     * 书签颜色
     */
    color: types.optional(types.string, DEFAULT_BOOKMARK_GROUP_COLOR),
    /**
     * 当前组是否为默认激活的分组
     * - 默认情况下,默认分组为激活状态,其他未非激活状态
     * - 设置为true 的话,默认创建的书签将会放置到激活的分组中
     */
    activeStatus: types.optional(types.boolean, false),
  })
  .actions(self => {
    return {
      setSortedIndex(idx: number) {
        self.sortedIndex = idx;
      },
      changeLabel(label: string) {
        self.label = label;
      },
      changeColor(color: string) {
        self.color = color;
      },
      setActiveStatus(isActived: boolean) {
        self.activeStatus = isActived;
      },
    };
  });

export type IBookmarkGroup = Instance<typeof BookmarkGroup>;
