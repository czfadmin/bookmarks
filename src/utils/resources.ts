import { Uri, ExtensionContext } from 'vscode';
export function getResourceUri(
  context: ExtensionContext,
  filename: string,
  dark: boolean = false
) {
  const resourceName = `resources/${dark ? 'dark' : 'light'}/${filename}`;
  return Uri.joinPath(context.extensionUri, resourceName);
}

export function getLogoUri(context: ExtensionContext, dark: boolean = false) {
  return getResourceUri(context, 'logo.svg');
}
