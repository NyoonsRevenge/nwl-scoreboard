#!/usr/bin/env python3
"""Extract NWL match data from Google Sheets into JSON for the Next.js static site."""

import json
import os
import re
import sys
import csv
import hashlib
from datetime import datetime
import urllib.request
import zipfile
import io

sys.stdout.reconfigure(encoding='utf-8')

PUBLISHED_ID = '2PACX-1vReMFS4C8UfVHqgl0rI14LVdU4adkyw8_ClQpAJgkXluqncRdqBHXer156nDt_A3deeB7qO0vuDaHE8'
SPREADSHEET_ID = '1vYy9Zsn7hVN3Z3sEW2S0GsXEMh1VVM_P7vn6C5LMFgY'
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'data')

# Manual attacker overrides: takes priority over XLSX image detection.
# Use when the spreadsheet has the wrong logo placement for a match.
ATTACKER_OVERRIDES = {
    'nwl-33': 'team2',  # Syndicate (Capyknights) attacked, not Beaverknights
    'nwl-34': 'team2',  # Syndicate (Capyknights) attacked, not Beaverknights
}

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

def extract_date_from_sheet_name(name):
    """Extract date (DD.MM.YYYY) from sheet name for matching."""
    m = re.search(r'(\d{2}\.\d{2}\.\d{4})', name)
    return m.group(1) if m else None

def get_tab_colors_from_data(xlsx_data):
    """Extract sheet tab colors from XLSX data.
    Returns dict keyed by date string -> 'team1' or 'team2'.
    """
    colors = {}
    try:
        with zipfile.ZipFile(io.BytesIO(xlsx_data)) as z:
            workbook_xml = z.read('xl/workbook.xml').decode('utf-8', errors='ignore')
            rels_xml = z.read('xl/_rels/workbook.xml.rels').decode('utf-8', errors='ignore')

            rels = {}
            for m in re.finditer(r'<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"', rels_xml):
                rels[m.group(1)] = m.group(2)

            for m in re.finditer(r'<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"', workbook_xml):
                name = m.group(1).replace('&amp;', '&')
                date_key = extract_date_from_sheet_name(name)
                if not date_key:
                    continue
                r_id = m.group(2)
                target = rels.get(r_id)
                if not target: continue

                sheet_xml = z.read('xl/' + target).decode('utf-8', errors='ignore')
                c_m = re.search(r'<tabColor rgb="([a-fA-F0-9]{8})"', sheet_xml)
                if c_m:
                    color = c_m.group(1)
                    r, g, b = int(color[2:4], 16), int(color[4:6], 16), int(color[6:8], 16)
                    # Green = Beaver (team1), Purple = Capy (team2)
                    if g > r and g > b: colors[date_key] = 'team1'  # Green
                    elif (r > g or b > g) and b > 50: colors[date_key] = 'team2'  # Purple
    except Exception as e:
        print(f"Failed to parse XLSX tab colors: {e}")
    return colors

# Known image MD5 hashes for team identification
# Beaverknights (team1) images
BEAVER_HASHES = {
    '9f4d16b642a2328d266b8793b7c1da76',  # image1.png - Attacker variant
    '9b765d9baf34b5633e3f0faed0042c43',  # image4.png - Defender variant
    '516a29a3de8834520d8a547eacc38ad8',  # image6.png - Attacker variant
}
# Capyknights (team2) images
CAPY_HASHES = {
    '1d13eabd4b1c3bd5ae1162b87548496c',  # image2.png - Defender variant
    '2cdd494d49b5e99b1545dedcd863f494',  # image3.png - Attacker variant
    '0383c9b5c7ac62ea7b801e42cb004d5b',  # image5.png - Defender variant
}

