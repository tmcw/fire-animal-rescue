very simple microsite for animal rescue

https://fire-animal-rescue.herokuapp.com/

## Parts

`server.js` sanitizes and geocodes the google docs spreadsheets. it caches the
spreadsheet for 5 minutes so that most users don't have to wait for google's servers.

`public/index.html` is the map, javascript, html, css all in one. it's served
by express. it could be served statically through github pages or etc, but that
doesn't really matter either way

The map is powered by [Leaflet](https://leafletjs.com/reference-1.7.1.html).

site is on heroku, auto-deploying from master, the server and frontend as one chunk.

---

### Development

You'll need Node.js. Any recent version should do. Install the dependencies with npm or yarn.
Then run:

```
$ npm run start
```

Deployment is automatic through Heroku. Just merge a PR to master and it'll update.


---

### Production

This runs on a Heroku server. Currently has a hobby Dyno. The main moving piece is
the server request that loads from google sheets. This has a cache so that not
every request goes through to google. However, Google could go down or rate limit.
Unlikely but possible.

More likely is a dramatic change in the spreadsheet. The algorithm tries to be robust,
matching any column with 'zip' in it as the zip code so that renamings don't affect
it. But if someone were to rename the zip column to something without zip in the name,
the dots would disappear. That manifests as a 500 internal error which is visible in
Heroku metrics, plus people will obviously notice. The fix is tweaking the algorithm to
match.

It's unlikely that CPU or memory would be a problem: memory usage and dyno load
are extremely low. Esri might also rate limit access to the wildfire outlines
that we're loading from the API, but also, probably not.
