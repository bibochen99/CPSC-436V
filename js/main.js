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

  // Combine both datasets to the TopoJSON file
  let inputYear = 2013;
  let usa, RepublicofSerbia, Macedonia, PapuaNewGuinea, Myanmar;
  let min = 100,
    max = -100;
  geoData.objects.world_countries.geometries.forEach((d) => {
    for (let i = 0; i < data.length; i++) {
      if (
        data[i]["Country name"] === "United States" &&
        data[i].year === inputYear
      ) {
        usa = data[i]["Life Ladder"];
      }
      if (data[i]["Country name"] === "Serbia" && data[i].year === inputYear) {
        RepublicofSerbia = data[i]["Life Ladder"];
      }

      if (
        data[i]["Country name"] === "North Macedonia" &&
        data[i].year === inputYear
      ) {
        Macedonia = data[i]["Life Ladder"];
      }
      if (
        data[i]["Country name"] === "Papua New Guinea" &&
        data[i].year === inputYear
      ) {
        PapuaNewGuinea = data[i]["Life Ladder"];
      }
      if (data[i]["Country name"] === "Myanmar" && data[i].year === inputYear) {
        Myanmar = data[i]["Life Ladder"];
      }

      if (d.properties.name == data[i]["Country name"]) {
        if (data[i].year === inputYear) {
          d.properties.year = inputYear;
          d.properties.lifeLadder = data[i]["Life Ladder"];
        }
      }
    }

    // update name
    if (d.properties.name == "USA") {
      d.properties.year = inputYear;
      d.properties.lifeLadder = usa;
    }
    if (d.properties.name == "Republic of Serbia") {
      d.properties.year = inputYear;
      d.properties.lifeLadder = RepublicofSerbia;
    }
    if (d.properties.name == "Macedonia") {
      d.properties.year = inputYear;
      d.properties.lifeLadder = Macedonia;
    }
    if (d.properties.name == "Guinea") {
      d.properties.year = inputYear;
      d.properties.lifeLadder = PapuaNewGuinea;
    }
    if (d.properties.name == "Myanmar") {
      d.properties.year = inputYear;
      d.properties.lifeLadder = Myanmar;
    }
  });

  let entryData = data.filter((d) => {
    return (d.year == 2013);
  });
  
  // choroplethMap init
  choroplethMap = new ChoroplethMap(
    {
      parentElement: "#map",
    },
    geoData,
    entryData
  );
});
