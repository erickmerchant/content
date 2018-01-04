#!/usr/bin/env node
const command = require('sergeant')
const make = require('./src/make')
const move = require('./src/move')
const generate = require('./src/generate')
const watch = require('@erickmerchant/conditional-watch')
const thenify = require('thenify')
const fs = require('fs')
const mkdirp = thenify(require('mkdirp'))
const writeFile = thenify(fs.writeFile)
const rename = thenify(fs.rename)
const deps = {
  watch,
  makeDir: mkdirp,
  writeFile,
  rename,
  out: process.stdout
}

command('html', 'generate html from markdown and js', function ({parameter, option, command}) {
  command('make', 'make a new markdown file', make(deps))

  command('move', 'move a markdown file', move(deps))

  return generate(deps)({parameter, option})
})(process.argv.slice(2))
