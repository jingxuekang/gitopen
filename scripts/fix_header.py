# -*- coding: utf-8 -*-

with open('d:/workspace/weChatShop/pages/index/index.wxss', encoding='utf-8') as f:
    content = f.read()

old = '''.home-header {
  margin: 0;
  padding: calc(env(safe-area-inset-top) + 16rpx) 24rpx 18rpx;
  border-radius: 0;
  background: linear-gradient(135deg, #8B6914 0%, #A67C1A 50%, #8B6914 100%);
  box-shadow: 0 4rpx 20rpx rgba(139, 105, 20, 0.25);
  box-sizing: border-box;
  position: relative;
  border-bottom: 1rpx solid rgba(255, 242, 218, 0.36);
}

.home-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1rpx;
  background: linear-gradient(90deg, transparent, rgba(255, 248, 232, 0.3), transparent);
}

.brand-row {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}

.brand-logo {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
  margin-right: 10rpx;
  background: rgba(255, 255, 255, 0.14);
}

.brand-name {
  font-size: 33rpx;
  font-weight: 700;
  color: #FFF8E8;
  letter-spacing: 1rpx;
}

.header-main-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 0;
}'''

new = '''.home-header {
  margin: 0;
  padding: calc(env(safe-area-inset-top) + 12rpx) 24rpx 20rpx;
  border-radius: 0;
  background: linear-gradient(135deg, #8B6914 0%, #A67C1A 50%, #8B6914 100%);
  box-shadow: 0 4rpx 20rpx rgba(139, 105, 20, 0.25);
  box-sizing: border-box;
  position: relative;
}

.brand-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
  padding-top: 4rpx;
}

.brand-logo {
  width: 48rpx;
  height: 48rpx;
  border-radius: 10rpx;
  margin-right: 12rpx;
  background: rgba(255, 255, 255, 0.14);
}

.brand-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFF8E8;
  letter-spacing: 2rpx;
}

.header-main-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 0;
}'''

if old in content:
    content = content.replace(old, new)
    print('Replaced!')
else:
    print('Not found')
    idx = content.find('.home-header')
    print(repr(content[idx:idx+100]))

with open('d:/workspace/weChatShop/pages/index/index.wxss', 'w', encoding='utf-8') as f:
    f.write(content)
