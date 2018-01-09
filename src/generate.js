const assert = require('assert')
const chalk = require('chalk')
const path = require('path')
const thenify = require('thenify')
const minify = require('html-minifier').minify
const glob = thenify(require('glob'))
const fs = require('fs')
const escapeHTML = require('escape-html')
const pathTo = require('path-to-regexp')
const readFile = thenify(fs.readFile)
const Highlights = require('highlights')
const highlighter = new Highlights()
const markdown = require('markdown-it')({
  highlight (code, lang) {
    if (!lang) {
      return escapeHTML(code)
    }

    code = highlighter.highlightSync({
      fileContents: code.trim(),
      scopeName: 'source.js'
    })

    return code
  },
  langPrefix: 'language-'
})
const cson = require('./cson')

module.exports = function (deps) {
  assert.equal(typeof deps.watch, 'function')

  assert.equal(typeof deps.makeDir, 'function')

  assert.equal(typeof deps.writeFile, 'function')

  assert.equal(typeof deps.out, 'object')

  assert.equal(typeof deps.out.write, 'function')

  return function ({parameter, option}) {
    parameter('content', {
      description: 'directory containing your markdown',
      required: true
    })

    parameter('template', {
      description: 'a js file that will generate html',
      required: true
    })

    parameter('destination', {
      description: 'the directory to save to',
      required: true
    })

    option('no-min', {
      description: 'do not minify',
      type: Boolean,
      default: { value: false }
    })

    option('watch', {
      description: 'watch for changes',
      type: Boolean,
      aliases: ['w'],
      default: { value: false }
    })

    return function (args) {
      let templatePath = path.join(process.cwd(), args.template)

      return deps.watch(args.watch, [templatePath, args.content], function () {
        return glob(path.join(args.content, '**/*.md')).then(function (files) {
          files = files.reverse()

          return Promise.all(files.map(function (file) {
            const pathResult = pathTo(':time(\\d+).:slug.md').exec(path.basename(file))
            let object = {}

            if (pathResult) {
              object.date = new Date(Number(pathResult[1]))

              object.slug = pathResult[2]
            } else {
              object.date = new Date()

              object.slug = path.basename(file, '.md')
            }

            object.categories = path.dirname(path.relative(args.content, file)).split('/')

            return readFile(file, 'utf-8').then(function (string) {
              object = Object.assign(cson.parse(string), object)

              object.content = markdown.render(object.content)

              return object
            })
          }))
        })
        .then(function (content) {
          delete require.cache[templatePath]

          const template = require(templatePath)

          const guarded = new Map()

          const routeDefinitions = new Map()

          const currentPage = Symbol('route')

          const htmls = new Map()

          const pages = new Set()

          const symbol = template({content, route, html, safe, link})

          return Promise.all([...pages].map(function (page) {
            let file = page.endsWith('/') ? page + 'index.html' : page

            file = path.join(args.destination, file)

            let content = concat(page, symbol)

            if (!args.noMin) {
              content = minify(content, {
                collapseWhitespace: true,
                removeComments: true,
                collapseBooleanAttributes: true,
                removeAttributeQuotes: true,
                removeRedundantAttributes: true,
                removeEmptyAttributes: true,
                removeOptionalTags: true
              })
            }

            return deps.makeDir(path.dirname(file)).then(function () {
              return deps.writeFile(file, content).then(function () {
                deps.out.write(chalk.green('\u2714') + ' saved ' + file + '\n')
              })
            })
          }))

          function concat (page, symbol) {
            const fragments = htmls.get(symbol)

            return fragments.map(escape).join('')

            function escape (fragment) {
              if (fragment === currentPage) {
                return page
              }

              if (routeDefinitions.has(fragment) || htmls.has(fragment) || guarded.has(fragment)) {
                if (guarded.has(fragment)) {
                  fragment = guarded.get(fragment)
                }

                if (routeDefinitions.has(fragment)) {
                  let definition = routeDefinitions.get(fragment)

                  fragment = definition.get(page) || ''
                }

                if (htmls.has(fragment)) {
                  fragment = concat(page, fragment)
                }

                return fragment
              }

              if (Array.isArray(fragment)) {
                return fragment.map(escape).join('')
              }

              return escapeHTML(fragment)
            }
          }

          function route (definer) {
            if (definer == null) {
              return currentPage
            }

            const symbol = Symbol('route')
            const definition = new Map()

            definer(function (page, content) {
              pages.add(page)

              definition.set(page, content)
            })

            routeDefinitions.set(symbol, definition)

            return symbol
          }

          function html (strings, ...vals) {
            const result = []

            strings.forEach(function (str, key) {
              result.push(safe(str))

              if (vals[key]) {
                let val = vals[key]

                result.push(val)
              }
            })

            let symbol = Symbol('html')

            htmls.set(symbol, result)

            return symbol
          }

          function safe (val) {
            const symbol = Symbol('safe')

            guarded.set(symbol, val)

            return symbol
          }

          function link (route, object) {
            return pathTo.compile(route)(object)
          }
        })
      })
    }
  }
}
