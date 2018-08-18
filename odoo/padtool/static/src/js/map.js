odoo.define('padtool.Map', function (require) {
"use strict";

var core = require('web.core');
var Widget = require('web.Widget');
var SystrayMenu = require('web.SystrayMenu');
var Mycanvas = require('padtool.Canvas');
var Hawkmap = require('padtool.Hawkmap');
var QWeb = core.qweb;
var _t = core._t;

var CanvasInfo = Widget.extend({
    template: 'Map.info',
    
    init: function (parent, value) {
        this._super(parent);

    },
});

var Map = Widget.extend({
	init: function(parent,action){
		this.action_manager = parent;
    	if(action && action.menu_id){
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
    	this._super.apply(this, arguments);
    	
    	this.defImage = new $.Deferred();
    	this.image = new fabric.Image();
    	var src = '/glassdata/'+ this.glassName +'/'+ this.panelName +'/' + this.padConf[this.panelName].panel_map
    	this.image.setSrc(src, function(img){
    		img.set({left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false });
    		self.map  = new fabric.Canvas('map',{
    			hoverCursor:'default',
    			stopContextMenu:false,
    			imageSmoothingEnabled:false,
    		});
    		self.map.isPanel = true;
    		var zoom = Math.max(self.map.getWidth()/img.width,self.map.getHeight()/img.height);
    		zoom = Math.floor(zoom*10)/10;
    		self.minZoom = zoom;
    		self.map.setZoom(zoom);
    		self.map.setDimensions({width:img.width*zoom,height:img.height*zoom});
    		self.map.add(img);

    		self.map.on('mouse:move',_.debounce(self._onMouseMove.bind(self), 100));    		
    		self.map.on('mouse:out', self._onMouseOut.bind(self)); 
    		self.map.on('mouse:up', self._onMouseUp.bind(self));
    		self.map.on('mouse:down',self._onMouseDown.bind(self));
    		self.map.on('mouse:dblclick',self._onMouseDblclick.bind(self));

    		//setTimeout(self._animate.bind(self), 500);
    		//self.map.on('object:moving',_.debounce(self._onObjectMoving.bind(self), 100));
    		//self.map.on('object:moving',self._onObjectMoving.bind(self));
    		self.map.on('object:moved',self._onObjectMoved.bind(self));
    		self.map.on('object:scaled',self._onObjectScaled.bind(self));
    		//self.map.on('object:moving',self._onObjectScaling.bind(self));
    		//self.map.on('object:scaling',self._onObjectScaling.bind(self));
    		//self.map.on('object:rotating',self._onObjectScaling.bind(self));
    		
    		self.map.on('selection:updated',self._onSelectionUpdated.bind(self));
    		self.map.on('selection:created',self._onSelectionUpdated.bind(self));
    		self.map.on('selection:cleared',self._onSelectionCleared.bind(self));
    		
    		self.keyupHandler = self._onKeyup.bind(self);
    		$('body').on('keyup', self.keyupHandler);
    		
    		self.keydownHandler = self._onKeydown.bind(self);
    		$('body').on('keydown', self.keydownHandler);

    		self.defImage.resolve();
    		
    		$.contextMenu({
    	        selector: '.canvas-map', 
    	        items: {
    	        	key1: {
    	                name: "Edit", 
    	                callback: self._onButtonSave.bind(self)
    	            },
    	            sep1: "---------",
    	            key2: {
    	                name: "Copy", 
    	                callback: $.noop
    	            },
    	            sep2: "---------",
    	            key3: {
    	                name: "Paste", 
    	                callback: $.noop
    	            }
    	        }, 
    	        
    	    });
    		
    	});
    	
    },
    
    destroy: function(){	
    	this._super.apply(this, arguments);
    	$('body').off('keyup', this.keyupHandler);
    	$('body').off('keydown', this.keydownHandler);
    },

  //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
      
    _onKeyup: function(e){
    	if(e.ctrlKey){
    		
    		if(e.which == 187){
    			if(this.hawkeye.visible){
    				var x = this.hawkmap.$('div.canvas-map').scrollLeft()+this.hawkmap.$('div.canvas-map').width()/2;
    	    		var y = this.hawkmap.$('div.canvas-map').scrollTop()+this.hawkmap.$('div.canvas-map').height()/2;
    				
    				this.hawkmap._zoom(0.2,x,y)
    			}
    			else{
    				var x = this.$el.scrollLeft()+this.$el.width()/2;
    	    		var y = this.$el.scrollTop()+this.$el.height()/2;
    	    		this._zoom(0.2,x,y)
    			}
    				
    		}	
    		else if(e.which == 189){
    			if(this.hawkeye.visible){
    				var x = this.hawkmap.$('div.canvas-map').scrollLeft()+this.hawkmap.$('div.canvas-map').width()/2;
    	    		var y = this.hawkmap.$('div.canvas-map').scrollTop()+this.hawkmap.$('div.canvas-map').height()/2;
    				this.hawkmap._zoom(-0.2,x,y)
    			}
    			else{
    				var x = this.$el.scrollLeft()+this.$el.width()/2;
    	    		var y = this.$el.scrollTop()+this.$el.height()/2;
    				this._zoom(-0.2,x,y)
    			}
    				
    		}else if(String.fromCharCode(e.which).toLowerCase() === 's'){
    			this._onButtonSave();
    		}else if(String.fromCharCode(e.which).toLowerCase() === 'c'){
    			this._onButtonCopy();
    		}else if(String.fromCharCode(e.which).toLowerCase() === 'x'){
    			this._onButtonCut();
    		}else if(String.fromCharCode(e.which).toLowerCase() === 'h'){
    			this._onButtonHawkeye();
    		}else if(String.fromCharCode(e.which).toLowerCase() === 'd'){
    			this._onButtonTrash();
    		}else if(String.fromCharCode(e.which).toLowerCase() === 'g'){
    			this._onButtonAlign();
    		}
    		
    		e.stopPropagation();
            e.preventDefault();	
    	}
    },
    _onKeydown: function(e){
    	if(e.ctrlKey){
    		e.stopPropagation();
            e.preventDefault();	
    	}
    },
    _onSelectionUpdated: function(opt){
    	if(opt.selected.length == 1 && opt.selected[0].type == 'cross'){
    		this.pad.selAnchor = opt.selected[0]; 
    		return;
    	}
    	
    	for(var i = 0; i< this.pad.selObjs.length;i++){
    		this.pad.selObjs[i].updateCross(false);
    	}
    	
    	this.pad.selObjs = [];
    	this.pad.selAnchor = null;
    	var activeObjects = this.map.getActiveObjects();
    	for(var i = 0; i< activeObjects.length;i++){
    		if(activeObjects[i].type == 'cross'){
    			this.pad.selAnchor = activeObjects[i]; 
    		}else if(activeObjects[i].pad && (activeObjects[i].pad.padType == 'mainMark' || activeObjects[i].pad.padType == 'uninspectZone'|| activeObjects[i].pad.padType == 'inspectZone')){
    			this.pad.selObjs.push(activeObjects[i].pad);
    			activeObjects[i].pad.updateCross(true);
    		}
    	}
    	
    	if(this.pad.selAnchor)
    		this.map._setActiveObject(this.pad.selAnchor);
    	else{
    		if(this.pad.selObjs.length > 0){
    			this.map._setActiveObject(this.pad.selObjs[0].crosses[0]);
    			this.pad.selAnchor = this.pad.selObjs[0].crosses[0]; 
    		}
    			
    	}
    	
    	this.hawkmap && this.hawkmap.$el.find('.fa-copy').toggleClass('o_hidden',this.pad.selObjs.length == 0);
    },

    _onSelectionCleared: function(opt){
    	for(var i = 0; i< this.pad.selObjs.length;i++){
    		this.pad.selObjs[i].updateCross(false);
    	}
    	
    	this.pad.selObjs = [];
    	this.pad.selAnchor = null;
    	this.hawkmap && this.hawkmap.$el.find('.fa-copy').toggleClass('o_hidden',this.pad.selObjs.length == 0);
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
      
      _onObjectScaled: function(opt){
     	 if(opt.target.type == "hawkeye"){
     		if(((opt.target.height * opt.target.scaleY) / this.coordinate.pmpPanelMapPara.dRatioY) > this.globalConf.hawk_height){
     			opt.target.scaleY = this.globalConf.hawk_height * this.coordinate.pmpPanelMapPara.dRatioY / opt.target.height ;
     			this.map.renderAll();
     		}
     		if(((opt.target.width *  opt.target.scaleX) / this.coordinate.pmpPanelMapPara.dRatioX) > this.globalConf.hawk_width){
     			opt.target.scaleX = this.globalConf.hawk_width * this.coordinate.pmpPanelMapPara.dRatioX / opt.target.width;
     			this.map.renderAll();
     		}
     		$('.panel-hawk').toggleClass('o_hidden');
     		$('.panel-hawk').toggleClass('o_hidden');
     		
      		this.hawkmap.showImage();
      	}
      },
      
      _onObjectMoved: function(opt){
    	 if(opt.target.type == "hawkeye"){
     		this.hawkmap.showImage();
     	}
     },
     
    _onMouseDown:function(opt){

    	this.map._isMousedown = true;
    	this.map.startPointer = opt.pointer;
    },
	_onMouseMove:function(opt){
		var zoom = this.map.getZoom();
		var x = opt.e.offsetX;
		var y = opt.e.offsetY;
		
		let {dOutputX:ux, dOutputY:uy} = this.coordinate.PanelMapCoordinateToUMCoordinate(x/zoom,this.image.height- y/zoom);

		$(".map-info").text('image(x:'+Math.round(x/zoom)+',y:'+Math.round(y/zoom)+') window(x:'+x+',y:'+y+') um(x:'+ux+',y:'+uy+')');
		
    	opt.e.stopPropagation();
        opt.e.preventDefault();	
	},
	_onMouseOut:function(opt){
		$(".map-info").text("");

		opt.e.stopPropagation();
        opt.e.preventDefault();	
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
      
     _zoom:function(delta,x,y){
    	 var zoom = this.map.getZoom();
    	 var x1 = x / zoom;
    	 var y1 = y / zoom;
 		
    	 zoom = zoom + delta;
    	 zoom = Math.floor(zoom*10)/10;
    	 if (zoom > 1.2) zoom = 1.2;
    	 if (zoom <= this.minZoom) zoom = this.minZoom;
 		
    	 var div = this.$('div.canvas-map').length? this.$('div.canvas-map'): this.$el;
 		
    	 x = x1 * zoom - (x - div.scrollLeft());
    	 y = y1 * zoom - (y - div.scrollTop());
 		
    	 this.map.setZoom(zoom);
    	 this.map.setDimensions({width:this.image.width*zoom,height:this.image.height*zoom});
 		//this.image.scale(zoom);

    	 div.scrollTop(y);
    	 div.scrollLeft(x);
     },
     
     _onMouseDblclick:function(opt){
    	 if(this.hawkeye && this.map.hoverCursor == 'default'){
    		 var zoom = this.map.getZoom();
	 	    this.hawkeye.set({ 
	     			top: opt.pointer.y/zoom, 
	     			left: opt.pointer.x/zoom,
	     			visible:true,
	     		});
	 	   this.hawkeye.setCoords();
				
	     	this.hawkeye.bringToFront();
			
			
			if(this.hawkmap){
				this.hawkmap.destroy();
	    		delete this.hawkmap;
	    	}
			
	    	this.hawkmap = new Hawkmap(this);
	        this.hawkmap.pad = this.pad;
	        this.hawkmap.appendTo('body');
	        this.hawkmap.showImage();

		}
     },
     

    _onMouseUp:function(opt){
    	var zoom = this.map.getZoom();
    	var endPointer = opt.pointer;
    	var _isDrawRect = this.map.startPointer.x != endPointer.x ||this.map.startPointer.y != endPointer.y;
    	
    	endPointer.x /= zoom;
    	endPointer.y /= zoom;
    	if(!_isDrawRect && (this.map.hoverCursor == 'zoom-in' || this.map.hoverCursor == 'zoom-out')){
    		var delta = this.map.hoverCursor == 'zoom-in'?0.2:-0.2;
    		this._zoom(delta,opt.e.offsetX,opt.e.offsetY);
    		opt.e.preventDefault();
     		opt.e.stopPropagation();
    	}
    	this.map._isMousedown = false;
    },
  
     _drawPad:function(){ 
 		var self = this;
 		this.innerFrame = null;
 		this.outerFrame = null;
 		this.jsonpad.objs && this.jsonpad.objs.forEach(function(pad){
 			var showCross = pad.padType == 'frame';
 			var obj = new Mycanvas.MyPolyline(self.map,pad.padType,showCross);
 			obj = _.extend(obj, pad);
 			obj.update();
 			self.pad.objs.push(obj);
 			
 			if(pad.padType == 'frame'){
 		 		if(self.innerFrame == null)
 		 			self.innerFrame = obj;
 		 		else if(self.outerFrame == null)
 		 			self.outerFrame = obj;
 			}
 		})
 		
 		if(this.innerFrame == null || this.outerFrame == null){
 			this.innerFrame = new Mycanvas.MyPolyline(this.map,'frame',true);
 			let {dOutputX:ux,dOutputY:uy} = this.coordinate.PanelMapCoordinateToUMCoordinate(500,500);
 			this.innerFrame.addPoint({x:500,y:this.image.height-500,ux,uy});
 			let {dOutputX:ux2,dOutputY:uy2} = this.coordinate.PanelMapCoordinateToUMCoordinate(this.image.width-500,this.image.height-500);
 			this.innerFrame.addPoint({x:this.image.width-500,y:500,ux:ux2,uy:uy2});
 			this.pad.objs.push(this.innerFrame);

 			this.outerFrame = new Mycanvas.MyPolyline(this.map,this.pad.curType,true);
			let {dOutputX:ux3,dOutputY:uy3} = this.coordinate.PanelMapCoordinateToUMCoordinate(300,300);
			this.outerFrame.addPoint({x:300,y:this.image.height-300,ux:ux3,uy:uy3});
			let {dOutputX:ux4,dOutputY:uy4} = this.coordinate.PanelMapCoordinateToUMCoordinate(this.image.width-300,this.image.height-300);
			this.outerFrame.addPoint({x:this.image.width-300,y:300,ux:ux4,uy:uy4});
			this.pad.objs.push(this.outerFrame);

			this._drawRegion();
		}

 		this.innerFrame.crosses[0].bringToFront();
 		this.innerFrame.crosses[1].bringToFront();
 		this.outerFrame.crosses[0].bringToFront();
 		this.outerFrame.crosses[1].bringToFront();
 		this.innerFrame.polyline.selectable=false;
 		this.outerFrame.polyline.selectable=false;
 		
    	this.map.forEachObject(this.showObj.bind(this));

		this.map.discardActiveObject();
		this.map.renderAll();

     },

 	 _drawRegion: function(){
 		var x,y,ux,uy,obj; 
 		var innerFrame = this.innerFrame;
 		var outerFrame = this.outerFrame;
 		
 		var res = _.partition(this.pad.objs, function(obj){
 			return obj.padType == 'region';
 		});
 		this.pad.objs = res[1];
 		res[0].forEach(function(obj){
 			obj.clear();
 		})
 	    
 		 var top = innerFrame.points[1].uy + this.globalConf.region_overlap;
 		 while(true){
 			 var bottom = top - this.globalConf.region_height;
 			 var nextTop = bottom + this.globalConf.region_overlap;
 			if((nextTop - this.globalConf.region_height)  < innerFrame.points[0].uy - this.globalConf.region_overlap ){
 				bottom = innerFrame.points[0].uy - this.globalConf.region_overlap;
 			}
 			
 			obj = new Mycanvas.MyPolyline(this.map,"region");
 			obj.iFrameNo = 0;
 			ux = outerFrame.points[0].ux;
 			uy = bottom;
 			let {dOutputX:x1, dOutputY:y1} = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
 			obj.addPoint({x:x1,y:this.image.height-y1,ux,uy});
 			
 			ux = innerFrame.points[0].ux;
 			uy = top;
 			let {dOutputX:x2, dOutputY:y2} = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
 			obj.addPoint({x:x2,y:this.image.height-y2,ux,uy});
 			this.pad.objs.push(obj);
 			obj.polyline.selectable=false;
 			
 			obj = new Mycanvas.MyPolyline(this.map,"region");
 			obj.iFrameNo = 2;
 			ux = innerFrame.points[1].ux;
 			uy = bottom;
 			let {dOutputX:x3, dOutputY:y3} = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
 			obj.addPoint({x:x3,y:this.image.height-y3,ux,uy});
 			
 			ux = outerFrame.points[1].ux;
 			uy = top;
 			let {dOutputX:x4, dOutputY:y4} = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
 			obj.addPoint({x:x4,y:this.image.height-y4,ux,uy});
 			this.pad.objs.push(obj);
 			obj.polyline.selectable=false;
 			
 			top = nextTop;
 			if((top - this.globalConf.region_height) < innerFrame.points[0].uy  - this.globalConf.region_overlap)
 				break;
 		 }
 		 
 		obj = new Mycanvas.MyPolyline(this.map,"region");
		obj.iFrameNo = 1;
 		x = outerFrame.points[0].x;
 		ux = outerFrame.points[0].ux;
		y = outerFrame.points[0].y;
		uy = outerFrame.points[0].uy;
		obj.addPoint({x,y,ux,uy});
		
		x = outerFrame.points[1].x;
		ux = outerFrame.points[1].ux;
		y = innerFrame.points[0].y;
		uy = innerFrame.points[0].uy;
		obj.addPoint({x,y,ux,uy});
		this.pad.objs.push(obj);
		obj.polyline.selectable=false;
 		 
 		obj = new Mycanvas.MyPolyline(this.map,"region");
 		obj.iFrameNo = 3;
 		x = outerFrame.points[0].x;
 		ux = outerFrame.points[0].ux;
		y = innerFrame.points[1].y;
		uy = innerFrame.points[1].uy;
		obj.addPoint({x,y,ux,uy});
		
		x = outerFrame.points[1].x;
		ux = outerFrame.points[1].ux;
		y = outerFrame.points[1].y;
		uy = outerFrame.points[1].uy;
		obj.addPoint({x,y,ux,uy});
		this.pad.objs.push(obj);
		obj.polyline.selectable=false;
 		 
		
 	 },
 	 
 	 _getSubMark(){
 		var dPanelLeft,dPanelBottom,dPanelRight,dPanelTop,dPeriodX, dPeriodY;
 		var id = 1;
		
 		while(this.bifConf['auops.subpanel.subpanel_'+id+'.global_subpanel_data'] != undefined){
 			var pos = this.bifConf['auops.subpanel.subpanel_'+id+'.position.top_left'].split(',');
    		var left = parseFloat(pos[0]);
    		var top = parseFloat(pos[1]);
    		
    		pos = this.bifConf['auops.subpanel.subpanel_'+id+'.position.bottom_right'].split(',');
    		var right = parseFloat(pos[0]);
    		var bottom = parseFloat(pos[1]);
    		
    		var pos2 = this.bifConf['auops.subpanel.subpanel_'+id+'.position.top_right'].split(',');
    		var right2 = parseFloat(pos2[0]);
    		var top2 = parseFloat(pos2[1]);
    		
    		pos = this.bifConf['auops.subpanel.subpanel_'+id+'.position.bottom_left'].split(',');
    		var left2 = parseFloat(pos[0]);
    		var bottom2 = parseFloat(pos[1]);
    		
    		var tmp = left * Math.cos(-this.glass_angle) + top * Math.sin(-this.glass_angle) + this.glass_center_x;
    		top = -left * Math.sin(-this.glass_angle) + top * Math.cos(-this.glass_angle) + this.glass_center_y;
    		left = tmp;
    		
    		tmp = right * Math.cos(-this.glass_angle) + bottom * Math.sin(-this.glass_angle) + this.glass_center_x;
    		bottom = -right * Math.sin(-this.glass_angle) + bottom * Math.cos(-this.glass_angle) + this.glass_center_y;
    		right = tmp;
    		
    		tmp = left2 * Math.cos(-this.glass_angle) + bottom2 * Math.sin(-this.glass_angle) + this.glass_center_x;
    		bottom2 = -left2 * Math.sin(-this.glass_angle) + bottom2 * Math.cos(-this.glass_angle) + this.glass_center_y;
    		left2 = tmp;
    		
    		tmp = right2 * Math.cos(-this.glass_angle) + top2 * Math.sin(-this.glass_angle) + this.glass_center_x;
    		top2 = -right2 * Math.sin(-this.glass_angle) + top2 * Math.cos(-this.glass_angle) + this.glass_center_y;
    		right2 = tmp;
    		
    		var dOutputX = this.coordinate.pmpPanelMapPara.dPanelCenterX;
    		var dOutputY = this.coordinate.pmpPanelMapPara.dPanelCenterY;
    		if(dOutputX > left && dOutputX < right && dOutputY < bottom && dOutputY > top){
    			
    			var name = this.bifConf['auops.subpanel.subpanel_'+id+'.global_subpanel_data'];
    			
				pos = this.bifConf['auops.global_subpanel_data.'+name+'.cellneighbor.check.basicpixelsize'].split(',');
	    		var dPeriodX = parseFloat(pos[0]);
	    		var dPeriodY = parseFloat(pos[1]);

	    		this.pMarkRegionArray = this.coordinate.GetSubMark(Math.max(left,left2),Math.max(top,top2),Math.min(right,right2),Math.min(bottom,bottom2),dPeriodX, dPeriodY);
    			break;
    		}
    		id++;
 		}
 	 },
 	 
 	_drawSubMark:function(){
 		var res = _.partition(this.pad.objs, function(obj){
 			return obj.padType == 'subMark';
 		});
 		this.pad.objs = res[1];
 		res[0].forEach(function(obj){
 			obj.clear();
 		});
 		
 		this._getSubMark();
 		for(var i = 0; i < this.pMarkRegionArray.length; i++){
 			var width = this.pMarkRegionArray[i].dMarkWidth ;
 			var height = this.pMarkRegionArray[i].dMarkHeight;
 			
 			var rect = new Mycanvas.MyPolyline(this.map,'subMark');
 			
 			var ux = this.pMarkRegionArray[i].dPositionX- width/2;
			var uy = this.pMarkRegionArray[i].dPositionY+ height/2;
 			var tmp = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
    		rect.addPoint({
    			x:tmp.dOutputX, 
    			y:this.image.height - tmp.dOutputY,
    			ux,
    			uy
    		});
    		
    		ux = this.pMarkRegionArray[i].dPositionX+ width/2;
			uy = this.pMarkRegionArray[i].dPositionY- height/2;
    		tmp = this.coordinate.UMCoordinateToPanelMapCoordinate(ux,uy);
			rect.addPoint({
				x:tmp.dOutputX, 
				y:this.image.height - tmp.dOutputY,
				ux,
				uy
			});
			
			rect.iMarkDirectionType = this.pMarkRegionArray[i].iMarkDirectionType;

 			var uLeft = this.pMarkRegionArray[i].dPositionX - this.pMarkRegionArray[i].dMarkWidth/2;
 			var uRight = this.pMarkRegionArray[i].dPositionX + this.pMarkRegionArray[i].dMarkWidth/2;
 			var uTop = this.pMarkRegionArray[i].dPositionY + this.pMarkRegionArray[i].dMarkHeight/2;
 			var uBottom = this.pMarkRegionArray[i].dPositionY - this.pMarkRegionArray[i].dMarkHeight/2;
 			
 			this.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(uLeft,uBottom,uRight,uTop,true);
 			rect.blocks = _.map(this.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
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
 			
 			this.pad.objs.push(rect);
 		}
 		
 		this.pad.isSubMarkModified = true;
 	},
 	
});

SystrayMenu.Items.push(CanvasInfo);

return Map;

});