/**
 * Load and combine data
 */
let geoData, data, lanLonData, choroplethMap;
Promise.all([
  d3.json("data/world_countries_topo.json"),
  d3.csv("data/world-happiness-report.csv"),
  d3.csv("data/world_country_and_usa_states_latitude_and_longitude_values.csv"),
]).then((dataset) => {
  geoData = dataset[0];
  data = dataset[1];
  lanLonData = dataset[2];
  data.forEach((d) => {
    d["year"] = +d["year"];
    d["Life Ladder"] = +d["Life Ladder"];
    d["Log GDP per capita"] = +d["Log GDP per capita"];
    d["Social support"] = +d["Social support"];
    d["Healthy life expectancy at birth"] =
      +d["Healthy life expectancy at birth"];
    d["Freedom to make life choices"] = +d["Freedom to make life choices"];
    d["Generosity"] = +d["Generosity"];
    d["Perceptions of corruption"] = +d["Perceptions of corruption"];
    d["Positive affect"] = +d["Positive affect"];
    d["Negative affect"] = +d["Negative affect"];
    lanLonData.forEach((data) => {
      if (d["Country name"] == data["country"]) d["lat"] = data["latitude"];
      d["lon"] = data["longitude"];
    });
  });

  data = data.filter((d) => {
    return d.lat !== undefined && d.lon !== undefined;
  });
  // console.log(geoData);
  // Combine both datasets by adding the population density to the TopoJSON file
  geoData.objects.world_countries.geometries.forEach((d) => {
    for (let i = 0; i < data.length; i++) {
      if (d.properties.name == data[i]["Country name"]) {
        if (data[i].year === 2013) {
          d.properties.lifeLadder = +data[i]["Life Ladder"];
        }
      }
    }

  });
  console.log(geoData);
  // choroplethMap init
  choroplethMap = new ChoroplethMap(
    {
      parentElement: "#map",
    },
    geoData,
    data
  );
});
