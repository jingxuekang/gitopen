const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

const filesToDelete = [
  "'+(i",
  '0',
  'd.name)',
  "p.endsWith('.js')",
  '{for(const',
  'x.toString(16).padStart(2',
  '[i+1',
  "{if(l.includes('getProductSkus')",
  "{if(l.includes('withSkuFallback')",
  '现阶段可执行优化计划.md'
]

const optionalDeletes = [
  path.join('miniprogram', 'project.config.json'),
  path.join('miniprogram', 'app.json.backup')
]

function removeIfExists(relPath) {
  const fullPath = path.join(root, relPath)
  if (!fs.existsSync(fullPath)) return false
  const stat = fs.statSync(fullPath)
  if (stat.isDirectory()) return false
  fs.unlinkSync(fullPath)
  return true
}

const removed = []

for (const relPath of filesToDelete.concat(optionalDeletes)) {
  if (removeIfExists(relPath)) {
    removed.push(relPath.replace(/\\/g, '/'))
  }
}

console.log(`removed: ${removed.length}`)
removed.forEach((item) => console.log(item))
