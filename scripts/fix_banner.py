# -*- coding: utf-8 -*-

with open('d:/workspace/weChatShop/pages/index/index.wxss', encoding='utf-8') as f:
    content = f.read()

old_banner = '''.banner-swiper {
  width: 100%;
  height: 400rpx;
  margin: 20rpx 0 24rpx 0;
  overflow: visible;
}

.banner-item {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.banner-card {
  width: calc(100% - 48rpx);
  height: 360rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 12rpx 32rpx rgba(61, 40, 23, 0.15);
  transition: all 0.3s ease;
  transform: scale(0.85);
  opacity: 0.6;
}

.banner-item.swiper-item-active .banner-card {
  transform: scale(1);
  opacity: 1;
  box-shadow: 0 20rpx 48rpx rgba(61, 40, 23, 0.25);
}'''

new_banner = '''.banner-swiper {
  width: calc(100% - 48rpx);
  height: 380rpx;
  margin: 20rpx 24rpx 24rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 28rpx rgba(61, 40, 23, 0.1);
}

.banner-item {
  width: 100%;
  height: 100%;
}

.banner-card {
  width: 100%;
  height: 100%;
  border-radius: 0;
  overflow: hidden;
}'''

if old_banner in content:
    content = content.replace(old_banner, new_banner)
    print('Replaced via exact match')
else:
    # 按位置替换
    start = content.find('.banner-swiper')
    end = content.find('.banner-image', start)
    if start != -1 and end != -1:
        content = content[:start] + new_banner + '\n\n' + content[end:]
        print(f'Replaced from {start} to {end}')
    else:
        print('ERROR: Could not find banner section')

with open('d:/workspace/weChatShop/pages/index/index.wxss', 'w', encoding='utf-8') as f:
    f.write(content)
