# -*- coding: utf-8 -*-
import json
import os

# 所有需要添加自定义导航栏的页面json文件
page_jsons = [
    # packageProduct
    'd:/workspace/weChatShop/packageProduct/pages/product/product.json',
    'd:/workspace/weChatShop/packageProduct/pages/trace/source/source.json',
    'd:/workspace/weChatShop/packageProduct/pages/review/review.json',
    'd:/workspace/weChatShop/packageProduct/pages/review/list/list.json',
    # packageOrder
    'd:/workspace/weChatShop/packageOrder/pages/order/confirm/confirm.json',
    'd:/workspace/weChatShop/packageOrder/pages/order/list/list.json',
    'd:/workspace/weChatShop/packageOrder/pages/order/detail/detail.json',
    'd:/workspace/weChatShop/packageOrder/pages/payment/payment.json',
    # packageUser
    'd:/workspace/weChatShop/packageUser/pages/user/settings/settings.json',
    'd:/workspace/weChatShop/packageUser/pages/user/address/list/list.json',
    'd:/workspace/weChatShop/packageUser/pages/user/address/edit/edit.json',
    'd:/workspace/weChatShop/packageUser/pages/user/coupon/coupon.json',
    'd:/workspace/weChatShop/packageUser/pages/user/favorite/favorite.json',
    # packageOther
    'd:/workspace/weChatShop/packageOther/pages/group/list/list.json',
    'd:/workspace/weChatShop/packageOther/pages/group/detail/detail.json',
    'd:/workspace/weChatShop/packageOther/pages/coupon/center/center.json',
    'd:/workspace/weChatShop/packageOther/pages/coupon/select/select.json',
    'd:/workspace/weChatShop/packageOther/pages/customer-service/customer-service.json',
]

for path in page_jsons:
    if not os.path.exists(path):
        print(f'SKIP (not found): {path}')
        continue
    
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    
    # 添加自定义导航栏配置
    data['navigationStyle'] = 'custom'
    
    # 添加nav-header组件
    if 'usingComponents' not in data:
        data['usingComponents'] = {}
    data['usingComponents']['nav-header'] = '/components/nav-header/nav-header'
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f'Updated: {os.path.basename(os.path.dirname(path))}/{os.path.basename(path)}')

print('\nAll done!')
