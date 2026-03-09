# -*- coding: utf-8 -*-

with open('d:/workspace/weChatShop/pages/index/index.wxss', encoding='utf-8') as f:
    content = f.read()

old = '''.category-grid {
  display: flex;
  background: linear-gradient(135deg, #FFFFFF 0%, #FAF8F5 100%);
  padding: 32rpx 0 28rpx;
  margin: 0 24rpx 24rpx;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 28rpx rgba(61, 40, 23, 0.12);
  position: relative;
  overflow: hidden;
}'''

new = '''.category-grid {
  display: flex;
  padding: 16rpx 0 8rpx;
  margin: 0;
}'''

if old in content:
    content = content.replace(old, new)
    print('category-grid replaced!')
else:
    idx = content.find('.category-grid')
    end = content.find('}', idx)
    print(f'Not exact match. Found at {idx}')
    print(repr(content[idx:end+1]))

with open('d:/workspace/weChatShop/pages/index/index.wxss', 'w', encoding='utf-8') as f:
    f.write(content)
