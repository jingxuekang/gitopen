# -*- coding: utf-8 -*-
import re

def add_nav_height(filepath, onload_pattern, insert_code):
    with open(filepath, encoding='utf-8') as f:
        content = f.read()
    
    if 'navBarHeight' in content:
        print(f'Already has navBarHeight: {filepath}')
        return
    
    # 找到 onLoad 或 onShow 方法，在第一行后插入
    idx = content.find(onload_pattern)
    if idx == -1:
        print(f'Pattern not found in {filepath}')
        return
    
    # 找到方法体的第一个 { 后的换行
    brace_idx = content.find('{', idx)
    if brace_idx == -1:
        print(f'Brace not found in {filepath}')
        return
    
    newline_idx = content.find('\n', brace_idx)
    if newline_idx == -1:
        print(f'Newline not found in {filepath}')
        return
    
    new_content = content[:newline_idx+1] + insert_code + content[newline_idx+1:]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'Fixed: {filepath}')

nav_code = '''    const _sysInfo = wx.getSystemInfoSync()
    const _statusH = _sysInfo.statusBarHeight || 20
    const _navContentH = Math.round(88 / 750 * _sysInfo.windowWidth)
    this.setData({ navBarHeight: _statusH + _navContentH })
'''

# search.js - onLoad
add_nav_height(
    'd:/workspace/weChatShop/pages/search/search.js',
    'onLoad(',
    nav_code
)

# user.js - onLoad
add_nav_height(
    'd:/workspace/weChatShop/pages/user/user.js',
    'onLoad(',
    nav_code
)

# cart.js - onShow (cart uses onShow)
add_nav_height(
    'd:/workspace/weChatShop/pages/cart/cart.js',
    'onShow(',
    nav_code
)

print('All done!')
