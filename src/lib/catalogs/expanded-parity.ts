import { BATCH1_CATALOGS } from './expanded-parity-1';
import { BATCH2_CATALOGS } from './expanded-parity-2';
import { BATCH3_CATALOGS } from './expanded-parity-3';
import { BATCH4_CATALOGS } from './expanded-parity-4';
import { BATCH5_CATALOGS } from './expanded-parity-5';

const LOCALES = ['ko', 'ja', 'zh', 'zh-hans', 'vi', 'fr', 'th', 'es', 'de', 'tr', 'ru'] as const;

export const EXPANDED_PARITY_CATALOGS: Record<string, Record<string, string>> = {};

for (const loc of LOCALES) {
  EXPANDED_PARITY_CATALOGS[loc] = {
    ...BATCH1_CATALOGS[loc],
    ...BATCH2_CATALOGS[loc],
    ...BATCH3_CATALOGS[loc],
    ...BATCH4_CATALOGS[loc],
    ...BATCH5_CATALOGS[loc],
  };
}
