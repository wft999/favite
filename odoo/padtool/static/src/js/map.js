odoo.define('padtool.Map', function (require) {
"use strict";

var core = require('web.core');
var Widget = require('web.Widget');
var SystrayMenu = require('web.SystrayMenu');
var Mycanvas = require('padtool.Canvas');
var QWeb = core.qweb;
var _t = core._t;

var CanvasInfo = Widget.extend({
    template: 'Map.info',
    
    init: function (parent, value) {
        this._super(parent);

    },
});

var Basemap = Widget.extend({
    template: 'Map',
/*    
    events: {
        'click .o_setup_company': 'on_setup_company'
    },
*/
    init: function(parent,action){
    	this.action_manager = parent;
    	if(action.menu_id){
    		this.menu_id = action.menu_id;
    	}else{
    		var queryString = document.location.hash.slice(1);
        	var params = this._parseQueryString(queryString);
        	if ('menu_id' in params) {
        		this.menu_id = params.menu_id;
        	}
    	}
    	
        return this._super.apply(this, arguments);
    },

    start: function(){    	
    	var self = this;
    	
    	this.defImage = new $.Deferred();
       	console.log('_loadImage start');
    	this.image = new fabric.Image();
    	this.image.setSrc(this.imgFile, this._onLoadImage.bind(this));

    },
    
    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    
	_onMouseDown:function(opt){
    	this.map._isMousedown = true;
    	this.map.startPointer = opt.pointer;
    },
	_onMouseMove:function(opt){
		
		var zoom = this.map.getZoom();
		var x = opt.e.offsetX;
		var y = opt.e.offsetY;
		$(".map-info").text("image(x:"+Math.round(x/zoom)+",y:"+Math.round(y/zoom)+") window(x:"+x+",y:"+y+")");
		
    	if(this.map._isMousedown && (this.map.startPointer.x != opt.pointer.x ||this.map.startPointer.y != opt.pointer.y)){
    		this.map._isDrawRect = true;
    	}
    	opt.e.stopPropagation();
        opt.e.preventDefault();
    		
	},
	_onMouseOut:function(opt){
		$(".map-info").text("");
	},
	_onMouseUp:function(opt){
		if(this.map._isDrawRect){
			this.map._isDrawRect = false;
			return;
		}
		
		var delta = 0;
		if(this.map.hoverCursor == 'zoom-in')
			delta = 0.2;
		else if(this.map.hoverCursor == 'zoom-out')
			delta = -0.2;
		else
			return;
		
		var zoom = this.map.getZoom();//this.image.scaleX;
		var x = opt.e.offsetX / zoom;
		var y = opt.e.offsetY / zoom;
		
		zoom = zoom + delta;
		zoom = Math.floor(zoom*10)/10;
		if (zoom > 2) zoom = 2;
		if (zoom <= this.minZoom) zoom = this.minZoom;
		
		var div = this.$('div.canvas-map').length? this.$('div.canvas-map'): this.$el;
		
		x = x * zoom - (opt.e.offsetX -div.scrollLeft());
		y = y * zoom - (opt.e.offsetY-div.scrollTop());
		
		this.map.setZoom(zoom);
		this.map.setDimensions({width:this.image.width*zoom,height:this.image.height*zoom});
		//this.image.scale(zoom);
		
		opt.e.preventDefault();
		opt.e.stopPropagation();

		div.scrollTop(y);
		div.scrollLeft(x);
	},
	
	_onLoadImage(img){
		img.set({left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false });
		this.map  = new fabric.Canvas('map',{hoverCursor:'default',stopContextMenu:true});
		var zoom = Math.max(this.map.getWidth()/img.width,this.map.getHeight()/img.height);
		zoom = Math.floor(zoom*10)/10;
		this.minZoom = zoom;
		this.map.setZoom(zoom);
		this.map.setDimensions({width:img.width*zoom,height:img.height*zoom});
		//this.map.setBackgroundImage(img);
		this.map.add(img);

		this.map.on('mouse:move',_.debounce(this._onMouseMove.bind(this), 100));    		
		this.map.on('mouse:out', this._onMouseOut.bind(this));
		this.map.on('mouse:up', this._onMouseUp.bind(this));
		this.map.on('mouse:down',this._onMouseDown.bind(this));
		
		console.log('_loadImage end');
		this.defImage.resolve();
	},
    
    _parseQueryString: function(query) {
        var parts = query.split('&');
        var params = {};
        for (var i = 0, ii = parts.length; i < ii; ++i) {
          var param = parts[i].split('=');
          var key = param[0].toLowerCase();
          var value = param.length > 1 ? param[1] : null;
          params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
        return params;
      },
    
});

var Map = Basemap.extend({
	init: function(parent,action){

        return this._super.apply(this, arguments);
    },
    
    start: function(){
    	var self = this;
    	this._super.apply(this, arguments);
    	$.when(self.defImage).then(function ( ) {
    		setTimeout(self._animate.bind(self), 500);
    		self.map.on('object:moving',_.debounce(self._onObjectMoving.bind(self), 100));
    		self.map.on('object:scaled',self._onObjectScale.bind(self));
    		self.map.on('object:moved',self._onObjectScale.bind(self));
    	});
    },
    
    destroy: function(){	
    	this._super.apply(this, arguments);
    },

  //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _animate: function () {
    	var objs = this.map.getActiveObjects();
		if(objs.length && objs[0].animateColor){
			objs[0].animateColor();
			objs[0].dirty = true;
			this.map.renderAll();
		}
        
        setTimeout(this._animate.bind(this), 500);
      },
      
     _onObjectScale: function(opt){
    	 if(opt.target.type == "hawkeye"){
     		this.hawkmap.showImage();
     	}
     },
     
    _onObjectMoving: function(opt){
    	if(this.map.hoverCursor !== 'default')
    		return;
    	
    	if(opt.target.mouseMove){
    		opt.target.mouseMove();
    		this.pad.isModified = true;
    		if(opt.target.padType == 'frame'){
    			var innerFrame = opt.target.inner?opt.target.inner[0].polyline:opt.target.polyline;
    		    var outerFrame = opt.target.outer?opt.target.outer[0].polyline:opt.target.polyline;
    			this._drawRegion(innerFrame,outerFrame);
    		}	
    		this.map.renderAll();
    	}else if(opt.target.type == "hawkeye"){
    		//this.hawkmap.drawImage();
    		//this.hawkmap.showImage();
    	}
    	
    	opt.e.stopPropagation();
        opt.e.preventDefault();
    	
    },

    _onMouseUp:function(opt){
    	this._super.apply(this, arguments);
    	
    	var zoom = this.map.getZoom();
    	var endPointer = opt.pointer;
    	if(this.map.hoverCursor == 'paste'){
    		
    		if(this.pad.pasteObj && this.pad.pasteObj.padType == this.pad.curType){
    			var offsetX = endPointer.x/zoom - this.pad.pasteObj.left;
        		var offsetY = endPointer.y/zoom - this.pad.pasteObj.top;
        		var points = this.pad.pasteObj.polyline.points;
        		
        		var polyline = new Mycanvas.MyPolyline(this.map,this.pad.curType);
        		for(var i = 0; i < points.length; i++){
        			polyline.addPoint({
        				x: points[i].x + offsetX,
        				y: points[i].y + offsetY,
        			});
        		}
        		this.pad.objs.push(polyline);
        		
        		var goa = this.pad.pasteObj.polyline.goa;
        		if(goa){
        			polyline.goa = new Mycanvas.Goa({
     	    			left:goa.left + offsetX,
     	    			top:goa.top + offsetY,
     	    			padType:this.pad.curType,
     	    			polyline:polyline,
     	    			scaleX:goa.scaleX,
    					scaleY:goa.scaleY,
    					angle:goa.angle,
    					visible:true
     	    		}); 
     	        	this.map.add(polyline.goa);
        		}
        		
        		this.pad.isModified = true;
    		}	
    	}else if(this.map.hoverCursor == 'crosshair'){
    		if(this.map._isDrawRect){
    			this.map.discardActiveObject();
    			var rect = new Mycanvas.MyPolyline(this.map,this.pad.curType);
        		rect.addPoint({
        				x:Math.min(this.map.startPointer.x/zoom,endPointer.x/zoom), 
        				y: Math.max(this.map.startPointer.y/zoom,endPointer.y/zoom)
        			})
        		rect.addPoint({
        				x:Math.max(this.map.startPointer.x/zoom,endPointer.x/zoom),
        				y:Math.min(this.map.startPointer.y/zoom,endPointer.y/zoom)
        			});
        		this.curPolyline = null;
        		this.pad.objs.push(rect);
        		this.pad.isModified = true;
        		
        		//this.$buttons.find('.fa-mouse-pointer').click();
    		}else if(this.pad.curType=='inspectZone' || this.pad.curType=='uninspectZone'){
    			if(!this.curPolyline){
    				this.curPolyline = new Mycanvas.MyPolyline(this.map,this.pad.curType);
    				this.pad.objs.push(this.curPolyline);
    				this.pad.isModified = true;
    			}
    				
        		if(!this.curPolyline.addPoint({x: endPointer.x/zoom, y: endPointer.y/zoom})){
        			this.notification_manager.notify(_t('Incorrect Operation'),_t('Please enter valid point!'),false);
        		}
        			
    		}
    		
		}else if(this.map.hoverCursor == 'default' && this.map._isDrawRect){
			var objs = this.map.getActiveObjects();
			if(objs.length){
				this.map.discardActiveObject();
				this.map.setActiveObject(objs[0]);
			}
		}
    			
    	this.map._isMousedown = false;
    	this.map._isDrawRect = false;
    },
  
     _drawPad(){ 
 		var self = this;
 		var innerFrame = null;
 		var outerFrame = null;
 		this.jsonpad.forEach(function(pad){
 			var obj = new Mycanvas.MyPolyline(self.map,pad.padType);
 			pad.points.forEach(function(p){
 				obj.addPoint(p);
 			})
 			
 			if(pad.goa){
 				obj.goa = new Mycanvas.Goa({
 	    			left:pad.goa.left,
 	    			top:pad.goa.top,
 	    			padType:pad.padType,
 	    			polyline:obj,
 	    			scaleX:pad.goa.scaleX,
					scaleY:pad.goa.scaleY,
					angle:pad.goa.angle,
					visible:false
 	    		}); 
 	        	self.map.add(obj.goa);
 			}
 			
 			self.pad.objs.push(obj);
 			
 			if(pad.padType == 'frame'){
 				obj.crosses[0].set({visible:true,lockMovementX:false,lockMovementY:false});
 		 		obj.crosses[1].set({visible:true,lockMovementX:false,lockMovementY:false});
 		 		
 		 		if(innerFrame == null)
 		 			innerFrame = obj;
 		 		else if(outerFrame == null)
 		 			outerFrame = obj;
 			}else{
 				obj.crosses.forEach(function(cross){
 					cross.set({visible:false});
 				});
 				obj.lines.forEach(function(line){
 					line.set({visible:false});
 				})
 			}
 		})
 		
 		if(innerFrame == null){
 			innerFrame = new Mycanvas.MyPolyline(this.map,'frame');
 			innerFrame.addPoint({x:500,y:this.image.height-500});
 			innerFrame.addPoint({x:this.image.width-500,y:500});
 			innerFrame.crosses[0].set({visible:true,lockMovementX:false,lockMovementY:false});
 			innerFrame.crosses[1].set({visible:true,lockMovementX:false,lockMovementY:false});
 			this.pad.objs.push(innerFrame);
 		}
 		
		if(outerFrame == null){
			outerFrame = new Mycanvas.MyPolyline(this.map,this.pad.curType);
			outerFrame.addPoint({x:300,y:this.image.height-300});
			outerFrame.addPoint({x:this.image.width-300,y:300});
			outerFrame.crosses[0].set({visible:true,lockMovementX:false,lockMovementY:false});
			outerFrame.crosses[1].set({visible:true,lockMovementX:false,lockMovementY:false});
			this.pad.objs.push(outerFrame);
		}
 		
		innerFrame.crosses[0].outer = [outerFrame.crosses[0],outerFrame.crosses[1]];
 		innerFrame.crosses[1].outer = [outerFrame.crosses[0],outerFrame.crosses[1]];
 		
		outerFrame.crosses[0].inner = [innerFrame.crosses[0],innerFrame.crosses[1]];
		outerFrame.crosses[1].inner = [innerFrame.crosses[0],innerFrame.crosses[1]];
		
		this._drawRegion(innerFrame,outerFrame);
		
		this.map.discardActiveObject();

     },

 	 _drawRegion: function(innerFrame,outerFrame){

 		var objects = this.map.getObjects('rect');
 	    for (var i = 0, len = objects.length; i < len; i++) {
 	    	if(objects[i].padType && objects[i].padType == 'frame_region'){
				this.map.remove(objects[i]);		
			}
 	    }

 		 var top = innerFrame.crosses[1].top - this.globalConf.region_overlap;
 		 while(true){
 			 var height = this.globalConf.region_height;
 			 var nextTop = top + this.globalConf.region_height - this.globalConf.region_overlap;
 			if((nextTop + this.globalConf.region_height)  > innerFrame.crosses[0].top + this.globalConf.region_overlap ){
 				height = innerFrame.crosses[0].top + this.globalConf.region_overlap - top;
 			}
 			var rect = new Mycanvas.Rect({
 				left:outerFrame.crosses[0].left,
 				top,
 				stroke: 'blue',
 				width:innerFrame.crosses[0].left - outerFrame.crosses[0].left,
 				height,
 				padType:"frame_region"
 			});
 			this.map.add(rect);
 			
 			rect = new Mycanvas.Rect({
				left:innerFrame.crosses[1].left,
				top,
				stroke: 'blue',
				width:outerFrame.crosses[1].left - innerFrame.crosses[1].left,
				height,
				padType:"frame_region"
			});
			this.map.add(rect);
 			
 			top = nextTop;
 			if((top + this.globalConf.region_height) > innerFrame.crosses[0].top  + this.globalConf.region_overlap)
 				break;
 		 }
 		 
 		var rect = new Mycanvas.Rect({
			left:outerFrame.crosses[0].left,
			top:outerFrame.crosses[1].top,
			stroke: 'blue',
			width:outerFrame.crosses[1].left - outerFrame.crosses[0].left,
			height:innerFrame.crosses[1].top - outerFrame.crosses[1].top,
			padType:"frame_region"
		});
		this.map.add(rect);
		
		rect = new Mycanvas.Rect({
			left:outerFrame.crosses[0].left,
			top:innerFrame.crosses[0].top,
			stroke: 'blue',
			width:outerFrame.crosses[1].left - outerFrame.crosses[0].left,
			height:outerFrame.crosses[0].top - innerFrame.crosses[0].top,
			padType:"frame_region"
		});
		this.map.add(rect);
 		 
 		innerFrame.crosses[0].bringToFront();
 		innerFrame.crosses[1].bringToFront();
 		outerFrame.crosses[0].bringToFront();
 		outerFrame.crosses[1].bringToFront();
 		//this.map.renderAll();
 		 
 	 },
});

SystrayMenu.Items.push(CanvasInfo);

return {Basemap,Map};

});