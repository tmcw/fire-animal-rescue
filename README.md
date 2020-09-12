very simple microsite for animal rescue

https://fire-animal-rescue.herokuapp.com/

## Parts

`server.js` sanitizes and geocodes the google docs spreadsheets. it caches the
spreadsheet for 5 minutes so that most users don't have to wait for google's servers.

`public/index.html` is the map, javascript, html, css all in one. it's served
by express. it could be served statically through github pages or etc, but that
doesn't really matter either way

site is on heroku, auto-deploying from master, the server and frontend as one chunk.

---

### Development

You'll need Node.js. Any recent version should do. Install the dependencies with npm or yarn.
Then run:

```
$ npm run start
```

Deployment is automatic through Heroku. Just merge a PR to master and it'll update.
