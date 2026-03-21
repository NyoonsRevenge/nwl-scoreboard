#!/usr/bin/env python3
"""Extract NWL match data from Google Sheets into JSON for the Next.js static site."""

import json
import os
import re
import sys
import csv
from datetime import datetime
import urllib.request
import zipfile
import io

sys.stdout.reconfigure(encoding='utf-8')

PUBLISHED_ID = '2PACX-1vReMFS4C8UfVHqgl0rI14LVdU4adkyw8_ClQpAJgkXluqncRdqBHXer156nDt_A3deeB7qO0vuDaHE8'
SPREADSHEET_ID = '1vYy9Zsn7hVN3Z3sEW2S0GsXEMh1VVM_P7vn6C5LMFgY'
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'data')

def get_tab_colors():
    """Download XLSX and extract sheet tab colors"""
    print("Fetching XLSX for tab colors...")
    colors = {}
    url = f'https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=xlsx'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            xlsx_data = resp.read()
            
        with zipfile.ZipFile(io.BytesIO(xlsx_data)) as z:
            workbook_xml = z.read('xl/workbook.xml').decode('utf-8', errors='ignore')
            rels_xml = z.read('xl/_rels/workbook.xml.rels').decode('utf-8', errors='ignore')
            
            rels = {}
            for m in re.finditer(r'<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"', rels_xml):
                rels[m.group(1)] = m.group(2)
                
            for m in re.finditer(r'<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"', workbook_xml):
                name = m.group(1).replace('&amp;', '&')
                target = rels.get(m.group(2))
                if not target: continue
                
                sheet_xml = z.read('xl/' + target).decode('utf-8', errors='ignore')
                c_m = re.search(r'<tabColor rgb="([a-fA-F0-9]{8})"', sheet_xml)
                if c_m:
                    color = c_m.group(1)
                    r, g, b = int(color[2:4], 16), int(color[4:6], 16), int(color[6:8], 16)
                    if g > r and g > b: colors[name] = 'team1'  # Green
                    elif (r > g or b > g) and b > 50: colors[name] = 'team2'  # Purple
    except Exception as e:
        print(f"Failed to fetch XLSX tab colors: {e}")
    return colors

def fetch_sheet_list():
    url = f'https://docs.google.com/spreadsheets/d/e/{PUBLISHED_ID}/pubhtml'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching sheet list: {e}")
        return []

    sheets = []
    # match JSON like: items.push({name: "Cutless Keys 17.03.2026 (NWL#23)", pageUrl: "...", gid: "668030288"
    pattern = r'name:\s*"([^"]+)"[^}}]*gid:\s*"(\d+)"'
    for match in re.finditer(pattern, html):
        name = match.group(1).replace(r'\/', '/')
        gid = match.group(2)
        if name != 'Template' and re.search(r'\d{2}\.\d{2}\.\d{4}', name) and re.search(r'NWL#', name, re.IGNORECASE):
            sheets.append({'name': name, 'gid': gid})
    return sheets

def parse_nwl_number(sheet_name):
    m = re.search(r'NWL#(\d+)', sheet_name, re.IGNORECASE)
    return int(m.group(1)) if m else None

def parse_map_and_date(sheet_name):
    date_match = re.search(r'(\d{2}\.\d{2}\.\d{4})', sheet_name)
    date = date_match.group(1) if date_match else ''
    
    map_match = re.search(r'^(.+?)\s+\d{2}\.\d{2}\.\d{4}', sheet_name)
    map_name = map_match.group(1).strip() if map_match else sheet_name
    return map_name, date

