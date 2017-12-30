#!/usr/bin/env node
const command = require('sergeant')
// const error = require('sergeant/error')
// const assert = require('assert')
// const chalk = require('chalk')
const watch = require('@erickmerchant/conditional-watch')
const path = require('path')
const thenify = require('thenify')
// const minify = require('html-minifier').minify
const glob = thenify(require('glob'))
const fs = require('fs')
// const escape = require('escape-html')
const slugify = require('slugg')
const cson = require('cson-parser')
// const Highlights = require('highlights')
// const Remarkable = require('remarkable')
// const pathMatch = require('path-match')()
const pathTo = require('path-to-regexp')
const mkdirp = thenify(require('mkdirp'))
const readFile = thenify(fs.readFile)
const writeFile = thenify(fs.writeFile)
const rename = thenify(fs.rename)
// const highlighter = new Highlights()
// const remarkable = new Remarkable({
//   highlight (code, lang) {
//     if (!lang) {
//       return escape(code)
//     }
//
//     code = highlighter.highlightSync({
//       fileContents: code.trim(),
//       scopeName: 'source.js'
//     })
//
//     return code
//   },
//   langPrefix: 'language-'
// })

command('html', 'generate html from markdown and js', function ({parameter, option, command}) {
  command('make', 'make a new markdown file', function ({parameter, option}) {
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
        return writeFile(file, stringify(object))
      })
    }
  })

  command('move', 'move a markdown file', function ({parameter, option}) {
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
      let pathResult = pathTo(':time(\\d+).:slug.md').exec(path.basename(args.source))
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
            return writeFile(file, stringify(object))
          })
        })
      })
    }
  })

  parameter('content', {
    description: 'directory containing your markdown',
    required: true
  })

  parameter('template', {
    description: 'a js file that will generate html',
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
        return Promise.all(files.map(function (file) {
          let pathResult = pathTo(':time(\\d+).:slug.md').exec(path.basename(file))
          let object = {}

          if (pathResult) {
            object.date = new Date(Number(pathResult[1]))

            object.slug = pathResult[2]
          }

          object.categories = path.dirname(path.relative(args.content, file)).split('/')

          return readFile(file, 'utf-8').then(function (string) {
            return Object.assign(parse(string), object)
          })
        }))
      })
      .then(function (content) {
        const template = require(args.template)

        const guarded = new Map()

        const pages = []

        const result = template({content, route, html, safe, link})

        function route (definition) {

        }

        function html (strings, ...vals) {
          let result = []

          strings.forEach(function (str, key) {
            result.push(str)

            if (vals[key]) {
              let val = vals[key]

              if (guarded.has(val)) {
                val = guarded.get(val)
              } else {
                val = escape(val)
              }

              if (Array.isArray(val)) {
                val = val.join('')
              }

              result.push(val)
            }
          })

          return result
        }

        function safe (val) {
          let symbol = Symbol('safe')

          guarded.set(symbol, val)

          return symbol
        }

        function link (route, object) {
          return pathTo.compile(route)(object)
        }
      })
    })
  }
})(process.argv.slice(2))

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

  let content = object.content || ''

  delete object.content

  return ['---', cson.stringify(object, null, 2), '---', content].join('\n')
}
