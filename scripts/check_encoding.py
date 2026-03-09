# -*- coding: utf-8 -*-
import sys

with open('d:/workspace/weChatShop/pages/index/index.wxml', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

problems = []
for i, line in enumerate(lines, 1):
    for ch in line:
        code = ord(ch)
        # 检查替换字符（乱码标志）
        if ch == '\ufffd':
            problems.append(f'Line {i}: replacement char (garbled) in: {line.strip()[:80]}')
            break

if problems:
    for p in problems:
        print(p)
else:
    print('No garbled characters found! File is clean.')
