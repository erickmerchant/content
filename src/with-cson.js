const cson = require('cson-parser')

exports.parse = function (string) {
  let object = {}

  let blocks = string.split('---').map((block) => block.trim())

  if (blocks[0] === '') {
    blocks = blocks.slice(1)

    object = cson.parse(blocks.shift())
  }

  object.content = blocks.join('---')

  return object
}

exports.stringify = function (object) {
  object = Object.assign({}, object)

  const content = object.content || ''

  delete object.content

  return ['---', cson.stringify(object, null, 2), '---', content].join('\n')
}
