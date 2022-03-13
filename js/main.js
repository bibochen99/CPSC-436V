/**
 * Load and combine data
 */
let geoData, data, lanLonData;
Promise.all([
  d3.json("data/countries-10m.json"),
  d3.csv("data/world-happiness-report.csv"),
  d3.csv("data/world_country_and_usa_states_latitude_and_longitude_values.csv"),
]).then((dataset) => {
  geoData = dataset[0];
  data = dataset[1];
  lanLonData = dataset[2];
  data.forEach((d) => {
    lanLonData.forEach((data) => {
      if (d["Country name"] == data["country"]) d["lat"] = data["latitude"];
      d["lon"] = data["longitude"];
    });
  });

  data = data.filter((d) => {
    return d.lat !== undefined && d.lon !== undefined;
  });
});
