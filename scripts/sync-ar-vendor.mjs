import { readFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
const source = resolve('node_modules/three')
const destination = resolve('public/ar/vendor')
const seen = new Set()
function copy(file) {
  if (seen.has(file)) return
  seen.add(file)
  const target = resolve(destination, relative(source, file))
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(file, target)
  const code = readFileSync(file, 'utf8')
  for (const match of code.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+\.js)['"]/g)) copy(resolve(dirname(file), match[1]))
}
copy(resolve(source, 'build/three.module.js'))
for (const file of ['controls/OrbitControls', 'loaders/GLTFLoader', 'libs/meshopt_decoder.module']) copy(resolve(source, `examples/jsm/${file}.js`))
copyFileSync(resolve(source, 'LICENSE'), resolve(destination, 'LICENSE'))
console.log(`Copied ${seen.size} Three.js modules for the AR scene.`)
