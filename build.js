import fs from 'fs'
import path from 'path'
import * as esbuild from 'esbuild'
import {solidPlugin} from 'esbuild-plugin-solid'
import stylePlugin from 'esbuild-style-plugin'
import tailwindPlugin from '@tailwindcss/postcss'

const spinner = fs.readFileSync('./src/spinner.svg', 'base64')

const htmlPlugin = (htmlFile, replacements, as = 'index.html') => ({
  name: 'html-file',
  setup(build) {
    build.onStart(() => {
      let template = fs.readFileSync(htmlFile, 'utf8')
      const html = template.replace(/<%(.+?)%>/, (match, c1) => {
        const key = c1.trim()
        return replacements[key]
      })
      fs.writeFileSync(path.join(build.initialOptions.outdir, as), html, 'utf8')
    })
  },
})

/** @type import('esbuild').BuildOptions */
const config = {
  entryPoints: ['src/index.ts', 'src/dash.tsx'],
  platform: 'browser',
  bundle: true,
  loader: {
    '.woff': 'dataurl',
    '.woff2': 'dataurl',
    '.obj': 'file',
    '.svg': 'dataurl',
    '.vert': 'text',
    '.frag': 'text',
    '.scss': 'text',
  },
  outdir: 'docs',
  minify: process.env.NODE_ENV !== 'watch',
  treeShaking: process.env.NODE_ENV !== 'watch',
  sourcemap: process.env.NODE_ENV === 'watch' ? 'inline' : false,
  plugins: [
    htmlPlugin('./src/index.html', {spinner: `data:image/svg+xml;base64,${spinner}`}),
    htmlPlugin('./src/dash.html', {}, 'dash.html'),
    {
      name: 'ts-as-file',
      setup(build) {
        build.onResolve({filter: /^\.\//, namespace: 'file'}, (args) => {
          if (!args.with || args.with.type !== 'file') return null
          return build.resolve(args.path, {
            importer: args.importer,
            resolveDir: args.resolveDir,
            kind: args.kind,
            namespace: 'referred'
          }).then(result => {
            result.path = result.path.replace(/\.ts$/, '.js')
            result.namespace = 'load-as-file'
            return result
          })
        })
        build.onLoad({filter: /\.js$/, namespace: 'load-as-file'}, (args) => {
          let text = fs.readFileSync(args.path.replace(/\.js$/, '.ts'), 'utf8')
          const result = esbuild.transformSync(text, {loader: 'ts'})
          return {
            contents: result.code.replace(/export[^;\n]+[;\n]/gm, ''),
            loader: 'file',
          }
        })
      },
    },
    solidPlugin(), stylePlugin({
      cssModulesOptions: {
        generateScopedName: function (name, filename) {
          return 'tfb-' + name + '_' + path.basename(filename).replace(/.module.(sa|s?c)ss/, '');
        },/**/
      },
      postcss: {
        plugins: [tailwindPlugin(), {
          postcssPlugin: 'remove-woff',
          Declaration(decl) {
            if (decl.parent.type !== 'atrule' || decl.parent.name !== 'font-face') return
            if (decl.prop !== 'src') return
            decl.value = decl.value.replace(/(,\s+?)?url\([^)]+?\)\s+?format\(['"]woff['"]\)/, '')
          }
        }]
      },
      renderOptions: {
        sassOptions: {
          loadPaths: [
            "./node_modules"
          ],
          silenceDeprecations: ['import']
        }
      }
    }), {
      name: 'logger',
      setup(build) {
        let start
        build.onStart(() => {
          start = performance.now()
        })
        build.onEnd(() => {
          console.log(`Built in ${performance.now() - start} ms`)
        })
      }
    }
  ]
}

if (process.env.NODE_ENV === 'watch')
  await (await esbuild.context(config)).watch({})
else
  await esbuild.build(config)
