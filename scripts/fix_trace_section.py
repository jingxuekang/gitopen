# -*- coding: utf-8 -*-

with open('d:/workspace/weChatShop/pages/index/index.wxml', encoding='utf-8') as f:
    content = f.read()

old = '''    <!-- 产品溯源 -->
    <view class="trace-header">
      <text class="trace-title">产品溯源</text>
    </view>

    <!-- 分类入口 -->
    <view class="category-grid">
      <view class="category-item tap-active" wx:for="{{categories}}" wx:key="id" bind:tap="goToTrace" data-category="{{item.id}}">
        <lazy-image 
          src="{{item.icon}}" 
          width="120rpx"
          height="120rpx"
          imageClass="category-icon"
        ></lazy-image>
        <text class="category-name">{{item.name}}</text>
      </view>
    </view>'''

new = '''    <!-- 产品溯源 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">产品溯源</text>
      </view>
      <view class="category-grid">
        <view class="category-item tap-active" wx:for="{{categories}}" wx:key="id" bind:tap="goToTrace" data-category="{{item.id}}">
          <lazy-image 
            src="{{item.icon}}" 
            width="120rpx"
            height="120rpx"
            imageClass="category-icon"
          ></lazy-image>
          <text class="category-name">{{item.name}}</text>
        </view>
      </view>
    </view>'''

if old in content:
    content = content.replace(old, new)
    print('Replaced!')
else:
    # 查找关键行
    idx = content.find('trace-header')
    end = content.find('category-grid', idx)
    end2 = content.find('</view>\n\n    <!-- 排行榜', end)
    print(f'trace-header at {idx}, category-grid at {end}, end at {end2}')
    print(repr(content[idx-10:end2+20]))

with open('d:/workspace/weChatShop/pages/index/index.wxml', 'w', encoding='utf-8') as f:
    f.write(content)
