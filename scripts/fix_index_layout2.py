# -*- coding: utf-8 -*-

with open('d:/workspace/weChatShop/pages/index/index.wxml', encoding='utf-8') as f:
    content = f.read()

old = '''  <view class="home-header safe-area-top">
    <!-- Logo + 品牌名居中 -->
    <view class="brand-row">
      <image class="brand-logo" src="/images/brand-logo.png" mode="heightFix"></image>
      <text class="brand-name">报告茶友</text>
    </view>
  </view>'''

new = '''  <view class="home-header">
    <!-- 第一行：状态栏占位 -->
    <view class="status-bar-placeholder"></view>
    <!-- 第二行：Logo + 品牌名居中 -->
    <view class="brand-row">
      <image class="brand-logo" src="/images/brand-logo.png" mode="heightFix"></image>
      <text class="brand-name">报告茶友</text>
    </view>
    <!-- 第三行：定位 + 搜索框 -->
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
  </view>'''

if old in content:
    content = content.replace(old, new)
    print('WXML header replaced!')
else:
    print('Not found, checking...')
    idx = content.find('home-header')
    print(repr(content[idx:idx+300]))

# 也移除轮播图上方重复的 header-action-bar（如果之前加过）
old_action = '''    <!-- 定位 + 搜索框 -->
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

    <!-- 轮播图 -->'''

if old_action in content:
    content = content.replace(old_action, '    <!-- 轮播图 -->')
    print('Removed duplicate action-bar!')

with open('d:/workspace/weChatShop/pages/index/index.wxml', 'w', encoding='utf-8') as f:
    f.write(content)
