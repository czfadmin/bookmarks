import {Instance, types} from 'mobx-state-tree';
import {Uri} from 'vscode';
import {DEFAULT_BOOKMARK_COLOR} from '../constants';
import {escapeColor} from '../utils';

export const Icon = types
  .model('icon', {
    /**
     * @zh gutter 名称
     */
    name: types.string,
    /**
     * @zh 颜色值
     */
    color: types.string,

    /**
     * @zh svg 图标
     */
    svgPath: types.string,
  })
  .views(self => {
    return {
      get uri() {
        return Uri.parse(`data:image/svg+xml;utf8,${self.svgPath}`);
      },

      get iconPath() {
        return Uri.parse(`data:image/svg+xml;utf8,${self.svgPath}`);
      },

      get escapedColor() {
        return self.color.startsWith('#')
          ? escapeColor(self.color)
          : self.color;
      },
    };
  })
  .actions(self => {
    return {
      changeColor(newColor: string) {
        self.color = newColor;
      },
      changeName(newName: string) {
        self.name = newName;
      },
      changeSvgPath(newSvgPath: string) {
        self.svgPath = newSvgPath;
      },
    };
  });

export const IconStore = types
  .model('iconStore', {
    gutters: types.array(Icon),
  })
  .actions(self => {
    return {
      addNewGutter(
        name: string,
        color: string = DEFAULT_BOOKMARK_COLOR,
        svgPath: string,
      ) {
        self.gutters.push(
          Icon.create({
            name,
            color,
            svgPath: svgPath,
          }),
        );
      },

      removeGutter(name: string) {},
    };
  });

export type IconStoreType = Instance<typeof IconStore>;
