import type { Config } from 'svgo'
import type { RsbuildSvgIconsPlugin, FileStats } from './typing'
import { SVG_DOM_ID, XMLNS, XMLNS_LINK } from './constants'
import { compilerIcons, inject } from './core'

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
      api.modifyHTMLTags(async (tags) => {
        const { insertHtml } = await compilerIcons(
          cache,
          svgoOptions as Config,
          options,
        )
        const xmlns = `xmlns="${XMLNS}"`
        const xmlnsLink = `xmlns:xlink="${XMLNS_LINK}"`
        const html = insertHtml
          .replace(new RegExp(xmlns, 'g'), '')
          .replace(new RegExp(xmlnsLink, 'g'), '')

        inject(
          tags.bodyTags,
          {
            tag: 'svg',
            attrs: {
              id: options.customDomId,
              xmlns: XMLNS,
              'xmlns:xlink': XMLNS_LINK,
              'aria-hidden': true,
              style: 'position: absolute; width: 0; height: 0',
            },
            children: html,
          },
          options.inject,
        )

        return tags
      })
    },
  }
}
