# -*- coding: utf-8 -*-

with open('d:/workspace/weChatShop/pages/category/category.wxml', encoding='utf-8') as f:
    content = f.read()

# 在底部导航栏前加上 category-body 的闭合标签
old = '''    </scroll-view>
  </view>
  
  <!-- 底部导航栏 -->
  <custom-tabbar current="1" />
</view>'''

new = '''    </scroll-view>
  </view>
  </view><!-- end category-body -->
  
  <!-- 底部导航栏 -->
  <custom-tabbar current="1" />
</view>'''

if old in content:
    content = content.replace(old, new)
    print('Done!')
else:
    # 查找末尾
    idx = content.rfind('</view>')
    print(f'Not found. Last </view> at {idx}')
    print(repr(content[idx-200:]))

with open('d:/workspace/weChatShop/pages/category/category.wxml', 'w', encoding='utf-8') as f:
    f.write(content)
