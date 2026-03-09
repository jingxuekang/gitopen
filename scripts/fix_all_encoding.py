# -*- coding: utf-8 -*-
import os
import re

# ============ 修复 cart.js ============
cart_path = 'd:/workspace/weChatShop/pages/cart/cart.js'

with open(cart_path, 'rb') as f:
    raw = f.read()

# 先尝试用latin-1读取（保留原始字节），再做替换
text = raw.decode('utf-8', errors='replace')

# 替换所有乱码注释为正确中文
replacements = [
    # data注释
    ('\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd', '购物车商品列表'),
    ('\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd', '总价（分）'),
    ('\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd', '是否全选'),
]

# 用正则替换所有连续的替换字符（乱码）
# 策略：找到包含\ufffd的行，根据上下文推断正确内容
lines = text.split('\n')
new_lines = []

for i, line in enumerate(lines):
    if '\ufffd' not in line:
        new_lines.append(line)
        continue
    
    # 清理乱码：将连续的\ufffd替换为对应中文
    fixed = line
    
    # 根据行号和上下文修复
    lineno = i + 1
    if lineno == 12:
        fixed = '    items: [],           // 购物车商品列表'
    elif lineno == 13:
        fixed = '    totalPrice: 0,       // 总价（分）'
    elif lineno == 15:
        fixed = '    allSelected: false,  // 是否全选'
    elif lineno == 47:
        fixed = '   * 加载购物车数据   */'
    elif lineno == 49:
        fixed = "    util.showLoading('加载中..')"
    elif lineno == 54:
        fixed = "      console.error('加载购物车失败', err)"
    elif lineno == 55:
        fixed = "      util.showToast('获取购物车失败')"
    elif lineno == 98:
        fixed = '   * 更新商品数量   */'
    elif lineno == 118:
        fixed = "        console.error('更新数量失败', err)"
    elif lineno == 124:
        fixed = '   * 切换商品选中状态   */'
    elif lineno == 131:
        fixed = "    util.showLoading('处理中..')"
    elif lineno == 140:
        fixed = "        console.error('切换选中失败', err)"
    elif lineno == 176:
        fixed = '   * 切换全选/取消全选   */'
    elif lineno == 187:
        fixed = "        util.showToast('请先选择商品')"
    elif lineno == 194:
        fixed = "        util.showToast(`库存不足，最多购买${stockLimit}件`)"
    elif lineno == 247:
        fixed = "    util.showLoading('处理中..')"
    elif lineno == 271:
        fixed = "    util.showConfirm(`确定删除选中的${selectedItems.length}件商品吗？`).then(() => {"
    elif lineno == 280:
        fixed = "    util.showLoading('删除中..')"
    elif lineno == 294:
        fixed = '   * 去结算'
    elif lineno == 324:
        fixed = '    // 跳转到确认订单页面'
        fixed += '\n    wx.navigateTo({'
        # skip next line if it's the duplicate
    elif lineno == 330:
        fixed = '   * 计算价格'
    else:
        # 通用处理：移除乱码字符
        fixed = re.sub(r'[\ufffd]+', '', line)
    
    new_lines.append(fixed)

new_text = '\n'.join(new_lines)
with open(cart_path, 'w', encoding='utf-8') as f:
    f.write(new_text)
print('cart.js fixed!')

# ============ 修复 index.wxss 乱码注释 ============
wxss_path = 'd:/workspace/weChatShop/pages/index/index.wxss'
with open(wxss_path, encoding='utf-8', errors='replace') as f:
    wxss = f.read()

# 移除乱码注释行
wxss_lines = wxss.split('\n')
wxss_new = []
for line in wxss_lines:
    if '\ufffd' in line:
        # 跳过纯乱码注释行
        if re.match(r'^\s*/\*[^*]*\ufffd.*\*/\s*$', line):
            continue
        # 否则清理乱码
        line = re.sub(r'/\*[^*]*\ufffd[^*]*\*/', '', line)
    wxss_new.append(line)

wxss_text = '\n'.join(wxss_new)
with open(wxss_path, 'w', encoding='utf-8') as f:
    f.write(wxss_text)
print('index.wxss fixed!')

# ============ 修复 banner-fix.wxss ============
banner_path = 'd:/workspace/weChatShop/pages/index/banner-fix.wxss'
if os.path.exists(banner_path):
    with open(banner_path, encoding='utf-8', errors='replace') as f:
        content = f.read()
    content = re.sub(r'/\*[^*]*\ufffd[^*]*\*/', '/* 轮播图修复样式 */', content)
    with open(banner_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('banner-fix.wxss fixed!')

print('\nAll done!')
