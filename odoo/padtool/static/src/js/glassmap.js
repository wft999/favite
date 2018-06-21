odoo.define('padtool.Glassmap', function (require) {
"use strict";

var core = require('web.core');
var framework = require('web.framework');
var Widget = require('web.Widget');
var session = require('web.session');
var ControlPanelMixin = require('web.ControlPanelMixin');
var web_client = require('web.web_client');
var SystrayMenu = require('web.SystrayMenu');

var QWeb = core.qweb;
var _t = core._t;


var Glassmap = Widget.extend(ControlPanelMixin,{
    template: 'Glassmap',
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
    
    willStart: function () {
        var self = this;
        return this._rpc({model: 'padtool.pad',method: 'get_information',args: [this.menu_id],})
            .then(function(res) {
            	self.path = res;
            	var parts = res.split('/');
        		if(parts.length == 4)
        			self.imgFile = ('/glassdata/'+parts[2] +'/Glass.bmp');
        		else{
        			self.imgFile = ('/glassdata/'+parts[2] +'/'+ parts[3]+'/'+ parts[3]+'.bmp');
        			self.padFile = ('/glassdata/'+parts[2] +'/'+ parts[3]+'/'+ parts[3]+'.json')
        		}
        			
            });
    },

    start: function(){
    	var self = this;
    	this._renderButtons();
    	this._updateControlPanel();
    	
    	this.defImage = new $.Deferred();
       	console.log('_loadImage start');
    	this.image = new fabric.Image();
    	this.image.setSrc(this.imgFile, this._onLoadImage.bind(this));
    },

    do_show: function () {
        this._super.apply(this, arguments);
        this._updateControlPanel();
        
    },
    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _onButtonSelectMode:function(e){
    	this.map.hoverCursor = e.currentTarget.dataset.mode;
    	$('.glassmap-mode button').removeClass('active');
    	$(e.currentTarget).addClass('active');
    	
    },
    _renderButtons: function () {
    	this.$buttons = $(QWeb.render('Glassmap.Buttons'));
    	this.$switch_buttons = $(QWeb.render('Glassmap.status'));
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
	
	_onMouseMove:function(opt){
		var zoom = this.map.getZoom();
		var x = opt.e.offsetX;
		var y = opt.e.offsetY;
		$(".map-status").text("image(x:"+Math.round(x/zoom)+",y:"+Math.round(y/zoom)+") window(x:"+x+",y:"+y+")")
	},
	_onMouseOut:function(opt){
		$(".map-status").text("");
	},
	_onMouseUp:function(opt){
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
		if (zoom > 1) zoom = 1;
		if (zoom <= this.minZoom) zoom = this.minZoom;
		
		x = x * zoom - (opt.e.offsetX -this.$el.scrollLeft());
		y = y * zoom - (opt.e.offsetY-this.$el.scrollTop());
		
		this.map.setZoom(zoom);
		this.map.setDimensions({width:this.image.width*zoom,height:this.image.height*zoom});
		//this.image.scale(zoom);
		
		opt.e.preventDefault();
		opt.e.stopPropagation();

		this.$el.scrollTop(y);
		this.$el.scrollLeft(x);
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
		
		this.map.on('mouse:move', this._onMouseMove.bind(this));    		
		this.map.on('mouse:out', this._onMouseOut.bind(this));
		this.map.on('mouse:up', this._onMouseUp.bind(this));
		
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

var CanvasStatus = Widget.extend({
    template: 'Glassmap.status',
    
    init: function (parent, value) {
        this._super(parent);

    },
});

SystrayMenu.Items.push(CanvasStatus);

core.action_registry.add('padtool.glassmap', Glassmap);


return Glassmap;

});