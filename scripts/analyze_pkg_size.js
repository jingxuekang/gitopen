const fs = require('fs')
const path = require('path')

const root = process.argv[2] || '.'
const topN = Number(process.argv[3] || 50)
const ignoreDirs = new Set([
  '.git',
  'node_modules',
  'cloudfunctions',
  'tests',
  'miniprogram',
  '.kiro'
])

const files = []

function walk(dir) {
  let entries = []
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch (e) {
    return
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) continue
      walk(full)
      continue
    }
    try {
      const stat = fs.statSync(full)
      files.push({
        file: full.replace(/\\/g, '/'),
        size: stat.size
      })
    } catch (e) {
      // ignore
    }
  }
}

walk(root)

files.sort((a, b) => b.size - a.size)

const total = files.reduce((sum, f) => sum + f.size, 0)
console.log(`files: ${files.length}`)
console.log(`total bytes: ${total}`)
console.log(`top ${topN}:`)
for (const item of files.slice(0, topN)) {
  console.log(`${item.size}\t${item.file}`)
}
