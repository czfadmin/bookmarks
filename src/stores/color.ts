import {Instance, types} from 'mobx-state-tree';

export const BookmarkColor = types.model('bookmark-color', {
  label: types.string,
  value: types.string,
});

export type BookmarkColorType = Instance<typeof BookmarkColor>;