def get_attackers(xlsx_data):
    """Extract attacker team per sheet from embedded images.

    The top image (lower row number) is always the attacker.
    Returns dict of date string -> 'team1' or 'team2' (attacker team).
    """
    attackers = {}
    try:
        with zipfile.ZipFile(io.BytesIO(xlsx_data)) as z:
            names = z.namelist()

            # Build image hash lookup: media filename -> team
            img_team = {}
            for n in names:
                if n.startswith('xl/media/'):
                    data = z.read(n)
                    h = hashlib.md5(data).hexdigest()
                    fname = n.split('/')[-1]
                    if h in BEAVER_HASHES:
                        img_team[fname] = 'team1'
                    elif h in CAPY_HASHES:
                        img_team[fname] = 'team2'

            # Map workbook rels
            workbook_xml = z.read('xl/workbook.xml').decode('utf-8', errors='ignore')
            rels_xml = z.read('xl/_rels/workbook.xml.rels').decode('utf-8', errors='ignore')

            wb_rels = {}
            for m in re.finditer(r'<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"', rels_xml):
                wb_rels[m.group(1)] = m.group(2)

            # For each NWL sheet, find drawing -> images -> top image team
            for m in re.finditer(r'<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"', workbook_xml):
                sheet_name = m.group(1).replace('&amp;', '&')
                date_key = extract_date_from_sheet_name(sheet_name)
                if not date_key:
                    continue

                target = wb_rels.get(m.group(2), '')
                sheet_path = 'xl/' + target
                try:
                    sheet_xml = z.read(sheet_path).decode('utf-8', errors='ignore')
                except:
                    continue

                # Find drawing reference
                dm = re.search(r'<drawing r:id="([^"]+)"', sheet_xml)
                if not dm:
                    continue

                # Get sheet rels to find drawing path
                sheet_rels_path = sheet_path.replace('worksheets/', 'worksheets/_rels/') + '.rels'
                try:
                    sheet_rels = z.read(sheet_rels_path).decode('utf-8', errors='ignore')
                except:
                    continue

                dm2 = re.search(rf'Id="{dm.group(1)}"[^>]*Target="([^"]+)"', sheet_rels)
                if not dm2:
                    continue
                drawing_path = 'xl/' + dm2.group(1).replace('../', '')

                # Read drawing XML and its rels
                try:
                    drawing_xml = z.read(drawing_path).decode('utf-8', errors='ignore')
                except:
                    continue

                drawing_rels_path = drawing_path.replace('drawings/', 'drawings/_rels/') + '.rels'
                rid_to_img = {}
                try:
                    drels = z.read(drawing_rels_path).decode('utf-8', errors='ignore')
                    for rm in re.finditer(r'Id="([^"]+)"[^>]*Target="([^"]+)"', drels):
                        rid_to_img[rm.group(1)] = rm.group(2).split('/')[-1]
                except:
                    continue

                # Find image anchors with row positions
                images = []
                for a in re.finditer(
                    r'<xdr:oneCellAnchor>.*?<xdr:row>(\d+)</xdr:row>.*?r:embed="([^"]+)".*?</xdr:oneCellAnchor>',
                    drawing_xml, re.DOTALL
                ):
                    row = int(a.group(1))
                    img_file = rid_to_img.get(a.group(2), '')
                    team = img_team.get(img_file)
                    if team:
                        images.append((row, team))

                if images:
                    images.sort(key=lambda x: x[0])
                    # Top image = attacker
                    attackers[date_key] = images[0][1]
    except Exception as e:
        print(f"Failed to extract attacker info from images: {e}")
    return attackers

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
    attacker_from_csv = None  # Written by nwl_quick.py to H9: 'MARAUDERS' or 'SYNDICATE'

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
            if attacker_from_csv is None:
                if 'MARAUDER' in h_up or 'BEAVERKNIGHT' in h_up:
                    attacker_from_csv = 'team1'
                elif 'SYNDICATE' in h_up or 'CAPYKNIGHT' in h_up:
                    attacker_from_csv = 'team2'

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
            if lr['left']:
                left.append({'label': lr['left'], 'players': lp})
            if lr['right']:
                right.append({'label': lr['right'], 'players': rp})
        return left, right

    s1l, s1r = extract_groups(s1)
    s2l, s2r = extract_groups(s2)

    def get_group_num(g):
        m = re.search(r'G(\d+)', g.get('label', ''))
        return int(m.group(1)) if m else 0

    def merge(t1_list, t2_list, offset=0):
        # Build lookup by group number so groups match by label, not index
        t1_by_num = {get_group_num(g): g for g in t1_list}
        t2_by_num = {get_group_num(g): g for g in t2_list}
        all_nums = sorted(set(t1_by_num.keys()) | set(t2_by_num.keys()))
        if not all_nums:
            return []
        groups = []
        for num in all_nums:
            t1 = t1_by_num.get(num)
            t2 = t2_by_num.get(num)
            label = (t1 or t2 or {}).get('label', f'G{num}')
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

    return groups, result, duration, totals, attacker_from_csv

