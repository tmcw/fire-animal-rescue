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

const remap = [
  ["Email Address ", "email"],
  ["Email Address", "email"],
  ["Name (first and last) ", "name"],
  ["Phone Number - we MUST be able to reach you.  ", "phone"],
  ["Phone Number - we MUST be able to reach you. ", "phone"],
  ["What zip code are you based out of?  ", "zip"],
  ["What's your hauling ability?  ", "hauling"],
  ["What counties are you willing to travel to?  ", "travel_to"],
];

async function getSheet(token, type) {
  const url = `https://docs.google.com/spreadsheets/d/${token}/gviz/tq?tqx=out:csv&sheet=Sheet1`;
  return fetch(url)
    .then((r) => r.text())
    .then((text) => {
      const parsed = d3.csvParse(text);
      return parsed
        .map((feature) => {
          const rawZip =
            feature["What zip code are you based out of?  "] ||
            feature["What zip code is the place you can house animals? "] ||
            feature["Zip Code where help is needed "];
          const zipString = rawZip.substring(0, 5);
          const zip = zipcodes.lookup(zipString);
          if (!zip) {
            if (rawZip) {
              console.log(rawZip);
            }
            return;
          }
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
        .filter((f) => f);
    });
}

const CAN_HELP_TOKEN = "11aRnEtMClL_q15563Yq16teAIA3iR8raspWWP7Wts1k";
const NEED_HELP_TOKEN = "1faFgo0piEoSYb4OrmvWvhmXw5DNBPt7EMisI9qZc3GE";
const HAVE_ROOM_TOKEN = "1FMyS6osRgKoE3zYKvNtjm3b028uMRiCOvVrPEmn9ITg";

app.get("/data.geojson", (_req, res) => {
  const cached = cache.get("can_help");
  if (cached) {
    res.send(cached);
  } else {
    Promise.all([
      getSheet(CAN_HELP_TOKEN, "can_help"),
      getSheet(HAVE_ROOM_TOKEN, "have_room"),
      getSheet(NEED_HELP_TOKEN, "need_help"),
    ]).then(([can_help, have_room, need_help]) => {
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
