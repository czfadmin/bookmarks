import { types } from 'mobx-state-tree';
import { BookmarkColor } from './color';
import { Icon } from './icons';
import { RootConfigure } from './configure';

export const GlobalStore = types
  .model('global-store', {
    colors: types.map(BookmarkColor),
    icons: types.array(Icon),
    configure: RootConfigure,
  }).views(self => {
    return {
    }
  })
  .actions(self => {
    return {
      afterCreate() { },

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

      clearColors() {
        self.colors.clear();
      },

      addNewColor(name: string, value: string, hex: string) {
        self.colors.set(
          name,
          BookmarkColor.create({
            label: name,
            value,
            hex,
          }),
        );
      },
    };
  });
