odoo.define('padtool.Panelmap', function (require) {
"use strict";

var core = require('web.core');
var framework = require('web.framework');
var Widget = require('web.Widget');
var session = require('web.session');
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
    	
        return this._super.apply(this, arguments);
    },
    
    willStart: function () {
    	var self = this;
    	return this._super.apply(this, arguments).then(function(){
    		var url = self.padFile;
    		var def = $.ajax(url, {dataType: "json"})
            .done(function(json_data){
                self.pad = json_data;
            })
            .fail(function(){
                console.log("[survey] Unable to load pad data");
                self.pad = {};
            });
        	//return def;
    	});
    },

    start: function(){
    	var self = this;
    	
    	this._super.apply(this, arguments);
    	$.when(self.defImage).then(function ( ) {
    		
    		self._drawFrame();
    		self._drawHawk();
    		self.map.on('mouse:down',self._onMouseDown.bind(self));
    		self.map.on('object:moving',self._onObjectMove.bind(self));
    		self.curPolyline = new Mycanvas.MyPolyline(self.map,'InspectZone');
    		
    		$('.breadcrumb').append('<li>Frame</li>')

    		console.log('panel map start');
    	});
    },
    
    destroy: function(){
    	//this.hawk.destroy();
    	this._super.apply(this, arguments);
    },

    do_show: function () {
    	return this._super.apply(this, arguments);
        
    },
  //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _onObjectMove: function(opt){
    	if(!this.map._isMousedown)
    		return;
    	if(this.map.hoverCursor !== 'default')
    		return;
    	
    	opt.target.mouseMove && opt.target.mouseMove();
	    this.map.renderAll();
    },
    _onMouseDown:function(opt){
    	this.map._isMousedown = true;
    	this.map.startPointer = opt.pointer;
    },
    _onMouseMove:function(opt){
    	this._super.apply(this, arguments);
    	this.map._isDrawRect = false;
    	if(this.map._isMousedown && this.map.hoverCursor == 'crosshair'){
    		this.map._isDrawRect = true;
    	}
    },
    _onMouseUp:function(opt){
    	this._super.apply(this, arguments);
    	
    	var zoom = this.map.getZoom();
    	var endPointer = opt.pointer;
    	if(this.map._isDrawRect){
    		this.map.discardActiveObject();
    		var rect = new Mycanvas.Rect({
    	          	width: Math.abs(this.map.startPointer.x/zoom-endPointer.x/zoom),
    	          	height: Math.abs(this.map.startPointer.y/zoom-endPointer.y/zoom),
    	          	left: Math.min(this.map.startPointer.x/zoom,endPointer.x/zoom),
    	          	top: Math.min(this.map.startPointer.y/zoom,endPointer.y/zoom),
    	          	strokeWidth: Math.round(1/this.map.getZoom()),
    	  			pad:this.curPad,
    	        });
    		this.map.add(rect);
    		this.map.setActiveObject(rect);
    		this.$buttons.find('.fa-mouse-pointer').click();
    	}else if(this.map.hoverCursor == 'crosshair' && (this.curPad=='InspectZone' || this.curPad=='UninspectZone')){
    		//var wh = 20/zoom;
    		//var cross = new Mycanvas.Cross({top: endPointer.y/zoom, left: endPointer.x/zoom,pad:this.curPad,width:wh,height:wh});
    		//this.map.add(cross);
    		//this.map.setActiveObject(cross);
    		this.curPolyline.addPoint({x: endPointer.x/zoom, y: endPointer.y/zoom})
    		
    	}
    	
    	this.map._isMousedown = false;
    	this.map._isDrawRect = false;
    },
    _onButtonSelectMode:function(e){
    	this._super.apply(this, arguments);
    	this.hawk.map.hoverCursor = this.map.hoverCursor;
    	if(this.map.hoverCursor == 'default'){
    		this.map.forEachObject(function(obj){
    			if(obj.type == 'cross'||obj.type == 'rect'){
    				obj.lockMovementX = false;
    				obj.lockMovementY = false;
    				if(obj.type == 'rect')
    					obj.hasControls = true;
    			}	
    		})
    	}	
    	else{
    		this.map.forEachObject(function(obj){
    			if(obj.type == 'cross'||obj.type == 'rect'){
    				obj.lockMovementX = true;
    				obj.lockMovementY = true;
    				if(obj.type == 'rect')
    					obj.hasControls = false;
    			}	
    		})
    	}	
    	this.map.discardActiveObject();
    },
    _onButtonSelectObject:function(e){
    	var self = this;
    	this.curPad = e.currentTarget.children[0].text;
    	
    	this.$buttons.find('.fa-pencil-square-o').toggleClass('o_hidden',this.curPad == 'Frame' || this.curPad == 'SubMark');
    	
    	var objectList = this.$buttons.find('.o_pad_object_list');
    	objectList.find('li').each(function (index, li) {
    		var addOrRemove  = li === e.currentTarget;
            $(li).toggleClass('selected',addOrRemove);
            if(addOrRemove){
            	if($('.breadcrumb')[0].children[1])
            		$('.breadcrumb')[0].removeChild($('.breadcrumb')[0].children[1]);
            	$('.breadcrumb').append('<li>'+self.curPad+'</li>')
            }
        });
    	
    	this.map.forEachObject(function(obj){
    		obj.visible = obj.pad ? !!(obj.pad.match(self.curPad)) : obj.visible;
    		
		})
		
    	this.map.discardActiveObject();
    	this.$buttons.find('.fa-mouse-pointer').click();
    	
    	this.map.renderAll();

    },
    _onButtonHawkeye:function(){
    	$('.panel-hawk').toggleClass('o_hidden');
    	this.hawkeye.visible = !this.hawkeye.visible;
    	this.map.renderAll();
    },
    _onButtonSave:function(){
    	this._rpc({model: 'padtool.pad',method: 'save_map',args: [this.padFile,this.pad],}).then(function(){
        	
        });
    },
    _renderButtons: function () {
    	this.$buttons = $(QWeb.render('Panelmap.Buttons'));
    	this.$switch_buttons = $(QWeb.render('Panelmap.status'));
    	this.$buttons.on('click', '.fa-mouse-pointer',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-plus',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-minus',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-pencil-square-o',this._onButtonSelectMode.bind(this) );
    	
    	this.$buttons.on('click', '.fa-eye',this._onButtonHawkeye.bind(this) );
    	
    	this.$buttons.on('click', '.fa-save',this._onButtonSave.bind(this) );
    	
    	this.$buttons.on('click', '.o_pad_object_list>li',this._onButtonSelectObject.bind(this) );
     },
     
     _drawFrame: function(){
    	 this.pad.frame = this.pad.frame ||{
 			outer:[{x:300,y:this.image.height-300},{x:this.image.width-300,y:300}],
 			inner:[{x:500,y:this.image.height-500},{x:this.image.width-500,y:500}]
 		};
 		
 		var outerRect = new Mycanvas.MyRect(this.map,'outerFrame',this.pad.frame.outer);
 		var InnerRect = new Mycanvas.MyRect(this.map,'innerFrame',this.pad.frame.inner);	
 		
 		InnerRect.cross1.outer = [outerRect.cross1,outerRect.cross2];
 		InnerRect.cross2.outer = [outerRect.cross1,outerRect.cross2];
 		
 		outerRect.cross1.inner = [InnerRect.cross1,InnerRect.cross2];
 		outerRect.cross2.inner = [InnerRect.cross1,InnerRect.cross2];

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
});

core.action_registry.add('padtool.panelmap', Panelmap);


return Panelmap;

});