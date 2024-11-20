import {Instance, types} from 'mobx-state-tree';
import {BookmarksStore} from './bookmark-store';
import {BookmarkColor} from './color';
import {Icon} from './icons';
import {DEFAULT_BOOKMARK_COLOR} from '../constants';
import {RootConfigure} from './configure';

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
          const defaultColor =
            self.configure.configure?.defaultBookmarkIconColor ||
            DEFAULT_BOOKMARK_COLOR;
          self.configure.configure?.colors.forEach(it => {
            self.colors.push(
              BookmarkColor.create({
                label: it,
                value: self.configure.configure?.colors.get(it) || defaultColor,
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
            body: body,
          }),
        );
      },

      removeIcon(id: string) {
        const idx = self.icons.findIndex(it => it.id === id);
        self.icons.splice(idx, 1);
      },

      removeIcons(items: string[]) {
        for (let item of items) {
          const idx = self.icons.findIndex(it => it.id === item);
          self.icons.splice(idx, 1);
        }
      },

      addNewColor(name: string, value: string) {
        self.colors.push(
          BookmarkColor.create({
            label: name,
            value,
          }),
        );
      },
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
    bookmarksStore: {
      bookmarks: [],
    },
    colors: [],
    icons: [],
    configure: {
      decoration: {},
      configure: {
        colors: {},
      },
    },
  });
  return globalStore;
}
