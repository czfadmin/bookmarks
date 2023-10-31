/**
 * https://github.com/microsoft/vscode/blob/0ac9d25b81e2a8afdfcd0511758beaf4cf859302/extensions/git/resources/emojis.json
 */
'use strict';
import { workspace, Uri } from 'vscode';
import { getExtensionContext } from './extension';
import { TextDecoder } from 'util';

const emojiRegex = /:(\w.*?)/g;

let emojiMap: Record<string, string> | undefined;
let emojiMapPromise: Promise<void> | undefined;

export async function ensureEmojis() {
  if (emojiMap === undefined) {
    if (emojiMapPromise === undefined) {
      emojiMapPromise = loadEmojiMap();
    }
    await emojiMapPromise;
  }
}

async function loadEmojiMap() {
  const context = getExtensionContext();

  const uri = (Uri as any).joinPath(
    context.extensionUri,
    'resources',
    'emojis.json'
  );
  emojiMap = JSON.parse(
    new TextDecoder('utf8').decode(await workspace.fs.readFile(uri))
  );
}

export function emojify(message: string) {
  if (emojiMap === undefined) {
    return message;
  }

  return message.replace(emojiRegex, (s, code) => {
    return emojiMap?.[code] || s;
  });
}
