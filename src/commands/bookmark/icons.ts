import {l10n, QuickPickItem, window} from 'vscode';
import {ServiceManager} from '../../services';
import {IBookmark, IconType} from '../../stores';
import {BookmarkActionContext} from '../../types';
import {getBookmarkFromCtx} from '../../utils';

/**
 * @zh 改变书签图标
 */
export async function changeBookmarkIcon(context: BookmarkActionContext) {
  const icons = ServiceManager.instance.icons;

  let bookmark: IBookmark | undefined = getBookmarkFromCtx(context);
  if (!bookmark) {
    window.showInformationMessage(
      l10n.t('Please select the bookmark before proceeding.'),
      {},
    );
    return;
  }

  const iconPickItems = icons.map((it: IconType) => {
    return {
      label: it.customName || it.name,
      description: it.id,
      iconPath: it.iconPath,
      meta: {
        ...it,
      },
    } as QuickPickItem;
  });

  const choosenIcon = await window.showQuickPick(
    iconPickItems as QuickPickItem[],
    {
      title: l10n.t('please select a icon.'),
      placeHolder:
        bookmark.icon || l10n.t('Please select the icon you want to use.'),
      canPickMany: false,
      ignoreFocusOut: false,
      matchOnDescription: true,
      matchOnDetail: true,
    },
  );

  if (!choosenIcon) {
    return;
  }

  bookmark.updateIcon(
    (choosenIcon as QuickPickItem & {meta: IconType}).meta.id,
  );
}
