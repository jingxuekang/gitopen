const fs = require('fs')
const path = require('path')

const keyword = process.argv[2]
if (!keyword) {
  console.log('Usage: node scripts/find_text.js <keyword>')
  process.exit(1)
}

const roots = ['app.js', 'app.json', 'pages', 'utils', 'components']
const exts = new Set(['.js', '.json', '.wxml', '.wxss'])

function walk(target) {
  if (!fs.existsSync(target)) return
  const stat = fs.statSync(target)
  if (stat.isFile()) {
    const ext = path.extname(target)
    if (!exts.has(ext)) return
    let text = ''
    try {
      text = fs.readFileSync(target, 'utf8')
    } catch (e) {
      return
    }
    if (text.includes(keyword)) {
      console.log(target.replace(/\\/g, '/'))
    }
    return
  }

  for (const entry of fs.readdirSync(target)) {
    walk(path.join(target, entry))
  }
}

for (const root of roots) {
  walk(root)
}
