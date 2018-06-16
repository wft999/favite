odoo.define('padtool.Panelmap', function (require) {
"use strict";

var core = require('web.core');
var framework = require('web.framework');
var Widget = require('web.Widget');
var session = require('web.session');
var ControlPanelMixin = require('web.ControlPanelMixin');
var web_client = require('web.web_client');
var Glassmap = require('padtool.Glassmap');
var Canvas = require('padtool.Canvas');
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
    	return this._super.apply(this, arguments);
    },

    start: function(){
    	var self = this;
    	this._super.apply(this, arguments);

    	$.when(self.defImage).then(function ( ) {
    		
    		self.cross = new Canvas.Cross({ 
    			top: 100, 
    			left: 100,
    			fill:"blue",
    			hasControls: false,
    			hasBorders:false,
    			width:100,
    			height:100,
    			originX:"center",
    			originY:"center",
    			opacity:0.5,
    			visible:false
    			});
    		self.map.add(self.cross);
    		
    		self.hawk = new Panelhawk(self,{imgFile:self.imgFile});
    		self.hawk.appendTo("body");

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
    _onSelectMode:function(e){
    	this._super.apply(this, arguments);
    	this.hawk.map.hoverCursor = this.map.hoverCursor;
    },
    _onHawkeye:function(){
    	$('.panel-hawk').toggleClass('o_hidden');
    	this.cross.visible = !this.cross.visible;
    	this.map.renderAll();
    },
    _renderButtons: function () {
    	this.$buttons = $(QWeb.render('Panelmap.Buttons'));
    	this.$switch_buttons = $(QWeb.render('Panelmap.status'));
    	this.$buttons.on('click', '.fa-mouse-pointer',this._onSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-plus',this._onSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-minus',this._onSelectMode.bind(this) );
    	
    	this.$buttons.on('click', '.fa-save',this._onHawkeye.bind(this) );
     },
});

core.action_registry.add('padtool.panelmap', Panelmap);


return Panelmap;

});