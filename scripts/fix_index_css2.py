# -*- coding: utf-8 -*-

with open('d:/workspace/weChatShop/pages/index/index.wxss', encoding='utf-8') as f:
    content = f.read()

old = '''.home-header {
  margin: 0;
  padding: calc(env(safe-area-inset-top) + 12rpx) 24rpx 20rpx;
  border-radius: 0;
  background: linear-gradient(135deg, #8B6914 0%, #A67C1A 50%, #8B6914 100%);
  box-shadow: 0 4rpx 20rpx rgba(139, 105, 20, 0.25);
  box-sizing: border-box;
  position: relative;
}'''

new = '''.home-header {
  margin: 0;
  padding: 0 24rpx 16rpx;
  border-radius: 0;
  background: linear-gradient(135deg, #8B6914 0%, #A67C1A 50%, #8B6914 100%);
  box-shadow: 0 4rpx 20rpx rgba(139, 105, 20, 0.25);
  box-sizing: border-box;
  position: relative;
}

.status-bar-placeholder {
  height: env(safe-area-inset-top);
  min-height: 44px;
}

.header-action-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
}'''

if old in content:
    content = content.replace(old, new)
    print('home-header replaced!')
else:
    print('Not found')
    idx = content.find('.home-header')
    print(repr(content[idx:idx+200]))

# 更新 brand-row 样式为居中
old_brand = '''.brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
  padding-top: 4rpx;
}'''

new_brand = '''.brand-row {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10rpx 0 0;
  gap: 12rpx;
}'''

if old_brand in content:
    content = content.replace(old_brand, new_brand)
    print('brand-row replaced!')
else:
    print('brand-row not found')
    idx = content.find('.brand-row')
    print(repr(content[idx:idx+150]))

# 确保 header-location 在 action-bar 里正确显示
old_loc = '''.header-location {
  display: flex;
  align-items: center;
  width: 232rpx;
  max-width: 40%;
  min-width: 0;
  height: 72rpx;
  padding: 0 16rpx 0 14rpx;
  border-radius: 36rpx;
  background: rgba(255, 248, 231, 0.22);
  border: 1rpx solid rgba(255, 248, 231, 0.4);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}'''

new_loc = '''.header-location {
  display: flex;
  align-items: center;
  width: 220rpx;
  flex-shrink: 0;
  height: 68rpx;
  padding: 0 16rpx 0 14rpx;
  border-radius: 36rpx;
  background: rgba(255, 248, 231, 0.22);
  border: 1rpx solid rgba(255, 248, 231, 0.4);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}'''

if old_loc in content:
    content = content.replace(old_loc, new_loc)
    print('header-location replaced!')

# 更新搜索框
old_search = '''.header-search {
  height: 72rpx;
  border-radius: 36rpx;
  background: rgba(255, 255, 255, 0.95);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  padding: 0 20rpx;
}'''

new_search = '''.header-search {
  height: 68rpx;
  border-radius: 36rpx;
  background: rgba(255, 255, 255, 0.95);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  padding: 0 20rpx;
}'''

if old_search in content:
    content = content.replace(old_search, new_search)
    print('header-search replaced!')

with open('d:/workspace/weChatShop/pages/index/index.wxss', 'w', encoding='utf-8') as f:
    f.write(content)

print('All done!')
