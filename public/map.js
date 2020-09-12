var map = L.map("map");

const bbox = {
  xmin: -131.309,
  ymin: 43.275,
  xmax: -111.622,
  ymax: 46.01,
  type: "extent",
  spatialReference: { wkid: 4326 },
};
const fires = `https://opendata.arcgis.com/datasets/5da472c6d27b4b67970acc7b5044c862_0.geojson?geometry=%7B%22xmin%22%3A-131.309%2C%22ymin%22%3A43.275%2C%22xmax%22%3A-111.622%2C%22ymax%22%3A46.01%2C%22type%22%3A%22extent%22%2C%22spatialReference%22%3A%7B%22wkid%22%3A4326%7D%7D`;

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

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

const needHelpCluster = L.markerClusterGroup({
  maxClusterRadius: 2,
}).addTo(map);
const haveRoomCluster = L.markerClusterGroup({
  maxClusterRadius: 2,
}).addTo(map);
const canHelpCluster = L.markerClusterGroup({
  maxClusterRadius: 2,
}).addTo(map);

L.control
  .layers(undefined, {
    "I need help": needHelpCluster,
    "I have room": haveRoomCluster,
    "I can help": canHelpCluster,
  })
  .addTo(map);

fetch("/can_help.geojson")
  .then((r) => r.json())
  .then((can_help) => {
    canHelpCluster.addLayers(
      L.geoJSON(can_help, {
        style: function (feature) {
          return { color: feature.properties.color };
        },
      }).eachLayer(function (layer) {
        layer.bindPopup(popup(layer.feature.properties));
      })
    );
  });

fetch("/need_help.geojson")
  .then((r) => r.json())
  .then((need_help) => {
    needHelpCluster.addLayers(
      L.geoJSON(need_help, {
        style: function (feature) {
          return { color: feature.properties.color };
        },
      }).eachLayer(function (layer) {
        layer.bindPopup(popup(layer.feature.properties));
      })
    );
  });

fetch("/have_room.geojson")
  .then((r) => r.json())
  .then((have_room) => {
    haveRoomCluster.addLayers(
      L.geoJSON(have_room, {
        style: function (feature) {
          return { color: feature.properties.color };
        },
      }).eachLayer(function (layer) {
        layer.bindPopup(popup(layer.feature.properties));
      })
    );
  });

fetch(fires)
  .then((r) => r.json())
  .then((fires) => {
    L.geoJSON(fires, {
      style: function (feature) {
        return { color: "red" };
      },
    })
      .eachLayer(function (layer) {
        layer.bindPopup(layer.feature.properties.IncidentName);
      })
      .addTo(map);
  });