def fetch_vod_responses():
    """Read VOD submissions from a 'VODs' tab in the spreadsheet.

    The tab is typically auto-populated by a Google Form (see
    scripts/create-vod-form.gs). Expected columns in this order:

        Timestamp | NWL Number | Discord Name | VOD URL

    The first row is treated as a header and skipped. Submissions for the
    same (match, discord name) pair are deduped — last submission wins.

    Returns:
        dict keyed by slug ('nwl-N') → list of {discord, url} dicts.
        None if the tab can't be found or fetched (caller should preserve
        the existing vods.json in that case).
    """
    list_url = f'https://docs.google.com/spreadsheets/d/e/{PUBLISHED_ID}/pubhtml'
    req = urllib.request.Request(list_url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8')
    except Exception as e:
        print(f"VOD: failed to fetch sheet list: {e}")
        return None

    vod_gid = None
    pattern = r'name:\s*"([^"]+)"[^}}]*gid:\s*"(\d+)"'
    for match in re.finditer(pattern, html):
        name = match.group(1).replace(r'\/', '/').strip().lower()
        if name == 'vods':
            vod_gid = match.group(2)
            break

    if not vod_gid:
        print("VOD: no 'VODs' tab found in spreadsheet — keeping existing vods.json")
        return None

    csv_url = f'https://docs.google.com/spreadsheets/d/e/{PUBLISHED_ID}/pub?output=csv&gid={vod_gid}'
    req = urllib.request.Request(csv_url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            text = resp.read().decode('utf-8')
        rows = list(csv.reader(text.splitlines()))
    except Exception as e:
        print(f"VOD: failed to fetch 'VODs' tab CSV: {e}")
        return None

    if len(rows) < 2:
        return {}

    by_key = {}
    for row in rows[1:]:  # skip header
        if len(row) < 4:
            continue
        nwl_raw = str(row[1]).strip()
        discord = str(row[2]).strip()
        url_val = str(row[3]).strip()
        if not (nwl_raw and discord and url_val):
            continue
        m = re.search(r'\d+', nwl_raw)
        if not m:
            continue
        nwl_num = int(m.group(0))
        slug = f'nwl-{nwl_num}'
        # last submission for the same (match, discord) wins
        by_key[(slug, discord.lower())] = {'discord': discord, 'url': url_val}

    grouped = {}
    for (slug, _), entry in by_key.items():
        grouped.setdefault(slug, []).append(entry)
    return grouped


def merge_vods(form_vods):
    """Merge form-submitted VODs into vods.json without losing manual entries.

    Within a slug present in form_vods, form data wins for matching discord
    names, but pre-existing manual entries (no matching form submission) are
    preserved. Slugs with no form data are left fully intact.

    Pass form_vods=None to skip writing entirely (e.g. on fetch failure).
    """
    if form_vods is None:
        return

    vods_path = os.path.join(OUT_DIR, 'vods.json')

    existing = {}
    if os.path.exists(vods_path):
        try:
            with open(vods_path, 'r', encoding='utf-8') as f:
                existing = json.load(f)
        except Exception as e:
            print(f"VOD: failed to read existing vods.json: {e}")

    merged = dict(existing)
    for slug, entries in form_vods.items():
        by_discord = {}
        for e in existing.get(slug, []):
            if isinstance(e, dict) and 'discord' in e:
                by_discord[e['discord'].lower()] = e
        for entry in entries:
            by_discord[entry['discord'].lower()] = entry
        merged[slug] = list(by_discord.values())

    def slug_num(s):
        m = re.match(r'nwl-(\d+)', s)
        return int(m.group(1)) if m else 0

    sorted_vods = {s: merged[s] for s in sorted(merged.keys(), key=slug_num, reverse=True)}

    with open(vods_path, 'w', encoding='utf-8') as f:
        json.dump(sorted_vods, f, ensure_ascii=False, indent=2)

    total = sum(len(v) for v in sorted_vods.values())
    print(f"VOD: wrote {total} VODs across {len(sorted_vods)} matches to vods.json")


def fetch_xlsx():
    """Download XLSX data once for reuse."""
    url = f'https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=xlsx'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        return resp.read()

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    sheets = fetch_sheet_list()
    if not sheets:
        print("No sheets found from publish URL.")
        sys.exit(1)

    print("Fetching XLSX for tab colors and attacker detection...")
    xlsx_data = fetch_xlsx()
    tab_colors = get_tab_colors_from_data(xlsx_data)
    attacker_map = get_attackers(xlsx_data)
        
    for s in sheets:
        s['num'] = parse_nwl_number(s['name'])
        s['mapName'], s['date'] = parse_map_and_date(s['name'])
        
    sheets.sort(key=lambda s: s['num'] or 0, reverse=True)
    
    matches = []
    
    for s in sheets:
        nwl_num = s['num']
        print(f"Parsing: NWL#{nwl_num} — {s['mapName']} ({s['date']})")
        rows = fetch_sheet_csv(s['gid'])
        groups, result, duration, totals, attacker_from_csv = parse_match(rows)

        date_key = s['date']

        # Attacker priority: manual override > CSV cell (H9, written by nwl_quick.py) > XLSX images
        slug = f'nwl-{nwl_num}'
        attacker = ATTACKER_OVERRIDES.get(slug) or attacker_from_csv or attacker_map.get(date_key)
        if attacker:
            print(f"  -> Attacker: {attacker}")

        # The top section in the spreadsheet is always the attacker.
        # parse_match() assigns the top section to team1, but if the attacker
        # is actually team2 (Capyknights), we need to swap the team assignments
        # BEFORE determining the winner.
        if attacker == 'team2':
            for g in groups:
                g['team1'], g['team2'] = g['team2'], g['team1']
            totals['team1'], totals['team2'] = totals['team2'], totals['team1']
            # Also swap VICTORY/DEFEAT result (it's from the attacker's perspective)
            if result == 'team1':
                result = 'team2'
            elif result == 'team2':
                result = 'team1'
            print(f"  -> Swapped team1/team2 (attacker was on top)")

        winner = tab_colors.get(date_key)
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
            'attacker': attacker,
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
            'attacker': attacker,
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

    print("\nFetching VODs from form responses...")
    form_vods = fetch_vod_responses()
    merge_vods(form_vods)

if __name__ == '__main__':
    main()
