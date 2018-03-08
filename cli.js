#!/usr/bin/env node
const command = require('sergeant')
const make = require('./src/make')
const move = require('./src/move')
const output = require('./src/output')
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

command('content', '', function ({command}) {
  command('make', 'make a new markdown file', make(deps))

  command('move', 'move a markdown file', move(deps))

  command('output', 'output all your content as json', output(deps))
})(process.argv.slice(2))
