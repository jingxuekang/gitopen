const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const docsRoot = path.join(root, 'docs')
const deploymentDir = path.join(docsRoot, 'deployment')
const featuresDir = path.join(docsRoot, 'features')
const guidesDir = path.join(docsRoot, 'guides')
const apiDir = path.join(docsRoot, 'api')
const cloudFnApiDir = path.join(apiDir, 'cloudfunctions')

for (const dir of [docsRoot, deploymentDir, featuresDir, guidesDir, apiDir, cloudFnApiDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const deploymentNames = new Set([
  'CLOUD_SETUP_GUIDE.md',
  'COMPLETE_DEPLOYMENT_GUIDE.md',
  'DEPLOYMENT_CHECKLIST.md',
  'DEPLOY_CLOUD_FUNCTIONS.md',
  'QUICK_DEPLOY_STEPS.md',
  'QUICK_START.md',
  '上线部署指南.md',
  '上传后操作指南.md'
])

const guideNames = new Set([
  'HOW_TO_RUN.md',
  'TEST_SETUP_GUIDE.md',
  'CREATE_TABBAR_ICONS.md',
  '真机测试指南.md'
])

const keepRoot = new Set([
  'README.md'
])

function moveFile(srcPath, targetDir) {
  const fileName = path.basename(srcPath)
  const targetPath = path.join(targetDir, fileName)
  if (srcPath === targetPath) return false
  if (fs.existsSync(targetPath)) {
    // do not overwrite existing docs; keep source if target exists
    return false
  }
  fs.renameSync(srcPath, targetPath)
  return true
}

const moved = []

for (const fileName of fs.readdirSync(root)) {
  const fullPath = path.join(root, fileName)
  const stat = fs.statSync(fullPath)
  if (!stat.isFile()) continue
  if (!fileName.toLowerCase().endsWith('.md')) continue
  if (keepRoot.has(fileName)) continue

  let targetDir = featuresDir
  if (deploymentNames.has(fileName)) {
    targetDir = deploymentDir
  } else if (guideNames.has(fileName)) {
    targetDir = guidesDir
  } else if (fileName === 'PROGRESS.md' || fileName === 'CURRENT_ISSUE_AND_SOLUTION.md') {
    targetDir = docsRoot
  }

  if (moveFile(fullPath, targetDir)) {
    moved.push(`${fileName} -> ${path.relative(root, targetDir).replace(/\\/g, '/')}`)
  }
}

const cloudFnDir = path.join(root, 'cloudfunctions')
if (fs.existsSync(cloudFnDir)) {
  for (const fileName of fs.readdirSync(cloudFnDir)) {
    const fullPath = path.join(cloudFnDir, fileName)
    if (!fs.statSync(fullPath).isFile()) continue
    if (!fileName.toLowerCase().endsWith('.md')) continue
    if (moveFile(fullPath, cloudFnApiDir)) {
      moved.push(`cloudfunctions/${fileName} -> docs/api/cloudfunctions`)
    }
  }
}

console.log(`moved: ${moved.length}`)
moved.forEach((item) => console.log(item))
