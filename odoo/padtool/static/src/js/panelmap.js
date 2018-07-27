odoo.define('padtool.Panelmap', function (require) {
"use strict";

var NotificationManager = require('web.notification').NotificationManager;
var ControlPanelMixin = require('web.ControlPanelMixin');
var core = require('web.core');
var Dialog = require('web.Dialog');

var Map = require('padtool.Map');
var Mycanvas = require('padtool.Canvas');
var Hawkmap = require('padtool.Hawkmap');
var Coordinate = require('padtool.coordinate');

var QWeb = core.qweb;
var _t = core._t;


var Panelmap = Map.extend(ControlPanelMixin,{
    template: 'Map',
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
    
    willStart: function () {
        var self = this;
        return this._rpc({model: 'padtool.pad',method: 'panel_information',args: [this.menu_id],})
            .then(function(res) {
            	_.extend(self,res);
            	self.coordinate = new Coordinate(res.cameraConf,res.bifConf,res.padConf,res.panelName);
            	self.tmpCoordinate = new Coordinate(res.cameraConf,res.bifConf,res.padConf,res.panelName);
            });
    },
    
    start: function(){
    	this._super.apply(this, arguments);
    	
    	this._renderButtons();
    	this._updateControlPanel();
    	
    	this.notification_manager = new NotificationManager(this);
        this.notification_manager.appendTo(this.$el);
    	
        var self = this;
    	$.when(self.defImage).then(function ( ) { 	
    		self.coordinate.pmpPanelMapPara.iPanelMapWidth = self.image.width;
    		self.coordinate.pmpPanelMapPara.iPanelMapHeight = self.image.height;
    		
    		self._loadPad();
    		self._showToolbar();
    		self._drawHawk();
    		$('.breadcrumb').append('<li>frame</li>');
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
    	
    	this.hawkmap&&this.hawkmap.destroy();
    },

    do_show: function () {
        this._super.apply(this, arguments);
        this._updateControlPanel();
        
    },

  //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _drawHawk:function(){
    	this.hawkmap = new Hawkmap(this);
    	this.hawkmap.pad = this.pad;
    	this.hawkmap.appendTo('body');
		
    	this.hawkeye = new Mycanvas.Hawkeye({ 
 			left: this.image.width/2, 
 			top: this.image.height/2,
 			width:300,
 			height:300,
 			});
    	this.map.add(this.hawkeye);
    	this.hawkeye.bringToFront();
    },

    _onButtonSelectMode:function(e){
    	var self = this;
    	
    	if(e.currentTarget.dataset.mode == 'zoom-in' || e.currentTarget.dataset.mode == 'zoom-out')
    		this.map.hoverCursor = e.currentTarget.dataset.mode;
    	else
    		this.map.hoverCursor = 'default';
    			
    	$('.glassmap-mode button').removeClass('active');
    	$(e.currentTarget).addClass('active');
    	
    	if(this.hawkmap.map){
    		this.hawkmap.map.hoverCursor = e.currentTarget.dataset.mode;
    		if(this.hawkmap.map.hoverCursor == 'default'){
        		function defaultMode(obj){
        			if((obj.type == 'cross' || obj.type == 'goa') && obj.padType == this.pad.curType){
        				obj.lockMovementX = false;
        				obj.lockMovementY = false;
        				obj.hoverCursor="move";
        				obj.visible = true;
        				obj.hasControls = obj.type == 'goa';		
        			}	
        		}
        		this.hawkmap.map.forEachObject(defaultMode.bind(this));
        	}else if(this.hawkmap.map.hoverCursor == 'crosshair'){
        		var objs = this.map.getActiveObjects();
    			if(objs.length == 1 && objs[0].padType && (objs[0].padType == 'inspectZone' || objs[0].padType == 'uninspectZone'))
    				this.curPolyline = objs[0].polyline;
    			else
    				this.curPolyline = null;
        	}	
        	else{
        		function noDefaultMode(obj){
        			if(obj.type == 'cross' || obj.type == 'goa'){
        				obj.lockMovementX = true;
        				obj.lockMovementY = true;
        				obj.hoverCursor="";
        				obj.hasControls = false;
        			}	
        		}
        		this.hawkmap.map.forEachObject(noDefaultMode);
        	}	
    		
    		
    	}
    	
    	if(this.hawkmap.map.hoverCursor != 'crosshair'){
    		this.map.discardActiveObject();
    		this.hawkmap.map.discardActiveObject();
    	}
    		
    	this.hawkmap.map.requestRenderAll();
    	this.map.requestRenderAll();
    	this._showToolbar();
    },
    
    _showToolbar(){
    	if(this.pad.curType === undefined)
    		this.pad.curType = 'frame';
    	
    	var hidden = this.pad.curType == 'frame' || this.pad.curType == 'subMark' || this.hawkeye.visible == false;

    	this.$buttons.find('.fa-edit').toggleClass('o_hidden',hidden);
    	this.$buttons.find('.fa-paste').toggleClass('o_hidden',hidden);
    	
    	hidden = this.pad.curType == 'frame' || this.pad.curType == 'subMark' || this.map.hoverCursor == 'crosshair' || this.map.hoverCursor == 'paste'
    	this.$buttons.find('.fa-copy').toggleClass('o_hidden',hidden);
    	this.$buttons.find('.fa-cut').toggleClass('o_hidden',hidden);
    	this.$buttons.find('.fa-trash').toggleClass('o_hidden',hidden);
    	
    	hidden = this.pad.curType == 'frame' || this.pad.curType == 'subMark' || this.pad.pasteObj == undefined || this.pad.pasteObj.padType !=this.pad.curType;
    	this.$buttons.find('.fa-paste').toggleClass('o_hidden',hidden);
    	
    	hidden = this.pad.curType == 'frame' || this.pad.curType == 'subMark' || this.pad.curType == 'mainMark'|| this.pad.curType == 'uninspectZone';
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
    	
    	function selectObj(obj){
    		obj.visible = obj.padType ? obj.padType == this.pad.curType : obj.visible;
    		
		}
    	this.map.forEachObject(selectObj.bind(this));
    	this.hawkmap.map && this.hawkmap.map.forEachObject(selectObj.bind(this));
		
    	this.map.discardActiveObject();
    	this.hawkmap.map && this.hawkmap.map.discardActiveObject();
    	
    	this.$buttons.find('.fa-mouse-pointer').click();
    	
    	this.map.renderAll();
    	this.hawkmap.map && this.hawkmap.map.renderAll();
    	
    	e.preventDefault();
		e.stopPropagation();

    },
    _onButtonHawkeye:function(){
    	$('.panel-hawk').toggleClass('o_hidden');
    	
    	this.hawkeye.visible = !this.hawkeye.visible;
    	this.map.renderAll();
    	
    	if(this.hawkeye.visible)
    		this.hawkmap.showImage();
    	
    	this.$buttons.find('.fa-mouse-pointer').click();
    },
    _onButtonSave:function(){
    	var self = this;
    	var pad = new Object();
    	pad.dPanelCenterX = parseFloat(this.padConf[this.panelName]['PANEL_CENTER_X'.toLowerCase()]);
    	pad.dPanelCenterY = parseFloat(this.padConf[this.panelName]['PANEL_CENTER_Y'.toLowerCase()]);
    	pad.region_overlap = this.globalConf.region_overlap;
    	pad.region_height = this.globalConf.region_height;
    	
    	pad.objs = new Array();
    	this.pad.objs.forEach(function(obj){
    		var o = {
    			padType: obj.padType,
    			points:obj.points,
    		};
    		if(obj.padType == 'mainMark' && obj.blocks)
    			o.blocks = obj.blocks;
    		else if(obj.padType == 'inspectZone'){
    			o.periodX = obj.periodX || 0;
    			o.periodY = obj.periodY || 0;
    			o.D1G1 = obj.D1G1 || 0;
    		}
    		
    		pad.objs.push(o);
    	});
    	
    	this._rpc({model: 'padtool.pad',method: 'save_pad',args: [this.glassName,this.panelName,pad],}).then(function(){
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
    	
    	if(this.pad.isModified && this.hawkeye.visible)
    		this.hawkmap.showImage();
    },
    _onButtonTrash:function(){
    	var objs = this.map.getActiveObjects();
    	if(objs.length == 1 && objs[0].padType && objs[0].padType == this.pad.curType){
    		if(objs[0].polyline.goa && objs[0].polyline.goa == objs[0]){
    			objs[0].polyline.goa = null;
    			this.map.remove(objs[0]);
    		}else{
    			objs[0].polyline.clear();
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
    	
    	if(this.pad.isModified && this.hawkeye.visible)
    		this.hawkmap.showImage();
    },
    
    _onButtonAlign:function(){
    	if(this.pad.curType != 'inspectZone')
    		return;
    	
    	var self = this;
    	var objs = this.map.getActiveObjects();
    	if(objs.length == 1 && objs[0].padType && objs[0].padType == this.pad.curType){
    		
    		var character = 10;
        	var self = this;
        	var $content = $(QWeb.render("GoaDialog"));
            
            this.dialog = new Dialog(this, {
                title: _t('Set Goa'),
                size: 'medium',
                buttons: [{text: _t('Confirm'), classes: 'btn-primary', close: true, click: function () {
                	objs[0].polyline.periodX = parseFloat(this.$content.find('.o_set_periodx_input').val());
                	objs[0].polyline.periodY = parseFloat(this.$content.find('.o_set_periody_input').val());
                	objs[0].polyline.D1G1 = this.$content.find('.o_set_d1g1_input')[0].checked?1:0;
                	
                	if(self.hawkeye.visible)
                		self.hawkmap.showImage();
                    
                }}, {text: _t('Discard'), close: true}],
                $content: $content,
            });
            this.dialog.opened().then(function () {
                self.dialog.$('.o_set_periodx_input').val(objs[0].polyline.periodX);
                self.dialog.$('.o_set_periody_input').val(objs[0].polyline.periodY);
                self.dialog.$('.o_set_d1g1_input')[0].checked = objs[0].polyline.D1G1 == 1;
                
            });
            this.dialog.open();
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
     
     _loadPad: function(){
    	var self = this;
    	var url = '/glassdata/'+this.glassName +'/'+ this.panelName +'/'+ this.panelName+'.json';

    	var def2 = $.ajax(url, {dataType: "json",cache:false})
         	.done(function(json_data){
         		self.jsonpad = json_data;
         	})
         	.fail(function(){
         		self.jsonpad = new Array();
         	})
         	.always(self._drawPad.bind(this));
     },
});

core.action_registry.add('padtool.panelmap', Panelmap);


return Panelmap;

});