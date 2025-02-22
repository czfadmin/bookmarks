import { ServiceManager } from './ServiceManager';
import { ofetch } from 'ofetch';
import {
  iconfiy_public_url,
  iconify_collection_endpoint,
} from '../constants/icons';
import { IconifyIconsType } from '../types/icon';
import { BaseService } from './BaseService';
import { applySnapshot, IDisposer, onSnapshot } from 'mobx-state-tree';
import { EventEmitter, Uri, window, workspace } from 'vscode';
import { escapeColor } from '../utils';
import { EXTENSION_ID } from '../constants';
import { IconType } from '../stores';

/**
 * @zh 装饰器和树上的图标服务类
 */
export class IconsService extends BaseService {
  private _downloadingIcons: string[];

  private _onIconsDidChangeEvent: EventEmitter<IconType[]> = new EventEmitter<
    IconType[]
  >();

  public onIconsDidChange = this._onIconsDidChangeEvent.event;

  public get icons() {
    return this.store.icons;
  }

  constructor(sm: ServiceManager) {
    super(IconsService.name, sm);
    this._downloadingIcons = [];
    this._disposers.push(
      onSnapshot(this.sm.icons, snapshot => {
        this.fire();
        this.saveToDisk(this.sm.fileService.iconsPath, snapshot);
      }),
    );

    // 监听插件的的`icons`的变化, 更新存储
    this._disposers.push(
      onSnapshot(this.configure.configure.icons, snapshot => {
        const { defaultBookmarkIcon, defaultLabeledBookmarkIcon } =
          this.configure.configure;
        Object.entries(snapshot).forEach(([key, value], index) => {
          if (!this.store.icons.find(it => it.id === value)) {
            this.downloadIcon(value, key);
          }
        });

        const iconValues = Object.values(snapshot);
        this.store.icons
          .filter(
            it =>
              !iconValues.includes(it.id) &&
              it.id !== defaultBookmarkIcon &&
              it.id !== defaultLabeledBookmarkIcon,
          )
          .forEach(it => {
            this.store.removeIcon(it.id);
          });
      }),
    );

    // 监听配置中的默认图标配置
    this._disposers.push(
      workspace.onDidChangeConfiguration(ev => {
        if (
          ev.affectsConfiguration(`${EXTENSION_ID}.defaultBookmarkIcon`) ||
          ev.affectsConfiguration(`${EXTENSION_ID}.defaultLabeledBookmarkIcon`)
        ) {
          const { defaultBookmarkIcon, defaultLabeledBookmarkIcon } =
            this.configure.configure;
          if (!this.store.icons.find(it => it.id === defaultBookmarkIcon)) {
            this.downloadIcon(defaultBookmarkIcon, 'default:bookmark');
          }
          if (
            !this.store.icons.find(it => it.id === defaultLabeledBookmarkIcon)
          ) {
            this.downloadIcon(
              defaultLabeledBookmarkIcon,
              'default:bookmark:tag',
            );
          }
        }
      }),
    );

    this.initial();
  }

  /**
   * @zh  下载iconfiy中的图标, 要求传递的格式是 {prefix}:{name}, vscode的装饰器图标的大小要求是16*16, 所以下载的大小默认是此尺寸
   * @param prefixWithName
   */
  async downloadIcon(prefixWithName: string, customName: string = '') {
    const [prefix, name] = prefixWithName.split(':');

    if (!prefix || !name) {
      return;
    }

    if (this._downloadingIcons.find(it => it === prefixWithName)) {
      return;
    }

    this._downloadingIcons.push(prefixWithName);

    if (!this.store.icons.find(it => it.id === prefixWithName)) {
      window.showInformationMessage('Downloading icon ....');
      const response = await this.download(
        `${iconfiy_public_url}/${prefix}.json?icons=${name}`,
      );
      if (response.name === 'FetchError') {
        window.showInformationMessage('Icon download failed!');
        return;
      }
      window.showInformationMessage('Icon downloaded successfully!');
      const svgBody = (response as IconifyIconsType).icons[name].body;
      this.store.addNewIcon(prefix, name, svgBody, customName);
      this._downloadingIcons = this._downloadingIcons.filter(
        it => it !== prefixWithName,
      );
    }
  }

