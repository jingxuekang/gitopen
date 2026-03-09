# -*- coding: utf-8 -*-

with open('d:/workspace/weChatShop/pages/index/index.wxml', encoding='utf-8') as f:
    content = f.read()

old_header = '''  <view class="home-header safe-area-top">
    <!-- 第一行：Logo + 品牌名 + 定位 -->
    <view class="brand-row">
      <image class="brand-logo" src="/images/brand-logo.png" mode="heightFix"></image>
      <text class="brand-name">报告茶友</text>
      <view class="header-location tap-active" bindtap="onTapLocation">
        <view class="location-pin">
          <view class="location-pin-dot"></view>
        </view>
        <text class="location-name">{{locating ? \'定位中...\' : locationName}}</text>
        <text class="location-arrow">›</text>
      </view>
    </view>
    <!-- 第二行：搜索栏 -->
    <view class="header-search-row tap-active" bindtap="goToSearch">
      <view class="search-icon-wrap">
        <view class="search-icon-circle"></view>
        <view class="search-icon-handle"></view>
      </view>
      <text class="search-keyword">{{searchHint}}</text>
    </view>
  </view>'''

new_header = '''  <view class="home-header safe-area-top">
    <!-- Logo + 品牌名居中 -->
    <view class="brand-row">
      <image class="brand-logo" src="/images/brand-logo.png" mode="heightFix"></image>
      <text class="brand-name">报告茶友</text>
    </view>
  </view>'''

old_banner = '''    <!-- 轮播图 -->
    <swiper'''

new_banner = '''    <!-- 定位 + 搜索框 -->
    <view class="header-action-bar">
      <view class="header-location tap-active" bindtap="onTapLocation">
        <view class="location-pin">
          <view class="location-pin-dot"></view>
        </view>
        <text class="location-name">{{locating ? \'定位中...\' : locationName}}</text>
        <text class="location-arrow">›</text>
      </view>
      <view class="header-search tap-active" bindtap="goToSearch">
        <view class="search-icon-wrap">
          <view class="search-icon-circle"></view>
          <view class="search-icon-handle"></view>
        </view>
        <text class="search-keyword">{{searchHint}}</text>
      </view>
    </view>

    <!-- 轮播图 -->
    <swiper'''

if old_header in content:
    content = content.replace(old_header, new_header)
    print('Header replaced!')
else:
    print('Header not found')

if old_banner in content:
    content = content.replace(old_banner, new_banner)
    print('Banner section replaced!')
else:
    print('Banner not found')

with open('d:/workspace/weChatShop/pages/index/index.wxml', 'w', encoding='utf-8') as f:
    f.write(content)
