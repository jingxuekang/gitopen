const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..', 'cloudfunctions')
const dirs = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const missing = []

for (const dir of dirs) {
  const packagePath = path.join(root, dir, 'package.json')
  if (!fs.existsSync(packagePath)) {
    missing.push(`${dir}: no package.json`)
    continue
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    const deps = pkg.dependencies || {}
    if (!deps['wx-server-sdk']) {
      missing.push(`${dir}: missing wx-server-sdk`)
    }
  } catch (err) {
    missing.push(`${dir}: invalid package.json`)
  }
}

console.log(`cloud functions: ${dirs.length}`)
console.log(`missing: ${missing.length}`)
for (const line of missing) {
  console.log(line)
}
