const d3 = require("d3");
const fetch = require("node-fetch");
const usZips = require("us-zips");
const express = require("express");
const app = express();
const port = 3000;

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
              usZips[feature["What zip code are you based out of?  "]];
            if (!zip) {
              return;
            }
            feature[
              "VOLUNTEER COMMENTS Key info, date, time, intitials"
            ] = undefined;
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
  getSheet(process.env.CAN_HELP_TOKEN).then((json) => res.send(json));
});

app.get("/have_room.geojson", (_req, res) => {
  getSheet(process.env.HAVE_ROOM_TOKEN).then((json) => res.send(json));
});

app.get("/need_help.geojson", (_req, res) => {
  getSheet(process.env.NEED_HELP_TOKEN).then((json) => res.send(json));
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
