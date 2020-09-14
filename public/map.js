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

map.fitBounds([
  [44.044167353572185, -124.07409667968749],
  [47.137424646293866, -118.41613769531249],
]);

const images = {
  can_help: "truck.svg",
  have_room: "home.svg",
  need_help: "alert-triangle.svg",
};

let activeLayer = undefined;

fetch("/data.geojson")
  .then((r) => r.json())
  .then((can_help) => {
    const pointsLayer = L.geoJSON(can_help, {
      style: function (feature) {
        return { color: feature.properties.color };
      },
    })
      .eachLayer(function (layer) {
        const elem = document.createElement("div");

        let widthNeeded = 0;

        let has_need = false;

        let total = 0;

        for (let [label, count] of layer.feature.properties.counts) {
          const div = elem.appendChild(document.createElement("div"));
          div.className = label;
          const img = div.appendChild(document.createElement("img"));
          img.width = 16;
          img.height = 16;
          widthNeeded += 20;
          img.src = images[label];
          total += count;
          if (label === "need_help") {
            has_need = true;
          }
        }

        let allFields = "";

        for (let feature of layer.feature.properties.features) {
          for (let k in feature) {
            allFields += " " + feature[k];
          }
        }

        layer.feature.properties.text = allFields.toLowerCase();

        if (total > 3) {
          const count = elem.appendChild(document.createElement("count"));
          count.textContent = ` x${total}`;
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

    document.getElementById("search").addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      pointsLayer.eachLayer((layer) => {
        const match = layer.feature.properties.text.indexOf(query) != -1;
        if (match) {
          layer.getElement().style.opacity = 1;
        } else {
          layer.getElement().style.opacity = 0.2;
        }
      });
    });
  });

function showLayer(layer) {
  if (activeLayer) {
    activeLayer.getElement().classList.remove("clicked");
  }
  layer.getElement().classList.add("clicked");
  activeLayer = layer;
  const elem = document.getElementById("sidebar");
  elem.innerHTML = "";
  layer.feature.properties.features.forEach((feat) => {
    const section = elem.appendChild(document.createElement("section"));
    const h5 = section.appendChild(document.createElement("h5"));
    h5.className = feat.type + "-header";
    h5.innerText =
      feat.type == "can_help"
        ? "Can help"
        : feat.type == "have_room"
        ? "Have room"
        : "Need help";
    for (let k in feat) {
      if (feat[k].trim()) {
        const label = section.appendChild(document.createElement("label"));
        const p = section.appendChild(document.createElement("p"));
        label.innerText = k;
        p.innerText = feat[k];
      }
    }
  });
}

/**
 * We're fetching fire data directly from this ArcGIS server,
 * and coloring it orange to represent the active fires
 */
const fires = `https://opendata.arcgis.com/datasets/5da472c6d27b4b67970acc7b5044c862_0.geojson?geometry=%7B%22xmin%22%3A-131.309%2C%22ymin%22%3A43.275%2C%22xmax%22%3A-111.622%2C%22ymax%22%3A46.01%2C%22type%22%3A%22extent%22%2C%22spatialReference%22%3A%7B%22wkid%22%3A4326%7D%7D`;
fetch(fires)
  .then((r) => r.json())
  .then((fires) => {
    L.geoJSON(fires, {
      style: function (_feature) {
        return { color: "#FF5733" };
      },
    })
      .eachLayer(function (layer) {
        layer.bindPopup(layer.feature.properties.IncidentName);
      })
      .addTo(map);
  });
