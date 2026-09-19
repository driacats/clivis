import { fetchLettura, getIndexEntry } from '../data/loader';
import type { IndexEntry, LetturaDoc, SlotRef } from '../data/types';

/** Plain index lookup, exposed here so render/* code doesn't import data/loader directly. */
export function resolvePiece(id: string): IndexEntry | undefined {
  return getIndexEntry(id);
}

export type ResolvedSlot =
  | { kind: 'lettura'; doc: LetturaDoc }
  | { kind: 'gap'; reason: 'not-applicable' | 'not-extracted'; note: string };

/** Resolves a SlotRef (Lettura Breve, or a Lodi Sunday Benedictus antiphon) into
 * either the fetched document or a gap description ready for gapWarning(). */
export async function resolveSlotRef(ref: SlotRef): Promise<ResolvedSlot> {
  if (ref.kind === 'gap') return ref;
  const doc = await fetchLettura(ref.file);
  return { kind: 'lettura', doc };
}

/** benedictusAntiphon can be a bare index id OR a SlotRef gap (Sunday). */
export function isSlotRef(value: string | SlotRef): value is SlotRef {
  return typeof value === 'object';
}
