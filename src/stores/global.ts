import {Instance, types} from 'mobx-state-tree';
import {BookmarksStore} from './bookmark-store';
import {BookmarkColor} from './color';
import {Icon} from './icons';
import {DEFAULT_BOOKMARK_COLOR} from '../constants';
import {RootConfigure} from './configure';
import {
  TreeViewGroupEnum,
  TreeViewSortedEnum,
  TreeViewStyleEnum,
} from '../types';

export const GlobalStore = types
  .model('global-store', {
    bookmarksStore: BookmarksStore,
    colors: types.array(BookmarkColor),
    icons: types.array(Icon),
    configure: RootConfigure,
  })
  .actions(self => {
    return {
      afterCreate() {
        // 填充颜色
        if (!self.colors.length) {
          const defaultColor  = self.configure.configure?.defaultBookmarkIconColor || DEFAULT_BOOKMARK_COLOR
          self.configure.configure?.colors.forEach(it => {
            self.colors.push(
              BookmarkColor.create({
                label: it,
                value:
                  self.configure.configure?.colors.get(it) ||
                  defaultColor,
              }),
            );
          });
        }
      },
      addNewIcon(
        prefix: string,
        name: string,
        body: string,
        color: string = DEFAULT_BOOKMARK_COLOR,
      ) {
        self.icons.push(
          Icon.create({
            id: `${prefix}:${name}`,
            prefix,
            name,
            color,
            body: body,
          }),
        );
      },

      removeIcon(name: string) {},
    };
  });

export type GlobalStoreType = Instance<typeof GlobalStore>;

let globalStore: Instance<typeof GlobalStore>;

/**
 * @zh 初始化一个全局的状态管理器
 * @returns
 */
export function createGlobalStore() {
  globalStore = GlobalStore.create({
    // @ts-ignore
    bookmarksStore: BookmarksStore.create({
      bookmarks: [],
      viewType: TreeViewStyleEnum.TREE,
      groupView: TreeViewGroupEnum.DEFAULT,
      sortedType: TreeViewSortedEnum.LINENUMBER,
      groups: [],
      groupInfo: [],
    }),
    colors: [],
    icons: [],
    // @ts-ignore
    configure: RootConfigure.create(),
  });
  return globalStore;
}
