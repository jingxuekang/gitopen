# -*- coding: utf-8 -*-
import os

# 文件路径 -> 正确的相对层级
files_4level = [
    'd:/workspace/weChatShop/packageOrder/pages/order/detail/detail.js',
    'd:/workspace/weChatShop/packageOrder/pages/order/confirm/confirm.js',
    'd:/workspace/weChatShop/packageUser/pages/user/favorite/favorite.js',
    'd:/workspace/weChatShop/packageOther/pages/group/detail/detail.js',
    'd:/workspace/weChatShop/packageOther/pages/coupon/select/select.js',
]

for filepath in files_4level:
    with open(filepath, encoding='utf-8') as f:
        content = f.read()
    new_content = content.replace("require('../../../utils/", "require('../../../../utils/")
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Fixed: {filepath}')
    else:
        print(f'No change: {filepath}')

print('Done!')
