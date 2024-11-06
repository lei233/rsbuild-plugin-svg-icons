import type { Config } from 'svgo'
import type { RsbuildSvgIconsPlugin, FileStats, DomInject } from './typing'
import path from 'path'
import fg from 'fast-glob'
import fs from 'fs'
import SVGCompiler from 'svg-baker'
import { optimize } from 'svgo'

const isWindows = typeof process !== 'undefined' && process.platform === 'win32'
const windowsSlashRE = /\\/g
export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? id.replace(windowsSlashRE, '/') : id)
}

export function inject<T>(
  el: Array<T>,
  value: T,
  inject: DomInject = 'body-last',
) {
  switch (inject) {
    case 'body-first':
      return Array.prototype.unshift.call(el, value)
    default:
      return Array.prototype.push.call(el, value)
  }
}

/**
 * Preload all icons in advance
 * @param cache
 * @param options
 */
export async function compilerIcons(
  cache: Map<string, FileStats>,
  svgOptions: Config,
  options: RsbuildSvgIconsPlugin,
) {
  const { iconDirs } = options

  let insertHtml = ''
  const idSet = new Set<string>()

  for (const dir of iconDirs) {
    const svgFilsStats = fg.sync('**/*.svg', {
      cwd: dir,
      stats: true,
      absolute: true,
    })

    for (const entry of svgFilsStats) {
      const { path, stats: { mtimeMs } = {} } = entry
      const cacheStat = cache.get(path)
      let svgSymbol
      let symbolId
      let relativeName = ''

      const getSymbol = async () => {
        relativeName = normalizePath(path).replace(normalizePath(dir + '/'), '')
        symbolId = createSymbolId(relativeName, options)
        svgSymbol = await compilerIcon(path, symbolId, svgOptions)
        idSet.add(symbolId)
      }

      if (cacheStat) {
        if (cacheStat.mtimeMs !== mtimeMs) {
          await getSymbol()
        } else {
          svgSymbol = cacheStat.code
          symbolId = cacheStat.symbolId
          symbolId && idSet.add(symbolId)
        }
      } else {
        await getSymbol()
      }

      svgSymbol &&
        cache.set(path, {
          mtimeMs,
          relativeName,
          code: svgSymbol,
          symbolId,
        })
      insertHtml += `${svgSymbol || ''}`
    }
  }
  return { insertHtml, idSet }
}

export async function compilerIcon(
  file: string,
  symbolId: string,
  svgOptions: Config,
): Promise<string | null> {
  if (!file) {
    return null
  }

  let content = fs.readFileSync(file, 'utf-8')

  if (svgOptions) {
    const { data } = optimize(content, svgOptions)
    content = data || content
  }

  // fix cannot change svg color  by  parent node problem
  content = content.replace(/stroke="[a-zA-Z#0-9]*"/, 'stroke="currentColor"')
  const svgSymbol = await new SVGCompiler().addSymbol({
    id: symbolId,
    content,
    path: file,
  })
  return svgSymbol.render()
}

export function createSymbolId(name: string, options: RsbuildSvgIconsPlugin) {
  const { symbolId } = options

  if (!symbolId) {
    return name
  }

  let id = symbolId
  let fName = name

  const { fileName = '', dirName } = discreteDir(name)
  if (symbolId.includes('[dir]')) {
    id = id.replace(/\[dir\]/g, dirName)
    if (!dirName) {
      id = id.replace('--', '-')
    }
    fName = fileName
  }
  id = id.replace(/\[name\]/g, fName)
  return id.replace(path.posix.extname(id), '')
}

export function discreteDir(name: string) {
  if (!normalizePath(name).includes('/')) {
    return {
      fileName: name,
      dirName: '',
    }
  }
  const strList = name.split('/')
  const fileName = strList.pop()
  const dirName = strList.join('-')
  return { fileName, dirName }
}
