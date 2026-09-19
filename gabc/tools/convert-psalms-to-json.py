#!/usr/bin/env python3
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SALMI = ROOT / "salmi"

def group_verses(lines):
    """Group raw lines into verses: a line starting with whitespace continues
    the previous verse (half-verse indentation), a line starting at column 0
    begins a new verse."""
    verses = []
    for raw in lines:
        if raw.strip() == "":
            continue
        if raw[0].isspace():
            if not verses:
                verses.append(raw.strip())
            else:
                verses[-1] = verses[-1] + " " + raw.strip()
        else:
            verses.append(raw.rstrip())
    return verses

def parse_txt(path):
    text = path.read_text(encoding="utf-8")
    # split on the literal Latin separator if present
    if "--- Latino ---" in text:
        it_part, la_part = text.split("--- Latino ---", 1)
    else:
        it_part, la_part = text, None

    it_lines = it_part.split("\n")
    # header = leading non-blank lines before first blank line
    header = []
    i = 0
    while i < len(it_lines) and it_lines[i].strip() != "":
        header.append(it_lines[i].rstrip())
        i += 1
    # skip the blank line(s)
    while i < len(it_lines) and it_lines[i].strip() == "":
        i += 1
    it_verse_lines = it_lines[i:]

    epigraph = header[2] if len(header) >= 3 else None

    it_verses = group_verses(it_verse_lines)

    la_verses = None
    if la_part is not None:
        la_lines = la_part.split("\n")
        j = 0
        while j < len(la_lines) and la_lines[j].strip() == "":
            j += 1
        la_verse_lines = la_lines[j:]
        la_verses = group_verses(la_verse_lines)

    return epigraph, it_verses, la_verses

def build_verses(it_verses, la_verses):
    if la_verses is None:
        return [{"it": v, "la": None} for v in it_verses]
    if len(it_verses) != len(la_verses):
        raise ValueError(f"verse count mismatch: it={len(it_verses)} la={len(la_verses)}")
    return [{"it": iv, "la": lv} for iv, lv in zip(it_verses, la_verses)]

def main():
    compieta_links = json.loads((ROOT / "gabc/tools/compieta-psalm-links.json").read_text())
    lodi_links = json.loads((ROOT / "gabc/tools/lodi-psalm-links.json").read_text())

    # unique file -> {ref, title} (first occurrence wins; verified same across dup rows)
    unique = {}
    for row in compieta_links + lodi_links:
        f = row["psalm"]["file"]
        if f not in unique:
            unique[f] = {"ref": row["psalm"]["ref"], "title": row["psalm"]["title"]}

    converted, skipped_already_json, errors = [], [], []

    for txt_rel, meta in sorted(unique.items()):
        txt_path = ROOT / txt_rel
        json_rel = re.sub(r"\.txt$", ".json", txt_rel)
        json_path = ROOT / json_rel
        if json_path.exists() and not txt_path.exists():
            skipped_already_json.append(json_rel)
            continue
        if not txt_path.exists():
            errors.append(f"MISSING SOURCE: {txt_rel}")
            continue
        try:
            epigraph, it_verses, la_verses = parse_txt(txt_path)
            verses = build_verses(it_verses, la_verses)
            out = {
                "ref": meta["ref"],
                "title": meta["title"],
                "epigraph": epigraph,
                "verses": verses,
            }
            json_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            txt_path.unlink()
            converted.append(json_rel)
        except Exception as e:
            errors.append(f"{txt_rel}: {e}")

    print(f"converted: {len(converted)}")
    print(f"skipped (already json, no txt): {len(skipped_already_json)}")
    print(f"errors: {len(errors)}")
    for e in errors:
        print("  ERROR:", e)

if __name__ == "__main__":
    main()
