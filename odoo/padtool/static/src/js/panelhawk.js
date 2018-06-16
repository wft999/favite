odoo.define('padtool.Panelhawk', function (require) {
"use strict";

var core = require('web.core');
var Widget = require('web.Widget');

var QWeb = core.qweb;
var _t = core._t;


var Panelhawk = Widget.extend({
    template: 'Panelhawk',
    
    events: {
        'mousedown .panel-heading': '_on_haedMousedown',
    },

    init: function(parent,option){
    	this._x = this._y = 0;
    	this.handle = ".panel-heading";
    	this.imgFile = option.imgFile;
        return this._super.apply(this, arguments);
    },
    
    willStart: function () {
    	return this._super.apply(this, arguments);
    },

    start: function(){
    	var self = this;
    	
    	this.image = new fabric.Image();
    	this.image.setSrc(this.imgFile, this._onLoadImage.bind(this));
		
    	return this._super.apply(this, arguments);

    },

    do_show: function () {
    	return this._super.apply(this, arguments);
        
    },
    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _on_haedMousedown: function(event){

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
    
    _onCanvasMouseMove:function(opt){
		var zoom = this.image.scaleX;
		var x = opt.e.offsetX;
		var y = opt.e.offsetY;
		$(".map-status").text("image(x:"+Math.round(x/zoom)+",y:"+Math.round(y/zoom)+") window(x:"+x+",y:"+y+")")
	},
	_onCanvasMouseOut:function(opt){
		$(".map-status").text("");
	},
    _onCanvasMouseUp:function(opt){
		var delta = 0;
		if(this.map.hoverCursor == 'zoom-in')
			delta = 0.1;
		else if(this.map.hoverCursor == 'zoom-out')
			delta = -0.1;
		else
			return;
		
		var zoom = this.image.scaleX;//this.canvas.getZoom();
		var x = opt.e.offsetX / zoom;
		var y = opt.e.offsetY / zoom;
		
		zoom = zoom + delta;
		if (zoom > 5) zoom = 5;
		if (zoom <= this.minZoom) zoom = this.minZoom;
		
		x = x * zoom - (opt.e.offsetX -this.$('.canvas-hawk').scrollLeft());
		y = y * zoom - (opt.e.offsetY-this.$('.canvas-hawk').scrollTop());
		
		this.map.setDimensions({width:this.image.width*zoom,height:this.image.height*zoom});
		this.image.scale(zoom);
		
		opt.e.preventDefault();
		opt.e.stopPropagation();

		this.$('.canvas-hawk').scrollTop(y);
		this.$('.canvas-hawk').scrollLeft(x);
	},
	_onLoadImage(img){
		img.set({left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false });
		this.map  = new fabric.Canvas('hawk',{hoverCursor:'default'});
		var zoom = Math.max(this.map.getWidth()/img.width,this.map.getHeight()/img.height);
		//zoom = Math.floor(zoom*10)/10;
		this.minZoom = zoom;
		//this.canvas.setZoom(zoom);
		this.map.setDimensions({width:img.width*zoom,height:img.height*zoom});
		this.map.add(img.scale(zoom));
		
		this.map.on('mouse:move', this._onCanvasMouseMove.bind(this));    		
		this.map.on('mouse:out', this._onCanvasMouseOut.bind(this));
		this.map.on('mouse:up', this._onCanvasMouseUp.bind(this));
		
		console.log('_loadImage end');
		//this.defImage.resolve();
	},
 
});



return Panelhawk;

});