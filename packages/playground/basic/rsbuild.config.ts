import { defineConfig } from '@rsbuild/core'
import { pluginVue } from '@rsbuild/plugin-vue'
import { pluginSvgIcons } from 'rsbuild-plugin-svg-icons'
import path from 'path'

export default defineConfig({
  html: {
    template: './index.html',
  },
  source: {
    entry: {
      index: './src/main.ts',
    },
  },
  plugins: [
    pluginVue(),
    pluginSvgIcons({
      iconDirs: [path.resolve(process.cwd(), 'src/icons')],
      // icon symbolId
      // default
      symbolId: 'icon-[dir]-[name]',
    }),
  ],
})
