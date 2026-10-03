import { describe, it, expect } from 'vitest';
import { easter, adventStart, fromDayNumber, liturgicalDay, parseIsoDate, toIsoDate } from './calendar';
import { benedicamusKey, compietaPlan, lodiPlan } from './plan';

const iso = (n: number) => toIsoDate(fromDayNumber(n));
const day = (s: string) => liturgicalDay(parseIsoDate(s)!);

describe('movable dates', () => {
  it('computes Easter', () => {
    expect(iso(easter(2024))).toBe('2024-03-31');
    expect(iso(easter(2025))).toBe('2025-04-20');
    expect(iso(easter(2026))).toBe('2026-04-05');
    expect(iso(easter(2027))).toBe('2027-03-28');
    expect(iso(easter(2038))).toBe('2038-04-25');
  });
  it('computes the first Sunday of Advent', () => {
    expect(iso(adventStart(2024))).toBe('2024-12-01');
    expect(iso(adventStart(2025))).toBe('2025-11-30');
    expect(iso(adventStart(2026))).toBe('2026-11-29');
    expect(iso(adventStart(2027))).toBe('2027-11-28');
  });
});

describe('liturgicalDay', () => {
  it('Ordinary Time after Pentecost (today)', () => {
    const d = day('2026-10-03');
    expect(d.season).toBe('ordinario');
    expect(d.seasonWeek).toBe(26);
    expect(d.psalterWeek).toBe(2);
    expect(d.label).toBe('Sabato della XXVI settimana del Tempo Ordinario');
    expect(d.color).toBe('verde');
  });
  it('a Sunday displaces a feast of a saint (St Francis 2026)', () => {
    const d = day('2026-10-04');
    expect(d.celebration).toBeNull();
    expect(d.label).toBe('XXVII Domenica del Tempo Ordinario');
    expect(d.psalterWeek).toBe(3);
  });
  it('but not a feast of the Lord (Transfiguration on Sunday 2028)', () => {
    expect(day('2028-08-06').celebration?.name).toBe('Trasfigurazione del Signore');
  });
  it('Ordinary Time after the Baptism', () => {
    const d = day('2026-01-12');
    expect(d.season).toBe('ordinario');
    expect(d.seasonWeek).toBe(1);
    expect(d.psalterWeek).toBe(1);
    expect(day('2026-01-11').celebration?.name).toBe('Battesimo del Signore');
    expect(day('2026-01-11').season).toBe('natale');
  });
  it('resumes Ordinary Time after Pentecost with the right week', () => {
    expect(day('2025-06-09').seasonWeek).toBe(10); // Monday after Pentecost 2025
    expect(day('2026-05-25').seasonWeek).toBe(8);
    expect(day('2026-11-22').seasonWeek).toBe(34);
  });
  it('Lent', () => {
    const ash = day('2026-02-18');
    expect(ash.label).toBe('Mercoledì delle Ceneri');
    expect(ash.psalterWeek).toBe(4);
    expect(ash.color).toBe('viola');
    const l1 = day('2026-02-22');
    expect(l1.seasonWeek).toBe(1);
    expect(l1.psalterWeek).toBe(1);
    expect(l1.celebration).toBeNull(); // Chair of Peter displaced by the Sunday
    expect(day('2026-03-15').color).toBe('rosaceo');
    const palm = day('2026-03-29');
    expect(palm.psalterWeek).toBe(2);
    expect(palm.color).toBe('rosso');
  });
  it('Triduum and Easter', () => {
    expect(day('2026-04-02').season).toBe('quaresima');
    expect(day('2026-04-03').season).toBe('triduo');
    expect(day('2026-04-03').color).toBe('rosso');
    const e = day('2026-04-05');
    expect(e.season).toBe('pasqua');
    expect(e.inOctave).toBe('pasqua');
    expect(e.paschal).toBe(true);
    const e2 = day('2026-04-13');
    expect(e2.inOctave).toBeNull();
    expect(e2.psalterWeek).toBe(2);
    expect(day('2026-05-17').celebration?.name).toBe('Ascensione del Signore');
    expect(day('2026-05-24').season).toBe('pasqua');
    expect(day('2026-05-25').season).toBe('ordinario');
  });
  it('Advent and Christmas', () => {
    const a = day('2026-11-29');
    expect(a.season).toBe('avvento');
    expect(a.psalterWeek).toBe(1);
    expect(a.label).toBe("I Domenica di Avvento");
    expect(day('2026-12-13').color).toBe('rosaceo');
    expect(day('2025-12-25').celebration?.name).toBe('Natale del Signore');
    expect(day('2025-12-28').celebration?.name).toBe('Santa Famiglia di Gesù, Maria e Giuseppe');
    expect(day('2025-12-29').psalterWeek).toBe(1);
    expect(day('2026-01-05').psalterWeek).toBe(2);
    expect(day('2025-12-29').inOctave).toBe('natale');
  });
  it('transfers solemnities that collide with privileged days', () => {
    expect(day('2024-12-08').celebration).toBeNull(); // II Sunday of Advent
    expect(day('2024-12-09').celebration?.name).toMatch(/Immacolata/);
    expect(day('2024-03-25').celebration).toBeNull(); // Holy Monday
    expect(day('2024-04-08').celebration?.name).toBe('Annunciazione del Signore');
    expect(day('2028-03-19').celebration).toBeNull(); // III Sunday of Lent
    expect(day('2028-03-20').celebration?.name).toMatch(/San Giuseppe/);
  });
  it('solemnities win over Sundays of Ordinary Time', () => {
    expect(day('2026-11-01').celebration?.name).toBe('Tutti i Santi');
  });
});

