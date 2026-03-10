# -*- coding: utf-8 -*-
import os
import re

files = [
    'd:/workspace/weChatShop/pages/category/category.wxml',
    'd:/workspace/weChatShop/pages/search/search.wxml',
    'd:/workspace/weChatShop/pages/cart/cart.wxml',
    'd:/workspace/weChatShop/pages/user/user.wxml',
    'd:/workspace/weChatShop/packageOrder/pages/order/list/list.wxml',
    'd:/workspace/weChatShop/packageOrder/pages/order/detail/detail.wxml',
    'd:/workspace/weChatShop/packageOrder/pages/order/confirm/confirm.wxml',
    'd:/workspace/weChatShop/packageOrder/pages/payment/payment.wxml',
    'd:/workspace/weChatShop/packageUser/pages/user/coupon/coupon.wxml',
    'd:/workspace/weChatShop/packageUser/pages/user/favorite/favorite.wxml',
    'd:/workspace/weChatShop/packageUser/pages/user/address/edit/edit.wxml',
    'd:/workspace/weChatShop/packageUser/pages/user/address/list/list.wxml',
    'd:/workspace/weChatShop/packageUser/pages/user/settings/settings.wxml',
    'd:/workspace/weChatShop/packageOther/pages/group/list/list.wxml',
    'd:/workspace/weChatShop/packageOther/pages/group/detail/detail.wxml',
    'd:/workspace/weChatShop/packageOther/pages/customer-service/customer-service.wxml',
]

for filepath in files:
    if not os.path.exists(filepath):
        print(f'Not found: {filepath}')
        continue
    with open(filepath, encoding='utf-8') as f:
        content = f.read()
    # 删除 nav-placeholder（各种形式）
    patterns = [
        r'\s*\u003cview class="nav-placeholder" style="height: \{\{navBarHeight\}\}px;"\u003e\u003c/view\u003e',
        r'\s*\u003cview class="nav-placeholder"\u003e\u003c/view\u003e',
    ]
    new_content = content
    for pat in patterns:
        new_content = re.sub(pat, '', new_content)
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Removed nav-placeholder: {filepath}')
    else:
        print(f'No placeholder found: {filepath}')

print('Done!')
