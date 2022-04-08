class ChoroplethMap {
  /**
   * Class constructor with basic configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _geoData, _data, _dispatcher, _currYear, _clicked) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 900,
      containerHeight: _config.containerHeight || 400,
      margin: _config.margin || { top: 100, right: 20, bottom: 10, left: 20 },
      tooltipPadding: 10,
      legendBottom: 50,
      legendLeft: 50,
      legendRectHeight: 12,
      legendRectWidth: 150,
      // currYear: 2013,
      steps: [
        "step0",
        "step1",
        "step2",
        "step3",
        "step4",
        "step5",
        "step6",
        "step7",
        "step8",
      ],
    };
    this.geoData = _geoData;
    this.data = _data;
    this.dispatcher = _dispatcher;
    this.currYear = _currYear;
    this.isClickedOnMap = _clicked;
    this.cleared = 0;
    this.initVis();
  }

  /**
   * We initialize scales/axes and append static elements, such as axis titles.
   */
  initVis() {
    let vis = this;
    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width =
      vis.config.containerWidth -
      vis.config.margin.left -
      vis.config.margin.right;
    vis.height =
      vis.config.containerHeight -
      vis.config.margin.top -
      vis.config.margin.bottom;

    // Define size of SVG drawing area
    vis.svg = d3
      .select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight)
      .attr("transform", `translate(0,-60)`);

    // Append group element that will contain our actual chart
    // and position it according to the given margin config
    vis.chart = vis.svg
      .append("g")
      .attr(
        "transform",
        `translate(${vis.config.margin.left},${vis.config.margin.top})`
      );

    // Defines the projection and path
    vis.projection = d3
      .geoEquirectangular()
      .center([0, 15]) // set centre to further North
      .scale([vis.width / (2 * Math.PI)]) // scale to fit size of svg group
      .translate([vis.width / 2, vis.height / 2]); // ensure centered within svg group

    vis.geoPath = d3.geoPath().projection(vis.projection);

    // Initialize color scale
    vis.colorScale = d3
      .scaleLinear()
      .range(["#cfe2f2", "#0d306b"])
      .interpolate(d3.interpolateHcl);

    // Initialize gradient that we will later use for the legend
    vis.linearGradient = vis.svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "legend-gradient");

    // Append legend
    vis.legend = vis.chart
      .append("g")
      .attr("class", "legend")
      .attr(
        "transform",
        `translate(${vis.config.legendLeft},${vis.height - vis.config.legendBottom
        })`
      );

    //Initialize geoJoinPath
    vis.geoJoinPath = vis.chart
      .selectAll(".geo-path")
      .data(
        topojson.feature(vis.geoData, vis.geoData.objects.world_countries)
          .features
      )
      .join("path");

    //Initialize Title
    vis.legendTitle = vis.legend
      .append("text")
      .attr("class", "legend-title")
      .attr("dy", ".35em")
      .attr("y", -10);

    // Time slider
    // source: https://bl.ocks.org/johnwalley/e1d256b81e51da68f7feb632a53c3518
    vis.dataTime = d3.range(0, 16).map(function (d) {
      return new Date(2005 + d, 1, 1);
    });

    vis.yearSlider = d3
      .sliderBottom()
      .min(d3.min(vis.dataTime))
      .max(d3.max(vis.dataTime))
      .step(1000 * 60 * 60 * 24 * 365)
      .width(500)
      .tickFormat(d3.timeFormat("%Y"))
      .tickValues(vis.dataTime)
      .default(new Date(2013, 1, 1))
      .on("onchange", (val) => {
        let selectedYear = d3.timeFormat("%Y")(val);
        d3.select("p#value-time").text(d3.timeFormat("%Y")(val));
        vis.dispatcher.call("timeline", event, selectedYear, vis.currStep);
      });

    d3.select("div#year-slider")
      .append("svg")
      .attr("width", 550)
      .attr("height", 100)
      .append("g")
      .attr("transform", "translate(30,30)")
      .call(vis.yearSlider);

    vis.filterData();
    // call step 0
    vis.step0();
  }

  filterData() {
    let vis = this;
    // filter data by year
    vis.filteredData = vis.data.filter((d) => {
      return d.year == vis.currYear;
    });

    // combine dataset
    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      d.properties.year = undefined;
      d.properties.lifeLadder = undefined;
      d.properties.socialSupport = undefined;
      d.properties.gdp = undefined;
      d.properties.healthyLife = undefined;
      d.properties.free = undefined;
      d.properties.perceptions = undefined;
      d.properties.positive = undefined;
      d.properties.negative = undefined;
      d.properties.generosity = undefined;
      for (let i = 0; i < vis.filteredData.length; i++) {
        if (d.properties.name == vis.filteredData[i]["Country name"]) {
          // if (vis.data[i].year === inputYear) {
          d.properties.year = vis.filteredData[i]["year"];
          d.properties.lifeLadder = vis.filteredData[i]["Life Ladder"];
          d.properties.socialSupport = vis.filteredData[i]["Social support"];
          d.properties.gdp = vis.filteredData[i]["Log GDP per capita"];
          d.properties.healthyLife =
            vis.filteredData[i]["Healthy life expectancy at birth"];
          d.properties.free =
            vis.filteredData[i]["Freedom to make life choices"];
          d.properties.perceptions =
            vis.filteredData[i]["Perceptions of corruption"];
          d.properties.positive = vis.filteredData[i]["Positive affect"];
          d.properties.negative = vis.filteredData[i]["Negative affect"];
          d.properties.generosity = vis.filteredData[i]["Generosity"];
          d.properties.mapIsClicked = 0;
          // }
        }
      }
    });
  }

  step0() {
    let vis = this;
    vis.currStep = 0;
    // Legend title
    vis.legendRect = vis.legend
      .append("rect")
      .attr("width", vis.config.legendRectWidth)
      .attr("height", vis.config.legendRectHeight);
    vis.legendTitle.text("Life Ladder");

    // update map value to life ladder
    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.lifeLadder
    );

    // update range, max & min indicator
    let range = d3.extent(vis.filteredData, (d) => d["Life Ladder"]);
    let min = range[0],
      max = range[1];

    // helper function
    if (!vis.cleared) {
      this.indicatorHelper("lifeLadder", min, max, vis);
    }

    // color scale domain
    vis.colorScale.domain(vis.mapValue);

    // Define begin and end of the color gradient (legend)
    vis.legendStops = [
      { color: "#cfe2f2", value: min, offset: 0 },
      { color: "#0d306b", value: max, offset: 100 },
    ];

    // Append world map
    this.worldAppendMapHelper(vis, "lifeLadder");
    //tooltip
    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let ladder;
        if (d.properties.lifeLadder === undefined) {
          ladder = "N/A";
        } else {
          ladder = d.properties.lifeLadder;
        }
        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
          <div class="tooltip-title">${name}</div>
          Life Ladder: ${ladder}
          `);
      })
      .on("mouseleave", () => {
        d3.select("#map-tooltip").style("display", "none");
      });

    // Add legend labels
    vis.legend
      .selectAll(".legend-label")
      .data(vis.legendStops)
      .join("text")
      .attr("class", "legend-label")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("y", 20)
      .attr("x", (d, index) => {
        return index == 0 ? 0 : vis.config.legendRectWidth;
      })
      .text((d) => Math.round(d.value * 10) / 10);

    // Update gradient for legend
    vis.linearGradient
      .selectAll("stop")
      .data(vis.legendStops)
      .join("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);
    vis.legendRect.attr("fill", "url(#legend-gradient)");

    //static dispatcher
    this.staticDispatcherHelper("Life Ladder", vis, min, max, 0);
    if (vis.isClickedOnMap === false) {
      this.dispatcherHelper("lifeLadder", vis);
    }
    //call dispatcherHelper
  }

  step1() {
    let vis = this;
    vis.currStep = 1;
    // update title
    vis.legendTitle.text("Social Support");

    // update map value
    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.socialSupport
    );

    // update range, max & min indicator, helper function, legend value
    let range = d3.extent(vis.filteredData, (d) => d["Social support"]);
    let min = range[0],
      max = range[1];
    if (!vis.cleared) {
      this.indicatorHelper("socialSupport", min, max, vis);
    }
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "#cfe2f2", value: min, offset: 0 },
      { color: "#0d306b", value: max, offset: 100 },
    ];

    // Append world map
    this.worldAppendMapHelper(vis, "socialSupport");
    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;

        let socialSupport;
        if (d.properties.socialSupport === undefined) {
          socialSupport = "N/A";
        } else {
          socialSupport = d.properties.socialSupport;
        }

        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Social Support: ${socialSupport}
            `);
      })
      .on("mouseleave", () => {
        d3.select("#map-tooltip").style("display", "none");
      });
    // Add legend labels
    vis.legend
      .selectAll(".legend-label")
      .data(vis.legendStops)
      .join("text")
      .attr("class", "legend-label")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("y", 20)
      .attr("x", (d, index) => {
        return index == 0 ? 0 : vis.config.legendRectWidth;
      })
      .text((d) => Math.round(d.value * 10) / 10);

    // Update gradient for legend
    vis.linearGradient
      .selectAll("stop")
      .data(vis.legendStops)
      .join("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    vis.legendRect.attr("fill", "url(#legend-gradient)");
    //static dispatcher
    this.staticDispatcherHelper("Social support", vis, min, max, 1);
    //call dispatcherHelper

    if (vis.isClickedOnMap === false) {
      this.dispatcherHelper("socialSupport", vis);
    }
  }

  step2() {
    let vis = this;
    vis.currStep = 2;
    // update title
    vis.legendTitle.text("Log GDP per capita");
    // update map value
    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.gdp
    );
    // update range, max & min indicator, helper function, legend value
    let range = d3.extent(vis.filteredData, (d) => d["Log GDP per capita"]);
    let min = range[0],
      max = range[1];
    if (!vis.cleared) {
      this.indicatorHelper("gdp", min, max, vis);
    }
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "#cfe2f2", value: min, offset: 0 },
      { color: "#0d306b", value: max, offset: 100 },
    ];

    // Append world map
    this.worldAppendMapHelper(vis, "gdp");

    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let gdp;
        if (d.properties.gdp === undefined) {
          gdp = "N/A";
        } else {
          gdp = d.properties.gdp;
        }

        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Log GDP per capita: ${gdp}
            `);
      })
      .on("mouseleave", () => {
        d3.select("#map-tooltip").style("display", "none");
      });
    // Add legend labels
    vis.legend
      .selectAll(".legend-label")
      .data(vis.legendStops)
      .join("text")
      .attr("class", "legend-label")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("y", 20)
      .attr("x", (d, index) => {
        return index == 0 ? 0 : vis.config.legendRectWidth;
      })
      .text((d) => Math.round(d.value * 10) / 10);

    // Update gradient for legend
    vis.linearGradient
      .selectAll("stop")
      .data(vis.legendStops)
      .join("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    //static dispatcher
    this.staticDispatcherHelper("Log GDP per capita", vis, min, max, 2);
    //call dispatcherHelper
    if (vis.isClickedOnMap === false) {
      this.dispatcherHelper("gdp", vis);
    }
  }
  step3() {
    let vis = this;
    vis.currStep = 3;
    // update title
    vis.legendTitle.text("Healthy life expectancy at birth");
    // update map value
    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.healthyLife
    );

    // update range, max & min indicator, helper function, legend value
    let range = d3.extent(
      vis.filteredData,
      (d) => d["Healthy life expectancy at birth"]
    );
    let min = range[0],
      max = range[1];
    if (!vis.cleared) {
      this.indicatorHelper("healthyLife", min, max, vis);
    }
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "#cfe2f2", value: min, offset: 0 },
      { color: "#0d306b", value: max, offset: 100 },
    ];

    // Append world map
    this.worldAppendMapHelper(vis, "healthyLife");
    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let healthyLife;
        if (d.properties.healthyLife === undefined) {
          healthyLife = "N/A";
        } else {
          healthyLife = d.properties.healthyLife;
        }

        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Healthy life expectancy at birth: ${healthyLife}
            `);
      })
      .on("mouseleave", () => {
        d3.select("#map-tooltip").style("display", "none");
      });
    // Add legend labels
    vis.legend
      .selectAll(".legend-label")
      .data(vis.legendStops)
      .join("text")
      .attr("class", "legend-label")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("y", 20)
      .attr("x", (d, index) => {
        return index == 0 ? 0 : vis.config.legendRectWidth;
      })
      .text((d) => Math.round(d.value * 10) / 10);

    // Update gradient for legend
    vis.linearGradient
      .selectAll("stop")
      .data(vis.legendStops)
      .join("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);
    //static dispatcher
    this.staticDispatcherHelper(
      "Healthy life expectancy at birth",
      vis,
      min,
      max,
      3
    );
    //call dispatcherHelper

    if (vis.isClickedOnMap === false) {
      this.dispatcherHelper("healthyLife", vis);
    }
  }
  step4() {
    let vis = this;
    vis.currStep = 4;
    // update title
    vis.legendTitle.text("Freedom to make life choices");
    // update map value
    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.free
    );
    // update range, max & min indicator, helper function, legend value
    let range = d3.extent(
      vis.filteredData,
      (d) => d["Freedom to make life choices"]
    );
    let min = range[0],
      max = range[1];
    if (!vis.cleared) {
      this.indicatorHelper("free", min, max, vis);
    }
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "#cfe2f2", value: min, offset: 0 },
      { color: "#0d306b", value: max, offset: 100 },
    ];

    // Append world map
    this.worldAppendMapHelper(vis, "free");

    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let free;
        if (d.properties.free === undefined) {
          free = "N/A";
        } else {
          free = d.properties.free;
        }
        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Freedom to make life choices: ${free}
            `);
      })
      .on("mouseleave", () => {
        d3.select("#map-tooltip").style("display", "none");
      });
    // Add legend labels
    vis.legend
      .selectAll(".legend-label")
      .data(vis.legendStops)
      .join("text")
      .attr("class", "legend-label")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("y", 20)
      .attr("x", (d, index) => {
        return index == 0 ? 0 : vis.config.legendRectWidth;
      })
      .text((d) => Math.round(d.value * 10) / 10);

    // Update gradient for legend
    vis.linearGradient
      .selectAll("stop")
      .data(vis.legendStops)
      .join("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);
    //static dispatcher
    this.staticDispatcherHelper(
      "Freedom to make life choices",
      vis,
      min,
      max,
      4
    );
    //call dispatcherHelper

    if (vis.isClickedOnMap === false) {
      this.dispatcherHelper("free", vis);
    }
  }
  step5() {
    let vis = this;
    vis.currStep = 5;
    // update title
    vis.legendTitle.text("Perceptions of corruption");
    // update map value
    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.perceptions
    );

    // update range, max & min indicator, helper function, legend value
    let range = d3.extent(
      vis.filteredData,
      (d) => d["Perceptions of corruption"]
    );
    let min = range[0],
      max = range[1];

    if (!vis.cleared) {
      this.indicatorHelper("perceptions", min, max, vis);
    }
    console.log(range);
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "#cfe2f2", value: min, offset: 0 },
      { color: "#0d306b", value: max, offset: 100 },
    ];

    // Append world map
    this.worldAppendMapHelper(vis, "perceptions");
    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let perceptions;
        if (d.properties.perceptions === undefined) {
          perceptions = "N/A";
        } else {
          perceptions = d.properties.perceptions;
        }
        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Perceptions of corruption: ${perceptions}
            `);
      })
      .on("mouseleave", () => {
        d3.select("#map-tooltip").style("display", "none");
      });
    // Add legend labels
    vis.legend
      .selectAll(".legend-label")
      .data(vis.legendStops)
      .join("text")
      .attr("class", "legend-label")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("y", 20)
      .attr("x", (d, index) => {
        return index == 0 ? 0 : vis.config.legendRectWidth;
      })
      .text((d) => Math.round(d.value * 10) / 10);

    // Update gradient for legend
    vis.linearGradient
      .selectAll("stop")
      .data(vis.legendStops)
      .join("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);
    //static dispatcher
    this.staticDispatcherHelper("Perceptions of corruption", vis, min, max, 5);

    //call dispatcherHelper

    if (vis.isClickedOnMap === false) {
      this.dispatcherHelper("perceptions", vis);
    }
  }
  step6() {
    let vis = this;
    vis.currStep = 6;
    // update title
    vis.legendTitle.text("Positive affect");
    // update map value
    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.positive
    );
    // update range, max & min indicator, helper function, legend value

    let range = d3.extent(vis.filteredData, (d) => d["Positive affect"]);
    let min = range[0],
      max = range[1];
    if (!vis.cleared) {
      this.indicatorHelper("positive", min, max, vis);
    }
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "#cfe2f2", value: min, offset: 0 },
      { color: "#0d306b", value: max, offset: 100 },
    ];

    // Append world map
    this.worldAppendMapHelper(vis, "positive");

    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;

        let positive;
        if (d.properties.positive === undefined) {
          positive = "N/A";
        } else {
          positive = d.properties.positive;
        }

        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Positive affect: ${positive}
            `);
      })
      .on("mouseleave", () => {
        d3.select("#map-tooltip").style("display", "none");
      });
    // Add legend labels
    vis.legend
      .selectAll(".legend-label")
      .data(vis.legendStops)
      .join("text")
      .attr("class", "legend-label")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("y", 20)
      .attr("x", (d, index) => {
        return index == 0 ? 0 : vis.config.legendRectWidth;
      })
      .text((d) => Math.round(d.value * 10) / 10);

    // Update gradient for legend
    vis.linearGradient
      .selectAll("stop")
      .data(vis.legendStops)
      .join("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);
    //static dispatcher
    this.staticDispatcherHelper("Positive affect", vis, min, max, 6);
    //call dispatcherHelper

    if (vis.isClickedOnMap === false) {
      this.dispatcherHelper("positive", vis);
    }
  }
  step7() {
    let vis = this;
    vis.currStep = 7;
    // update title
    vis.legendTitle.text("Negative affect");
    // update map value
    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.negative
    );
    // update range, max & min indicator, helper function, legend value
    let range = d3.extent(vis.filteredData, (d) => d["Negative affect"]);
    let min = range[0],
      max = range[1];
    this.indicatorHelper("negative", min, max, vis);
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "#cfe2f2", value: min, offset: 0 },
      { color: "#0d306b", value: max, offset: 100 },
    ];
    // Append world map
    this.worldAppendMapHelper(vis, "negative");

    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let negative;
        if (d.properties.negative === undefined) {
          negative = "N/A";
        } else {
          negative = d.properties.negative;
        }

        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Negative affect: ${negative}
            `);
      })
      .on("mouseleave", () => {
        d3.select("#map-tooltip").style("display", "none");
      });
    // Add legend labels
    vis.legend
      .selectAll(".legend-label")
      .data(vis.legendStops)
      .join("text")
      .attr("class", "legend-label")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("y", 20)
      .attr("x", (d, index) => {
        return index == 0 ? 0 : vis.config.legendRectWidth;
      })
      .text((d) => Math.round(d.value * 10) / 10);

    // Update gradient for legend
    vis.linearGradient
      .selectAll("stop")
      .data(vis.legendStops)
      .join("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);
    //static dispatcher
    this.staticDispatcherHelper("Negative affect", vis, min, max, 7);
    //call dispatcherHelper

    if (vis.isClickedOnMap === false) {
      this.dispatcherHelper("negative", vis);
    }
  }
  step8() {
    let vis = this;
    vis.currStep = 8;
    // update title
    vis.legendTitle.text("Generosity");
    // update map value
    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.generosity
    );
    // update range, max & min indicator, helper function, legend value
    let range = d3.extent(vis.filteredData, (d) => d["Generosity"]);
    let min = range[0],
      max = range[1];
    this.indicatorHelper("generosity", min, max, vis);
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "#cfe2f2", value: min, offset: 0 },
      { color: "#0d306b", value: max, offset: 100 },
    ];
    // Append world map
    this.worldAppendMapHelper(vis, "generosity");
    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;

        let generosity;
        if (d.properties.generosity === undefined) {
          generosity = "N/A";
        } else {
          generosity = d.properties.generosity;
        }
        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Generosity: ${generosity}
            `);
      })
      .on("mouseleave", () => {
        d3.select("#map-tooltip").style("display", "none");
      });
    // Add legend labels
    vis.legend
      .selectAll(".legend-label")
      .data(vis.legendStops)
      .join("text")
      .attr("class", "legend-label")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("y", 20)
      .attr("x", (d, index) => {
        return index == 0 ? 0 : vis.config.legendRectWidth;
      })
      .text((d) => Math.round(d.value * 10) / 10);

    // Update gradient for legend
    vis.linearGradient
      .selectAll("stop")
      .data(vis.legendStops)
      .join("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);
    //static dispatcher
    this.staticDispatcherHelper("Generosity", vis, min, max, 8);
    //call dispatcherHelper

    if (vis.isClickedOnMap === false) {
      this.dispatcherHelper("generosity", vis);
    }
  }
  goToStep(stepIndex) {
    this[this.config.steps[stepIndex]]();
  }

  // Helper function
  indicatorHelper(input, min, max, vis) {
    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      d.properties.isMax = 0;
      d.properties.isMin = 0;
    });
    console.log(vis.geoData);

    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      if (d.properties[input] == max && d.properties.year == vis.currYear) {
        d.properties.isMax = 1;
      } else if (
        d.properties[input] == min &&
        d.properties.year == vis.currYear
      ) {
        d.properties.isMin = 1;
      } else {
        d.properties.isMax = 0;
        d.properties.isMin = 0;
      }
    });
  }

  // helper function for map dispatcher
  dispatcherHelper(inputAttribute, vis) {
    vis.geoJoinPath.on("click", function (event, d) {
      // Check if current category is active and toggle class
      d3.selectAll(".geo-path").attr("fill", (d) =>
        vis.colorScale(d.properties[inputAttribute])
      );

      const isActive = d3.select(this).classed("active");

      d3.select(this).classed("active", !isActive);

      vis.geoData.objects.world_countries.geometries.forEach((d) => {
        if (d.properties.name == this.id) {
          if (d.properties.mapIsClicked == 1) {
            d.properties.mapIsClicked = 0;
            vis.isClickedOnMap = false;
          } else {
            d.properties.mapIsClicked = 1;
            vis.isClickedOnMap = true;
          }
        }
      });

      let selectedCountries = [];
      vis.geoData.objects.world_countries.geometries.forEach((d) => {
        if (d.properties.mapIsClicked) {
          selectedCountries.push(d.properties.name);
        }
      });

      vis.data.forEach((d) => {
        if (selectedCountries.includes(d["Country name"])) {
          d.isSelectedFromMap = 1;
        } else {
          d.isSelectedFromMap = 0;
        }
      });
      // Trigger filter event and pass array with the selected country name
      vis.dispatcher.call(
        "selectedCountry",
        event,
        selectedCountries,
        vis.data
      );
    });
  }

  // helper function for map dispatcher
  staticDispatcherHelper(attrName, vis, min, max, stepNumber) {
    if (vis.isClickedOnMap === true) {
      vis.data.forEach((d) => {
        d.max = -1;
        d.min = -1;
      });
    } else {
      let year = vis.currYear;

      vis.data.forEach((d) => {
        d["stepNumber"] = -1;
        d["stepNumber"] = stepNumber;
        if (d.year == year) {
          if (d[attrName] == max) {
            d.max = 1;
          } else {
            d.max = 0;
          }
          if (d[attrName] == min) {
            d.min = 1;
          } else {
            d.min = 0;
          }
        } else {
          d.max = 0;
          d.min = 0;
        }
      });
    }
    vis.dispatcher.call("staticMap", attrName, vis.data, vis.isClickedOnMap);
  }

  worldAppendMapHelper(vis, attrName) {
    vis.geoJoinPath
      .transition()
      .attr("id", (d) => d.properties.name)
      .attr("d", vis.geoPath)
      .attr("opacity", (d) => {
        if (d.properties[attrName] == undefined) {
          return "0.3";
        }
      })
      .attr("fill", (d) => {
        // console.log(d.properties[attrName]);
        if (d.properties[attrName] == undefined) {
          return "black";
        } else if (vis.isClickedOnMap == false) {
          if (d.properties.isMax == 1) {
            return "#F4CF49";
          } else if (d.properties.isMin == 1) {
            return "#F8E6A5";
          } else {
            return vis.colorScale(d.properties[attrName]);
          }
        } else {
          if (d.properties.mapIsClicked == 0) {
            return vis.colorScale(d.properties[attrName]);
          }
        }
      })
      .attr("class", (d) => {
        if (d.properties[attrName] === undefined) {
          return "geo-path disabled";
        } else {
          if (d.properties.mapIsClicked == 0) {
            return "geo-path";
          } else {
            return "geo-path active";
          }
        }
      });
  }
}
