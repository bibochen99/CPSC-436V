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

    vis.symbolScale = d3.scaleSqrt().range([4, 25]);

    // vis.colorScale = d3.scaleLinear()
    //     .range(['#cfe2f2', '#0d306b'])
    //     .interpolate(d3.interpolateHcl);

    // Initialize gradient that we will later use for the legend
    // vis.linearGradient = vis.svg.append('defs').append('linearGradient')
    //     .attr("id", "legend-gradient");

    // Append legend
    // vis.legend = vis.chart.append('g')
    //     .attr('class', 'legend')
    //     .attr('transform', `translate(${vis.config.legendLeft},${vis.height - vis.config.legendBottom})`);

    // vis.legendRect = vis.legend.append('rect')
    //     .attr('width', vis.config.legendRectWidth)
    //     .attr('height', vis.config.legendRectHeight);

    // vis.legendTitle = vis.legend.append('text')
    //     .attr('class', 'legend-title')
    //     .attr('dy', '.35em')
    //     .attr('y', -10)
    //     .text('Pop. density per square km')

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    // const popDensityExtent = d3.extent(vis.data.objects.collection.geometries, d => d.properties.pop_density);

    // Update color scale
    // vis.colorScale.domain(popDensityExtent);

    // Define begin and end of the color gradient (legend)
    // vis.legendStops = [
    //   { color: '#cfe2f2', value: popDensityExtent[0], offset: 0},
    //   { color: '#0d306b', value: popDensityExtent[1], offset: 100},
    // ];
    vis.symbolScale.domain(d3.extent(vis.data, (d) => d["Life Ladder"]));
    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    // Convert compressed TopoJSON to GeoJSON format
    // const countries = topojson.feature(vis.geoData);

    // Defines the scale of the projection so that the geometry fits within the SVG area
    // vis.projection.fitSize([vis.width, vis.height], countries);

    // Append world map
    const geoPath = vis.chart
      .selectAll(".geo-path")
      .data(
        topojson.feature(vis.geoData, vis.geoData.objects.world_countries)
          .features
      )
      .join("path")
      .attr("class", "geo-path")
      .attr("d", vis.geoPath);

    // // Append country borders
    // const geoBoundaryPath = vis.chart
    //   .selectAll(".geo-boundary-path")
    //   .data([topojson.mesh(vis.geoData, vis.geoData.objects.countries)])
    //   .join("path")
    //   .attr("class", "geo-boundary-path")
    //   .attr("d", vis.geoPath);

    //tooltip
    geoPath
      .on("mousemove", (event, d) => {
        let name = d.properties.name;
        let ladder = d.properties.lifeLadder ?d.properties.lifeLadder:"N/A";
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
    // vis.legend
    //   .selectAll(".legend-label")
    //   .data(vis.legendStops)
    //   .join("text")
    //   .attr("class", "legend-label")
    //   .attr("text-anchor", "middle")
    //   .attr("dy", ".35em")
    //   .attr("y", 20)
    //   .attr("x", (d, index) => {
    //     return index == 0 ? 0 : vis.config.legendRectWidth;
    //   })
    //   .text((d) => Math.round(d.value * 10) / 10);

    // // Update gradient for legend
    // vis.linearGradient
    //   .selectAll("stop")
    //   .data(vis.legendStops)
    //   .join("stop")
    //   .attr("offset", (d) => d.offset)
    //   .attr("stop-color", (d) => d.color);

    // vis.legendRect.attr("fill", "url(#legend-gradient)");
  }
}
