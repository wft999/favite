odoo.define('padtool.Glassmap', function (require) {
"use strict";

var ControlPanelMixin = require('web.ControlPanelMixin');
var core = require('web.core');
var Map = require('padtool.Map');
var Coordinate = require('padtool.coordinate');

var QWeb = core.qweb;
var _t = core._t;

var Glassmap = Map.Basemap.extend(ControlPanelMixin,{
    template: 'Map',
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
        return this._rpc({model: 'padtool.pad',method: 'get_information',args: [this.menu_id],})
            .then(function(res) {
            	_.extend(self,res);
            	//self.coordinate = new Coordinate(res.cameraConf,res.bifConf,res.padConf,res.panelName);
            });
    },

    start: function(){    
    	this._super.apply(this, arguments);
    	
    	this._renderButtons();
    	this._updateControlPanel();
    	
    	$.when(self.defImage).then(function ( ) { 	
    		//self.coordinate.gmpGlassMapPara.iGlassMapWidth = this.image.width;
    		//self.coordinate.gmpGlassMapPara.iGlassMapHeight = this.image.height;
    	});

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