// 批量更新分包路径脚本
const fs = require('fs');
const path = require('path');

// 路径映射表
const pathMap = {
  '/pages/product/product': '/packageProduct/pages/product/product',
  '/pages/trace/source/source': '/packageProduct/pages/trace/source/source',
  '/pages/review/review': '/packageProduct/pages/review/review',
  '/pages/review/list/list': '/packageProduct/pages/review/list/list',
  
  '/pages/order/confirm/confirm': '/packageOrder/pages/order/confirm/confirm',
  '/pages/order/list/list': '/packageOrder/pages/order/list/list',
  '/pages/order/detail/detail': '/packageOrder/pages/order/detail/detail',
  '/pages/payment/payment': '/packageOrder/pages/payment/payment',
  
  '/pages/user/settings/settings': '/packageUser/pages/user/settings/settings',
  '/pages/user/address/list/list': '/packageUser/pages/user/address/list/list',
  '/pages/user/address/edit/edit': '/packageUser/pages/user/address/edit/edit',
  '/pages/user/coupon/coupon': '/packageUser/pages/user/coupon/coupon',
  '/pages/user/favorite/favorite': '/packageUser/pages/user/favorite/favorite',
  
  '/pages/group/list/list': '/packageOther/pages/group/list/list',
  '/pages/group/detail/detail': '/packageOther/pages/group/detail/detail',
  '/pages/coupon/center/center': '/packageOther/pages/coupon/center/center',
  '/pages/coupon/select/select': '/packageOther/pages/coupon/select/select',
  '/pages/customer-service/customer-service': '/packageOther/pages/customer-service/customer-service'
};

// 需要扫描的目录
const scanDirs = [
  'pages',
  'components',
  'utils',
  'packageProduct',
  'packageOrder',
  'packageUser',
  'packageOther'
];

// 需要处理的文件扩展名
const extensions = ['.js', '.wxml', '.json'];

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    Object.entries(pathMap).forEach(([oldPath, newPath]) => {
      const regex = new RegExp(oldPath.replace(/\//g, '\\/'), 'g');
      if (regex.test(content)) {
        content = content.replace(regex, newPath);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ 已更新: ${filePath}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`✗ 处理失败: ${filePath}`, err.message);
    return false;
  }
}

function scanDirectory(dir) {
  let count = 0;
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (item !== 'node_modules' && item !== '.git') {
          count += scanDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          if (replaceInFile(fullPath)) {
            count++;
          }
        }
      }
    });
  } catch (err) {
    console.error(`扫描目录失败: ${dir}`, err.message);
  }
  
  return count;
}

console.log('开始更新分包路径...\n');

let totalUpdated = 0;
scanDirs.forEach(dir => {
  const fullPath = path.resolve(__dirname, dir);
  if (fs.existsSync(fullPath)) {
    console.log(`\n扫描目录: ${dir}`);
    totalUpdated += scanDirectory(fullPath);
  }
});

console.log(`\n完成！共更新 ${totalUpdated} 个文件`);
