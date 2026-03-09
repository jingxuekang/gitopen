# -*- coding: utf-8 -*-

with open('d:/workspace/weChatShop/pages/index/index.wxml', encoding='utf-8') as f:
    content = f.read()

old = '''    <!-- 轮播图 - 3D堆叠效果 -->
    <swiper 
      class="banner-swiper" 
      previous-margin="20rpx"
      next-margin="20rpx"
      circular
      autoplay
      duration="300"
      easing-function="ease-out"
      indicator-dots="{{false}}"
    >
      <swiper-item wx:for="{{banners}}" wx:key="_id" class="banner-item">
        <view class="banner-card">
          <image class="banner-image" src="{{item.image}}" mode="aspectFill"></image>
        </view>
      </swiper-item>
    </swiper>'''

new = '''    <!-- 轮播图 -->
    <swiper 
      class="banner-swiper" 
      circular
      autoplay
      duration="500"
      indicator-dots="{{true}}"
      indicator-color="rgba(255,255,255,0.5)"
      indicator-active-color="#ffffff"
    >
      <swiper-item wx:for="{{banners}}" wx:key="_id" class="banner-item">
        <view class="banner-card">
          <image class="banner-image" src="{{item.image}}" mode="aspectFill"></image>
        </view>
      </swiper-item>
    </swiper>'''

if old in content:
    content = content.replace(old, new)
    print('Replaced!')
else:
    print('Not found, trying line by line...')
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'previous-margin' in line or 'next-margin' in line or 'easing-function' in line:
            print(f'Line {i+1}: {line}')

with open('d:/workspace/weChatShop/pages/index/index.wxml', 'w', encoding='utf-8') as f:
    f.write(content)