def get_tab_colors():
    """Download XLSX and extract sheet tab colors"""
    print("Fetching XLSX for tab colors...")
    colors = {}
    url = f'https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=xlsx'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            xlsx_data = resp.read()
            
        with zipfile.ZipFile(io.BytesIO(xlsx_data)) as z:
            workbook_xml = z.read('xl/workbook.xml').decode('utf-8', errors='ignore')
            rels_xml = z.read('xl/_rels/workbook.xml.rels').decode('utf-8', errors='ignore')
            
            rels = {}
            for m in re.finditer(r'<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"', rels_xml):
                rels[m.group(1)] = m.group(2)
                
            for m in re.finditer(r'<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"', workbook_xml):
                name = m.group(1).replace('&amp;', '&')
                r_id = m.group(2)
                target = rels.get(r_id)
                if not target: continue
                
                sheet_xml = z.read('xl/' + target).decode('utf-8', errors='ignore')
                c_m = re.search(r'<tabColor rgb="([a-fA-F0-9]{8})"', sheet_xml)
                if c_m:
                    color = c_m.group(1)
                    r, g, b = int(color[2:4], 16), int(color[4:6], 16), int(color[6:8], 16)
                    # Green = Beaver (team1), Purple = Capy (team2)
                    if g > r and g > b: colors[name] = 'team1'  # Green
                    elif (r > g or b > g) and b > 50: colors[name] = 'team2'  # Purple
    except Exception as e:
        print(f"Failed to fetch/parse XLSX tab colors: {e}")
    return colors

def safe_int(val):
    if not val:
        return 0
    try:
        # Handle European number format: dots as thousands separator, comma as decimal
        cleaned = str(val).strip().replace('.', '').replace(',', '.')
        return int(float(cleaned))
    except (ValueError, TypeError):
        return 0

def is_group_label(val):
    return val and isinstance(val, str) and re.match(r'^G\d+', val.strip())

def parse_player(row, col_offset):
    if not row or len(row) < col_offset + 7:
        return None
    role = str(row[col_offset]).strip()
    name = str(row[col_offset + 1]).strip()
    if not name or not role:
        return None
    if len(role) > 5 or not role.isalpha():
        return None
    return {
        'name': name,
        'role': role,
        'kills': safe_int(row[col_offset + 2]),
        'deaths': safe_int(row[col_offset + 3]),
        'assists': safe_int(row[col_offset + 4]),
        'healing': safe_int(row[col_offset + 5]),
        'damage': safe_int(row[col_offset + 6]),
    }

def fetch_sheet_csv(gid):
    url = f'https://docs.google.com/spreadsheets/d/e/{PUBLISHED_ID}/pub?output=csv&gid={gid}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        text = resp.read().decode('utf-8')
    return list(csv.reader(text.splitlines()))

