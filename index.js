const chalk = require('chalk')
const watch = require('@erickmerchant/conditional-watch')
const path = require('path')
const thenify = require('thenify')
const minify = require('html-minifier').minify
const glob = thenify(require('glob'))
const fs = require('fs')
const escapeHTML = require('escape-html')
const slugify = require('slugg')
const cson = require('cson-parser')
const pathTo = require('path-to-regexp')
const mkdirp = thenify(require('mkdirp'))
const readFile = thenify(fs.readFile)
const writeFile = thenify(fs.writeFile)
const rename = thenify(fs.rename)
const Highlights = require('highlights')
const highlighter = new Highlights()
const markdown = require('markdown-it')({
  highlight (code, lang) {
    if (!lang) {
      return escape(code)
    }

    code = highlighter.highlightSync({
      fileContents: code.trim(),
      scopeName: 'source.js'
    })

    return code
  },
  langPrefix: 'language-'
})

exports.make = function (deps) {
  return function ({parameter, option}) {
    parameter('destination', {
      description: 'the directory to save to',
      required: true
    })

    option('title', {
      description: 'the title',
      required: true
    })

    return function (args) {
      const now = Date.now()

      const slug = slugify(args.title)

      const object = {title: args.title}

      const file = path.join(args.destination, `${now}.${slug}.md`)

      return mkdirp(path.dirname(file)).then(function () {
        return writeFile(file, stringify(object)).then(function () {
          console.log(chalk.green('\u2714') + ' saved ' + file)
        })
      })
    }
  }
}

exports.move = function (deps) {
  return function ({parameter, option}) {
    parameter('source', {
      description: 'the file to move',
      required: true
    })

    parameter('destination', {
      description: 'the directory to move it to',
      required: true
    })

    option('title', {
      description: 'a new title'
    })

    option('update', {
      description: 'update the date and time',
      type: Boolean,
      default: { value: false }
    })

    return function (args) {
      const pathResult = pathTo(':time(\\d+).:slug.md').exec(path.basename(args.source))
      let now
      let slug

      if (pathResult) {
        now = pathResult[1]

        slug = pathResult[2]
      }

      return readFile(args.source, 'utf-8').then(function (string) {
        const object = parse(string)

        if (args.update) {
          now = Date.now()
        }

        if (args.title != null) {
          slug = slugify(args.title)

          object.title = args.title
        }

        if (!now) {
          return Promise.reject(new Error('time not set'))
        }

        if (!slug) {
          return Promise.reject(new Error('slug not set'))
        }

        const file = path.join(args.destination, `${now}.${slug}.md`)

        return mkdirp(path.dirname(file)).then(function () {
          return rename(args.source, file).then(function () {
            return writeFile(file, stringify(object)).then(function () {
              console.log(chalk.green('\u2714') + ' saved ' + file)
            })
          })
        })
      })
    }
  }
}

exports.generate = function (deps) {
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
      watch(args.watch, args.content, function () {
        return glob(path.join(args.content, '**/*.md')).then(function (files) {
          files = files.reverse()

          return Promise.all(files.map(function (file) {
            const pathResult = pathTo(':time(\\d+).:slug.md').exec(path.basename(file))
            let object = {}

            if (pathResult) {
              object.date = new Date(Number(pathResult[1]))

              object.slug = pathResult[2]
            }

            object.categories = path.dirname(path.relative(args.content, file)).split('/')

            return readFile(file, 'utf-8').then(function (string) {
              object = Object.assign(parse(string), object)

              object.content = markdown.render(object.content)

              return object
            })
          }))
        })
        .then(function (content) {
          let templatePath = path.join(process.cwd(), args.template)

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

            return mkdirp(path.dirname(file)).then(function () {
              return writeFile(file, content).then(function () {
                console.log(chalk.green('\u2714') + ' saved ' + file)
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

function parse (string) {
  let object = {}

  let blocks = string.split('---').map((block) => block.trim())

  if (blocks[0] === '') {
    blocks = blocks.slice(1)

    object = cson.parse(blocks.shift())
  }

  object.content = blocks.join('---')

  return object
}

function stringify (object) {
  object = Object.assign({}, object)

  const content = object.content || ''

  delete object.content

  return ['---', cson.stringify(object, null, 2), '---', content].join('\n')
}
