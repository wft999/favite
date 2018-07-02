odoo.define('padtool.Panelmap', function (require) {
"use strict";

var core = require('web.core');
var framework = require('web.framework');
var Widget = require('web.Widget');
var session = require('web.session');
var Dialog = require('web.Dialog');
var ControlPanelMixin = require('web.ControlPanelMixin');
var web_client = require('web.web_client');
var Glassmap = require('padtool.Glassmap');
var Mycanvas = require('padtool.Canvas');
var Panelhawk = require('padtool.Panelhawk');

var QWeb = core.qweb;
var _t = core._t;


var Panelmap = Glassmap.extend({
    template: 'Panelmap',
/*    
    events: {
        'click .o_setup_company': 'on_setup_company'
    },
*/
    init: function(parent,action){
    	
    	this.pad = {
    		curType: 'frame',
    		pasteObj:null,
    		objs:new Array(),
    		isModified:false
    	};

        return this._super.apply(this, arguments);
    },
    
    start: function(){
    	var self = this;
    	
    	this._super.apply(this, arguments);
    	$.when(self.defImage).then(function ( ) {
    		
    		self._loadPad();
    		self._drawHawk();
    		self._showToolbar();
    		setTimeout(self._animate.bind(self), 500);
    		
    		self.map.on('object:moving',self._onObjectMove.bind(self));
    		self.map.on('object:moving',self._onObjectMove.bind(self));
    		
    		$('.breadcrumb').append('<li>frame</li>')

    		console.log('panel map start');
    	});
    },
    
    destroy: function(){
    	if(this.pad.isModified){
    		var self = this;
    		var su = self._super;
    		Dialog.confirm(this, (_t("The current pad was modified. Save changes?")), {
                confirm_callback: function () {
                    self._onButtonSave();
                    su.apply(self, arguments);
                },
            });
    	}else{
    		this._super.apply(this, arguments);
    	}
    	
    	this.hawk&&this.hawk.destroy();
    },

    do_show: function () {
    	return this._super.apply(this, arguments);
        
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
      
    _onObjectMove: function(opt){
    	if(this.map.hoverCursor !== 'default')
    		return;
    	
    	if(opt.target.mouseMove){
    		opt.target.mouseMove();
    		this.pad.isModified = true;
    		if(opt.target.padType == 'frame')
    			var innerFrame = opt.target.inner?opt.target.inner[0].polyline:opt.target.polyline;
    		    var outerFrame = opt.target.outer?opt.target.outer[0].polyline:opt.target.polyline;
    		
    			this._drawRegion(innerFrame,outerFrame);
    	}
	    this.map.renderAll();
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
    _onButtonSelectMode:function(e){
    	var self = this;
    	this._super.apply(this, arguments);
    	this.hawk.map.hoverCursor = this.map.hoverCursor;
    	if(this.map.hoverCursor == 'default'){
    		this.map.forEachObject(function(obj){
    			if((obj.type == 'cross' || obj.type == 'goa') && obj.padType == self.pad.curType){
    				obj.lockMovementX = false;
    				obj.lockMovementY = false;
    				obj.hoverCursor="move";
    				//obj.visible = true;
    				obj.hasControls = obj.type == 'goa';		
    			}	
    		})
    	}	
    	else{
    		this.map.forEachObject(function(obj){
    			if(obj.type == 'cross' || obj.type == 'goa'){
    				obj.lockMovementX = true;
    				obj.lockMovementY = true;
    				obj.hoverCursor="";
    				//obj.visible = false;
    				obj.hasControls = false;
    			}	
    		})
    	}	
    	//this.map.discardActiveObject();
    	if(this.map.hoverCursor == 'crosshair'){
    		var objs = this.map.getActiveObjects();
			if(objs.length == 1 && objs[0].padType && (objs[0].padType == 'inspectZone' || objs[0].padType == 'uninspectZone'))
				this.curPolyline = objs[0].polyline;
			else
				this.curPolyline = null;
			
			$('.panel-hawk').addClass('o_hidden');
	    	this.hawkeye.visible = false;
    	}
    	
    	this.map.requestRenderAll();
    	this._showToolbar();
    },
    _showToolbar(){
    	if(this.pad.curType === undefined)
    		this.pad.curType = 'frame';
    	
    	var hidden = this.pad.curType == 'frame' || this.pad.curType == 'subMark';

    	this.$buttons.find('.fa-edit').toggleClass('o_hidden',hidden);
    	this.$buttons.find('.fa-paste').toggleClass('o_hidden',hidden);
    	
    	hidden = hidden || this.map.hoverCursor == 'crosshair' || this.map.hoverCursor == 'paste'
    	this.$buttons.find('.fa-copy').toggleClass('o_hidden',hidden);
    	this.$buttons.find('.fa-cut').toggleClass('o_hidden',hidden);
    	this.$buttons.find('.fa-trash').toggleClass('o_hidden',hidden);
    	
//    	this.$buttons.find('.fa-undo').toggleClass('o_hidden',hidden);
//    	this.$buttons.find('.fa-repeat').toggleClass('o_hidden',hidden);
    	
    	hidden = this.pad.curType == 'frame' || this.pad.curType == 'subMark' || this.pad.pasteObj == undefined || this.pad.pasteObj.padType !=this.pad.curType;
    	this.$buttons.find('.fa-paste').toggleClass('o_hidden',hidden);
    	
    	hidden = this.pad.curType == 'frame' || this.pad.curType == 'subMark' || this.pad.curType == 'mainMark';
    	this.$buttons.find('.fa-align-justify').toggleClass('o_hidden',hidden);
    	
    },
    _onButtonSelectObject:function(e){
    	var self = this;
    	this.pad.curType = e.currentTarget.children[0].text;
    	this.curPolyline = null;
    	
    	this._showToolbar();
    	
    	var objectList = this.$buttons.find('.o_pad_object_list');
    	objectList.find('li').each(function (index, li) {
    		var addOrRemove  = li === e.currentTarget;
            $(li).toggleClass('selected',addOrRemove);
            if(addOrRemove){
            	if($('.breadcrumb')[0].children[1])
            		$('.breadcrumb')[0].removeChild($('.breadcrumb')[0].children[1]);
            	$('.breadcrumb').append('<li>'+self.pad.curType+'</li>')
            }
        });
    	
    	this.map.forEachObject(function(obj){
    		obj.visible = obj.padType ? obj.padType.match(self.pad.curType) : obj.visible;
    		
		})
		
    	this.map.discardActiveObject();
    	this.$buttons.find('.fa-mouse-pointer').click();
    	
    	this.map.renderAll();
    	
    	e.preventDefault();
		e.stopPropagation();

    },
    _onButtonHawkeye:function(){
    	$('.panel-hawk').toggleClass('o_hidden');
    	this.hawkeye.visible = !this.hawkeye.visible;
    	this.map.renderAll();
    	
    	this.$buttons.find('.fa-mouse-pointer').click();
    },
    _onButtonSave:function(){
    	var self = this;
    	var pad = new Array();
    	this.pad.objs.forEach(function(obj){
    		var o = {
    			padType: obj.padType,
    	    	points: obj.points,
    		};
    		if(obj.goa){
    			o.goa = {
    					top:obj.goa.top,
    					left:obj.goa.left,
    					width:obj.goa.width,
    					height:obj.goa.height,
    					scaleX:obj.goa.scaleX,
    					scaleY:obj.goa.scaleY,
    					angle:obj.goa.angle,
    			}
    		}
    		pad.push(o);
    	});
    	
    	this._rpc({model: 'padtool.pad',method: 'save_map',args: [this.padFile,pad],}).then(function(){
    		self.notification_manager.notify(_t('Operation Result'),_t('Pad was succesfully saved!'),false);
    		self.pad.isModified = false;
        });
    },
    _onButtonCopy:function(){
    	var objs = this.map.getActiveObjects();
    	if(objs.length == 1 && objs[0].padType && objs[0].padType == this.pad.curType){
    		this.pad.pasteObj = objs[0];
    		
    		this.$buttons.find('.fa-paste').removeClass('o_hidden');
    	}else{
    		this.notification_manager.notify(_t('Incorrect Operation'),_t('Please select one object!'),false);
    	}
    },
    _onButtonCut:function(){
    	var objs = this.map.getActiveObjects();
    	if(objs.length == 1 && objs[0].padType && objs[0].padType == this.pad.curType){
    		
    		var polyline = objs[0].polyline;
    		var crosses = objs[0].polyline.crosses;
    		
    		for(var i =0 ; i<crosses.length; i++){
    			if(crosses[i] == objs[0]){
    				polyline.removePoint(i);
    				
    				if(polyline.crosses.length == 0){
    					if(polyline.goa){
    	    				this.map.remove(polyline.goa);
    	    				delete polyline.goa;
    	    			}
    					
    					var length = this.pad.objs.length;
    	        		for(var i =0 ; i<length; i++){
    	        			if(this.pad.objs[i] == polyline){
    	        				this.pad.objs.splice(i,1);
    	        				break;
    	        			}
    	        		}
    	        		
    	        		this.curPolyline = null;
    				}
    					
    	    		this.pad.isModified = true;
    				break;
    			}
    		}
    		
    	}else{
    		this.notification_manager.notify(_t('Incorrect Operation'),_t('Please select one object!'),false);
    	}
    },
    _onButtonTrash:function(){
    	var objs = this.map.getActiveObjects();
    	if(objs.length == 1 && objs[0].padType && objs[0].padType == this.pad.curType){
    		if(objs[0].polyline.goa && objs[0].polyline.goa == objs[0]){
    			objs[0].polyline.goa = null;
    			this.map.remove(objs[0]);
    		}else{
    			objs[0].polyline.clear();
    			if(objs[0].polyline.goa){
    				this.map.remove(objs[0].polyline.goa);
    				delete objs[0].polyline.goa;
    			}
        		var length = this.pad.objs.length;
        		for(var i =0 ; i<length; i++){
        			if(this.pad.objs[i] == objs[0].polyline){
        				this.pad.objs.splice(i,1);
        				break;
        			}
        		}
    		}
    		
    		this.curPolyline = null;
    		this.pad.isModified = true;
    	}else{
    		this.notification_manager.notify(_t('Incorrect Operation'),_t('Please select one object!'),false);
    	}
    },
    
    _onButtonAlign:function(){
    	var objs = this.map.getActiveObjects();
    	if(objs.length == 1 && objs[0].padType && objs[0].padType == this.pad.curType){
    		if(objs[0].polyline.goa){
    			this.notification_manager.notify(_t('Incorrect Operation'),_t('Goa has already existed!'),false);
    			return;
    		}
    		
    		var minX,minY,maxX,maxY;
    		objs[0].polyline.points.forEach(function(p){
    			minX = minX == undefined?p.x:(p.x>minX?minX:p.x);
    			minY = minY == undefined?p.y:(p.y>minY?minY:p.y);
    			maxX = maxX == undefined?p.x:(p.x<maxX?maxX:p.x);
    			maxY = maxY == undefined?p.y:(p.y<maxY?maxY:p.y);
    		})

        	objs[0].polyline.goa = new Mycanvas.Goa({
    			left:(minX+maxX)/2,
    			top:(minY+maxY)/2,
    			padType:this.pad.curType,
    			polyline:objs[0].polyline,
    		}); 
        	this.map.add(objs[0].polyline.goa);
        	this.pad.isModified = true;
        	
        	this.map.renderAll();
    	}else{
    		this.notification_manager.notify(_t('Incorrect Operation'),_t('Please select one object!'),false);
    	}
    },
    
    _renderButtons: function () {
    	this.$buttons = $(QWeb.render('Panelmap.Buttons'));
    	//this.$switch_buttons = $(QWeb.render('Panelmap.status'));
    	this.$buttons.on('click', '.fa-eye',this._onButtonHawkeye.bind(this) );
    	
    	this.$buttons.on('click', '.fa-mouse-pointer',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-plus',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-minus',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-edit',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-paste',this._onButtonSelectMode.bind(this) );
    	
    	this.$buttons.on('click', '.fa-save',this._onButtonSave.bind(this) );
    	this.$buttons.on('click', '.fa-copy',this._onButtonCopy.bind(this) );
    	this.$buttons.on('click', '.fa-cut',this._onButtonCut.bind(this) );
    	this.$buttons.on('click', '.fa-trash',this._onButtonTrash.bind(this) );
    	
    	this.$buttons.on('click', '.fa-align-justify',this._onButtonAlign.bind(this) );
    	
    	this.$buttons.on('click', '.o_pad_object_list>li',this._onButtonSelectObject.bind(this) );
     },
     
     _loadPad: function(){
    	var self = this;
    	var url = this.padFile;

    	var def2 = $.ajax(url, {dataType: "json",cache:false})
         	.done(function(json_data){
         		self.jsonpad = json_data;
         	})
         	.fail(function(){
         		self.jsonpad = new Array();
         	})
         	.always(self._drawPad.bind(this));
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
     _drawHawk:function() {
    	 this.hawkeye = new Mycanvas.Hawkeye({ 
 			top: 300/this.map.getZoom(), 
 			left: 300/this.map.getZoom(),
 			width:50/this.map.getZoom(),
 			height:50/this.map.getZoom(),
 			});
 		this.map.add(this.hawkeye);
 		
 		this.hawk = new Panelhawk(this,{imgFile:this.imgFile});
 		this.hawk.appendTo("body");
 	  },
 	 _drawRegion: function(innerFrame,outerFrame){

 		var objects = this.map.getObjects('rect');
 	    for (var i = 0, len = objects.length; i < len; i++) {
 	    	if(objects[i].padType && objects[i].padType == 'frame_region'){
				this.map.remove(objects[i]);		
			}
 	    }

 		 var top = outerFrame.crosses[1].top;
 		 while(true){
 			 var height = this.config.region_height;
 			 var nextTop = top + this.config.region_height - this.config.region_overlap;
 			if((nextTop + this.config.region_height)  > outerFrame.crosses[0].top ){
 				height = outerFrame.crosses[0].top - top;
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
 			if((top + this.config.region_height) > outerFrame.crosses[0].top)
 				break;
 		 }
 		 
 		innerFrame.crosses[0].bringToFront();
 		innerFrame.crosses[1].bringToFront();
 		outerFrame.crosses[0].bringToFront();
 		outerFrame.crosses[1].bringToFront();
 		//this.map.renderAll();
 		 
 	 },
});

core.action_registry.add('padtool.panelmap', Panelmap);


return Panelmap;

});