  /**
   * @zh 开始下载初始图标资源
   */
  async initial() {
    if (this.sm.fileService.exists(this.sm.fileService.iconsPath)) {
      const content = this.sm.fileService.readFileSync(
        this.sm.fileService.iconsPath,
      );

      const obj = JSON.parse(content || '[]') as {
        id: string;
        prefix: string;
        name: string;
        body: string;
      }[];

      if (!obj || !obj.length) {
        await this.downloadDefaultIcons();
      } else {
        applySnapshot(this.sm.store.icons, obj);
      }
    }

    const {
      defaultBookmarkIcon,
      defaultLabeledBookmarkIcon,
      icons: iconsInConfigure,
    } = this.configure.configure;

    const iconsValues: [string, string][] = [];

    for (let [key, value] of iconsInConfigure.entries()) {
      iconsValues.push([key, value]);
    }

    if (!this.store.icons.find(it => it.id === defaultBookmarkIcon)) {
      const defaultIcon = iconsValues.find(iv => iv[1] === defaultBookmarkIcon);
      await this.downloadIcon(
        defaultBookmarkIcon,
        defaultIcon ? defaultIcon[0] : 'default:bookmark',
      );
    }

    if (!this.store.icons.find(it => it.id === defaultLabeledBookmarkIcon)) {
      const defaultIcon = iconsValues.find(iv => iv[1] === defaultBookmarkIcon);
      await this.downloadIcon(
        defaultLabeledBookmarkIcon,
        defaultIcon ? defaultIcon[0] : 'default:bookmark:tag',
      );
    }

    const toDownloadIcons: any[] = [];
    for (let [key, value] of iconsValues) {
      // 下载配置需要存在但不存在本地的图标数据
      if (!this.sm.store.icons.find(it => it.id === value)) {
        toDownloadIcons.push({ key, value });
      }
    }

    // 删除配置不存在但是本地缓存中存在的图标缓存数据
    this.store.icons
      .filter(
        it =>
          !iconsValues.find(km => km[1] === it.id) &&
          it.id !== defaultBookmarkIcon &&
          it.id !== defaultLabeledBookmarkIcon,
      )
      .forEach(it => this.store.removeIcon(it.id));

    if (!toDownloadIcons.length) {
      return;
    }

    Promise.all(
      toDownloadIcons.map(it => {
        return this.downloadIcon(it.value, it.key);
      }),
    );
  }

  async downloadDefaultIcons() {
    const configure = this.configure;
    if (!configure) {
      return;
    }
    const { defaultBookmarkIcon, defaultLabeledBookmarkIcon } =
      configure.configure;

    await this.downloadIcon(defaultBookmarkIcon, 'default:bookmark');
    await this.downloadIcon(defaultLabeledBookmarkIcon, 'default:bookmark:tag');
  }
  /**
   * 下载集合列表
   */
  async downloadCollectionList() {
    const response = await this.download(
      `${iconfiy_public_url}/${iconify_collection_endpoint}`,
    );
  }

  async download(url: string) {
    try {
      return await ofetch(url);
    } catch (error) {
      this._logger.error(error);
      return error;
    }
  }

  async getIconPath(name: string, colorLabel: string = 'default') {
    let icon = this.store.icons.find(it => it.id === name);

    if (!icon) {
      await this.downloadIcon(name);
      icon = this.store.icons.find(it => it.id === name);
    }

    let color =
      this.store.colors.get(colorLabel)?.value ||
      this.configure.configure.defaultBookmarkIconColor;

    color = color.startsWith('#') ? escapeColor(color) : color;

    const body = icon?.body.replace(/fill="(\w.*?)"/gi, `fill="${color}"`);

    return Uri.parse(
      `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24">${body}</svg>`,
    );
  }

  async getDotIcon(colorLabel: string) {
    return this.getIconPath(
      this.configure.configure.defaultBookmarkIcon,
      colorLabel,
    );
  }

  fire() {
    this._onIconsDidChangeEvent.fire(this.sm.icons);
  }

  dispose(): void {
    this._onIconsDidChangeEvent.dispose();
    super.dispose();
  }
}
