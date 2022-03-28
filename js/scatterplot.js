class Scatterplot {

    /**
     * Class constructor with basic chart configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data,_dispatcher, _xAttr,_currYear) {
      this.config = {
        parentElement: _config.parentElement,
        containerWidth: _config.containerWidth || 400,
        containerHeight: _config.containerHeight || 240,
        margin: _config.margin || {top: 25, right: 20, bottom: 20, left: 35},
        tooltipPadding: _config.tooltipPadding || 15
      }
      this.Data = _data;
      this.dispatcher = _dispatcher;
      this.xAttr = _xAttr;
      this.currYear = _currYear;
      this.initVis();
    }
    
    /**
     * We initialize scales/axes and append static elements, such as axis titles.
     */
    initVis() {
      let vis = this;
  
      // Calculate inner chart size. Margin specifies the space around the actual chart.
      vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
      vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;
  
      vis.xScale = d3.scaleLinear()
          .range([0, vis.width]);
  
      vis.yScale = d3.scaleLinear()
          .range([vis.height, 0]);
  
      // Initialize axes
      vis.xAxis = d3.axisBottom(vis.xScale)
          .ticks(8)
          .tickSize(-vis.height - 10)
          .tickPadding(10)
          .tickFormat(d => d)
          .tickSizeOuter(0);
  
      vis.yAxis = d3.axisLeft(vis.yScale)
          .ticks(8)
          .tickSize(-vis.width - 10)
          .tickPadding(10)
          .tickSizeOuter(0);
  
      // Define size of SVG drawing area
      vis.svg = d3.select(vis.config.parentElement)
          .attr('width', vis.config.containerWidth)
          .attr('height', vis.config.containerHeight);
  
      // Append group element that will contain our actual chart 
      // and position it according to the given margin config
      vis.chart = vis.svg.append('g')
          .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
  
      // Append empty x-axis group and move it to the bottom of the chart
      vis.xAxisG = vis.chart.append('g')
          .attr('class', 'axis x-axis')
          .attr('transform', `translate(0,${vis.height})`);
      
      // Append y-axis group
      vis.yAxisG = vis.chart.append('g')
          .attr('class', 'axis y-axis');
  
      // Append both axis titles
      vis.xLabel = vis.chart.append('text')
          .attr('class', 'axis-title')
          .attr('y', vis.height - 15)
          .attr('x', vis.width + 10)
          .attr('dy', '.71em')
          .style('text-anchor', 'end')
          .text(vis.xAttr);
  
      vis.svg.append('text')
          .attr('class', 'axis-title')
          .attr('x', 0)
          .attr('y', 0)
          .attr('dy', '.71em')
          .text('Life Ladders');
    }
  
    /**
     * Prepare the data and scales before we render it.
     */
    updateVis() {
      let vis = this;

      //Filter the data in the given year
      vis.data = vis.Data.filter((d) => {
        return d.year == vis.currYear;
      });
      // Specificy accessor functions
      vis.xValue = d => d[vis.xAttr];
      vis.yValue = d => d["Life Ladder"];
  
      // Set the scale input domains
      vis.xScale.domain([d3.min(vis.data, vis.xValue)>0? 0:d3.min(vis.data, vis.xValue), d3.max(vis.data, vis.xValue)]);
      vis.yScale.domain([d3.min(vis.data, vis.yValue)>0? 0:d3.min(vis.data, vis.yValue), d3.max(vis.data, vis.yValue)]);

      vis.xLabel.text(vis.xAttr);
  
      vis.renderVis();
    }
  
    /**
     * Bind data to visual elements.
     */
    renderVis() {
      let vis = this;

      // Add circles
      const circles = vis.chart.selectAll('.scatter-plot')
          .data(vis.data)
        .join('circle')
          .attr('class', 'scatter-plot')
          .attr('r', 4)
          .attr('cy', d => vis.yScale(vis.yValue(d)))
          .attr('cx', d => vis.xScale(vis.xValue(d)))
          .attr('stroke','blue')
          .attr('fill','lightblue')
          .classed("selected", d => {
            if(d.select == true){
              return true;
            }else{
              return false;
            }
          });

      let selectedCountry = [];
      vis.data.forEach((d) => {
        if(d.select){
          selectedCountry.push(d["Country name"]);
        }
      })
      // Tooltip event listeners
      circles
          .on('mouseover', (event,d) => {
            d3.select('#scatterplot-tooltip')
              .style('display', 'block')
              .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
              .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
              .html(`
                <div class="tooltip-title">${d["Country name"]}</div>
                <ul>
                  <li>Life Ladder: ${d["Life Ladder"]} </li>
                </ul>
              `);
          })
          .on('click', function(event, d) {
            if (!d.select) {
              d3.select(this).classed('selected', true);
              d.select = true;
              selectedCountry.push(d["Country name"]);
            } else {
              d3.select(this).classed('selected', false);
              d.select = false;
            }
            vis.dispatcher.call('selectedCountry',event,selectedCountry);
          })
          .on('mouseleave', () => {
            d3.select('#scatterplot-tooltip').style('display', 'none');
          });
      
      // Update the axes/gridlines
      vis.xAxisG.call(vis.xAxis);
      vis.yAxisG.call(vis.yAxis);
    }
  }