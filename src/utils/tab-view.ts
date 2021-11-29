import { urlToMapKey } from './utils';
import { HistoryEntry, OpenGraphInfo } from './interfaces';

export const headerHeight = 71;

function createOpenGraphInfo(): OpenGraphInfo {
  return { title: '', type: '', image: '', url: '' };
}

export function createHistoryEntry(url: string): HistoryEntry {
  return {
    url,
    key: urlToMapKey(url),
    title: '',
    favicon: '',
    openGraphData: createOpenGraphInfo(),
  };
}
