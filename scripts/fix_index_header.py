# -*- coding: utf-8 -*-

with open('d:/workspace/weChatShop/pages/index/index.wxml', encoding='utf-8') as f:
    content = f.read()

old = '''<!--pages/index/index.wxml-->
  <view class="index-page">
  <view class="home-header safe-area-top">
    <view class="brand-row">
      <image class="brand-logo" src="/images/brand-logo.png" mode="heightFix"></image>
      <text class="brand-name">报告茶友</text>
    </view>
    <view class="header-main-row">
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

new = '''<!--pages/index/index.wxml-->
  <view class="index-page">
  <view class="home-header safe-area-top">
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

if old in content:
    content = content.replace(old, new)
    print('Replaced!')
else:
    # 直接找header区域并替换
    start = content.find('<view class="home-header safe-area-top">')
    end = content.find('</view>', content.find('header-search', start))
    end = content.find('</view>', end + 1)  # 关闭 header-main-row
    end = content.find('</view>', end + 1)  # 关闭 home-header
    print(f'start={start}, end={end}')
    print(repr(content[start:end+7]))

with open('d:/workspace/weChatShop/pages/index/index.wxml', 'w', encoding='utf-8') as f:
    f.write(content)
