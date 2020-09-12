var map = L.map("map", {
  renderer: L.canvas(),
});

const bbox = {
  xmin: -131.309,
  ymin: 43.275,
  xmax: -111.622,
  ymax: 46.01,
  type: "extent",
  spatialReference: { wkid: 4326 },
};

L.tileLayer(
  "https://api.mapbox.com/styles/v1/tmcw/ckezx6w3p029819pns6t0vwao/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoidG1jdyIsImEiOiJjazljNTM3Z2IwMWFsM21uc3htNnNnbGkxIn0.x9St0tz_1Tp0BSCIN6jf0g",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }
).addTo(map);

function popup(obj) {
  let elem = document.createElement("div");

  for (let k in obj) {
    const value = obj[k].trim();
    if (!value) continue;
    const h3 = elem.appendChild(document.createElement("h3"));
    const div = elem.appendChild(document.createElement("div"));
    h3.textContent = k;
    div.textContent = obj[k];
  }

  return elem;
}

map.fitBounds([
  [44.044167353572185, -124.07409667968749],
  [47.137424646293866, -118.41613769531249],
]);

const images = {
  can_help: "truck.svg",
  have_room: "home.svg",
  need_help: "alert-triangle.svg",
};

fetch("/data.geojson")
  .then((r) => r.json())
  .then((can_help) => {
    L.geoJSON(can_help, {
      style: function (feature) {
        return { color: feature.properties.color };
      },
    })
      .eachLayer(function (layer) {
        const elem = document.createElement("div");

        let widthNeeded = 5;

        let has_need = false;

        let total = 0;

        for (let [label, count] of layer.feature.properties.counts) {
          const img = elem.appendChild(document.createElement("img"));
          img.width = 12;
          img.height = 12;
          widthNeeded += 18;
          img.src = images[label];
          total += count;
          if (label === "need_help") {
            has_need = true;
          }
        }
        if (total > 1) {
          elem.appendChild(document.createTextNode(`x${total}`));
          widthNeeded += 12;
        }

        var myIcon = L.divIcon({
          html: elem,
          iconSize: [widthNeeded, 20],
          className: `marker ${has_need ? "alert" : ""}`,
          riseOnHover: true,
        });
        layer.setIcon(myIcon);

        layer.on("click", () => {
          showLayer(layer);
        });
      })
      .addTo(map);
  });

const templates = {
  can_help: _.template(`<section><h5>Can help</h5>
                       <div><label>email</label>: <a href="mailto:<%= email %>"><%= email %></a></div>
                       <div><label>phone</label>: <%= phone %></div>
                       <div><label>zip code based out of</label>: <%= zip %></div>
                       <div><label>willing to travel to</label>: <%= travel_to %></div>
                       <div><label>hauling capacity</label>: <%= hauling %></div></section>`),
  have_room: _.template(`<section><h5>Have room</h5>
                       <div><label>email</label>: <a href="mailto:<%= email %>"><%= email %></a></div>
                       <div><label>phone</label>: <%= phone %></div></section>`),
  need_help: _.template(`<section><h5 style="color:darkred">Needs help</h5>
                       <div><label>email</label>: <a href="mailto:<%= email %>"><%= email %></a></div>
                       <div><label>phone</label>: <%= phone %></div></section>`),
};

function showLayer(layer) {
  const elem = document.getElementById("sidebar");
  elem.innerHTML = layer.feature.properties.features
    .map((feat) => {
      return templates[feat.type](feat);
    })
    .join("\n");
}

/**
 * We're fetching fire data directly from this ArcGIS server,
 * and coloring it a sort of purple so that it isn't too clashy with the reds.
 */
const fires = `https://opendata.arcgis.com/datasets/5da472c6d27b4b67970acc7b5044c862_0.geojson?geometry=%7B%22xmin%22%3A-131.309%2C%22ymin%22%3A43.275%2C%22xmax%22%3A-111.622%2C%22ymax%22%3A46.01%2C%22type%22%3A%22extent%22%2C%22spatialReference%22%3A%7B%22wkid%22%3A4326%7D%7D`;
fetch(fires)
  .then((r) => r.json())
  .then((fires) => {
    L.geoJSON(fires, {
      style: function (_feature) {
        return { color: "#f4b0db" };
      },
    })
      .eachLayer(function (layer) {
        layer.bindPopup(layer.feature.properties.IncidentName);
      })
      .addTo(map);
  });
