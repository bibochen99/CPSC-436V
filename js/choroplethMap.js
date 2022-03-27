class ChoroplethMap {
  /**
   * Class constructor with basic configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _geoData, _data, _dispatcher) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 800,
      containerHeight: _config.containerHeight || 300,
      margin: _config.margin || { top: 20, right: 20, bottom: 20, left: 20 },
      tooltipPadding: 10,
      legendBottom: 50,
      legendLeft: 50,
      legendRectHeight: 12,
      legendRectWidth: 150,
      currYear: 2013,
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
    this._dispatcher = _dispatcher;
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
      .attr("height", vis.config.containerHeight);

    // Append group element that will contain our actual chart
    // and position it according to the given margin config
    vis.chart = vis.svg
      .append("g")
      .attr(
        "transform",
        `translate(${vis.config.margin.left},${vis.config.margin.top})`
      );

    // Defines the scale and translate of the projection so that the geometry fits within the SVG area
    // We crop Antartica because it takes up a lot of space that is not needed for our data
    vis.projection = d3
      .geoEquirectangular()
      .center([0, 15]) // set centre to further North
      .scale([vis.width / (2 * Math.PI)]) // scale to fit size of svg group
      .translate([vis.width / 2, vis.height / 2]); // ensure centered within svg group

    vis.geoPath = d3.geoPath().projection(vis.projection);

    // vis.colorScale = d3.scaleOrdinal().range(["#d3eecd", "#7bc77e", "#2a8d46"]); // light green to dark green
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
        `translate(${vis.config.legendLeft},${
          vis.height - vis.config.legendBottom
        })`
      );

    vis.geoJoinPath = vis.chart
      .selectAll(".geo-path")
      .data(
        topojson.feature(vis.geoData, vis.geoData.objects.world_countries)
          .features
      )
      .join("path");

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
        d3.select("p#value-time").text(d3.timeFormat("%Y")(val));
        vis.config.currYear = d3.timeFormat("%Y")(val);
        vis.step0();
      });

    d3.select("div#year-slider")
      .append("svg")
      .attr("width", 550)
      .attr("height", 100)
      .append("g")
      .attr("transform", "translate(30,30)")
      .call(vis.yearSlider);

    // d3.select('p#value-time').text(d3.timeFormat('%Y')(vis.yearSlider.value()));

    vis.step0();
  }

  // filterGeoData(inputYear) {
  //   let vis = this;
  //   // vis.geoData.objects.world_countries.geometries = {};
  //   vis.geoData.objects.world_countries.geometries.forEach((d) => {
  //     for (let i = 0; i < vis.data.length; i++) {
  //       if (d.properties.name == vis.data[i]["Country name"]) {
  //         if (vis.data[i].year === inputYear) {
  //           d.properties.year = vis.data[i]["year"];
  //           d.properties.lifeLadder = vis.data[i]["Life Ladder"];
  //           d.properties.socialSupport = vis.data[i]["Social support"];
  //           d.properties.gdp = vis.data[i]["Log GDP per capita"];
  //           d.properties.healthyLife =
  //             vis.data[i]["Healthy life expectancy at birth"];
  //           d.properties.free = vis.data[i]["Freedom to make life choices"];
  //           d.properties.perceptions = vis.data[i]["Perceptions of corruption"];
  //           d.properties.positive = vis.data[i]["Positive affect"];
  //           d.properties.negative = vis.data[i]["Negative affect"];
  //           d.properties.generosity = vis.data[i]["Generosity"];
  //         }
  //       }
  //     }
  //   });
  // }

  step0() {
    let vis = this;

    vis.legendRect = vis.legend
      .append("rect")
      .attr("width", vis.config.legendRectWidth)
      .attr("height", vis.config.legendRectHeight);

    vis.legendTitle.text("Life Ladder");

    vis.filteredData = vis.data.filter((d) => {
      return d.year == vis.config.currYear;
    });

    vis.geoData.objects.world_countries.geometries.forEach((d) => {
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
          // }
        }
      }
    });

    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.lifeLadder
    );

    let range = d3.extent(vis.filteredData, (d) => d["Life Ladder"]);

    let min = range[0],
      max = range[1];

    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      if (
        d.properties.lifeLadder == max &&
        d.properties.year == vis.config.currYear
      ) {
        d.properties.isMax = 1;
      } else if (d.properties.lifeLadder == min) {
        d.properties.isMin = 1;
      } else {
        d.properties.isMax = 0;
        d.properties.isMin = 0;
      }
    });

    vis.colorScale.domain(vis.mapValue);

    // Define begin and end of the color gradient (legend)
    vis.legendStops = [
      { color: "#cfe2f2", value: min, offset: 0 },
      { color: "#0d306b", value: max, offset: 100 },
    ];

    // Append world map
    vis.geoJoinPath
      .transition()
      .attr("class", "geo-path")
      .attr("id", (d) => d.properties.name)
      .attr("d", vis.geoPath)
      .attr("fill", (d) => {
        if (d.properties.isMax == 1) {
          return "#F4CF49";
        } else if (d.properties.isMin == 1) {
          return "#F8E6A5";
        } else {
          return vis.colorScale(d.properties.lifeLadder);
        }
      });

    //tooltip
    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let ladder = d.properties.lifeLadder ? d.properties.lifeLadder : "N/A";
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

    // console.log(vis.geoData);

    // on click event and dispatcher
    let selectedCategories = [];

    vis.geoJoinPath.on("click", function (event, d) {
      // Check if current category is active and toggle class

      const isActive = d3.select(this).classed("active");

      d3.select(this).classed("active", !isActive);
      if (selectedCategories.length < 5) {
        selectedCategories.push(this.id);
      }
      // console.log(selectedCategories);
      // if (!selectedCategories.includes(this.id)) {
      //   selectedCategories.push(this.id);
      // } else {
      //   selectedCategories = selectedCategories.filter((d) => {
      //     return d !== this.id;
      //   });
      // }

      // // Trigger filter event and pass array with the selected category names
      vis.dispatcher.call("selectMap", event, selectedCategories);
    });
  }

  step1() {
    let vis = this;
    vis.legendTitle.text("Social Support");

    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.socialSupport
    );
    let range = d3.extent(vis.filteredData, (d) => d["Social support"]);
    let min = range[0],
      max = range[1];
    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      d.properties.isMax = 0;
      d.properties.isMin = 0;
    });

    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      if (
        d.properties.socialSupport == max &&
        d.properties.year == vis.config.currYear
      ) {
        d.properties.isMax = 1;
      } else if (d.properties.socialSupport == min) {
        d.properties.isMin = 1;
      } else {
        d.properties.isMax = 0;
        d.properties.isMin = 0;
      }
    });
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "lightgreen", value: min, offset: 0 },
      { color: "green", value: max, offset: 100 },
    ];

    // Append world map
    vis.geoJoinPath
      .transition()
      .attr("d", vis.geoPath)
      .attr("fill", (d) => {
        if (d.properties.isMax == 1) {
          return "#F4CF49";
        } else if (d.properties.isMin == 1) {
          return "#F8E6A5";
        } else {
          return vis.colorScale(d.properties.socialSupport);
        }
      });
    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let ladder = d.properties.socialSupport
          ? d.properties.socialSupport
          : "N/A";
        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Social Support: ${ladder}
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
  }

  step2() {
    let vis = this;
    vis.legendTitle.text("Log GDP per capita");

    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.gdp
    );
    let range = d3.extent(vis.filteredData, (d) => d["Log GDP per capita"]);
    let min = range[0],
      max = range[1];
    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      d.properties.isMax = 0;
      d.properties.isMin = 0;
    });

    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      if (d.properties.gdp == max) {
        d.properties.isMax = 1;
      } else if (d.properties.gdp == min) {
        d.properties.isMin = 1;
      } else {
        d.properties.isMax = 0;
        d.properties.isMin = 0;
      }
    });
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "lightgreen", value: min, offset: 0 },
      { color: "green", value: max, offset: 100 },
    ];

    // Append world map
    vis.geoJoinPath
      .transition()
      .attr("d", vis.geoPath)
      .attr("fill", (d) => {
        if (d.properties.isMax == 1) {
          return "#F4CF49";
        } else if (d.properties.isMin == 1) {
          return "#F8E6A5";
        } else {
          return vis.colorScale(d.properties.gdp);
        }
      });
    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let ladder = d.properties.gdp ? d.properties.gdp : "N/A";
        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Log GDP per capita: ${ladder}
            `);
      })
      .on("mouseleave", () => {
        d3.select("#tooltip").style("display", "none");
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
  }
  step3() {
    let vis = this;
    vis.legendTitle.text("Healthy life expectancy at birth");

    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.healthyLife
    );
    let range = d3.extent(
      vis.filteredData,
      (d) => d["Healthy life expectancy at birth"]
    );
    let min = range[0],
      max = range[1];
    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      d.properties.isMax = 0;
      d.properties.isMin = 0;
    });

    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      if (d.properties.healthyLife == max) {
        d.properties.isMax = 1;
      } else if (d.properties.healthyLife == min) {
        d.properties.isMin = 1;
      } else {
        d.properties.isMax = 0;
        d.properties.isMin = 0;
      }
    });
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "lightgreen", value: min, offset: 0 },
      { color: "green", value: max, offset: 100 },
    ];

    // Append world map
    vis.geoJoinPath
      .transition()
      .attr("d", vis.geoPath)
      .attr("fill", (d) => {
        if (d.properties.isMax == 1) {
          return "#F4CF49";
        } else if (d.properties.isMin == 1) {
          return "#F8E6A5";
        } else {
          return vis.colorScale(d.properties.healthyLife);
        }
      });
    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let ladder = d.properties.healthyLife
          ? d.properties.healthyLife
          : "N/A";
        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Healthy life expectancy at birth: ${ladder}
            `);
      })
      .on("mouseleave", () => {
        d3.select("#tooltip").style("display", "none");
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
  }
  step4() {
    let vis = this;
    vis.legendTitle.text("Freedom to make life choices");

    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.free
    );
    let range = d3.extent(
      vis.filteredData,
      (d) => d["Freedom to make life choices"]
    );
    let min = range[0],
      max = range[1];
    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      d.properties.isMax = 0;
      d.properties.isMin = 0;
    });

    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      if (d.properties.free == max) {
        d.properties.isMax = 1;
      } else if (d.properties.free == min) {
        d.properties.isMin = 1;
      } else {
        d.properties.isMax = 0;
        d.properties.isMin = 0;
      }
    });
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "lightgreen", value: min, offset: 0 },
      { color: "green", value: max, offset: 100 },
    ];

    // Append world map
    vis.geoJoinPath
      .transition()
      .attr("d", vis.geoPath)
      .attr("fill", (d) => {
        if (d.properties.isMax == 1) {
          return "#F4CF49";
        } else if (d.properties.isMin == 1) {
          return "#F8E6A5";
        } else {
          return vis.colorScale(d.properties.free);
        }
      });
    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let ladder = d.properties.free ? d.properties.free : "N/A";
        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Freedom to make life choices: ${ladder}
            `);
      })
      .on("mouseleave", () => {
        d3.select("#tooltip").style("display", "none");
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
  }
  step5() {
    let vis = this;
    vis.legendTitle.text("Perceptions of corruption");

    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.perceptions
    );
    let range = d3.extent(
      vis.filteredData,
      (d) => d["Perceptions of corruption"]
    );
    let min = range[0],
      max = range[1];
    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      d.properties.isMax = 0;
      d.properties.isMin = 0;
    });

    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      if (d.properties.perceptions == max) {
        d.properties.isMax = 1;
      } else if (d.properties.perceptions == min) {
        d.properties.isMin = 1;
      } else {
        d.properties.isMax = 0;
        d.properties.isMin = 0;
      }
    });
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "lightgreen", value: min, offset: 0 },
      { color: "green", value: max, offset: 100 },
    ];

    // Append world map
    vis.geoJoinPath
      .transition()
      .attr("d", vis.geoPath)
      .attr("fill", (d) => {
        if (d.properties.isMax == 1) {
          return "#F4CF49";
        } else if (d.properties.isMin == 1) {
          return "#F8E6A5";
        } else {
          return vis.colorScale(d.properties.perceptions);
        }
      });
    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let ladder;
        if (d.properties.perceptions === undefined) {
          ladder = "N/A";
        } else {
          ladder = d.properties.perceptions;
        }
        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Perceptions of corruption: ${ladder}
            `);
      })
      .on("mouseleave", () => {
        d3.select("#tooltip").style("display", "none");
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
  }
  step6() {
    let vis = this;
    vis.legendTitle.text("Positive affect");

    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.positive
    );
    let range = d3.extent(vis.filteredData, (d) => d["Positive affect"]);
    let min = range[0],
      max = range[1];
    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      d.properties.isMax = 0;
      d.properties.isMin = 0;
    });

    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      if (d.properties.positive == max) {
        d.properties.isMax = 1;
      } else if (d.properties.positive == min) {
        d.properties.isMin = 1;
      } else {
        d.properties.isMax = 0;
        d.properties.isMin = 0;
      }
    });
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "lightgreen", value: min, offset: 0 },
      { color: "green", value: max, offset: 100 },
    ];

    // Append world map
    vis.geoJoinPath
      .transition()
      .attr("d", vis.geoPath)
      .attr("fill", (d) => {
        if (d.properties.isMax == 1) {
          return "#F4CF49";
        } else if (d.properties.isMin == 1) {
          return "#F8E6A5";
        } else {
          return vis.colorScale(d.properties.positive);
        }
      });
    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let ladder = d.properties.positive ? d.properties.positive : "N/A";
        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Positive affect: ${ladder}
            `);
      })
      .on("mouseleave", () => {
        d3.select("#tooltip").style("display", "none");
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
  }
  step7() {
    let vis = this;
    vis.legendTitle.text("Negative affect");

    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.negative
    );
    let range = d3.extent(vis.filteredData, (d) => d["Negative affect"]);
    let min = range[0],
      max = range[1];
    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      d.properties.isMax = 0;
      d.properties.isMin = 0;
    });

    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      if (d.properties.negative == max) {
        d.properties.isMax = 1;
      } else if (d.properties.negative == min) {
        d.properties.isMin = 1;
      } else {
        d.properties.isMax = 0;
        d.properties.isMin = 0;
      }
    });
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "lightgreen", value: min, offset: 0 },
      { color: "green", value: max, offset: 100 },
    ];

    // Append world map
    vis.geoJoinPath
      .transition()
      .attr("d", vis.geoPath)
      .attr("fill", (d) => {
        if (d.properties.isMax == 1) {
          return "#F4CF49";
        } else if (d.properties.isMin == 1) {
          return "#F8E6A5";
        } else {
          return vis.colorScale(d.properties.negative);
        }
      });
    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let ladder = d.properties.negative ? d.properties.negative : "N/A";
        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Negative affect: ${ladder}
            `);
      })
      .on("mouseleave", () => {
        d3.select("#tooltip").style("display", "none");
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
  }
  step8() {
    let vis = this;
    vis.legendTitle.text("Generosity");

    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.generosity
    );
    let range = d3.extent(vis.filteredData, (d) => d["Generosity"]);
    let min = range[0],
      max = range[1];
    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      d.properties.isMax = 0;
      d.properties.isMin = 0;
    });

    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      if (d.properties.generosity == max) {
        d.properties.isMax = 1;
      } else if (d.properties.generosity == min) {
        d.properties.isMin = 1;
      } else {
        d.properties.isMax = 0;
        d.properties.isMin = 0;
      }
    });
    vis.colorScale.domain(vis.mapValue);
    vis.legendStops = [
      { color: "lightgreen", value: min, offset: 0 },
      { color: "green", value: max, offset: 100 },
    ];

    // Append world map
    vis.geoJoinPath
      .transition()
      .attr("d", vis.geoPath)
      .attr("fill", (d) => {
        if (d.properties.isMax == 1) {
          return "#F4CF49";
        } else if (d.properties.isMin == 1) {
          return "#F8E6A5";
        } else {
          return vis.colorScale(d.properties.generosity);
        }
      });
    vis.geoJoinPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let ladder = d.properties.generosity ? d.properties.generosity : "N/A";
        d3
          .select("#map-tooltip")
          .style("display", "block")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
            <div class="tooltip-title">${name}</div>
            Generosity: ${ladder}
            `);
      })
      .on("mouseleave", () => {
        d3.select("#tooltip").style("display", "none");
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
  }

  goToStep(stepIndex) {
    this[this.config.steps[stepIndex]]();
  }
}