describe('lodiPlan', () => {
  it('uses the psalter day on a plain weekday', () => {
    const p = lodiPlan(day('2026-10-03'));
    expect(p).toMatchObject({ week: 2, dayName: 'Sabato', properNotice: null, seasonalNotice: null, paschal: false });
  });
  it('flags proper offices', () => {
    expect(lodiPlan(day('2026-11-01')).properNotice).toMatch(/solennità/);
    expect(lodiPlan(day('2026-04-07')).properNotice).toMatch(/Ottava di Pasqua/);
    expect(lodiPlan(day('2026-12-02')).seasonalNotice).toMatch(/Avvento/);
    expect(lodiPlan(day('2026-11-01')).fallback).toEqual({ week: 1, dayName: 'Domenica' });
    expect(lodiPlan(day('2026-12-30')).fallback).toEqual({ week: 1, dayName: 'Mercoledì' });
    expect(lodiPlan(day('2026-10-03')).fallback).toBeNull();
  });
});

describe('compietaPlan', () => {
  it('picks the block of the day', () => {
    expect(compietaPlan(day('2026-10-03')).blockId).toBe('domenica-I-vespri');
    expect(compietaPlan(day('2026-10-04')).blockId).toBe('domenica-II-vespri');
    expect(compietaPlan(day('2026-10-07')).blockId).toBe('mercoledi');
  });
  it('uses the Sunday Compieta around solemnities', () => {
    expect(compietaPlan(day('2026-12-07')).blockId).toBe('domenica-I-vespri');
    expect(compietaPlan(day('2026-12-08')).blockId).toBe('domenica-II-vespri');
    expect(compietaPlan(day('2026-12-08')).hymnRefs['te-lucis']).toBe('compieta.C30');
  });
  it('chooses hymn, responsory and Marian antiphon by season', () => {
    const ord = compietaPlan(day('2026-10-07'));
    expect(ord.hymnRefs).toEqual({ 'te-lucis': 'compieta.C2', christe: 'compieta.C7' });
    expect(ord.responsoryRef).toBe('compieta.C12');
    expect(ord.marian).toBe('salve');
    expect(compietaPlan(day('2026-10-04')).hymnRefs['te-lucis']).toBe('compieta.C5');
    expect(compietaPlan(day('2026-12-18')).hymnRefs).toEqual({ christe: 'compieta.C31' });
    expect(compietaPlan(day('2026-11-28')).marian).toBe('alma');
    expect(compietaPlan(day('2026-02-01')).marian).toBe('alma');
    expect(compietaPlan(day('2026-02-02')).marian).toBe('ave');
    expect(compietaPlan(day('2026-03-03')).hymnRefs).toEqual({ christe: 'compieta.C35' });
    expect(compietaPlan(day('2026-03-03')).openingWithoutAlleluia).toBe(true);
    expect(compietaPlan(day('2026-04-02')).responsoryRef).toBe('compieta.C38');
    expect(compietaPlan(day('2026-04-08')).responsoryRef).toBe('compieta.C39');
    expect(compietaPlan(day('2026-05-01')).responsoryRef).toBe('compieta.C40');
    expect(compietaPlan(day('2026-05-01')).marian).toBe('regina');
    expect(compietaPlan(day('2026-05-01')).hymnRefs).toEqual({ iesu: 'compieta.C36' });
  });
});

describe('benedicamusKey', () => {
  it('follows the day', () => {
    expect(benedicamusKey(day('2026-10-03'))).toBe('ferie');
    expect(benedicamusKey(day('2026-10-04'))).toBe('domeniche');
    expect(benedicamusKey(day('2026-11-01'))).toBe('solennita');
    expect(benedicamusKey(day('2026-11-30'))).toBe('feste');
    expect(benedicamusKey(day('2026-12-02'))).toBe('avvento-quaresima');
    expect(benedicamusKey(day('2026-04-08'))).toBe('pasqua');
    expect(benedicamusKey(day('2026-05-06'))).toBe('tempo-pasquale');
  });
});
