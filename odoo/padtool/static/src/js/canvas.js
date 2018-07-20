odoo.define('padtool.Canvas', function (require) {
"use strict";

var Class = require('web.Class');

var Line = fabric.util.createClass(fabric.Line, {
    selectable: false,
    originX:"left",
	originY:"top",
	fill: 'yellow',
    stroke: 'yellow',
    initialize: function(points,options) {
    	this.callSuper('initialize',points, options);
    	this.padType = options.padType || '';
    },

	_render: function(ctx) {
		this.strokeWidth = Math.round(1/this.canvas.getZoom());
		this.callSuper('_render', ctx);
    }
  });

var Rect = fabric.util.createClass(fabric.Rect, {
//	hasBorders:false,
	hasRotatingPoint:false,
	transparentCorners: false,
	fill: false,
    stroke: 'yellow',
    cornerSize:5,
    //hoverCursor:"move",
    lockMovementX:true,
	lockMovementY:true,
	hasControls: false,
    initialize: function(options) {
    	this.callSuper('initialize',options);
    	this.padType = options.padType || '';
    },

	_render: function(ctx) {
		ctx.lineWidth= Math.round(1/(this.canvas.getZoom()*this.scaleX));
		this.callSuper('_render', ctx);
    }
  });

var Goa = fabric.util.createClass(fabric.Object, {
	type:'goa',
    fill:false,
    hasBorders:false,
    transparentCorners: false,
    cornerSize:5,
	originX:"center",
	originY:"center",
	//hoverCursor:"move",
	lockMovementX:true,
	lockMovementY:true,
	hasControls: false,
	
	period:20,
	number:5,
	width:100,
	height:100,
    initialize: function(options) {
    	this.callSuper('initialize', options);
    	this.polyline = options.polyline || null;
    	this.padType = options.padType || null;
    },

	_render: function(ctx) {	
		//this.strokeWidth = Math.round(1/this.canvas.getZoom()*this.scaleX*this.scaleY);
		ctx.strokeStyle="red"; 
		ctx.lineWidth= 1/(this.canvas.getZoom()*this.scaleY);
		
		ctx.beginPath(); 
		ctx.moveTo(-this.width/2,-this.height/2);
		ctx.lineTo(-this.width/2,this.height/2);
		ctx.stroke();

		
		ctx.lineWidth= 1/(this.canvas.getZoom()*this.scaleY);
		ctx.beginPath(); 
		ctx.moveTo(-this.width/2,-this.height/2);
		ctx.lineTo(this.width/2,-this.height/2);
		ctx.stroke();
		
		var i;
		ctx.strokeStyle="yellow";
		for(i =1; i < this.number; i++){
			ctx.beginPath(); 
			ctx.moveTo(-this.width/2,-this.height/2+i*this.period);
			ctx.lineTo(this.width/2,-this.height/2+i*this.period);
			ctx.stroke();
		}
		
		ctx.strokeStyle="red";
		ctx.beginPath(); 
		ctx.moveTo(-this.width/2,-this.height/2+i*this.period);
		ctx.lineTo(this.width/2,-this.height/2+i*this.period);
		ctx.stroke();
		
    },
});

var Cross = fabric.util.createClass(fabric.Object, {
	type:'cross',
    objectCaching: true,
    fill:false,
	hasControls: false,
	borderColor: 'red',
	originX:"center",
	originY:"center",
	//hoverCursor:"move",
	lockMovementX:true,
	lockMovementY:true,
//	visible:false,
	stroke:"yellow",
    initialize: function(options) {
    	this.callSuper('initialize', options);
    	this.polyline = options.polyline || null;
    	this.padType = options.padType || null;
    	this.id = options.id;
    	
    	this.animDirection = 'up';
        this.w=10;
    },

	_render: function(ctx) {
		this.width = this.w/this.canvas.getZoom(),
		this.height = this.w/this.canvas.getZoom(),
		
		ctx.beginPath(); 
		ctx.lineWidth= Math.round(2/this.canvas.getZoom());
		//ctx.strokeStyle="yellow"; 
		ctx.moveTo(-this.width/2,0);
		ctx.lineTo(this.width/2,0);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(0,-this.height/2);
		ctx.lineTo(0,this.height/2); 
		ctx.stroke(); 
		
    },
    animateColor: function(){
    	this.stroke = this.stroke == "yellow"?"red":"yellow";
    },
    animateWidthHeight: function() {
        var interval = 1;

        if (this.w >= 5 && this.w <= 20) {
          var actualInterval = (this.animDirection === 'up' ? interval : -interval);
          this.w += actualInterval;
        }

        if (this.w >= 20) {
          this.animDirection = 'down';
          this.w -= interval;
        }
        if (this.w <= 5) {
          this.animDirection = 'up';
          this.w += interval;
        }
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
    	
    	this.polyline.points[this.id].x = this.left;
    	this.polyline.points[this.id].y = this.top;
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
			if(this.line1){
				this.line1.set({ 'x2': this.left, 'y2': this.top });
	        	this.line1.setCoords();
			}
			if(this.line2){
				this.line2.set({ 'x1': this.left, 'y1': this.top });
	        	this.line2.setCoords();
			}
    	}
	}
  });

var Hawkeye = fabric.util.createClass(fabric.Object, {
	type:'hawkeye',
	hasRotatingPoint:false,
	transparentCorners: false,
    objectCaching: false,
	//hasControls: false,
	hasBorders:false,
	visible:false,
	originX:"center",
	originY:"center",
	cornerSize:5,
	hoverCursor:'move',
	
    initialize: function(options) {
    	this.callSuper('initialize', options);
    	this.width = options&&options.width||50;
    	this.height = options&&options.height||50;
    },

	_render: function(ctx) {
		//this.width = 50/this.canvas.getZoom(),
		//this.height = 50/this.canvas.getZoom(),
/*		
		ctx.beginPath(); 
		ctx.lineWidth=  1/(this.canvas.getZoom()*this.scaleY);
		ctx.strokeStyle="yellow"; 
		ctx.moveTo(-this.width/2,0);
		ctx.lineTo(this.width/2,0);
		ctx.stroke();

		ctx.beginPath();
		ctx.lineWidth=  1/(this.canvas.getZoom()*this.scaleX);
		ctx.moveTo(0,-this.height/2);
		ctx.lineTo(0,this.height/2); 
		ctx.stroke(); */

		ctx.fillStyle = '#4FC3F7';
		ctx.globalAlpha = 0.3;
		//ctx.beginPath();
		ctx.fillRect(-this.width/2,-this.height/2,this.width,this.height);
		//ctx.arc(0,0,this.width/2,0,Math.PI * 2, false);
		//ctx.fill();
    }
  });

var MyRect = Class.extend({
	init: function(map,padType,points){
		if(points.length != 2)
			return;
		
		var wh = 10/map.getZoom();

 		var line1 = new Line([points[0].x,points[0].y,points[0].x,points[1].y],{padType});
 		var line2 = new Line([points[0].x,points[0].y,points[1].x,points[0].y],{padType});
 		var line3 = new Line([points[1].x,points[1].y,points[1].x,points[0].y],{padType});
 		var line4 = new Line([points[1].x,points[1].y,points[0].x,points[1].y],{padType});
 		
 		this.cross1 = new Cross({ 
 			top: points[0].y, 
 			left: points[0].x,
 			padType:padType,
 			width:wh,
 			height:wh,
 			lockMovementX:false,
 			lockMovementY:false,
 			polyline:this,
 			});
 		this.cross2 = new Cross({ 
 			top: points[1].y, 
 			left: points[1].x,
 			padType:padType,
 			width:wh,
 			height:wh,
 			lockMovementX:false,
 			lockMovementY:false,
 			polyline:this,
 			});
 		
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
	init: function(map,padType){
		this.map = map;
		this.padType = padType;
		this.points = new Array();
		this.crosses = new Array();
		this.lines = new Array();
	},
	
	addPoint:function(point){
		if(this.points.length >= 3 && this._checkIntersection(point)){
			/*Dialog.alert(this, _t("Please enter valid point!"));
			new CrashManager().show_warning({data: {
                exception_type: _t("Incorrect Operation"),
                message: _t("You cannot mix items from receivable and payable accounts.")
            }});*/
			return false;
		}
		this.points.push(point);
		this._render();
		this.map.setActiveObject(this.crosses[this.crosses.length -1]);
		return true;
	},
	removePoint:function(id){
		if(id >= this.points.length)
			return;
		
		this.points.splice(id,1);
		this._render();
	},
	
	_checkIntersection:function(point){
		var length = this.points.length,
        a1,a2,b1, b2, inter, i;
		
		for (i = 0; i < length-1; i++) {
			a1 = point;
			b1 = this.points[i];
			b2 = this.points[i + 1];
			if(i==0){
				a2 = this.points[length-1];
				inter = fabric.Intersection.intersectLineLine(a1, a2, b1, b2);
				if(inter.points.length>0)
					return true;
			}else if(i==length-2){
				a2 = this.points[0];
				inter = fabric.Intersection.intersectLineLine(a1, a2, b1, b2);
				if(inter.points.length>0)
					return true;
			}else{
				a2 = this.points[0];
				inter = fabric.Intersection.intersectLineLine(a1, a2, b1, b2);
				if(inter.points.length>0)
					return true;
				
				a2 = this.points[length-1];
				inter = fabric.Intersection.intersectLineLine(a1, a2, b1, b2);
				if(inter.points.length>0)
					return true;
			}
		}
		
		return false;   
	},
	
	clear:function(){
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
/*		if(this.goa){
			this.map.remove(this.goa);
			delete this.goa;
		}*/
			
		
	},
	_render: function(){
		this.clear();
		
		var wh = 10/this.map.getZoom();
		for(var i = 0; i < this.points.length; i++){
			var cross = new Cross({ 
				id:i,
				top: this.points[i].y, 
				left: this.points[i].x,
				padType:this.padType,
				width:wh,
				height:wh,
				polyline:this,
				});
			this.crosses.push(cross);
			this.map.add(cross);
			
			if(this.points.length == 1)
				break;
			if(this.points.length == 2){
				var line1 = new Line([this.points[0].x,this.points[0].y,this.points[0].x,this.points[1].y],{padType:this.padType});
		 		var line2 = new Line([this.points[0].x,this.points[0].y,this.points[1].x,this.points[0].y],{padType:this.padType});
		 		var line3 = new Line([this.points[1].x,this.points[1].y,this.points[1].x,this.points[0].y],{padType:this.padType});
		 		var line4 = new Line([this.points[1].x,this.points[1].y,this.points[0].x,this.points[1].y],{padType:this.padType});
		 		this.lines.push(line1,line2,line3,line4);
		 		var cross2 = new Cross({ 
		 			id:1,
		 			top: this.points[1].y, 
					left: this.points[1].x,
					padType:this.padType,
					width:wh,
					height:wh,
					polyline:this,
		 			});
		 		this.crosses.push(cross2);
		 		
		 		cross.line1 = line1;
		 		cross.line2 = line2;
		 		cross.line3 = line3;
		 		cross.line4 = line4;
		 		
		 		cross2.line1 = line3;
		 		cross2.line2 = line4;
		 		cross2.line3 = line1;
		 		cross2.line4 = line2;
		 		this.map.add(line1,line2,line3,line4,cross2);
				break;
			}
			
			if(i == 0){
				var line = new Line(
						[this.points[this.points.length-1].x,this.points[this.points.length-1].y,this.points[i].x,this.points[i].y],
						{padType:this.padType,fill: 'red',stroke: 'red',}
						);
				this.lines.push(line);
				this.map.add(line);
			}
			else if(i > 0){
				var line = new Line(
						[this.points[i-1].x,this.points[i-1].y,this.points[i].x,this.points[i].y],
						{padType:this.padType}
					);
				this.lines.push(line);
				this.map.add(line);
				
				this.crosses[i-1].line2 = line;
				this.crosses[i].line1 = line;
			}
			
			if(i == this.points.length -1){
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
	MyPolyline,
	Goa,
};

});