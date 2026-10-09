// The ids of gabc/index.json and the files of the database that the code
// names directly; everything else is reached through gabc/liturgy.json.

/** Database files, relative to the site. */
export const DATA_FILES = {
  index: 'gabc/index.json',
  liturgy: 'gabc/liturgy.json',
  lodiConclusions: 'testi/lodi-conclusioni.json',
  compietaOrations: 'testi/compieta-orazioni.json',
  ordinario: 'testi/ordinario.json',
  esame: 'testi/esame-coscienza.json',
  marianIt: 'testi/antifone-mariane-it.json',
  seasonProperIt: 'testi/proprio-tempo-it.json',
  comuni: 'testi/comuni.json',
} as const;

/** Folder of the short readings (letturaBreve.file is relative to it). */
export const READINGS_DIR = 'letture/';

/** The Benedictus, sung at every Lodi. */
export const BENEDICTUS_FILE = 'salmi/cant-lc-1-68-79-benedictus.json';

/** Compieta pieces, numbered as in the inventory (gabc/tools/archivio/PDF-INVENTORY.md). */
export const compietaId = (n: number) => `compieta.C${n}`;

/** The versicle «Custodi nos» after the short responsory of Compieta, ordinary and paschal. */
export const CUSTODI = { ordinary: 'compieta.custodi', paschal: 'compieta.custodi-tp' } as const;

/** Chants of the Ordinary of Lodi (libretto pp. 301-321). */
export const ORDINARIO = {
  /** tone of the short reading */
  lectio: 'ordinario.LECTIO',
  blessing: { simple: 'ordinario.BEN1', solemn: 'ordinario.BEN2' },
  /** «Deus, in adiutorium» in a tone, without Alleluia in Lent */
  opening: (tone: string, lent: boolean) => `ordinario.DEUS-${tone}${lent ? '-q' : ''}`,
  paterNoster: (tone: string) => `ordinario.PN-${tone}`,
  benedicamus: (key: string) => `ordinario.BD-${key}`,
} as const;

/** File name of a chant, without folder: "gabc/chants/123-x.gabc" → "123-x.gabc". */
export const chantFileName = (file: string): string => file.split('/').pop() ?? file;
