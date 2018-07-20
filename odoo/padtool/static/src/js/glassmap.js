odoo.define('padtool.Glassmap', function (require) {
"use strict";

var ControlPanelMixin = require('web.ControlPanelMixin');
var core = require('web.core');
var Widget = require('web.Widget');
var Coordinate = require('padtool.coordinate');

var QWeb = core.qweb;
var _t = core._t;

var Glassmap = Widget.extend(ControlPanelMixin,{
    template: 'Map',
/*    
    events: {
        'click .o_setup_company': 'on_setup_company'
    },
*/
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
    
    willStart: function () {
        var self = this;
        return this._rpc({model: 'padtool.pad',method: 'get_information',args: [this.menu_id],})
            .then(function(res) {
            	_.extend(self,res);
            	//self.coordinate = new Coordinate(res.cameraConf,res.bifConf,res.padConf,res.panelName);
            });
    },

    start: function(){    
    	var self = this;
    	this._super.apply(this, arguments);
    	
    	this.defImage = new $.Deferred();
    	this.image = new fabric.Image();
    	this.image.setSrc(this.imgFile, function(img){
    		img.set({left: 0,top: 0,hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false });
    		self.map  = new fabric.Canvas('map',{hoverCursor:'default',stopContextMenu:true});
    		var zoom = Math.max(self.map.getWidth()/img.width,self.map.getHeight()/img.height);
    		zoom = Math.floor(zoom*10)/10;
    		self.minZoom = zoom;
    		self.map.setZoom(zoom);
    		self.map.setDimensions({width:img.width*zoom,height:img.height*zoom});
    		//this.map.setBackgroundImage(img);
    		self.map.add(img);

    		self.map.on('mouse:move',_.debounce(self._onMouseMove.bind(self), 100));    		
    		self.map.on('mouse:out', self._onMouseOut.bind(self));
    		self.map.on('mouse:up', self._onMouseUp.bind(self));
    		self.map.on('mouse:down',self._onMouseDown.bind(self));
    		
    		self._renderButtons();
    		self._updateControlPanel();
    	});
    },

    do_show: function () {
        this._super.apply(this, arguments);
        this._updateControlPanel();
        
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
		
    	opt.e.stopPropagation();
        opt.e.preventDefault();
    		
	},
	_onMouseOut:function(opt){
		$(".map-info").text("");
	},
	
	_onMouseUp:function(opt){
		
		if(this.map.startPointer.x != opt.pointer.x ||this.map.startPointer.y != opt.pointer.y){
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
		if (zoom > 1.2) zoom = 1.2;
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
      
    _onButtonSelectMode:function(e){
    	this.map.hoverCursor = e.currentTarget.dataset.mode;
    	$('.glassmap-mode button').removeClass('active');
    	$(e.currentTarget).addClass('active');
    	
    },
    _renderButtons: function () {
    	this.$buttons = $(QWeb.render('Glassmap.Buttons'));
    	//this.$switch_buttons = $(QWeb.render('Glassmap.info'));
    	this.$buttons.on('click', '.fa-mouse-pointer',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-plus',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-minus',this._onButtonSelectMode.bind(this) );
     },
     _updateControlPanel: function () {    			
     	this.update_control_panel({
               breadcrumbs: this.action_manager.get_breadcrumbs(),
               cp_content: {
             	  $searchview: this.$buttons,
             	  //$buttons: this.$buttons,
             	  //$switch_buttons:this.$switch_buttons,
             },
     	});
 	},

});

core.action_registry.add('padtool.glassmap', Glassmap);


return Glassmap;

});