def parse_match(rows):
    result = None
    duration = None

    for row in rows:
        if len(row) > 7:
            h = str(row[7]).strip()
            h_up = h.upper()
            if result is None:
                if h_up == 'VICTORY':
                    result = 'team1'
                elif h_up == 'DEFEAT':
                    result = 'team2'
            if re.match(r'^\d+:\d+$', h):
                duration = h

    label_rows = []
    for i, row in enumerate(rows):
        b = str(row[1]).strip() if len(row) > 1 else ''
        c = str(row[2]).strip() if len(row) > 2 else ''
        l = str(row[11]).strip() if len(row) > 11 else ''
        
        is_hdr = (c == 'Kills')
        lb = is_group_label(b)
        ll = is_group_label(l)
        if is_hdr or lb or ll:
            label_rows.append({
                'idx': i,
                'left': b if lb else None,
                'right': l if ll else None,
                'is_header': bool(is_hdr)
            })

    split_idx = None
    seen_first = False
    for i, lr in enumerate(label_rows):
        has_g1_or_header = lr['is_header'] or (lr['left'] and lr['left'].startswith('G1'))
        if has_g1_or_header:
            if seen_first:
                split_idx = i
                break
            seen_first = True

    s1 = label_rows[:split_idx] if split_idx else label_rows
    s2 = label_rows[split_idx:] if split_idx else []

    def extract_groups(section):
        left, right = [], []
        for i, lr in enumerate(section):
            start = lr['idx'] + 1
            end = (section[i + 1]['idx'] - 1) if i + 1 < len(section) else lr['idx'] + 6
            end = min(end, len(rows) - 1)
            lp, rp = [], []
            for r in range(start, end + 1):
                p1 = parse_player(rows[r], 0)
                if p1: lp.append(p1)
                p2 = parse_player(rows[r], 10)
                if p2: rp.append(p2)
            if lr['left'] and lp:
                left.append({'label': lr['left'], 'players': lp})
            if lr['right'] and rp:
                right.append({'label': lr['right'], 'players': rp})
        return left, right

    s1l, s1r = extract_groups(s1)
    s2l, s2r = extract_groups(s2)

    def merge(t1_list, t2_list, offset=0):
        groups = []
        n = max(len(t1_list), len(t2_list))
        for i in range(n):
            t1 = t1_list[i] if i < len(t1_list) else None
            t2 = t2_list[i] if i < len(t2_list) else None
            label = (t1 or t2 or {}).get('label', f'G{i + 1 + offset}')
            groups.append({
                'label': label,
                'team1': (t1 or {}).get('players', []),
                'team2': (t2 or {}).get('players', []),
            })
        return groups

    groups = merge(s1l, s2l, 0) + merge(s1r, s2r, 5)

    t1 = {'kills': 0, 'deaths': 0, 'assists': 0, 'healing': 0, 'damage': 0}
    t2 = {'kills': 0, 'deaths': 0, 'assists': 0, 'healing': 0, 'damage': 0}
    for g in groups:
        for p in g['team1']:
            for k in t1: t1[k] += p[k]
        for p in g['team2']:
            for k in t2: t2[k] += p[k]
    totals = {'team1': t1, 'team2': t2}

    return groups, result, duration, totals

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    sheets = fetch_sheet_list()
    if not sheets:
        print("No sheets found from publish URL.")
        sys.exit(1)
        
    tab_colors = get_tab_colors()
        
    for s in sheets:
        s['num'] = parse_nwl_number(s['name'])
        s['mapName'], s['date'] = parse_map_and_date(s['name'])
        
    sheets.sort(key=lambda s: s['num'] or 0, reverse=True)
    
    matches = []
    
    for s in sheets:
        nwl_num = s['num']
        print(f"Parsing: NWL#{nwl_num} — {s['mapName']} ({s['date']})")
        rows = fetch_sheet_csv(s['gid'])
        groups, result, duration, totals = parse_match(rows)
        
        raw_name = s['name']
        winner = tab_colors.get(raw_name)
        if winner:
            print(f"  -> Tab color winner: {winner}")
        else:
            winner = result
        
        if not winner:
            t1k = totals['team1']['kills']
            t2k = totals['team2']['kills']
            winner = 'team1' if t1k > t2k else ('team2' if t2k > t1k else None)

        slug = f'nwl-{nwl_num}'
        match_data = {
            'slug': slug,
            'nwlNumber': nwl_num,
            'mapName': s['mapName'],
            'date': s['date'],
            'duration': duration,
            'winner': winner,
            'groups': groups,
            'totals': totals,
            'team1Name': 'Beaverknights',
            'team2Name': 'Capyknights',
        }
        with open(os.path.join(OUT_DIR, f'{slug}.json'), 'w', encoding='utf-8') as f:
            json.dump(match_data, f, ensure_ascii=False, indent=2)
            
        matches.append({
            'slug': slug,
            'nwlNumber': nwl_num,
            'mapName': s['mapName'],
            'date': s['date'],
            'duration': duration,
            'winner': winner,
            'team1Kills': totals['team1']['kills'],
            'team2Kills': totals['team2']['kills'],
            'team1Name': 'Beaverknights',
            'team2Name': 'Capyknights',
        })

    with open(os.path.join(OUT_DIR, 'matches.json'), 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False, indent=2)

    print(f'\nExtracted {len(matches)} matches to {OUT_DIR}')
    for m in matches:
        w = '🟢' if m['winner'] == 'team1' else '🟣'
        print(f"  {w} NWL#{m['nwlNumber']}: {m['mapName']} ({m['date']}) — {m['team1Kills']}:{m['team2Kills']}")

if __name__ == '__main__':
    main()
