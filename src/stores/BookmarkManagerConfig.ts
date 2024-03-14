import {Instance, types} from 'mobx-state-tree';

const BookmarkManagerConfigureModel = types
  .model('BookmarkManagerConfigureModel', {})
  .views(self => {
    return {};
  })
  .actions(self => {
    return {};
  });

export type BookmarkManagerConfigure = Instance<
  typeof BookmarkManagerConfigureModel
>;
