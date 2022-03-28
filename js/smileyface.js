class Smileyface {

  constructor(_config,_data,_year) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 500,
      containerHeight: _config.containerHeight || 300,
      margin: _config.margin || {top: 25, right: 20, bottom: 20, left: 20}
    }
    this.Data = _data;
    this.currYear = _year;
    this.initVis();
  }

  initVis() {
    let vis = this;
    vis.width = 20;
    vis.height = 20;
    vis.eyeSpacing = 5;
    vis.eyeOffset = -3;
    vis.eyeRadius = 2;

    vis.svg = d3.select(vis.config.parentElement)
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);
    vis.updateVis();
  }

  updateVis(){
    let vis = this;
    vis.data = vis.Data.filter((d) => {
      return d.year == vis.currYear;
    });
    vis.selectedCountry = [];
    vis.data.forEach((d) => {
      if(d.display){
        vis.selectedCountry.push(d["Life Ladder"]);
      }
    })
    for(let j= 1; j<= vis.selectedCountry.length;j++){
      for(let i = 1; i<=5; i++){
        this.g = this.svg.append('g')
          .attr('transform', `translate(${this.width*i}, ${this.height*j})`);
          
        var grad = this.g.append("defs")
          .append("linearGradient").attr("id", "grad")
          .attr("x1", "0%")
          .attr("x2", "100%")
          .attr("y1", "0%")
          .attr("y2", "0%");
        
        grad.append("stop").attr("offset", "50%").style("stop-color", "lightblue");
        grad.append("stop").attr("offset", "50%").style("stop-color", "white");
        
        this.circle = this.g.append('circle')
          .attr('r', this.height / 2)
          .attr('stroke', 'black')
          .attr('fill','url(#grad)');
          
        this.eyesG = this.g
          .append('g')
          .attr('transform', `translate(0, ${this.eyeOffset})`);
          
        this.leftEye = this.eyesG
          .append('circle')
          .attr('r', this.eyeRadius)
          .attr('cx', -this.eyeSpacing);
          
        this.rightEye = this.eyesG
          .append('circle')
          .attr('r', this.eyeRadius)
          .attr('cx', this.eyeSpacing);
          
        this.mouth = this.g
          .append('path')
          .attr('d', d3.arc()({
            innerRadius: 1,
            outerRadius: 3,
            startAngle: Math.PI / 2,
            endAngle: Math.PI * 3 / 2
          }));

      }
    }
  }
}
