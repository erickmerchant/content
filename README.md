# @erickmerchant/html

Generate html from markdown and js. Could be part of a static site set-up. Install it globally with `npm install --global @erickmerchant/html`. Requires the following file structure.

```
├── content
│   ...
└── html.js
```

The content directory contains folders and your markdown content. The markdown should have CSON frontmatter.

## An example markdown file

``` markdown
---
title: "Example"
---
Markdown content goes here.
```

## An example html.js

``` javascript
module.exports = ({collection}) => {
  collection('post', ({on, save, read}) => {
    on('publish', ({parameter, option}) => {
      option('title', {
        description: 'the title',
        required: true
      })

      return (args) => {
        save('posts/:time.:slug', {
          time: Date.now(),
          title: args.title,
          slug: args.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        })
      }
    })

    on('publish-plus', ({parameter, option}) => {
      parameter('post', {
        description: 'the post to plus',
        required: true
      })

      return (args) => {
        read(args.post, 'posts/:time.:slug', (post) => {
          save('posts/:time.:slug', Object.assign(post, {
            plus: true
          }))
        })
      }
    })
  })

  return ({get, html, save, safe, link}) => {
    save('/', html`<a href="/posts/">Go to Posts</a>`)

    get('posts/:time.:slug', (posts) => {
      posts.forEach((post) => {
        save(link('posts/:slug', post), html`
          <!doctype html>
          <html>
            <head>
              <title>${post.title}</title>
              <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/10up-sanitize.css/5.0.0/sanitize.min.css">
            </head>
            <body>
              <h1>
                ${post.title}
                <small><time>${new Date(Number(post.time))}</time></small>
              </h1>
              <main>
                ${safe(post.content)}
              </main>
            </body>
          </html>
        `)
      })
    })

    get('posts/:time.:slug', (posts) => {
      save('posts/', html`
        <!doctype html>
        <html>
          <head>
            <title>Post</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/10up-sanitize.css/5.0.0/sanitize.min.css">
          </head>
          <body>
            <ul>
              ${safe(posts.map((post) => {
                return html`<li><a href="${link('/posts/:slug.html', post)}">${post.title}</a></li>`
              }))}
            </ul>
          </body>
        </html>
      `)
    })
  }
}
```
