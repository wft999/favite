odoo.define('padtool.Canvas', function (require) {
"use strict";
var Class = require('web.Class');

var Line = fabric.util.createClass(fabric.Line, {
    selectable: false,
    originX:"left",
	originY:"top",
	fill: 'red',
    stroke: 'red',
    initialize: function(points,options) {
    	this.callSuper('initialize',points, options);
    	this.pad = options.pad || '';
    },

	_render: function(ctx) {
		this.strokeWidth = Math.round(1/this.canvas.getZoom());
		this.callSuper('_render', ctx);
    }
  });

var Rect = fabric.util.createClass(fabric.Rect, {
	hasBorders:false,
	hasRotatingPoint:false,
	transparentCorners: false,
	fill: false,
    stroke: 'yellow',
    cornerSize:5,
    hoverCursor:"move",
//  lockMovementX:true,
//	lockMovementY:true,
	hasControls: false,
    initialize: function(options) {
    	this.callSuper('initialize',options);
    	this.pad = options.pad || '';
    },

	_render: function(ctx) {
		this.strokeWidth = Math.round(1/this.canvas.getZoom());
		this.callSuper('_render', ctx);
    }
  });

var Cross = fabric.util.createClass(fabric.Object, {
	type:'cross',
    objectCaching: false,
    fill:false,
	hasControls: false,
	borderColor: 'red',
	originX:"center",
	originY:"center",
	hoverCursor:"move",
//	lockMovementX:true,
//	lockMovementY:true,
    initialize: function(options) {
    	this.callSuper('initialize', options);
    },

	_render: function(ctx) {
		this.width = 10/this.canvas.getZoom(),
		this.height = 10/this.canvas.getZoom(),
		
		ctx.beginPath(); 
		ctx.lineWidth= Math.round(2/this.canvas.getZoom())+"";
		ctx.strokeStyle="yellow"; 
		ctx.moveTo(-this.width/2,0);
		ctx.lineTo(this.width/2,0);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(0,-this.height/2);
		ctx.lineTo(0,this.height/2); 
		ctx.stroke(); 
		
    },
    mouseMove: function(){
    	var modefy;
    	if(this.inner){
    		if(this.left>= this.inner[0].left && this.left<= this.inner[1].left){
    			this.left = this == this.inner[0].outer[0]?(this.inner[0].left - 10):(this.inner[1].left + 10);
    			modefy = true;
    		}
    		if(this.top>= this.inner[1].top && this.top<= this.inner[0].top){
    			this.top = this == this.inner[0].outer[0]?(this.inner[0].top + 10):(this.inner[1].top - 10);
    			modefy = true;
    		}
    		if(modefy){
    			this.setCoords();
    			return;
    		}	
    	}else if(this.outer){
    		if(this.left>= this.outer[1].left || this.left<= this.outer[0].left){
    			this.left = this == this.outer[0].inner[0]?(this.outer[0].left + 10):(this.outer[1].left - 10);
    			modefy = true;
    		}
    		if(this.top<= this.outer[1].top || this.top>= this.outer[0].top){
    			this.top = this == this.outer[0].inner[0]?(this.outer[0].top - 10):(this.outer[1].top + 10);
    			modefy = true;
    		}
    		if(modefy){
    			this.setCoords();
    			return;
    		}		
    	}
    	
		if(this.line1&&this.line2 && this.line3&&this.line4){
			this.line1.set({ 'x1': this.left, 'y1': this.top });
        	this.line1.set({ 'x2': this.left});	 
        	this.line1.setCoords();
        	
        	this.line2.set({ 'x1': this.left, 'y1': this.top });
        	this.line2.set({ 'y2': this.top });
        	this.line2.setCoords();
        	
	    	this.line3.set({ 'y2': this.top});
	    	this.line4.set({ 'x2': this.left});
		    this.line3.setCoords();
		    this.line4.setCoords();
		}else{
			this.line1.set({ 'x2': this.left, 'y2': this.top });
        	this.line1.setCoords();
        	this.line2.set({ 'x1': this.left, 'y1': this.top });
        	this.line2.setCoords();
    	}
	}
  });

var Hawkeye = fabric.util.createClass(fabric.Object, {
	
    objectCaching: false,
	hasControls: false,
	hasBorders:false,
	visible:false,
	originX:"center",
	originY:"center",
	
    initialize: function(options) {
    	this.callSuper('initialize', options);
    	this.width = options&&options.width||50;
    	this.height = options&&options.height||50;
    },

	_render: function(ctx) {
		this.width = 50/this.canvas.getZoom(),
		this.height = 50/this.canvas.getZoom(),
		
		ctx.beginPath(); 
		ctx.lineWidth= Math.round(2/this.canvas.getZoom())+"";
		ctx.strokeStyle="yellow"; 
		ctx.moveTo(-this.width/2,0);
		ctx.lineTo(this.width/2,0);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(0,-this.height/2);
		ctx.lineTo(0,this.height/2); 
		ctx.stroke(); 

		ctx.fillStyle = '#4FC3F7';
		ctx.globalAlpha = 0.3;
		ctx.beginPath();
		ctx.arc(0,0,this.width/2,0,Math.PI * 2, false);
		ctx.fill();
    }
  });

var MyRect = Class.extend({
	init: function(map,pad,points){
		if(points.length != 2)
			return;
		
		var wh = 10/map.getZoom();

 		var line1 = new Line([points[0].x,points[0].y,points[0].x,points[1].y],{pad});
 		var line2 = new Line([points[0].x,points[0].y,points[1].x,points[0].y],{pad});
 		var line3 = new Line([points[1].x,points[1].y,points[1].x,points[0].y],{pad});
 		var line4 = new Line([points[1].x,points[1].y,points[0].x,points[1].y],{pad});
 		
 		this.cross1 = new Cross({ top: points[0].y, left: points[0].x,pad:pad,width:wh,height:wh});
 		this.cross2 = new Cross({ top: points[1].y, left: points[1].x,pad:pad,width:wh,height:wh});
 		
 		this.cross1.line1 = line1;
 		this.cross1.line2 = line2;
 		this.cross1.line3 = line3;
 		this.cross1.line4 = line4;
 		
 		this.cross2.line1 = line3;
 		this.cross2.line2 = line4;
 		this.cross2.line3 = line1;
 		this.cross2.line4 = line2;
 		map.add(line1,line2,line3,line4,this.cross1,this.cross2); 
	},
	
	
});

var MyPolyline = Class.extend({
	init: function(map,pad){
		this.map = map;
		this.pad = pad;
		this.points = new Array();
		this.crosses = new Array();
		this.lines = new Array();
	},
	addPoint:function(point){
		this.points.push(point);
		this._render();
	},
	removePoint:function(id){
		if(id >= this.points.length)
			return;
		
		this.points.splice(id);
		this._render();
	},
	_clear:function(){
		var self = this;
		while(this.crosses.length)
		{
			var cross = this.crosses.pop()
			this.map.remove(cross);
		}
		while(this.lines.length)
		{
			var line = this.lines.pop()
			this.map.remove(line);
		}
		
	},
	_render: function(){
		this._clear();
		
		var wh = 10/this.map.getZoom();
		for(var i = 0; i < this.points.length; i++){
			var cross = new Cross({ top: this.points[i].y, left: this.points[i].x,pad:this.pad,width:wh,height:wh});
			this.crosses.push(cross);
			this.map.add(cross);
			
			if(i == 0 && this.points.length > 2){
				var line = new Line([this.points[this.points.length-1].x,this.points[this.points.length-1].y,this.points[i].x,this.points[i].y],{pad:this.pad});
				this.lines.push(line);
				this.map.add(line);
			}
			else if(i > 0){
				var line = new Line([this.points[i-1].x,this.points[i-1].y,this.points[i].x,this.points[i].y],{pad:this.pad});
				this.lines.push(line);
				this.map.add(line);
				
				this.crosses[i-1].line2 = line;
				this.crosses[i].line1 = line;
			}
			
			if(i == this.points.length -1 && i > 1){
				this.crosses[0].line1 = this.lines[0];
				this.crosses[i].line2 = this.lines[0];
			}
		}
	}
});

return {
	Cross,
	Hawkeye,
	Rect,
	MyRect,
	MyPolyline
};

});