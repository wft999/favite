odoo.define('padtool.Hawkmap', function (require) {
"use strict";

var core = require('web.core');
var Widget = require('web.Widget');
var Mycanvas = require('padtool.Canvas');
var Dialog = require('web.Dialog');
var QWeb = core.qweb;
var _t = core._t;

var HAWK_WIDTH = 600;
var HAWK_HEIGHT = 600;
var MAX_sIZE = 50000000;
var Hawkmap = Widget.extend({
    template: 'Hawkmap',
    events: {
        'mousedown .panel-heading': '_on_headMousedown',
        'click a.close': '_on_close',
        'click button.fa-mouse-pointer':'_onButtonSelectMode', 
        'click button.fa-search-plus':'_onButtonSelectMode', 
        'click button.fa-search-minus':'_onButtonSelectMode', 
        'click button.fa-edit':'_onButtonSelectMode', 
        'click button.fa-copy':'_onButtonSelectMode', 
        'click button.fa-cut':'_onButtonCut', 
        'click button.fa-align-justify':'_onButtonAlign',
    },

    init: function(parent,option){
    	this._x = this._y = 0;
    	this.handle = ".panel-heading";
    	this.minZoom = 1;
    	this.parent = parent;
        return this._super.apply(this, arguments);
    },
    
    start: function(){
    	this.map  = new fabric.Canvas('hawk',{
    		hoverCursor:'default',
    		stopContextMenu:true,
    		imageSmoothingEnabled:false
    		});
    	this.map.isPanel = false;
    	this.map.on('object:moving',_.debounce(this._onObjectMoving.bind(this), 100));
    	this.map.on('object:modified',this._onObjectModified.bind(this));
    	this.map.on('mouse:move',_.debounce(this._onMouseMove.bind(this), 100));    		
		this.map.on('mouse:out', this._onMouseOut.bind(this));
		this.map.on('mouse:up', this._onMouseUp.bind(this));
		this.map.on('mouse:down',this._onMouseDown.bind(this));
		this.map.on('mouse:over',this._onMouseOver.bind(this));
		
		//this.map.on('selection:updated',this._onObjectSelect.bind(this));
		//this.map.on('selection:created',this._onObjectSelect.bind(this));
		this.map.on('selection:updated',this._onSelectionUpdated.bind(this));
		this.map.on('selection:created',this._onSelectionUpdated.bind(this));
		this.map.on('selection:cleared',this._onSelectionCleared.bind(this));
		this.map.on('object:moved',this._onObjectMoved.bind(this));
		
		var hidden = this.pad.curType == 'frame' || this.pad.curType == 'subMark';
    	this.$el.find('.fa-edit').toggleClass('o_hidden',hidden);
    	this.$el.find('.fa-copy').toggleClass('o_hidden',true);
    },
    
    showImage: function(zoom){
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
        	if(self.image !== undefined)
        		delete self.image;

    		self.image = img;
        	
    		var x;
	 		var y;
        	if(zoom == undefined){
        		x= 0;
        		y = 0;
        		zoom = Math.max(HAWK_WIDTH/img.width,HAWK_HEIGHT/img.height);
        		self.minZoom = zoom;
        		self.map.setZoom(zoom);
        		self.map.setDimensions({width:img.width*zoom,height:img.height*zoom});
        	}else{
    	 		self.map.setZoom(zoom);
        		self.map.setDimensions({width:img.width*zoom,height:img.height*zoom});
        		x = self.map.width/2 - HAWK_WIDTH/2;
    	 		y = self.map.height/2 - HAWK_HEIGHT/2;
        	}
    		
    		if(self.map.width <= HAWK_WIDTH)
    			self.$(".canvas-map")[0].style.width = 1+self.map.width + 'px';
    		else
    			self.$(".canvas-map")[0].style.width = 1+HAWK_WIDTH + 'px';
    		
    		if(self.map.height <= HAWK_HEIGHT)
    			self.$(".canvas-map")[0].style.height = 1+self.map.height + 'px';
    		else
    			self.$(".canvas-map")[0].style.height = 1+HAWK_HEIGHT + 'px';
    		
    		self.$('div.canvas-map').scrollTop(y);
	 		self.$('div.canvas-map').scrollLeft(x);

    		self.eyeLeft = left;
    		self.eyeTop = top;
    		self.drawPad();
        });
    	
    	
    	
    },
    
    drawPad:function(){
    	var self = this;
    	self.map.clear();
    	self.map.add(self.image.set({hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false,}));
    	
    	this.parent.map.forEachObject(function(obj) {
    		var isCurPad = self.curPad && self.curPad.panelpad && self.curPad.panelpad == obj.pad;
    		
    		if(obj.type != 'group')
    			return;
    		if((!self.parent.hawkeye.intersectsWithObject(obj)) && (!isCurPad))
    			return;
    		
    		var points = obj.pad.points;
    		var pad = new Mycanvas.MyPolyline(self.map,obj.pad.padType);

    		for(var i = 0; i < points.length; i++){
    			if(points[i].ux){
    				var tmp = self.parent.coordinate.UMCoordinateToHawkmapCoordinate(points[i].ux,points[i].uy);
    				if(tmp.iOutputX == undefined){
    					var x = (points[i].x - self.eyeLeft)/self.parent.padConf[self.parent.panelName].panel_map_ratio_x;
        				var y= (points[i].y - self.eyeTop)/self.parent.padConf[self.parent.panelName].panel_map_ratio_y;
        				pad.addPoint({x,y});
    				}else{
    					var x = tmp.iOutputX;
    					var y = self.image.height - tmp.iOutputY;

    					pad.addPoint({x,y});
    				}
    				
    			}else{
    				pad.addPoint({
        				x: (points[i].x - self.eyeLeft)/self.parent.padConf[self.parent.panelName].panel_map_ratio_x,
        				y: (points[i].y - self.eyeTop)/self.parent.padConf[self.parent.panelName].panel_map_ratio_y,
        			});
    			}
    		}
    		
    		if(self.parent.pad.curType == 'frame' && pad.padType == 'frame')
    			pad.updateCross(true);
    		
    		if(pad.polyline){
    			pad.polyline.visible = pad.padType == self.parent.pad.curType || (pad.padType == 'region' && self.parent.pad.curType == 'frame');
        		pad.polyline.lockMovementX = pad.padType == 'subMark' || pad.padType == 'frame' || pad.padType == 'region' || self.map.hoverCursor !== 'default';
        		pad.polyline.lockMovementY = pad.padType == 'subMark' || pad.padType == 'frame' || pad.padType == 'region' || self.map.hoverCursor !== 'default';
        		pad.polyline.hoverCursor = (pad.polyline.lockMovementX)?'':'move';
    		}

    		pad.panelpad = obj.pad;
    		obj.pad.hawkpad = pad;
    		if(self.curPad && self.curPad.panelpad && self.curPad.panelpad == obj.pad)
    			self.curPad = pad;
    		
    		if(obj.pad.padType == 'inspectZone' && ((obj.pad.periodX != undefined && obj.pad.periodX != 0) || (obj.pad.periodY != undefined && obj.pad.periodY != 0))){
 				var angle,period;
    			if(obj.pad.periodY == 0){
 					angle = fabric.util.degreesToRadians(90);
 					period = obj.pad.periodX;
 				}else if(obj.pad.periodX == 0){
 					angle = fabric.util.degreesToRadians(0);
 					period = obj.pad.periodY;
 				}else{
 					angle = Math.atan(obj.pad.periodX/obj.pad.periodY);
 					period = obj.pad.periodY / fabric.util.cos(angle);
 				}
    			period = period / self.parent.coordinate.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionY;
 				
    			var minX,minY,maxX,maxY;
    			pad.points.forEach(function(p){
        			minX = minX == undefined?p.x:(p.x>minX?minX:p.x);
        			minY = minY == undefined?p.y:(p.y>minY?minY:p.y);
        			maxX = maxX == undefined?p.x:(p.x<maxX?maxX:p.x);
        			maxY = maxY == undefined?p.y:(p.y<maxY?maxY:p.y);
        		})
    			pad.goa = new Mycanvas.Goa({
    				left:(minX+maxX)/2,
        			top:(minY+maxY)/2,
 	    			pad:pad,
 	    			period:period,
					angle:fabric.util.radiansToDegrees(angle),
					visible:self.parent.pad.curType==pad.padType,
					hoverCursor:'move'
 	    		}); 
 	        	self.map.add(pad.goa);
 			}

		});
		
		self.map.forEachObject(function(obj){
    		if(obj.type == 'cross')
    			obj.bringToFront();
    		else if(obj.pad && ( obj.pad.padType == 'frame' || obj.pad.padType == 'region')){
    			obj.selectable = false;
    		}
    	});
		
		self.map.renderAll();
    },
    
    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _onObjectMoved: function(opt){
    	var objs = [opt.target];
    	if(opt.target.type == 'activeSelection'){
    		objs = opt.target._objects;
    	}
    	
    	var zoom = this.map.getZoom();
    	var offsetX = (opt.e.offsetX - this.map.startPointer.x)/zoom;
		var offsetY = (opt.e.offsetY - this.map.startPointer.y)/zoom;
		
		var self = this;
		objs.forEach(function(obj){
			if(obj.pad && obj.type != 'cross' && obj.type != 'goa'){
				self.parent.register(obj.pad.panelpad);
				var tmpPoints = _.clone(obj.pad.panelpad.points);
	    		for(var i = 0; i < obj.pad.points.length; i++){
	    			obj.pad.points[i].x += offsetX;
	    			obj.pad.points[i].y += offsetY;
	    			
	    			var {dOutputX:ux2, dOutputY:uy2} = self.parent.coordinate.HawkmapCoordinateToUMCoordinate(obj.pad.points[i].x,self.image.height-obj.pad.points[i].y);
	    			obj.pad.panelpad.points[i].ux = ux2;
	    			obj.pad.panelpad.points[i].uy = uy2;
	    			let {dOutputX:x2, dOutputY:y2} = self.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux2,uy2);
	    			obj.pad.panelpad.points[i].x = x2;
	    			obj.pad.panelpad.points[i].y = self.parent.image.height - y2;
	    		}
	    		
	    		if(obj.pad.padType == 'mainMark'){
	    			var pad = obj.pad.panelpad;
    				var left = Math.min(pad.points[0].ux,pad.points[1].ux);
    				var right = Math.max(pad.points[0].ux,pad.points[1].ux);
    				var bottom = Math.min(pad.points[0].uy,pad.points[1].uy);
    				var top = Math.max(pad.points[0].uy,pad.points[1].uy);
    				self.parent.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(left,bottom,right,top,true);
            		if(self.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap.length == 1){
            			obj.pad.panelpad.blocks = _.map(self.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
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
            			
            			self.pad.isMainMarkModified = true;
            		}else{
            			for(var i = 0; i < obj.pad.points.length; i++){
        	    			obj.pad.points[i].x -= offsetX;
        	    			obj.pad.points[i].y -= offsetY;
        	    			
        	    			obj.pad.panelpad.points[i].ux = tmpPoints[i].ux;
        	    			obj.pad.panelpad.points[i].uy = tmpPoints[i].uy;
        	    			obj.pad.panelpad.points[i].x = tmpPoints[i].x;
        	    			obj.pad.panelpad.points[i].y = tmpPoints[i].y;
        	    		}
            			
            			self.parent.notification_manager.notify(_t('Incorrect Operation'),_t('Mark is across multiple IPs!'),false);
            		}
	    		}
	    		
	    		obj.pad.update();
	    		obj.pad.panelpad.update();
				self.parent.pad.isModified = true;

	    	}
		});
		
    },
    _onObjectSelect: function(opt){
    	if(opt.target.pad){
    		this.curPad = opt.target.pad;
    	}
    	
    	var hidden = opt.selected.length != 1 ||  opt.selected[0].type != 'cross' || opt.selected[0].pad.padType == 'frame';
    	this.$el.find('.fa-cut').toggleClass('o_hidden',hidden);

    },
    
    _onSelectionUpdated: function(opt){
    	if(opt.selected.length == 1 && opt.selected[0].type == 'cross'){
    		this.pad.selAnchor = opt.selected[0].pad.crosses[opt.selected[0].id]; 
    		this.curPad = opt.selected[0].pad;
    		
    		this.$el.find('.fa-cut').toggleClass('o_hidden',opt.selected[0].pad.padType == 'frame');
    		return;
    	}
    	this.$el.find('.fa-cut').toggleClass('o_hidden',true);
    	
    	for(var i = 0; i< this.pad.selObjs.length;i++){
    		this.pad.selObjs[i].updateCross(false);
    		this.pad.selObjs[i].hawkpad.updateCross(false);
    	}
    	
    	this.pad.selObjs = [];
    	this.pad.selAnchor = null;
    	var activeObjects = this.map.getActiveObjects();
    	for(var i = 0; i< activeObjects.length;i++){
    		if(activeObjects[i].type == 'cross'){
    			this.pad.selAnchor = activeObjects[i].pad.crosses[activeObjects[i].id]; 
    		}else if(activeObjects[i].type == 'goa'){
    		}
    		else if(activeObjects[i].pad && (activeObjects[i].pad.padType == 'mainMark' || activeObjects[i].pad.padType == 'uninspectZone'|| activeObjects[i].pad.padType == 'inspectZone')){
    			this.pad.selObjs.push(activeObjects[i].pad.panelpad);
    			activeObjects[i].pad.updateCross(true);
    			activeObjects[i].pad.panelpad.updateCross(true);
    		}
    	}
    	
    	
    	if (activeObjects.length > 1) {
    		var obj = this.map.getActiveObject();
    		obj.set({
    			hasControls:false,
    			hasRotatingPoint:false,
    		});
        }
    	
    	if(this.pad.selAnchor){
    		this.curPad = this.pad.selAnchor.pad.hawkpad;
    		this.parent.map._setActiveObject(this.pad.selAnchor.pad.crosses[this.pad.selAnchor.id]);
    	}
    	else{
    		if(this.pad.selObjs.length > 0){
    			this.curPad = this.pad.selObjs[0].hawkpad;
    			this.parent.map._setActiveObject(this.pad.selObjs[0].crosses[0]);
    			this.pad.selAnchor = this.pad.selObjs[0].crosses[0]; 
    		}
    			
    	}
    	
    	var hidden = this.pad.curType != 'inspectZone' || this.pad.selObjs.length == 0;
    	this.$el.find('.fa-align-justify').toggleClass('o_hidden',hidden);
    	var hidden = this.pad.selObjs.length == 0;
    	this.$el.find('.fa-copy').toggleClass('o_hidden',hidden);
    	
    	this.parent.map.renderAll();
    },

    _onSelectionCleared: function(opt){
    	if(this.map.hoverCursor == 'crosshair' || this.map.hoverCursor == 'copy')
    		return;
    	
    	for(var i = 0; i< this.pad.selObjs.length;i++){
    		this.pad.selObjs[i].updateCross(false);
    		this.pad.selObjs[i].hawkpad.updateCross(false);
    	}
    	
    	this.pad.selObjs = [];
    	this.pad.selAnchor = null;
    	this.$el.find('.fa-cut').toggleClass('o_hidden',true);
    	this.curPad = null;
    	
    	var hidden = this.pad.curType != 'inspectZone' || this.pad.selObjs.length == 0;
    	this.$el.find('.fa-align-justify').toggleClass('o_hidden',hidden);
    	var hidden = this.pad.selObjs.length == 0;
    	this.$el.find('.fa-copy').toggleClass('o_hidden',hidden);
    	
    	this.parent.map.discardActiveObject();
    	this.parent.map.renderAll();
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
			
			opt.target.pad.panelpad.periodX = period*fabric.util.sin(fabric.util.degreesToRadians(opt.target.angle));
			opt.target.pad.panelpad.periodY = period*fabric.util.cos(fabric.util.degreesToRadians(opt.target.angle));
     	}
     },
     
     _checkFrame:function(ux,uy,id,isInner){
 		if(isInner){
 			if(id == 0){
 				return ux > this.parent.outerFrame.points[0].ux && uy > this.parent.outerFrame.points[0].uy;
 			}
 			if(id == 1){
 				return ux < this.parent.outerFrame.points[1].ux && uy < this.parent.outerFrame.points[1].uy;
 			}
 		}else{
 			if(id == 0){
 				return ux < this.parent.innerFrame.points[0].ux && uy < this.parent.innerFrame.points[0].uy;
 			}
 			if(id == 1){
 				return ux > this.parent.innerFrame.points[1].ux && uy > this.parent.innerFrame.points[1].uy;
 			}
 		}
 	},
     
    _onObjectMoving: function(opt){
    	if(this.map.hoverCursor !== 'default')
    		return;
    	if(opt.target.type != "cross")
    		return;
    	
    	if(opt.target.pad.padType == 'frame'){
			var {dOutputX:ux2, dOutputY:uy2} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(opt.target.left,this.image.height-opt.target.top);
			if(this._checkFrame(ux2,uy2,opt.target.id,opt.target.pad.panelpad == this.parent.innerFrame)){
				opt.target.pad.points[opt.target.id].x = opt.target.left;
				opt.target.pad.points[opt.target.id].y = opt.target.top;
				if(opt.target.pad.polyline){
		    		opt.target.pad.update();
		    	}
				
				opt.target.pad.panelpad.points[opt.target.id].ux = ux2;
				opt.target.pad.panelpad.points[opt.target.id].uy = uy2;
				let {dOutputX:x2, dOutputY:y2} = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux2,uy2);
				opt.target.pad.panelpad.points[opt.target.id].x = x2;
				opt.target.pad.panelpad.points[opt.target.id].y = this.parent.image.height - y2;
				opt.target.pad.panelpad.update();
		    	
				this.parent._drawRegion();
				this.parent.pad.isModified = true;
				this.drawPad();
			}else{
				opt.target.left = opt.target.pad.points[opt.target.id].x;
				opt.target.top = opt.target.pad.points[opt.target.id].y;
			}
		}else if(opt.target.pad.padType == 'mainMark'){
			var ux = opt.target.pad.panelpad.points[opt.target.id?0:1].ux;
			var uy = opt.target.pad.panelpad.points[opt.target.id?0:1].uy;
    		var {dOutputX:ux2, dOutputY:uy2} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(opt.target.left,this.image.height-opt.target.top);
    		this.parent.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(Math.min(ux,ux2),Math.min(uy,uy2),Math.max(ux,ux2),Math.max(uy,uy2),true);
    		if(this.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap.length == 1){
    			opt.target.pad.points[opt.target.id].x = opt.target.left;
    			opt.target.pad.points[opt.target.id].y = opt.target.top;
    			if(opt.target.pad.polyline){
    	    		opt.target.pad.update();
    	    	}
    			this.parent.register(opt.target.pad.panelpad);
    			
    			opt.target.pad.panelpad.points[opt.target.id].ux = ux2;
				opt.target.pad.panelpad.points[opt.target.id].uy = uy2;
				let {dOutputX:x2, dOutputY:y2} = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux2,uy2);
				opt.target.pad.panelpad.points[opt.target.id].x = x2;
				opt.target.pad.panelpad.points[opt.target.id].y = this.parent.image.height - y2;
				opt.target.pad.panelpad.update();
				
    			opt.target.pad.panelpad.blocks = _.map(this.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
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
    			
    			this.parent.pad.isModified = true;
    			this.pad.isMainMarkModified = true;
    			
    		}else{
				opt.target.left = opt.target.pad.points[opt.target.id].x;
				opt.target.top = opt.target.pad.points[opt.target.id].y;
    			this.parent.notification_manager.notify(_t('Incorrect Operation'),_t('Mark is across multiple IPs!'),false);
    		}
		}else{
			opt.target.pad.points[opt.target.id].x = opt.target.left;
			opt.target.pad.points[opt.target.id].y = opt.target.top;
			if(opt.target.pad.polyline){
	    		opt.target.pad.update();
	    	}
			this.parent.register(opt.target.pad.panelpad);
			var {dOutputX:ux2, dOutputY:uy2} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(opt.target.left,this.image.height-opt.target.top);
			opt.target.pad.panelpad.points[opt.target.id].ux = ux2;
			opt.target.pad.panelpad.points[opt.target.id].uy = uy2;
			let {dOutputX:x2, dOutputY:y2} = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux2,uy2);
			opt.target.pad.panelpad.points[opt.target.id].x = x2;
			opt.target.pad.panelpad.points[opt.target.id].y = this.parent.image.height - y2;
			opt.target.pad.panelpad.update();
			
			this.parent.pad.isModified = true;
		}
    	
    	this.map.renderAll();
    	this.parent.map.renderAll();
    	opt.e.stopPropagation();
        opt.e.preventDefault();
    },
    
    _onMouseDown:function(opt){
    	this.map._isMousedown = true;
    	this.map.startPointer = opt.pointer;
    },
	_onMouseMove:function(opt){
		if(this.image){
			var zoom = this.map.getZoom();
			var x = opt.e.offsetX;
			var y = opt.e.offsetY;
			let {dOutputX:ux,dOutputY:uy} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(x/zoom,this.image.height-y/zoom);
			$(".map-info").text("image(x:"+Math.round(x/zoom)+",y:"+Math.round(y/zoom)+") window(x:"+x+",y:"+y+") um(x:"+ux+',y:'+uy);
		}
		
    	opt.e.stopPropagation();
        opt.e.preventDefault();
    		
	},
	_onMouseOut:function(opt){
		$(".map-info").text("");
		
		if(opt.target && opt.target.pad && (opt.target.pad.padType == 'mainMark' || opt.target.pad.padType == 'subMark')){
			if(this.markShow){
				this.map.remove(this.markShow);
				this.map.renderAll();
				this.markShow = null;
			}
		}
	},
	
	_zoom:function(delta,x,y){
		var zoom = this.map.getZoom();
		var x1 = x / zoom;
   	 	var y1 = y / zoom;
   	 	var div = this.$('div.canvas-map').length? this.$('div.canvas-map'): this.$el;
		
   	 	zoom = zoom + delta;
   	 	zoom = Math.floor(zoom*10)/10;
   	 	if (zoom <= this.minZoom) zoom = this.minZoom;
   	 	if(MAX_sIZE < (this.image.width*zoom*this.image.height*zoom)){
   	 		let {dOutputX:ux1, dOutputY:uy1} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(x1,this.image.height-y1);
   	 		let {dOutputX:x2, dOutputY:y2} = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux1,uy1);
   	 		this.parent.hawkeye.left = x2;
   	 		this.parent.hawkeye.top = this.parent.image.height - y2;
   	 		this.parent.hawkeye.width -= this.parent.hawkeye.width/10;
   	 		this.parent.hawkeye.height -= this.parent.hawkeye.height/10;
   	 		this.parent.hawkeye.setCoords();
   	 		this.parent.map.renderAll();
   	 		this.showImage(zoom);
   	 	}else{
   	 		x = x1 * zoom - (x - div.scrollLeft());
   	 		y = y1 * zoom - (y - div.scrollTop());
		
   	 		this.map.setZoom(zoom);
   	 		this.map.setDimensions({width:this.image.width*zoom,height:this.image.height*zoom});
   	 		
   	 		this.$('div.canvas-map').scrollTop(y);
   	 		this.$('div.canvas-map').scrollLeft(x);
   	 		
   	 	}
    },
    
    _onMouseUp:function(opt){
    	var needUpdateHawk = false;
    	var zoom = this.map.getZoom();
    	var endPointer = _.clone(opt.pointer);
    	var _isDrawRect = this.map.startPointer.x != endPointer.x ||this.map.startPointer.y != endPointer.y;
		
    	if(!_isDrawRect && (this.map.hoverCursor == 'zoom-in' || this.map.hoverCursor == 'zoom-out')){
    		var delta = this.map.hoverCursor == 'zoom-in'?0.2:-0.2;
    		this._zoom(delta,opt.e.offsetX,opt.e.offsetY);
    		opt.e.preventDefault();
     		opt.e.stopPropagation();
    	}else if(!_isDrawRect && this.map.hoverCursor == 'copy' && this.pad.selObjs.length > 0){
    		
    		let {dOutputX:ux,dOutputY:uy} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(endPointer.x/zoom,this.image.height-endPointer.y/zoom);
    		var uoffsetX = ux - this.pad.selAnchor.pad.points[this.pad.selAnchor.id].ux;
    		var uoffsetY = uy - this.pad.selAnchor.pad.points[this.pad.selAnchor.id].uy;
    		
    		var tmp = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
    		endPointer.x = tmp.dOutputX;
    		endPointer.y = this.parent.image.height-tmp.dOutputY;
    		var offsetX = endPointer.x - this.pad.selAnchor.left;
    		var offsetY = endPointer.y - this.pad.selAnchor.top;
    		
    		var self = this;
    		var pads = [];
    		this.pad.selObjs.forEach(function(obj){
    			var pad = new Mycanvas.MyPolyline(self.parent.map,obj.padType,false);
    			if(obj.padType == 'mainMark'){
    				var left = Math.min(obj.points[0].ux,obj.points[1].ux) + uoffsetX;
    				var right = Math.max(obj.points[0].ux,obj.points[1].ux) + uoffsetX;
    				var bottom = Math.min(obj.points[0].uy,obj.points[1].uy) + uoffsetY;
    				var top = Math.max(obj.points[0].uy,obj.points[1].uy) + uoffsetY;
    				self.parent.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(left,bottom,right,top,true);
            		if(self.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap.length == 1){
            			pad.blocks = _.map(self.parent.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
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
            			
            			self.pad.isMainMarkModified = true;
            		}else{
            			self.parent.notification_manager.notify(_t('Incorrect Operation'),_t('Mark is across multiple IPs!'),false);
            			return;
            		}
	    		}

	    		for(var i = 0; i < obj.points.length; i++){
	    			pad.points.push({
	    				x: obj.points[i].x + offsetX,
	    				y: obj.points[i].y + offsetY,
	    				ux: obj.points[i].ux + uoffsetX,
	    				uy: obj.points[i].uy + uoffsetY,
	    			});
	    		}
	    		pad.update();
				
				if(obj.padType == 'inspectZone'){
					pad.periodX = obj.periodX || 0;
					pad.periodY = obj.periodY || 0;
					pad.D1G1 = obj.D1G1 || 0;
	    		}
				
				self.pad.objs.push(pad);
				pads.push(pad)
    		});
    		this.parent.register(pads,'copy');
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
				this.parent.map.discardActiveObject();
				var rect = new Mycanvas.MyPolyline(this.parent.map,this.pad.curType,false);
				this.parent.register(rect);
				
				var tmp = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
	    		rect.addPoint({x:tmp.dOutputX, y:this.parent.image.height-tmp.dOutputY,ux,uy});

	    		tmp = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux2,uy2);
				rect.addPoint({x:tmp.dOutputX, y:this.parent.image.height-tmp.dOutputY,ux:ux2,uy:uy2});
				
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
					
					this.pad.isMainMarkModified = true;
				}
	    		
	    		needUpdateHawk = true;
	    		//this.curPad = rect;
	    		this.pad.objs.push(rect);
	    		this.pad.isModified = true;
			}else{
				this.parent.notification_manager.notify(_t('Incorrect Operation'),_t('Mark is across multiple IPs!'),false);
			}
    	}else if(!_isDrawRect && this.map.hoverCursor == 'crosshair' && (this.pad.curType=='inspectZone' || this.pad.curType=='uninspectZone')){
    		if(!this.curPad){
    			var pad = new Mycanvas.MyPolyline(this.parent.map,this.pad.curType,false);
				this.curPad = new Mycanvas.MyPolyline(this.map,this.pad.curType,true);
				this.curPad.panelpad = pad;
				pad.hawkpad = this.curPad;
				this.pad.objs.push(pad);
			}
    		this.parent.register(this.curPad.panelpad);
    		
			let {dOutputX:ux,dOutputY:uy} = this.parent.coordinate.HawkmapCoordinateToUMCoordinate(endPointer.x/zoom,this.image.height-endPointer.y/zoom);
    		tmp = this.parent.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);

    		if(this.curPad.panelpad.addPoint({x:tmp.dOutputX, y:this.parent.image.height-tmp.dOutputY,ux,uy})){
    			this.curPad.addPoint({x: endPointer.x/zoom, y: endPointer.y/zoom})
    			this.pad.isModified = true;
    		}else{
    			this.parent.notification_manager.notify(_t('Incorrect Operation'),_t('Please enter valid point!'),false);
    		}
    			
		}else if( _isDrawRect && this.map.hoverCursor == 'default'){
			/*var objs = this.map.getActiveObjects();
			if(objs.length){
				this.map.discardActiveObject();
				this.map.setActiveObject(objs[0]);
			}*/
		}

    	if(needUpdateHawk){
    		this.drawPad();
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
        event.preventDefault && event.preventDefault();   

        var y = event.clientY - event.data._y;
        var x = event.clientX - event.data._x;
        var w=window.innerWidth|| document.documentElement.clientWidth|| document.body.clientWidth;
        var h=window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight;
        
        if(y < 0)
        	y = 0;
        else if(y > h - 30)
        	y = h - 30;
        
        if(x < -event.data.el.clientWidth + 100)
        	x = -event.data.el.clientWidth + 100;
        else if(x > w - 100)
        	x = w - 100;
        
        event.data.el.style.top = y + "px";
        event.data.el.style.left = x + "px";
    },
    _on_headMouseup : function (event)
    {
    	event.data.$(this.handle)[0].releaseCapture && event.data.$(this.handle)[0].releaseCapture();
    	$(document).off('mousemove');
    	$(document).off('mouseup');
    },
    _on_close:function(){
    	this.parent.hawkeye.visible = false;
    	this.parent.map.renderAll();
    	
    	//delete this.parent.hawkmap;
    	//this.destroy();
    	this.do_hide();
    },
    
    _onButtonSelectMode:function(e){
    	var self = this;  	
   		this.map.hoverCursor = e.currentTarget.dataset.mode;    			
    	$('.panel-heading button').removeClass('active');
    	$(e.currentTarget).addClass('active');
    	
    	this.map.forEachObject(function(obj){
			if(obj.pad && obj.pad.padType == self.pad.curType){
				obj.lockMovementX = self.map.hoverCursor != 'default';
				obj.lockMovementY = self.map.hoverCursor != 'default';
				obj.hoverCursor = self.map.hoverCursor == 'default'?'move':'';
				obj.hasControls = obj.type == 'goa' && self.map.hoverCursor == 'default';		
				if(obj.type === 'cross'){
					obj.visible = self.map.hoverCursor == 'default' && obj.pad.padType === 'frame';
				}
			}
		});
    	
    	if(this.map.hoverCursor == 'default'){
    		this.map.discardActiveObject();
    		this.curPad = null;
    	}else if(this.map.hoverCursor == 'crosshair'){
			for(var i = 0; i< this.pad.selObjs.length;i++){
	    		this.pad.selObjs[i].updateCross(false);
	    		this.pad.selObjs[i].hawkpad.updateCross(false);
	    	}
	    	
	    	this.pad.selObjs = [];
	    	this.pad.selAnchor = null;
    	}else if(this.map.hoverCursor == 'copy'){
    		
    	}else{
    		this.map.discardActiveObject();
    	}
    		
    	this.map.requestRenderAll();
    },
    
    _onButtonCut:function(){
    	var objs = this.map.getActiveObjects();
    	if(objs.length == 1 && objs[0].type =='cross' && objs[0].pad.padType && objs[0].pad.padType == this.pad.curType && objs[0].pad.padType != 'frame'){
    		this.parent.register(objs[0].pad.panelpad);
    		var pad = objs[0].pad;
    		var crosses = objs[0].pad.crosses;
    		
    		for(var i =0 ; i<crosses.length; i++){
    			if(crosses[i] == objs[0]){
    				pad.removePoint(i);
    				pad.panelpad.removePoint(i);
    				
    				if(crosses.length == 0){
    					var length = this.pad.objs.length;
    	        		for(var i =0 ; i<length; i++){
    	        			if(this.pad.objs[i] == pad.panelpad){
    	        				this.pad.objs.splice(i,1);
    	        				break;
    	        			}
    	        		}
    				}
    				
    				if(objs[0].pad.padType == 'mainMark'){
    					this.pad.isMainMarkModified = true;
    	    		}
    					
    	    		this.pad.isModified = true;
    				break;
    			}
    		}
    		
    	}else{
    		this.parent.notification_manager.notify(_t('Incorrect Operation'),_t('Please select one object!'),false);
    	}
    	
    },
    
    _onButtonAlign:function(){
    	if(this.pad.curType != 'inspectZone')
    		return;
    	
    	var self = this;
    	var objs = this.map.getActiveObjects();
    	if(objs.length == 1 && objs[0].pad.padType && objs[0].pad.padType == this.pad.curType){
    		
    		var pad = objs[0].pad.panelpad;
        	var $content = $(QWeb.render("GoaDialog"));
            
            this.dialog = new Dialog(this, {
                title: _t('Set Goa'),
                size: 'medium',
                buttons: [{text: _t('Confirm'), classes: 'btn-primary', close: true, click: function () {
                	pad.periodX = parseFloat(this.$content.find('.o_set_periodx_input').val());
                	pad.periodY = parseFloat(this.$content.find('.o_set_periody_input').val());
                	pad.D1G1 = this.$content.find('.o_set_d1g1_input')[0].checked?1:0;
                	
                	var angle,period;
        			if(pad.periodY == 0){
     					angle = fabric.util.degreesToRadians(90);
     					period = pad.periodX;
     				}else if(pad.periodX == 0){
     					angle = fabric.util.degreesToRadians(0);
     					period = pad.periodY;
     				}else{
     					angle = Math.atan(pad.periodX/pad.periodY);
     					period = pad.periodY / fabric.util.cos(angle);
     				}
        			angle = fabric.util.radiansToDegrees(angle);
        			period = period / self.parent.coordinate.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionY;
        			
        			if(objs[0].pad.goa === undefined){
        				var minX,minY,maxX,maxY;
        				objs[0].pad.points.forEach(function(p){
                			minX = minX == undefined?p.x:(p.x>minX?minX:p.x);
                			minY = minY == undefined?p.y:(p.y>minY?minY:p.y);
                			maxX = maxX == undefined?p.x:(p.x<maxX?maxX:p.x);
                			maxY = maxY == undefined?p.y:(p.y<maxY?maxY:p.y);
                		})
            			objs[0].pad.goa = new Mycanvas.Goa({
            				left:(minX+maxX)/2,
                			top:(minY+maxY)/2,
         	    			pad:objs[0].pad,
         	    			period,
        					angle,
        					visible:true
         	    		}); 
         	        	self.map.add(objs[0].pad.goa);
        			}else{
        				var dirty = true;
            			var height = period * objs[0].pad.goa.number;
            			objs[0].pad.goa.set({angle,period,dirty,height});
            			objs[0].pad.goa.setCoords();
        			}
                	self.map.renderAll();
                    
                }}, {text: _t('Discard'), close: true}],
                $content: $content,
            });
            this.dialog.opened().then(function () {
                self.dialog.$('.o_set_periodx_input').val(pad.periodX);
                self.dialog.$('.o_set_periody_input').val(pad.periodY);
                self.dialog.$('.o_set_d1g1_input')[0].checked = pad.D1G1 == 1;
                
            });
            this.dialog.open();
    	}
    	
    },
    _showMark:function(markImage,opt){
		var self = this;
		var tempCanvas = new fabric.StaticCanvas();
	    tempCanvas.setDimensions({
	      width: opt.target.pad.panelpad.blocks[0].iInterSectionWidth+6,
	      height:_.reduce(opt.target.pad.panelpad.blocks, function(memo, block){return (memo + (block.iInterSectionHeight?block.iInterSectionHeight:0));}, 0)+6
	    });
	    
	    tempCanvas.add(markImage);
	    markImage.left = -opt.target.pad.panelpad.imgStartX +2;
	    markImage.top = -markImage.height + tempCanvas.height + 2;
	    markImage.setCoords();
	    
	    tempCanvas.add(new fabric.Rect({
	    	left:3,
	    	top:3,
	    	width:tempCanvas.width -6,
	    	height:tempCanvas.height -6,
	    	fill:false,
	    	strokeWidth:3,
	    	stroke:'blue'
	    }));
	    
	    tempCanvas.renderAll();
	    
	    var img = new Image();
	    img.onload = function() {
	    	if(self.markShow){
	    		self.map.remove(self.markShow);
			}
	    	self.markShow = new fabric.Image(img, {
	    		left: opt.target.left > (self.image.width/2)? (opt.target.left - tempCanvas.width - 10):(opt.target.left + opt.target.width + 10),
	    		top: opt.target.top > (self.image.height/2)? (opt.target.top - tempCanvas.height - 10):(opt.target.top + opt.target.height + 10),
	    		hasControls: false,
	    	});
	    	self.map.add(self.markShow);
	    	self.map.renderAll();
	    }
	    img.src = tempCanvas.toDataURL();
	},
	
	_onMouseOver:function(opt){
		var self = this;
		if(opt.target && opt.target.pad ){
			var d = new Date();
			if(opt.target.pad.padType == 'mainMark'){
				if(this.pad.isMainMarkModified){
					//this.parent.notification_manager.notify(_t('Mark has been modified'),_t('Please save first!'),false);
				}else{
					if(this.parent.mainMarkImage){
						this._showMark(this.parent.mainMarkImage,opt)
					}else{
						var src = '/glassdata/'+ self.parent.glassName +'/'+ self.parent.panelName +'/mainMark.bmp'+'?t='+ d.getTime();
						fabric.Image.fromURL(src, function(img) {
							self.parent.mainMarkImage = img;
							self.parent.mainMarkImage.originX = 'left';
							self.parent.mainMarkImage.originY = 'top';
							self._showMark(self.parent.mainMarkImage,opt)
						});
					}
				}
			}else if(opt.target.pad.padType == 'subMark'){
				if(this.pad.isSubMarkModified){
					this.parent.notification_manager.notify(_t('Mark has been modified'),_t('Please save first!'),false);
				}else{
					if(this.subMarkImage){
						this._showMark(this.parent.subMarkImage,opt)
					}else{
						var src = '/glassdata/'+ self.parent.glassName +'/'+ self.parent.panelName +'/subMark.bmp'+'?t='+ d.getTime();
						fabric.Image.fromURL(src, function(img) {
							self.parent.subMarkImage = img;
							self.parent.subMarkImage.originX = 'left';
							self.parent.subMarkImage.originY = 'top';
							self._showMark(self.parent.subMarkImage,opt)
						});
					}
				}
			}else{
				return;
			}
			
			
		}
	},
    
});



return Hawkmap;

});