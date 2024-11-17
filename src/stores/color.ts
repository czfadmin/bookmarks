import {Instance, types} from 'mobx-state-tree';

export const BookmarkColor = types.model('bookmark-color', {
  label: types.identifier,
  value: types.string,
});
