import {types} from 'mobx-state-tree';
import {BookmarkColor} from './color';
import {Icon} from './icons';
import {DEFAULT_BOOKMARK_COLOR} from '../constants';
import {RootConfigure} from './configure';

export const GlobalStore = types
  .model('global-store', {
    colors: types.array(BookmarkColor),
    icons: types.array(Icon),
    configure: RootConfigure,
  })
  .actions(self => {
    return {
      afterCreate() {},

      addNewIcon(
        prefix: string,
        name: string,
        body: string,
        customName: string = '',
      ) {
        self.icons.push(
          Icon.create({
            id: `${prefix}:${name}`,
            prefix,
            name,
            body: body,
            customName,
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
