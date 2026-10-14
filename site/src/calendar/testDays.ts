// Liturgical days computed directly from the layers in calendaria/, for the
// tests (the site reads them already computed from calendarium/).

import europa from '../../../calendaria/europa.json';
import generale from '../../../calendaria/generale.json';
import genua from '../../../calendaria/genua.json';
import italia from '../../../calendaria/italia.json';
import { liturgicalDays, type LiturgicalDay } from '../../../calendaria/dies';
import { mergeLayers, type Layer } from '../../../calendaria/strata';
import { parseIsoDate } from '../../../calendaria/tempus';
import comuni from '../../../testi/comuni.json';

const LAYERS: Record<string, unknown> = { generale, europa, italia, genua };

/** A day of the calendar made of these layers (by default the Italian one). */
export function dayIn(layers: string[]): (iso: string) => LiturgicalDay {
  const cal = mergeLayers(layers.map((n) => ({ file: `${n}.json`, data: LAYERS[n] as Layer })),
    new Set(comuni.comuni.map((c) => c.id)));
  const cache = new Map<string, LiturgicalDay>();
  return (iso) => {
    let d = cache.get(iso);
    if (!d) {
      const date = parseIsoDate(iso);
      if (!date) throw new Error(`data non valida: ${iso}`);
      d = liturgicalDays(cal, date, date)[0];
      cache.set(iso, d);
    }
    return d;
  };
}

export const ITALIA = ['generale', 'europa', 'italia'];
export const GENUA = [...ITALIA, 'genua'];
