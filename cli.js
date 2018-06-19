#!/usr/bin/env node
const command = require('sergeant')
const make = require('./src/make')
const move = require('./src/move')
const output = require('./src/output')
const watch = require('@erickmerchant/conditional-watch')
const promisify = require('util').promisify
const fs = require('fs')
const makeDir = require('make-dir')
const writeFile = promisify(fs.writeFile)
const rename = promisify(fs.rename)
const deps = {
  date: new Date(),
  watch,
  makeDir,
  writeFile,
  rename,
  out: process.stdout
}

command('content', '', function ({command}) {
  command('make', 'make a new cson file', make(deps))

  command('move', 'move a cson file', move(deps))

  command('output', 'output all your content as json', output(deps))
})(process.argv.slice(2))
