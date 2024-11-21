import {Instance} from 'mobx-state-tree';
import {GlobalStore} from './global';
import {BookmarksStore} from './bookmark-store';

export * from './bookmark';
export * from './configure';
export * from './decoration';
export * from './custom';
export * from './bookmark';
export * from './bookmark-group';
export * from './bookmark-store';
export * from './icons';
export * from './color';
export * from './global';

/**
 * @zh 初始化一个全局的状态管理器
 * @returns
 */
export function createGlobalStore() {
  const globalStore = GlobalStore.create({
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

/**
 * @zh  创建书签状态管理器
 * @returns
 */
export function createBookmarkStore() {
  const bookmarkStore = BookmarksStore.create({
    bookmarks: [],
  });
  return bookmarkStore;
}
