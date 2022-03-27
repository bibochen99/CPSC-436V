class Smileyface {

  constructor(_config,_x, _y) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 500,
      containerHeight: _config.containerHeight || 300,
      margin: _config.margin || {top: 25, right: 20, bottom: 20, left: 20}
    }
    this.width = _x;
    this.height = _y;
    this.eyeSpacing = 5;
    this.eyeOffset = -3;
    this.eyeRadius = 2;
    this.initvis();
  }

  initvis() {
    this.svg = d3.select(this.config.parentElement)
      .attr('width', this.config.containerWidth)
      .attr('height', this.config.containerHeight);

    for(let j= 1; j<=5;j++){
    for(let i = 1; i<=5; i++){
    this.g = this.svg.append('g')
      .attr('transform', `translate(${this.width*i}, ${this.height*j})`);


    var grad = this.g.append("defs").append("linearGradient").attr("id", "grad")
      .attr("x1", "0%").attr("x2", "100%").attr("y1", "0%").attr("y2", "0%");
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
