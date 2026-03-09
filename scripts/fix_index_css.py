# -*- coding: utf-8 -*-

with open('d:/workspace/weChatShop/pages/index/index.wxss', encoding='utf-8') as f:
    content = f.read()

old = '''.brand-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
  padding-top: 4rpx;
}'''

new = '''.brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
  padding-top: 4rpx;
}

.header-search-row {
  height: 72rpx;
  border-radius: 36rpx;
  background: rgba(255, 255, 255, 0.95);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  padding: 0 20rpx;
  width: 100%;
  box-sizing: border-box;
}'''

if old in content:
    content = content.replace(old, new)
    print('brand-row replaced!')
else:
    print('Not found, searching...')
    idx = content.find('.brand-row')
    print(repr(content[idx:idx+150]))

with open('d:/workspace/weChatShop/pages/index/index.wxss', 'w', encoding='utf-8') as f:
    f.write(content)
