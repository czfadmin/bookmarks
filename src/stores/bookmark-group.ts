import {types, Instance} from 'mobx-state-tree';
import {DEFAULT_BOOKMARK_GROUP_COLOR} from '../constants';

export const BookmarkGroup = types
  .model('BookmarkGroup', {
    id: types.string,
    label: types.string,
    sortedIndex: types.number,
    color: types.optional(types.string, DEFAULT_BOOKMARK_GROUP_COLOR),
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
    };
  });

export type IBookmarkGroup = Instance<typeof BookmarkGroup>;
