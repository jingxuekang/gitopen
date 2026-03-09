# -*- coding: utf-8 -*-
import os
import sys

root = 'd:/workspace/weChatShop'
exts = ('.wxml', '.wxss', '.js', '.json')
ignore_dirs = {'node_modules', 'miniprogram_npm', '.git', 'scripts'}

problems = []

for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in ignore_dirs]
    
    for filename in filenames:
        if not any(filename.endswith(ext) for ext in exts):
            continue
        
        filepath = os.path.join(dirpath, filename)
        try:
            with open(filepath, 'rb') as f:
                raw = f.read()
            
            text = raw.decode('utf-8', errors='replace')
            lines = text.split('\n')
            for i, line in enumerate(lines, 1):
                if '\ufffd' in line:
                    rel_path = os.path.relpath(filepath, root)
                    # ASCII-safe output
                    safe_line = line.strip()[:100].encode('ascii', errors='replace').decode('ascii')
                    problems.append((rel_path, i, safe_line))
        except Exception as e:
            problems.append((filepath, 0, str(e)))

# Write results to file
with open('d:/workspace/weChatShop/scripts/encoding_report.txt', 'w', encoding='utf-8') as out:
    if problems:
        out.write(f'Found {len(problems)} garbled lines:\n\n')
        for path, lineno, content in problems:
            out.write(f'{path}:{lineno}\n')
            out.write(f'  {content}\n')
    else:
        out.write('No garbled characters found!\n')

print(f'Done. Found {len(problems)} problems. See scripts/encoding_report.txt')
