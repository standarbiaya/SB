"""Validate CSV headers before importing them as Sheets tabs."""
import csv
from pathlib import Path
root=Path(__file__).resolve().parents[1] / 'templates'
for f in sorted(root.glob('*.csv')):
    with f.open(encoding='utf-8-sig',newline='') as stream:
        reader=csv.reader(stream)
        h=next(reader)
    assert 'id' in h or f.stem == 'RELASI_REGULASI',f'{f.name}: missing ID'
    print(f'OK {f.name}: {len(h)} columns')
