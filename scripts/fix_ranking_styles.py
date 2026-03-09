# -*- coding: utf-8 -*-

new_styles = '''
/* 新排行榜样式 */
.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 24rpx 28rpx;
  background: #FFFBF5;
  border-radius: 20rpx;
  position: relative;
  transition: all 0.3s ease;
  box-shadow: 0 4rpx 16rpx rgba(139, 105, 20, 0.08);
}

.ranking-item:active {
  background: #FFF8ED;
  transform: scale(0.98);
}

/* 前三名奖牌样式 */
.rank-medal {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 24rpx;
}

.medal-1 {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  box-shadow: 0 4rpx 16rpx rgba(255, 215, 0, 0.5);
}

.medal-2 {
  background: linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 100%);
  box-shadow: 0 4rpx 16rpx rgba(192, 192, 192, 0.5);
}

.medal-3 {
  background: linear-gradient(135deg, #CD7F32 0%, #B87333 100%);
  box-shadow: 0 4rpx 16rpx rgba(205, 127, 50, 0.5);
}

.medal-number {
  font-size: 28rpx;
  font-weight: 700;
  color: #FFFFFF;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.3);
}

/* 第四名及以后的普通数字 */
.rank-number-normal {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 24rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #8B6914;
  background: #F5F0E8;
}

.ranking-image {
  width: 140rpx;
  height: 140rpx;
  border-radius: 16rpx;
  margin-right: 28rpx;
  flex-shrink: 0;
  object-fit: cover;
}

.ranking-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 140rpx;
  padding: 4rpx 0;
}

.ranking-name {
  font-size: 30rpx;
  color: #3D2817;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
  margin-bottom: 0;
}

.ranking-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.ranking-price {
  display: flex;
  align-items: baseline;
  gap: 2rpx;
}

.ranking-price .price-symbol {
  font-size: 24rpx;
  color: #B5702E;
  font-weight: 600;
}

.ranking-price .price-value {
  font-size: 38rpx;
  color: #B5702E;
  font-weight: 700;
}

.ranking-stats {
  font-size: 22rpx;
  color: #A89888;
  padding: 6rpx 14rpx;
  background: rgba(139, 105, 20, 0.07);
  border-radius: 20rpx;
}
'''

with open('d:/workspace/weChatShop/pages/index/index.wxss', encoding='utf-8', errors='replace') as f:
    content = f.read()

# 找到新排行榜样式区域并替换到文件末尾前
start_idx = content.find('/* \u65b0\u6392\u884c\u699c\u6837\u5f0f */')
if start_idx == -1:
    start_idx = content.find('.ranking-list')
    # 往前找注释
    comment_idx = content.rfind('/*', 0, start_idx)
    if comment_idx > start_idx - 50:
        start_idx = comment_idx

# 找结束位置（下一个主要注释块或文件末尾）
end_markers = ['/* 骨架屏 */', '/* 果H */', '/* ¹ûH */', '/* tap-active */', '.tap-active']
end_idx = len(content)
for marker in end_markers:
    idx = content.find(marker, start_idx + 100)
    if idx != -1 and idx < end_idx:
        end_idx = idx

before = content[:start_idx]
after = content[end_idx:]
new_content = before + new_styles + '\n' + after

with open('d:/workspace/weChatShop/pages/index/index.wxss', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'Done! Replaced from {start_idx} to {end_idx}')
