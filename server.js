const d3 = require("d3");
const fetch = require("node-fetch");
const usZips = require("us-zips");
const express = require("express");
const app = express();
const port = 3000;

const URL = process.env.VOLUNTEERS_URL;

app.get("/", (_req, res) => {
  fetch(URL)
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
    })
    .then((parsed) => res.send(parsed));
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
