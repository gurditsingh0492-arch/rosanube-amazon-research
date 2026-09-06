import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Writes `content` to the cache directory and opens the OS share sheet so the
 * file can go to Drive, email, or a spreadsheet app. Returns the file URI.
 */
export async function shareTextFile(
  filename: string,
  content: string,
  mimeType = 'text/csv',
): Promise<string> {
  if (Platform.OS === 'web') {
    downloadInBrowser(filename, content, mimeType);
    return filename;
  }

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename, UTI: 'public.comma-separated-values-text' });
  }
  return file.uri;
}

function downloadInBrowser(filename: string, content: string, mimeType: string): void {
  const globalAny = globalThis as unknown as {
    document?: Document;
    URL?: typeof URL;
    Blob?: typeof Blob;
  };
  if (!globalAny.document || !globalAny.Blob || !globalAny.URL) return;

  const blob = new globalAny.Blob([content], { type: mimeType });
  const url = globalAny.URL.createObjectURL(blob);
  const a = globalAny.document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  globalAny.URL.revokeObjectURL(url);
}
