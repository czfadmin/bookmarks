import {window, l10n} from 'vscode';
import {IBookmark} from '../../stores';
import {BookmarkActionContext} from '../../types';
import {chooseBookmarkGutter, getBookmarkFromCtx} from '../../utils';
import {resolveBookmarkController} from '../../bootstrap';

/**
 * 改变书签的gutter
 * @param args
 */
export async function changeBookmarkGutter(ctx: BookmarkActionContext) {
  let bookmark: IBookmark | undefined = getBookmarkFromCtx(ctx);
  if (!bookmark) {
    window.showInformationMessage(l10n.t('Please select bookmark color'), {});
    return;
  }

  const gutter = await chooseBookmarkGutter();
  // if (!gutter) {
  //   return;
  // }

  // bookmark.updateGutter(gutter);
}
