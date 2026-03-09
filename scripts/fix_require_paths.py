# -*- coding: utf-8 -*-
import re

files = [
    'd:/workspace/weChatShop/packageProduct/pages/product/product.js',
    'd:/workspace/weChatShop/packageOrder/pages/payment/payment.js',
]

for filepath in files:
    with open(filepath, encoding='utf-8') as f:
        content = f.read()
    
    # 将分包内的 ../../utils/ 替换为根目录绝对路径 /utils/
    new_content = content.replace("require('../../utils/", "require('/utils/")
    new_content = new_content.replace('require("../../utils/', 'require("/utils/')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Fixed: {filepath}')
    else:
        print(f'No change: {filepath}')

print('Done!')
