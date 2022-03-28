const dispatcher = d3.dispatch("timeline", "selectMap", "selectScatter", "selectSpider");

/**
 * Load and combine data
 */
let geoData, data, filteredData, lanLonData, choroplethMap, spiderChart, smiley;
Promise.all([
  d3.json("data/world_countries_topo.json"),
  d3.csv("data/world-happiness-report.csv"),
]).then((dataset) => {
  geoData = dataset[0];
  data = dataset[1];
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
    d.Display = false;
  });

  let entryData = data.filter((d) => {
    return d.year == 2013;
  });

  // entryData range and filter
  let range = d3.extent(entryData, (d) => d["Life Ladder"]);
  let min = range[0],
    max = range[1];
  
  entryData.forEach((d) => {
    d.select = false;
    if (d["Life Ladder"] == max || d["Life Ladder"] == min) {
      d.Display = true;
    }
  });

  // choroplethMap init
  choroplethMap = new ChoroplethMap(
    {
      parentElement: "#map",
    },
    geoData,
    data,
    dispatcher,
    2013
  );

  // Scatterplot init
  scatterplot = new Scatterplot(
    {
      parentElement: "#scatterplot",
    },
    entryData
  );
  scatterplot.updateVis();


  // Create a waypoint for each `step` container
  const waypoints = d3.selectAll(".step").each(function (d, stepIndex) {
    return new Waypoint({
      // `this` contains the current HTML element
      element: this,
      handler: function (direction) {
        // Check if the user is scrolling up or down
        const nextStep =
          direction === "down" ? stepIndex : Math.max(0, stepIndex - 1);

        // Update visualization based on the current step
        choroplethMap.goToStep(nextStep);
      },
      // Trigger scroll event halfway up. Depending on the text length, 75% might be even better
      offset: "50%",
    });
  });

  spiderChart = new SpiderChart(
    {
      parentElement: "#spider",
    },
    data,
    dispatcher,
    2013
  );

  smiley = new Smileyface(
    {
      parentElement: "#smiley",
    },
    20, 20
  );
});

dispatcher.on("timeline", selectedYear => {
  console.log("year: " + selectedYear);
  choroplethMap.currYear = selectedYear;
  choroplethMap.step0();
  spiderChart.currYear = selectedYear;
  spiderChart.updateVis();
});
/**
 * Dispatcher waits for 'selectMap' event
 *  filter data based on the selected categories and update the plot
 */
// TODO: selectedCategories contain country name, and will only have up to 5 country names, Ex. ["Russia","China"]
dispatcher.on("selectMap", (selectedCategories) => {
  /**
   * A sample how to modifies the dataset
   */

  // if (selectedCategories.length !== 0) {
  //   let selected = selectedCategories[0];
  //   data.forEach((d) => {
  //     if (d.gender === selected) {
  //       d.showup = 1;
  //       d.barclicked = 1;
  //     } else {
  //       d.showup = 0;
  //       d.barclicked = 0;
  //     }
  //   });
  // } else {
  //   data.forEach((d) => {
  //     d.showup = 1;
  //     d.idup = 0;
  //     d.arrowup = 0;
  //     d.barclicked = 0;
  //   });
  //}
  // update other vis

  // scatterplot.updateVis();
  // lexisplot.updateVis();
});