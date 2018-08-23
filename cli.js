#!/usr/bin/env node
const command = require('sergeant')
const make = require('./src/make')
const move = require('./src/move')
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
  command('make', 'make a new cson file', ({option, parameter}) => {
    parameter('destination', {
      description: 'the directory to save to',
      required: true
    })

    option('title', {
      description: 'the title',
      required: true,
      type (val) { return val }
    })

    option('date', {
      description: 'add the current time'
    })

    return (args) => make(deps)(args)
  })

  command('move', 'move a cson file', ({option, parameter}) => {
    parameter('source', {
      description: 'the file to move',
      required: true
    })

    parameter('destination', {
      description: 'the directory to move it to',
      required: true
    })

    option('title', {
      description: 'a new title',
      type (val) { return val }
    })

    option('update', {
      description: 'update the time'
    })

    option('no-date', {
      description: 'do not include the time'
    })

    return (args) => move(deps)(args)
  })
})(process.argv.slice(2))
