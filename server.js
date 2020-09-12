const d3 = require("d3");
const LRU = require("lru-cache");
const fetch = require("node-fetch");
const zipcodes = require("zipcodes");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

const options = {
  maxAge: 1000 * 60 * 5,
};
const cache = new LRU(options);

/**
 * The spreadsheets that back this thing have long, descriptive headers
 * that don't work well in code. This translates them. This could be improved
 * to make it less fragile - matching anything that has "email" in it
 * to email address rather than a literal string, so that someone who
 * updates the header doesn't break the site.
 */
const remap = [
  ["Email Address ", "email"],
  ["Email Address", "email"],
  ["Name (first and last) ", "name"],
  ["Phone Number - we MUST be able to reach you.  ", "phone"],
  ["Phone Number - we MUST be able to reach you. ", "phone"],
  ["What zip code are you based out of?  ", "zip"],
  ["What's your hauling ability?  ", "hauling"],
  ["What counties are you willing to travel to?  ", "travel_to"],
  ["Describe how many animals need help (how many, what breed) ", "animals"],
  [
    "Do you need transportation or a place to keep the animals?  ",
    "need_transportation",
  ],
  [
    "Is a person still at the property with the animals?  ",
    "still_at_property",
  ],
  ["Will you be able to stay with the animals on site?  ", "able_to_stay"],
  [
    "Phone Number- we will not send resources out without confirming by phone. ",
    "phone",
  ],
  [
    "Email Address Please include details in Volunteer Notes - from start to finish. Your initials when you start/accept the request along with time you started, updates and key info as you progress, who you've connected for transport, & where they are going/shelter ",
    "email",
  ],
];

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
      return (
        parsed
          .map((feature) => {
            const rawZip =
              feature["What zip code are you based out of?  "] ||
              feature["What zip code is the place you can house animals? "] ||
              feature["Zip Code where help is needed "];
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

            for (const [source, target] of remap) {
              const val = feature[source];
              if (val !== undefined) {
                delete feature[source];
                feature[target] = val;
              }
            }
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
