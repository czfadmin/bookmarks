import {Instance, types} from 'mobx-state-tree';

export const BookmarkColor = types.model('bookmark-color', {
  label: types.string,
  value: types.string,
  /**
   * 颜色16进制的值
   */
  hex: types.string,
});

export type BookmarkColorType = Instance<typeof BookmarkColor>;
