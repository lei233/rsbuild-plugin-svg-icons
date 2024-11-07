import type { Config } from 'svgo'
import type { RsbuildSvgIconsPlugin, FileStats } from './typing'
import {
  SVG_DOM_ID,
  SVG_ICONS_CLIENT,
  SVG_ICONS_REGISTER_NAME,
} from './constants'
import { createModuleCode } from './core'

export function pluginSvgIcons(opt: RsbuildSvgIconsPlugin) {
  const cache = new Map<string, FileStats>()

  const options = {
    svgoOptions: true,
    symbolId: 'icon-[dir]-[name]',
    inject: 'body-last' as const,
    customDomId: SVG_DOM_ID,
    ...opt,
  }

  let { svgoOptions } = options
  const { symbolId } = options

  if (!symbolId.includes('[name]')) {
    throw new Error('SymbolId must contain [name] string!')
  }

  if (svgoOptions) {
    svgoOptions = typeof svgoOptions === 'boolean' ? {} : svgoOptions
  }

  return {
    name: 'rsbuild:svg-icons',
    setup(api) {
      api.resolve(async ({ resolveData }) => {
        const id = resolveData.request
        if (!/^virtual:svg-icons/.test(id)) return
        const isRegister = id.endsWith(SVG_ICONS_REGISTER_NAME)
        const isClient = id.endsWith(SVG_ICONS_CLIENT)
        const { code, idSet } = await createModuleCode(
          cache,
          svgoOptions as Config,
          options,
        )
        if (isRegister) {
          resolveData.request = `data:text/javascript,${code}`
        }
        if (isClient) {
          resolveData.request = `data:text/javascript,${idSet}`
        }
      })
    },
  }
}
