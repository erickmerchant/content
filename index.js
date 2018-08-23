const path = require('path')
const pathTo = require('path-to-regexp')
const cson = require('cson-parser')

module.exports = function (file, content = '', now = new Date()) {
  const result = {}

  result.data = cson.parse(content)

  const pathResult = pathTo(`:time(\\d+).:slug.cson`).exec(path.basename(file))

  if (pathResult) {
    result.date = new Date(Number(pathResult[1]))

    result.slug = pathResult[2]
  } else {
    result.date = now

    result.slug = path.basename(file, path.extname(file))
  }

  result.categories = path.dirname(file).split('/')

  if (result.categories.length && result.categories[0] === '.') {
    result.categories = result.categories.slice(1)
  }

  return result
}
