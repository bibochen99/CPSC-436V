class ChoroplethMap {
  /**
   * Class constructor with basic configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _geoData, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 800,
      containerHeight: _config.containerHeight || 300,
      margin: _config.margin || { top: 0, right: 0, bottom: 0, left: 0 },
      tooltipPadding: 10,
      legendBottom: 50,
      legendLeft: 50,
      legendRectHeight: 12,
      legendRectWidth: 150,
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

    vis.step0();
  }

  step0() {
    let vis = this;

    vis.legendRect = vis.legend
      .append("rect")
      .attr("width", vis.config.legendRectWidth)
      .attr("height", vis.config.legendRectHeight);

    vis.legendTitle.text("Life Ladder");

    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.lifeLadder
    );

    let range = d3.extent(vis.data, (d) => d["Life Ladder"]);
    let min = range[0],
      max = range[1];

    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      if (d.properties.lifeLadder == max) {
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

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    // Append world map
    vis.geoJoinPath
      .transition()
      .attr("class", "geo-path")
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
          <ul>
          <li>Life Ladder: ${ladder}</li>

        </ul>
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

  step1() {
    let vis = this;
    vis.legendTitle.text("Social Support");

    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.socialSupport
    );
    let range = d3.extent(vis.data, (d) => d["Social support"]);
    let min = range[0],
      max = range[1];
    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      d.properties.isMax = 0;
      d.properties.isMin = 0;
    });

    vis.geoData.objects.world_countries.geometries.forEach((d) => {
      if (d.properties.socialSupport == max) {
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
            <ul>
            <li>Social Support: ${ladder}</li>
  
          </ul>
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

  step2() {
    let vis = this;
    vis.legendTitle.text("Log GDP per capita");

    vis.mapValue = d3.extent(
      vis.geoData.objects.world_countries.geometries,
      (d) => d.properties.gdp
    );
    let range = d3.extent(vis.data, (d) => d["Log GDP per capita"]);
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
            <ul>
            <li>Log GDP per capita: ${ladder}</li>
  
          </ul>
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
      vis.data,
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
            <ul>
            <li>Healthy life expectancy at birth: ${ladder}</li>
  
          </ul>
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
    let range = d3.extent(vis.data, (d) => d["Freedom to make life choices"]);
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
            <ul>
            <li>Freedom to make life choices: ${ladder}</li>
  
          </ul>
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
    let range = d3.extent(vis.data, (d) => d["Perceptions of corruption"]);
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
            <ul>
            <li>Perceptions of corruption: ${ladder}</li>
  
          </ul>
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
    let range = d3.extent(vis.data, (d) => d["Positive affect"]);
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
            <ul>
            <li>Positive affect: ${ladder}</li>
  
          </ul>
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
    let range = d3.extent(vis.data, (d) => d["Negative affect"]);
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
            <ul>
            <li>Negative affect: ${ladder}</li>
  
          </ul>
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
    let range = d3.extent(vis.data, (d) => d["Generosity"]);
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
            <ul>
            <li>Generosity: ${ladder}</li>
  
          </ul>
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
