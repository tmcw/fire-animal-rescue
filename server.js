const d3 = require("d3");
const LRU = require("lru-cache");
const fetch = require("node-fetch");
const usZips = require("us-zips");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

const options = {
  maxAge: 1000 * 60 * 5,
};
const cache = new LRU(options);

async function getSheet(token) {
  const url = `https://docs.google.com/spreadsheets/d/${token}/gviz/tq?tqx=out:csv&sheet=Sheet1`;
  return fetch(url)
    .then((r) => r.text())
    .then((text) => {
      const parsed = d3.csvParse(text);
      return {
        type: "FeatureCollection",
        features: parsed
          .map((feature) => {
            const zip =
              usZips[
                feature["What zip code are you based out of?  "] ||
                  feature[
                    "What zip code is the place you can house animals? "
                  ] ||
                  feature["Zip Code where help is needed "]
              ];
            if (!zip) {
              return;
            }
            feature[
              "VOLUNTEER COMMENTS Key info, date, time, intitials"
            ] = undefined;
            feature["VOLUNTEER NOTES "] = undefined;
            return {
              type: "Feature",
              properties: feature,
              geometry: {
                type: "Point",
                coordinates: [zip.longitude, zip.latitude],
              },
            };
          })
          .filter((f) => f),
      };
    });
}

app.get("/can_help.geojson", (_req, res) => {
  const cached = cache.get("can_help");
  if (cached) {
    res.send(cached);
  } else {
    getSheet(process.env.CAN_HELP_TOKEN).then((json) => {
      cache.set("can_help", json);
      res.send(json);
    });
  }
});

app.get("/have_room.geojson", (_req, res) => {
  const cached = cache.get("have_room");
  if (cached) {
    res.send(cached);
  } else {
    getSheet(process.env.HAVE_ROOM_TOKEN).then((json) => {
      cache.set("have_room", json);
      res.send(json);
    });
  }
});

app.get("/need_help.geojson", (_req, res) => {
  const cached = cache.get("need_help");
  if (cached) {
    res.send(cached);
  } else {
    getSheet(process.env.NEED_HELP_TOKEN).then((json) => {
      cache.set("need_help", json);
      res.send(json);
    });
  }
});

app.listen(port, () => {
  // console.log(`Example app listening at http://localhost:${port}`);
});

app.use(express.static("public"));
