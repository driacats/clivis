import { describe, it, expect } from 'vitest';
import { liturgicalDay } from './calendar';
import { saintsOfDay } from './saintOfDay';

const on = (year: number, month: number, day: number) => saintsOfDay(liturgicalDay({ year, month, day }));

describe('saintsOfDay', () => {
  it('gives the memorial of the day', () => {
    expect(on(2026, 10, 15).saints).toEqual([{ name: 'Santa Teresa di Gesù, vergine e dottore della Chiesa', kind: 'memoria' }]);
    expect(on(2026, 10, 6).saints[0].kind).toBe('memoria facoltativa');
  });
  it('lists several optional memorials', () => {
    expect(on(2026, 10, 16).saints.map((s) => s.name)).toHaveLength(2);
  });
  it('has none on feasts (they are the title of the day)', () => {
    expect(on(2027, 10, 4)).toEqual({ saints: [], note: null }); // Monday: the feast is celebrated
    expect(on(2026, 7, 11)).toEqual({ saints: [], note: null }); // St Benedict, feast in Europe
  });
  it('does not celebrate memorials on Sundays', () => {
    const r = on(2026, 10, 11); // Sunday, St John XXIII
    expect(r.saints[0].name).toMatch(/Giovanni XXIII/);
    expect(r.saints[0].notCelebrated).toMatch(/domenica/);
  });
  it('shows a feast displaced by a Sunday, and a moved solemnity', () => {
    const f = on(2026, 10, 4); // St Francis on the XXVII Sunday
    expect(f.saints[0]).toMatchObject({ name: "San Francesco d'Assisi, patrono d'Italia", kind: 'festa' });
    expect(f.saints[0].notCelebrated).toMatch(/domenica/);
    const i = on(2024, 12, 8); // Immaculate Conception on the II Sunday of Advent → 9 December
    expect(i.saints[0].notCelebrated).toMatch(/lunedì 9 dicembre 2024/);
  });
  it('turns memorials into commemorations in Lent and from 17 December', () => {
    expect(on(2027, 3, 17).saints[0]).toEqual({ name: 'San Patrizio, vescovo', kind: 'commemorazione' });
    expect(on(2026, 12, 21).saints[0].kind).toBe('commemorazione');
  });
  it('adds the movable Marian memorials', () => {
    expect(on(2027, 5, 17).saints[0].name).toBe('Beata Vergine Maria, Madre della Chiesa'); // Monday after Pentecost 2027
    expect(on(2027, 6, 5).saints[0].name).toBe('Cuore Immacolato della Beata Vergine Maria');
  });
  it('offers Saint Mary on Saturday in Ordinary Time', () => {
    expect(on(2026, 10, 10).saints.map((s) => s.name)).toContain('Santa Maria in sabato');
  });
  it('includes the memorials that have no Comune in the libretto', () => {
    expect(on(2026, 10, 2).saints).toEqual([{ name: 'Santi Angeli custodi', kind: 'memoria' }]);
    expect(on(2025, 10, 2).saints[0].name).toBe('Santi Angeli custodi');
  });
  it('says when there is no memorial', () => {
    expect(on(2026, 10, 8).note).toMatch(/feria/);
  });
});
