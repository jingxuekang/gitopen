# 图片资源优化说明

## 重要提示
为了减小小程序包体积，所有商品图片、轮播图等大图应该：

1. **上传到云存储**
   - 在微信开发者工具中打开"云开发控制台"
   - 进入"存储"模块
   - 创建文件夹：`products/`、`banners/`、`categories/`
   - 上传图片并获取云存储 URL

2. **数据库中使用云存储 URL**
   ```javascript
   // 商品图片示例
   {
     images: [
       'cloud://env-id.xxxx/products/tea-001.jpg',
       'cloud://env-id.xxxx/products/tea-002.jpg'
     ]
   }
   
   // 轮播图示例
   {
     image: 'cloud://env-id.xxxx/banners/banner-001.jpg'
   }
   ```

3. **本地只保留必要的小图标**
   - Tab 图标（< 40KB）
   - 品牌 Logo（< 20KB）
   - UI 图标（< 10KB）

## 当前本地图片（需保留）
- `/images/brand-logo.png` - 品牌 Logo
- `/images/tab/*` - 底部导航图标
- `/images/category/*` - 分类图标（如果 < 200KB）

## 需要迁移到云存储的图片
- 所有商品图片
- 所有轮播图
- 所有大于 100KB 的图片

## 图片优化建议
1. 使用 TinyPNG 压缩图片
2. 商品图：建议 800x800，质量 80%
3. 轮播图：建议 750x400，质量 85%
4. 图标：使用 SVG 或 WebP 格式
