const d3 = require("d3");
const LRU = require("lru-cache");
const fetch = require("node-fetch");
const zipcodes = require("zipcodes");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

/**
 * this option defines how often data is forced to be updated
 * from the spreadsheets - measured in milliseconds, so the 1000 * 60 is
 * counting up to one minute and the final number is the number of minutes.
 */
const options = {
  maxAge: 1000 * 60 * 5,
};
const cache = new LRU(options);

/**
 * The core method that fetches a Google sheet from the Google API,
 * parses it as a CSV file, looks up the zip code, then turns that into a
 * GeoJSON feature object.
 */
async function getSheet(token, type) {
  const url = `https://docs.google.com/spreadsheets/d/${token}/gviz/tq?tqx=out:csv&sheet=Sheet1`;
  return fetch(url)
    .then((r) => r.text())
    .then((text) => {
      const parsed = d3.csvParse(text);
      const zipColumnName = parsed.columns.find((column) => {
        return column.match(/\bzip\b/gi);
      });
      return (
        parsed
          .map((feature) => {
            const rawZip = feature[zipColumnName];
            const zipString = rawZip.substring(0, 5);
            const zip = zipcodes.lookup(zipString);
            if (!zip) {
              if (rawZip) {
                /**
                 * Logging the failed zip codes so that we can manually review them.
                 * As far as I have tested (Tom), all of the failed zip codes are
                 * zip codes that don't actually exist. The zip database in the zipcodes
                 * module is fairly recent. */
                console.log(rawZip);
              }
              return;
            }

            /**
             * Try to censor volunteer notes for now. We can include them if we
             * want to. This is mainly a question of whether they are public or private. */
            feature[
              "VOLUNTEER COMMENTS Key info, date, time, intitials"
            ] = undefined;
            feature["VOLUNTEER NOTES "] = undefined;

            return {
              type: "Feature",
              properties: {
                zip: zipString,
                type,
                ...feature,
              },
              geometry: {
                type: "Point",
                coordinates: [zip.longitude, zip.latitude],
              },
            };
          })
          /**
           * This is equivalent to .compact in Ruby. We ignore some
           * rows of the spreadsheet because of wrong zip codes: this
           * line removes those from the array. */
          .filter((f) => f)
      );
    });
}

const CAN_HELP_TOKEN = "11aRnEtMClL_q15563Yq16teAIA3iR8raspWWP7Wts1k";
const NEED_HELP_TOKEN = "1faFgo0piEoSYb4OrmvWvhmXw5DNBPt7EMisI9qZc3GE";
const HAVE_ROOM_TOKEN = "1FMyS6osRgKoE3zYKvNtjm3b028uMRiCOvVrPEmn9ITg";

app.get("/data.geojson", (_req, res) => {
  /**
   * This data is cached so that we don't have to make a request
   * to google sheets on every site visit.
   */
  const cached = cache.get("can_help");
  if (cached) {
    res.send(cached);
  } else {
    /**
     * load all the sheets from google maps, and then
     * cluster them by simply grouping on zip codes.
     */
    Promise.all([
      getSheet(CAN_HELP_TOKEN, "can_help"),
      getSheet(HAVE_ROOM_TOKEN, "have_room"),
      getSheet(NEED_HELP_TOKEN, "need_help"),
    ]).then(([can_help, have_room, need_help]) => {
      /**
       * Group by zip code, based on fancy weird d3 magic. */
      const groups = d3.group(
        [].concat(can_help).concat(have_room).concat(need_help),
        (feature) => feature.properties.zip
      );
      const json = {
        type: "FeatureCollection",
        features: Array.from(groups, ([_key, values]) => {
          return {
            type: "Feature",
            geometry: values[0].geometry,
            properties: {
              counts: [
                ...d3.rollup(
                  values,
                  (v) => v.length,
                  (v) => v.properties.type
                ),
              ],
              features: values.map((v) => v.properties),
            },
          };
        }),
      };
      cache.set("can_help", json);
      res.send(json);
    });
  }
});

app.listen(port, () => {
  // console.log(`Example app listening at http://localhost:${port}`);
});

app.use(express.static("public"));
