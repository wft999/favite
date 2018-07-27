odoo.define('padtool.Hawkmap', function (require) {
"use strict";

var core = require('web.core');
var Widget = require('web.Widget');
var Mycanvas = require('padtool.Canvas');

var QWeb = core.qweb;
var _t = core._t;

var HAWK_WIDTH = 400;
var HAWK_HEIGHT = 400;

var Hawkmap = Widget.extend({
    template: 'Hawkmap',
    
    events: {
        'mousedown .panel-heading': '_on_headMousedown',
    },

    init: function(parent,option){
    	this._x = this._y = 0;
    	this.handle = ".panel-heading";
    	this.minZoom = 1;
    	this.parent = parent;
        return this._super.apply(this, arguments);
    },

    start: function(){
    	this.map  = new fabric.Canvas('hawk',{hoverCursor:'default',stopContextMenu:true});
    	this.map.on('object:moving',_.debounce(this._onObjectMoving.bind(this), 100));
    	this.map.on('object:modified',this._onObjectModified.bind(this));
    	this.map.on('mouse:move',_.debounce(this._onMouseMove.bind(this), 100));    		
		this.map.on('mouse:out', _.debounce(this._onMouseOut.bind(this), 110));
		this.map.on('mouse:up', this._onMouseUp.bind(this));
		this.map.on('mouse:down',this._onMouseDown.bind(this));
		this.map.on('selection:updated',this._onObjectSelect.bind(this));
		this.map.on('selection:created',this._onObjectSelect.bind(this));
		
		//setTimeout(this._animate.bind(this), 500);
    },
    
    showImage: function(){
    	var left = this.parent.hawkeye.left - this.parent.hawkeye.scaleX*this.parent.hawkeye.width/2;
    	var right = this.parent.hawkeye.left + this.parent.hawkeye.scaleX*this.parent.hawkeye.width/2;
    	var top = this.parent.hawkeye.top - this.parent.hawkeye.scaleY*this.parent.hawkeye.height/2;
    	var bottom = this.parent.hawkeye.top + this.parent.hawkeye.scaleY*this.parent.hawkeye.height/2;
    	
    	if(left < 0) left = 0;
    	if(right > this.parent.image.width) right = this.parent.image.width;
    	if(top < 0) top = 0;
    	if(bottom > this.parent.image.height ) bottom = this.parent.image.height;
    	
    	this.parent.coordinate.GetRectIntersectionInfoInBlockMapMatrix(left,this.parent.image.height-bottom,right,this.parent.image.height-top);
    	if(this.parent.coordinate.bmpBlockMapPara.m_BlockMap.length == 0){
    		return
    	}	
    	
    	var imgWidth = _.reduce(this.parent.coordinate.bmpBlockMapPara.m_BlockMap, function(memo, block){ 
    		return memo + (block[0]&&block[0].bHasIntersection?block[0].iInterSectionWidth:0); 
    		}, 0);
    	var imgHeight = _.reduce(this.parent.coordinate.bmpBlockMapPara.m_BlockMap[0], function(memo, block){ 
    		return memo  + (block&&block.bHasIntersection?block.iInterSectionHeight:0); 
    		}, 0);
    	
    	if(imgWidth == 0 || imgHeight == 0){
    		this.parent.notification_manager.notify(_t('Incorrect Operation'),_t('Width  or height is 0!'),false);
    		return;
    	}
    		
    	
    	var self = this;
    	var image = new fabric.Image();
    	var strBlocks = JSON.stringify(this.parent.coordinate.bmpBlockMapPara.m_BlockMap);
    	console.log(strBlocks+'\n');
    	image.setSrc('/padtool/'+this.parent.glassName+'/image'+imgWidth+'X'+imgHeight+'?strBlocks='+strBlocks, function(img) {
    		if(img.width == 0 || img.height == 0){
    			self.parent.notification_manager.notify(_t('Incorrect Operation'),_t('Image is not exsit!'),false);
    			return;
    		}
    		
    		self.image = img;
        	self.map.clear();
        	
    		var zoom = Math.max(HAWK_WIDTH/img.width,HAWK_HEIGHT/img.height);
    		self.minZoom = zoom;
    		self.map.setZoom(zoom);
    		self.map.setDimensions({width:img.width*zoom,height:img.height*zoom});
    		self.map.add(img.set({hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false,}));

    		self.eyeLeft = left;
    		self.eyeTop = top;
    		self.pad.objs.forEach(function(obj){
    			var res = _.some(obj.points,function(p){
    				return p.x > left && p.x < right && p.y > top && p.y < bottom;
    			});
    			
    			if(res){
            		var points = obj.points;
            		var polyline = new Mycanvas.MyPolyline(self.map,obj.padType);
            		for(var i = 0; i < points.length; i++){
            			if(points[i].ux){
            				var tmp = self.parent.coordinate.UMCoordinateToHawkmapCoordinate(points[i].ux,points[i].uy);
            				if(tmp.iOutputX == undefined){
            					polyline.addPoint({
                    				x: (points[i].x - left)/self.parent.padConf[self.parent.panelName].panel_map_ratio_x,
                    				y: (points[i].y - top)/self.parent.padConf[self.parent.panelName].panel_map_ratio_y,
                    			});
            				}else{
            					polyline.addPoint({
                    				x: tmp.iOutputX,
                    				y: self.image.height - tmp.iOutputY,
                    			});
            				}
            				
            			}else{
            				polyline.addPoint({
                				x: (points[i].x - left)/self.parent.padConf[self.parent.panelName].panel_map_ratio_x,
                				y: (points[i].y - top)/self.parent.padConf[self.parent.panelName].panel_map_ratio_y,
                			});
            			}
            		}

            		polyline.origin = obj;
            		obj.hawkeye = polyline;
            		
            		if(obj.padType == 'inspectZone' && ((obj.periodX != undefined && obj.periodX != 0) || (obj.periodY != undefined && obj.periodY != 0))){
         				var angle,period;
            			if(obj.periodY == 0){
         					angle = fabric.util.degreesToRadians(90);
         					period = obj.periodX;
         				}else if(obj.periodX == 0){
         					angle = fabric.util.degreesToRadians(0);
         					period = obj.periodY;
         				}else{
         					angle = Math.atan(obj.periodX/obj.periodY);
         					period = obj.periodY / fabric.util.cos(angle);
         				}
            			period = period / self.parent.coordinate.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionY;
         				
            			var minX,minY,maxX,maxY;
                		polyline.points.forEach(function(p){
                			minX = minX == undefined?p.x:(p.x>minX?minX:p.x);
                			minY = minY == undefined?p.y:(p.y>minY?minY:p.y);
                			maxX = maxX == undefined?p.x:(p.x<maxX?maxX:p.x);
                			maxY = maxY == undefined?p.y:(p.y<maxY?maxY:p.y);
                		})
            			polyline.goa = new Mycanvas.Goa({
            				left:(minX+maxX)/2,
                			top:(minY+maxY)/2,
         	    			padType:obj.padType,
         	    			polyline:polyline,
         	    			period:period,
        					angle:fabric.util.radiansToDegrees(angle),
        					visible:true
         	    		}); 
         	        	self.map.add(polyline.goa);
         			}

                	self.map.forEachObject(function(obj){
                		obj.visible = obj.padType ? obj.padType.match(self.parent.pad.curType) : obj.visible;
                		obj.lockMovementX = false;
                		obj.lockMovementY = false;
            		});
                	
                	
    			}
    		})
    		
    		self.parent.$buttons.find('.fa-mouse-pointer').click();
    		
        });
    	
    },
    
    
    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _onObjectSelect: function(opt){
    	if(opt.target.polyline && opt.target.polyline.origin){
    		opt.target.polyline.origin.crosses[opt.target.id]&&this.parent.map._setActiveObject(opt.target.polyline.origin.crosses[opt.target.id]);
    		this.parent.map.requestRenderAll();
    	}
    },
    _animate: function () {
    	var objs = this.map.getActiveObjects();
		if(objs.length && objs[0].animateColor){
			objs[0].animateColor();
			objs[0].dirty = true;
			this.map.renderAll();
		}
        
        setTimeout(this._animate.bind(this), 500);
      },
     
     _onObjectModified: function(opt){
    	 if(opt.target.type == "goa"){
     		this.pad.isModified = true;
     		
     		var dResolutionY =  this.parent.coordinate.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionY;
			var period = dResolutionY * (opt.target.period * opt.target.scaleY )
			
			opt.target.polyline.origin.periodX = period*fabric.util.sin(fabric.util.degreesToRadians(opt.target.angle));
			opt.target.polyline.origin.periodY = period*fabric.util.cos(fabric.util.degreesToRadians(opt.target.angle));
     	}
     },
     
    _onObjectMoving: function(opt){
    	if(this.map.hoverCursor !== 'default')
    		return;
    	
    	if(opt.target.type == "cross"){
    		this.parent.pad.isModified = true;
    		opt.target.mouseMove();
    		
    		if(opt.target.polyline && opt.target.polyline.origin){
    			var ux = opt.target.polyline.origin.points[opt.target.id].ux;
    			var uy = opt.target.polyline.origin.points[opt.target.id].uy;
        		var {dOutputX:ux2, dOutputY:uy2} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(opt.target.left,this.image.height-opt.target.top);
        		if(this.pad.curType == "mainMark")
    				this.parent.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(Math.min(ux,ux2),Math.min(uy,uy2),Math.max(ux,ux2),Math.max(uy,uy2),true);
    			
    			if(this.pad.curType != "mainMark" || this.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap.length == 1){
    				opt.target.polyline.origin.points[opt.target.id].ux = ux2;
    				opt.target.polyline.origin.points[opt.target.id].uy = uy2;
    				
    				if(this.pad.curType == "mainMark"){
    					opt.target.polyline.origin.blocks = _.map(this.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
    	    	    		return {
    	    	    			iIPIndex:item.iIPIndex,
    	    	    			iScanIndex:item.iScanIndex,
    	    	    			iBlockIndex:item.iBlockIndex,
    	    	    			iInterSectionStartX:item.iInterSectionStartX,
    	    	    			iInterSectionStartY:item.iInterSectionStartY,
    	    	    			iInterSectionWidth:item.iInterSectionWidth,
    	    	    			iInterSectionHeight:item.iInterSectionHeight,
    	    	    			iBlockMapHeight:item.iBlockMapHeight
    	    	    			};
    	    	    		});
    				}
    				
    				opt.target.polyline.origin.crosses[opt.target.id].left = this.eyeLeft+opt.target.left*this.parent.padConf[this.parent.panelName].panel_map_ratio_x;
        			opt.target.polyline.origin.crosses[opt.target.id].top = this.eyeTop+opt.target.top*this.parent.padConf[this.parent.panelName].panel_map_ratio_y;
        			opt.target.polyline.origin.crosses[opt.target.id].mouseMove();
            		opt.target.polyline.origin.map.requestRenderAll();
    			}else{
    				var tmp = this.parent.coordinate.UMCoordinateToHawkmapCoordinate(ux,uy);
    				opt.target.left = tmp.iOutputX;
    				opt.target.top = this.image.height-tmp.iOutputY;
    				this.requestRenderAll();
    				
    				this.parent.notification_manager.notify(_t('Incorrect Operation'),_t('Mark is across multiple IPs!'),false);
    			}
        	}
    		
    		
    		if(opt.target.padType == 'frame'){
    			if(opt.target.polyline && opt.target.polyline.origin){
    				var innerFrame = opt.target.polyline.origin.crosses[opt.target.id].inner?opt.target.polyline.origin.crosses[opt.target.id].inner[0].polyline:opt.target.polyline.origin;
        		    var outerFrame = opt.target.polyline.origin.crosses[opt.target.id].outer?opt.target.polyline.origin.crosses[opt.target.id].outer[0].polyline:opt.target.polyline.origin;
    				this.parent._drawRegion(innerFrame,outerFrame);
            	}
    		}	
    		this.map.renderAll();
    	}
    	
    	opt.e.stopPropagation();
        opt.e.preventDefault();
    	
    },
    
    _onMouseDown:function(opt){
    	this.map._isMousedown = true;
    	this.map.startPointer = opt.pointer;
    },
	_onMouseMove:function(opt){
		var zoom = this.map.getZoom();
		var x = opt.e.offsetX;
		var y = opt.e.offsetY;
		$(".map-info").text("image(x:"+Math.round(x/zoom)+",y:"+Math.round(y/zoom)+") window(x:"+x+",y:"+y+")");
		
    	opt.e.stopPropagation();
        opt.e.preventDefault();
    		
	},
	_onMouseOut:function(opt){
		$(".map-info").text("");
	},
    
    _onMouseUp:function(opt){
    	var needUpdateHawk = false;
    	var zoom = this.map.getZoom();
    	var endPointer = _.clone(opt.pointer);
    	var _isDrawRect = this.map.startPointer.x != endPointer.x ||this.map.startPointer.y != endPointer.y;
		
    	if(!_isDrawRect && (this.map.hoverCursor == 'zoom-in' || this.map.hoverCursor == 'zoom-out')){
    		var delta = this.map.hoverCursor == 'zoom-in'?0.2:-0.2;
    		var x = opt.e.offsetX / zoom;
    		var y = opt.e.offsetY / zoom;
    		
    		zoom = zoom + delta;
    		zoom = Math.floor(zoom*10)/10;
    		if (zoom > 1.2) zoom = 1.2;
    		if (zoom <= this.minZoom) zoom = this.minZoom;
    		
    		x = x * zoom - (opt.e.offsetX -div.scrollLeft());
    		y = y * zoom - (opt.e.offsetY-div.scrollTop());
    		var div = this.$('div.canvas-map').length? this.$('div.canvas-map'): this.$el;
    		div.scrollTop(y);
    		div.scrollLeft(x);
    		
    		this.map.setZoom(zoom);
    		this.map.setDimensions({width:this.image.width*zoom,height:this.image.height*zoom});
    		
    		opt.e.preventDefault();
    		opt.e.stopPropagation();
    	}else if(!_isDrawRect && this.map.hoverCursor == 'paste' && this.pad.pasteObj && this.pad.pasteObj.padType == this.pad.curType){
    		var points = this.pad.pasteObj.polyline.points;
    		
    		let {dOutputX:ux,dOutputY:uy} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(endPointer.x/zoom,this.image.height-endPointer.y/zoom);
    		var uoffsetX = ux - points[this.pad.pasteObj.id].ux;
    		var uoffsetY = uy - points[this.pad.pasteObj.id].uy;
    		
    		endPointer.x = this.eyeLeft + (endPointer.x/zoom)*this.parent.padConf[this.parent.panelName].panel_map_ratio_x;
    		endPointer.y = this.eyeTop + (endPointer.y/zoom)*this.parent.padConf[this.parent.panelName].panel_map_ratio_y;
    		var offsetX = endPointer.x - this.pad.pasteObj.left;
    		var offsetY = endPointer.y - this.pad.pasteObj.top;
    		
    		var polyline = new Mycanvas.MyPolyline(this.parent.map,this.pad.curType);
    		for(var i = 0; i < points.length; i++){
    			polyline.addPoint({
    				x: points[i].x + offsetX,
    				y: points[i].y + offsetY,
    				ux: points[i].ux + uoffsetX,
    				uy: points[i].uy + uoffsetY,
    			});
    		}
			
			if(this.pad.pasteObj.polyline.padType == 'inspectZone'){
				polyline.periodX = this.pad.pasteObj.polyline.periodX || 0;
				polyline.periodY = this.pad.pasteObj.polyline.periodY || 0;
				polyline.D1G1 = this.pad.pasteObj.polyline.D1G1 || 0;
    		}
			
			this.pad.objs.push(polyline);
			needUpdateHawk = true;
    		this.pad.isModified = true;
    	}else if(_isDrawRect && this.map.hoverCursor == 'crosshair'){
    		var imgx = Math.min(this.map.startPointer.x,opt.pointer.x);
			var imgy = Math.max(this.map.startPointer.y,opt.pointer.y);
			let {dOutputX:ux,dOutputY:uy} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(imgx/zoom,this.image.height-imgy/zoom);
			imgx = Math.max(this.map.startPointer.x,opt.pointer.x);
			imgy = Math.min(this.map.startPointer.y,opt.pointer.y);
			let {dOutputX:ux2,dOutputY:uy2} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(imgx/zoom,this.image.height-imgy/zoom);
			
			var acrossIp = false;
			if(this.pad.curType == "mainMark"){
				this.parent.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(Math.min(ux,ux2),Math.min(uy,uy2),Math.max(ux,ux2),Math.max(uy,uy2),true);
				acrossIp = this.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap.length > 1;
			}
				
			if(this.pad.curType != "mainMark" || acrossIp == false){
				var startPointer = _.clone(this.map.startPointer);
	    		startPointer.x = this.eyeLeft + (startPointer.x/zoom)*this.parent.padConf[this.parent.panelName].panel_map_ratio_x;
				startPointer.y = this.eyeTop + (startPointer.y/zoom)*this.parent.padConf[this.parent.panelName].panel_map_ratio_y;
				endPointer.x = this.eyeLeft + (endPointer.x/zoom)*this.parent.padConf[this.parent.panelName].panel_map_ratio_x;
	    		endPointer.y = this.eyeTop + (endPointer.y/zoom)*this.parent.padConf[this.parent.panelName].panel_map_ratio_y;
	    		
				this.parent.map.discardActiveObject();
				var rect = new Mycanvas.MyPolyline(this.parent.map,this.pad.curType);
				
				var x = Math.min(startPointer.x,endPointer.x);
				var y = Math.max(startPointer.y,endPointer.y);
	    		rect.addPoint({x, y,ux,uy});
	    			
	    		x = Math.max(startPointer.x,endPointer.x);
				y = Math.min(startPointer.y,endPointer.y);	
				rect.addPoint({x, y,ux:ux2,uy:uy2});
				
				if(rect.padType == "mainMark"){
					rect.blocks = _.map(this.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
	    	    		return {
	    	    			iIPIndex:item.iIPIndex,
	    	    			iScanIndex:item.iScanIndex,
	    	    			iBlockIndex:item.iBlockIndex,
	    	    			iInterSectionStartX:item.iInterSectionStartX,
	    	    			iInterSectionStartY:item.iInterSectionStartY,
	    	    			iInterSectionWidth:item.iInterSectionWidth,
	    	    			iInterSectionHeight:item.iInterSectionHeight,
	    	    			iBlockMapHeight:item.iBlockMapHeight
	    	    			};
	    	    		});
				}
	    		
	    		needUpdateHawk = true;
	    		this.curPolyline = null;
	    		this.pad.objs.push(rect);
	    		this.pad.isModified = true;
			}else{
				this.parent.notification_manager.notify(_t('Incorrect Operation'),_t('Mark is across multiple IPs!'),false);
			}
    	}else if(!_isDrawRect && this.map.hoverCursor == 'crosshair' && (this.pad.curType=='inspectZone' || this.pad.curType=='uninspectZone')){
    		var myPolyline;
    		if(!this.parent.curPolyline){
				this.parent.curPolyline = new Mycanvas.MyPolyline(this.parent.map,this.pad.curType);
				this.pad.objs.push(this.parent.curPolyline);
				
				myPolyline = new Mycanvas.MyPolyline(this.map,this.pad.curType);
				myPolyline.origin = this.parent.curPolyline;
				this.parent.curPolyline.hawkeye = myPolyline;
			}else{
				myPolyline = this.parent.curPolyline.hawkeye;
			}
			
			let {dOutputX:ux,dOutputY:uy} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(endPointer.x/zoom,this.image.height-endPointer.y/zoom);
			var x = this.eyeLeft + (endPointer.x/zoom)*this.parent.padConf[this.parent.panelName].panel_map_ratio_x;
    		var y = this.eyeTop + (endPointer.y/zoom)*this.parent.padConf[this.parent.panelName].panel_map_ratio_y;
			
    		if(this.parent.curPolyline.addPoint({x, y,ux,uy})){
    			myPolyline.addPoint({x: endPointer.x/zoom, y: endPointer.y/zoom})
    			this.pad.isModified = true;
    		}else{
    			this.parent.notification_manager.notify(_t('Incorrect Operation'),_t('Please enter valid point!'),false);
    		}
    			
		}else if( _isDrawRect && this.map.hoverCursor == 'default'){
			var objs = this.map.getActiveObjects();
			if(objs.length){
				this.map.discardActiveObject();
				this.map.setActiveObject(objs[0]);
			}
		}

    	if(needUpdateHawk){
    		this.showImage();
    	}
    			
    	this.map._isMousedown = false;
    },
    
    _on_headMousedown: function(event){

        this._x = event.clientX - this.el.offsetLeft;
        this._y = event.clientY - this.el.offsetTop;
        
        event.preventDefault && event.preventDefault();
        this.$(this.handle)[0].setCapture && this.$(this.handle)[0].setCapture();	
        
        $(document).on('mousemove', this, this._on_headMousemove);
        $(document).on('mouseup', this, this._on_headMouseup);
    },
    _on_headMousemove : function (event)
    {
        event.data.el.style.top = event.clientY - event.data._y + "px";
        event.data.el.style.left = event.clientX - event.data._x + "px";
        event.preventDefault && event.preventDefault();   
    },
    _on_headMouseup : function (event)
    {
    	event.data.$(this.handle)[0].releaseCapture && event.data.$(this.handle)[0].releaseCapture();
    	$(document).off('mousemove');
    	$(document).off('mouseup');
    },
    
});



return Hawkmap;

});