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
    		self.map  = new fabric.Canvas('map',{hoverCursor:'default',stopContextMenu:false});
    		var zoom = Math.max(self.map.getWidth()/img.width,self.map.getHeight()/img.height);
    		zoom = Math.floor(zoom*10)/10;
    		self.minZoom = zoom;
    		self.map.setZoom(zoom);
    		self.map.setDimensions({width:img.width*zoom,height:img.height*zoom});
    		self.map.add(img);

    		self.map.on('mouse:move',_.debounce(self._onMouseMove.bind(self), 100));    		
    		self.map.on('mouse:out', _.debounce(self._onMouseOut.bind(self), 110)); 
    		self.map.on('mouse:up', self._onMouseUp.bind(self));
    		self.map.on('mouse:down',self._onMouseDown.bind(self));

    		//setTimeout(self._animate.bind(self), 500);
    		//self.map.on('object:moving',_.debounce(self._onObjectMoving.bind(self), 100));
    		//self.map.on('object:moving',self._onObjectMoving.bind(self));
    		self.map.on('object:moved',self._onObjectMoved.bind(self));
    		self.map.on('object:scaled',self._onObjectScaled.bind(self));
    		self.map.on('object:moving',self._onObjectScaling.bind(self));
    		self.map.on('object:scaling',self._onObjectScaling.bind(self));
    		//self.map.on('object:rotating',self._onObjectScaling.bind(self));
    		
    		self.map.on('selection:updated',self._onObjectSelect.bind(self));
    		self.map.on('selection:created',self._onObjectSelect.bind(self));
    		
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
    _onObjectSelect: function(opt){
    	if(opt.target.polyline && opt.target.polyline.hawkeye){
    		opt.target.polyline.hawkeye.crosses[opt.target.id]&&this.hawkmap.map._setActiveObject(opt.target.polyline.hawkeye.crosses[opt.target.id]);
    		this.hawkmap.map.requestRenderAll();
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
     _onObjectScaling:function(){
    	 this.map.objectModifing = true;
     },
     
    _onMouseDown:function(opt){
    	if (this.contextMenuOpen) {
            this.contextMenuOpen = false;
            evt.preventDefault();
            return;
          }
    	
    	this.map._isMousedown = true;
    	this.map.startPointer = opt.pointer;
    },
	_onMouseMove:function(opt){
		var zoom = this.map.getZoom();
		var x = opt.e.offsetX;
		var y = opt.e.offsetY;
		
		let {dOutputX:ux, dOutputY:uy} = this.coordinate.PanelMapCoordinateToUMCoordinate(x/zoom,this.image.height- y/zoom);

		$(".map-info").text("image(x:"+Math.round(x/zoom)+",y:"+Math.round(y/zoom)+") window(x:"+x+",y:"+y+") um(x:"+ux+',y:'+uy);
		
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
    	}else if( _isDrawRect && this.map.hoverCursor == 'default'&& (!this.map.objectModifing)){
			var objs = this.map.getActiveObjects();
			if(objs.length){
				this.map.discardActiveObject();
				this.map.setActiveObject(objs[0]);
			}
			
			if(this.hawkeye && this.hawkeye.visible){
				var width = Math.abs(this.map.startPointer.x/zoom - endPointer.x);
				var height = Math.abs(this.map.startPointer.y/zoom - endPointer.y);

		 	    if((height / this.coordinate.pmpPanelMapPara.dRatioY) > this.globalConf.hawk_height){
		 	    	this.notification_manager.notify(_t('Incorrect Operation'),_t('Hawkeye is too high!'),false);
		 	    }else if((width / this.coordinate.pmpPanelMapPara.dRatioX) > this.globalConf.hawk_width){
		 	    	this.notification_manager.notify(_t('Incorrect Operation'),_t('Hawkeye is too wide!'),false);
		 	    }else{
		 	    	this.map.remove(this.hawkeye);
		 	    	this.hawkeye = new Mycanvas.Hawkeye({ 
		     			top: (this.map.startPointer.y/zoom + endPointer.y)/2, 
		     			left: (this.map.startPointer.x/zoom + endPointer.x)/2,
		     			width:width,
		     			height:height,
		     			visible:true,
		     		});
					
		     		this.map.add(this.hawkeye);
		     		this.hawkeye.bringToFront();
					this.hawkmap.showImage();
		 	    }
			}
			
		}
    	this.map._isMousedown = false;
    	this.map.objectModifing = false;
    },
  
     _drawPad:function(){ 
 		var self = this;
 		var innerFrame = null;
 		var outerFrame = null;
 		this.jsonpad.objs && this.jsonpad.objs.forEach(function(pad){
 			if(pad.padType == 'subMark')
 				return;
 			
 			var obj = new Mycanvas.MyPolyline(self.map,pad.padType);
 			pad.points.forEach(function(p){
 				obj.addPoint(p);
 			})
 			
 			if(pad.padType == 'inspectZone'){
 				obj.periodX = pad.periodX || 0;
 				obj.periodY = pad.periodY || 0;
 				obj.D1G1 = pad.D1G1 || 0;
 			}
 			if(pad.blocks)
 				obj.blocks = pad.blocks;
 			
 			self.pad.objs.push(obj);
 			
 			if(pad.padType == 'frame'){
 				obj.crosses[0].set({visible:true});
 		 		obj.crosses[1].set({visible:true});
 		 		
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
 			
 			let {dOutputX:ux,dOutputY:uy} = this.coordinate.PanelMapCoordinateToUMCoordinate(500,500);
 			innerFrame.addPoint({x:500,y:this.image.height-500,ux,uy});
 			
 			let {dOutputX:ux2,dOutputY:uy2} = this.coordinate.PanelMapCoordinateToUMCoordinate(this.image.width-500,this.image.height-500);
 			innerFrame.addPoint({x:this.image.width-500,y:500,ux:ux2,uy:uy2});
 			
 			innerFrame.crosses[0].set({visible:true,lockMovementX:false,lockMovementY:false});
 			innerFrame.crosses[1].set({visible:true,lockMovementX:false,lockMovementY:false});
 			this.pad.objs.push(innerFrame);
 		}
 		
		if(outerFrame == null){
			outerFrame = new Mycanvas.MyPolyline(this.map,this.pad.curType);
			
			let {dOutputX:ux,dOutputY:uy} = this.coordinate.PanelMapCoordinateToUMCoordinate(300,300);
			outerFrame.addPoint({x:300,y:this.image.height-300,ux,uy});
			
			let {dOutputX:ux2,dOutputY:uy2} = this.coordinate.PanelMapCoordinateToUMCoordinate(this.image.width-300,this.image.height-300);
			outerFrame.addPoint({x:this.image.width-300,y:300,ux:ux2,uy:uy2});
			
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
 	    
 	    var dResolutionY =  this.coordinate.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionY;
 	    var region_overlap = this.coordinate.pmpPanelMapPara.dRatioY * this.globalConf.region_overlap/dResolutionY;
 	    var region_height = this.coordinate.pmpPanelMapPara.dRatioY * this.globalConf.region_height/dResolutionY;

 		 var top = innerFrame.crosses[1].top - region_overlap;
 		 while(true){
 			 var height = region_height;
 			 var nextTop = top + region_height - region_overlap;
 			if((nextTop + region_height)  > innerFrame.crosses[0].top + region_overlap ){
 				height = innerFrame.crosses[0].top + region_overlap - top;
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
 			if((top + region_height) > innerFrame.crosses[0].top  + region_overlap)
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
 		for(var i = 0; i < this.pMarkRegionArray.length; i++){
 			var width = this.pMarkRegionArray[i].dMarkWidth ;
 			var height = this.pMarkRegionArray[i].dMarkHeight;
 			
 			let {dOutputX, dOutputY} = this.coordinate.UMCoordinateToPanelMapCoordinate(this.pMarkRegionArray[i].dPositionX- width/2,this.pMarkRegionArray[i].dPositionY+ height/2);
 			
 			var left = dOutputX;
 			var top = this.image.height - dOutputY;
 			var rect = new Mycanvas.Rect({
 				left,
 				top,
 				stroke: 'blue',
 				width:this.pMarkRegionArray[i].iSizeWidth*this.padConf[this.panelName].panel_map_ratio_x,
 				height:this.pMarkRegionArray[i].iSizeHeight*this.padConf[this.panelName].panel_map_ratio_y,
 				padType:"subMark"
 			});
 			this.map.add(rect);

 			var rect2 = new Mycanvas.MyPolyline(this.map,'subMark');
    		rect2.addPoint({
    			x:left, y:top,
    			ux:this.pMarkRegionArray[i].dPositionX- width/2,
    			uy:this.pMarkRegionArray[i].dPositionY+ height/2
    		});
			rect2.addPoint({
				x:left+rect.width,y:top+rect.height,
				ux:this.pMarkRegionArray[i].dPositionX+ width/2,
				uy:this.pMarkRegionArray[i].dPositionY- height/2
			});
			this.pad.objs.push(rect2);

 			var uLeft = this.pMarkRegionArray[i].dPositionX - this.pMarkRegionArray[i].dMarkWidth/2;
 			var uRight = this.pMarkRegionArray[i].dPositionX + this.pMarkRegionArray[i].dMarkWidth/2;
 			var uTop = this.pMarkRegionArray[i].dPositionY + this.pMarkRegionArray[i].dMarkHeight/2;
 			var uBottom = this.pMarkRegionArray[i].dPositionY - this.pMarkRegionArray[i].dMarkHeight/2;
 			
 			this.tmpCoordinate.GetRectIntersectionInfoInBlockMapMatrix(uLeft,uBottom,uRight,uTop,true);
 			this.pMarkRegionArray[i].blocks = _.map(this.tmpCoordinate.bmpBlockMapPara.m_BlockMap[0],function(item){
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
 	},
 	
});

SystrayMenu.Items.push(CanvasInfo);

return Map;

});