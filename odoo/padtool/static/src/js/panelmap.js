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
    
    events: {
//        'keydown.canvas-map': '_onKeydown'
    },

    init: function(parent,action){
    	
    	this.pad = {
    		curType: 'frame',
    		objs:[],
    		selObjs : [],
    		selAnchor:null,
    		isModified:false,
    		isSubMarkModified:false,
    	};
    	
    	this.undoStack = [];
        this.redoStack = [];
    	
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

    	this.notification_manager = new NotificationManager(this);
        this.notification_manager.appendTo(this.$el);
    	
        var self = this;
    	$.when(self.defImage).then(function ( ) { 	
    		self.coordinate.pmpPanelMapPara.iPanelMapWidth = self.image.width;
    		self.coordinate.pmpPanelMapPara.iPanelMapHeight = self.image.height;
    		
    		self._loadPad();
    		self._drawHawk();
    		
    		self._renderButtons();
    		self._updateControlPanel();
    		self._showToolbar();
    		
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
    
    register:function(pad,action) {
    	var pads = [];
    	if(Array.isArray(pad)){
    		pads = pad;
    	}else{
    		pads.push(pad);
    	}
    	
    	var points = [];
    	pads.forEach(function(item){
    		var tmp = [];
    		
    		item.points.forEach(function(p){
    			if(action !== 'copy')
    				tmp.push({x:p.x,y:p.y,ux:p.ux,uy:p.uy});
        	});

    		points.push(tmp);
    	})
    	
        this.undoStack.push({pads,points,action});
        this.redoStack.length = 0;
    },
    
    undo:function() {
        var c = this.undoStack.pop();
        if (c) {
        	var points = [];
        	for(var i = 0; i< c.pads.length; i++){
        		if(c.action == 'delete')
        			points.push([]);
        		else
        			points.push(c.pads[i].points);
        		
        		c.pads[i].points = c.points[i];
                c.pads[i].update();
        	}
            this.redoStack.push({pads:c.pads,points,action:c.action});
            this.hawkmap && this.hawkmap.showImage();
        }
    },
    
    redo:function() {
        var c = this.redoStack.pop();
        if (c) {
        	var points = [];
        	for(var i = 0; i< c.pads.length; i++){
        		points.push(c.pads[i].points);
        		
        		c.pads[i].points = c.points[i];
                c.pads[i].update();
        	}
        	
            this.undoStack.push({pads:c.pads,points,action:c.action});
            this.hawkmap && this.hawkmap.showImage();
        }
    },

  //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _drawHawk:function(){
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
    	this.map.hoverCursor = e.currentTarget.dataset.mode;

    	$('.glassmap-mode button').removeClass('active');
    	$(e.currentTarget).addClass('active');
    	
    	if(this.map.hoverCursor == 'default'){
    		this.map.discardActiveObject();
    	}
    	this.map.requestRenderAll();
    	this._showToolbar();
    },
    
    _showToolbar(){
    	if(this.pad.curType === undefined)
    		this.pad.curType = 'frame';
    	
    	var hidden = this.pad.curType == 'frame' || this.pad.curType == 'subMark' 
    	this.$buttons.find('.fa-trash').toggleClass('o_hidden',hidden);
    	this.$buttons.find('.fa-undo').toggleClass('o_hidden',hidden);
    	this.$buttons.find('.fa-repeat').toggleClass('o_hidden',hidden);

    	hidden = this.pad.curType !== 'subMark'
    	this.$buttons.find('.fa-refresh').toggleClass('o_hidden',hidden);
    },
    
    showObj:function(obj){
		if(obj.pad){
			obj.visible = obj.pad.padType == this.pad.curType || (obj.pad.padType == 'region' && this.pad.curType == 'frame');
			if(obj.type == 'cross')
				obj.visible = false;
		}
		
	},
    
    _onButtonSelectObject:function(e){
    	if(e.currentTarget.children[0].text == 'Save'){
    		this._onButtonSave();
    		return;
    	}
    	
    	
    	var self = this;
    	this.pad.curType = e.currentTarget.children[0].text;
    	
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
    	
    	if(this.pad.curType == 'subMark'){
    		if(_.some(this.pad.objs,function(obj){return obj.padType == 'subMark'}) == false)
    			this._drawSubMark();
    	}
    	
    	this.map.forEachObject(this.showObj.bind(this));
    	this.map.discardActiveObject();
    	this.map.renderAll();
    	
    	if(this.hawkmap){
    		this.hawkmap.map.forEachObject(this.showObj.bind(this));
    		this.hawkmap.map.discardActiveObject();
    		this.hawkmap.map.renderAll();
    		
    		this.hawkmap.$el.find('button.fa-mouse-pointer').click();
    		
    		var hidden = this.pad.curType == 'frame' || this.pad.curType == 'subMark';
        	this.hawkmap.$el.find('.fa-edit').toggleClass('o_hidden',hidden);
        	this.hawkmap.$el.find('.fa-copy').toggleClass('o_hidden',true);
    	}
    	
    	this.$buttons.find('.fa-mouse-pointer').click();
    	
    	e.preventDefault();
		e.stopPropagation();

    },
    
    _onButtonSave:function(){
    	var self = this;
    	var pad = new Object();
    	pad.dPanelCenterX = parseFloat(this.padConf[this.panelName]['PANEL_CENTER_X'.toLowerCase()]);
    	pad.dPanelCenterY = parseFloat(this.padConf[this.panelName]['PANEL_CENTER_Y'.toLowerCase()]);
    	pad.region_overlap = this.globalConf.region_overlap;
    	pad.region_height = this.globalConf.region_height;
    	pad.isSubMarkModified = this.pad.isSubMarkModified;
    	pad.isMainMarkModified = this.pad.isMainMarkModified;
    	
    	pad.objs = new Array();
    	var mainMarkStartX = 0;
    	var subMarkStartX = 0;
    	this.pad.objs.forEach(function(obj){
    		if(obj.points.length < 2)
    			return;
    		var o = {
    			padType: obj.padType,
    			points:obj.points,
    		};
    		if(obj.padType == 'mainMark'){
    			o.blocks = obj.blocks;
    			o.iMarkDirectionType = obj.iMarkDirectionType;
    			o.imgStartX = mainMarkStartX;
    			obj.imgStartX = mainMarkStartX;
    			mainMarkStartX += o.blocks[0].iInterSectionWidth;
    		}else if(obj.padType == 'subMark'){
    			o.blocks = obj.blocks;
    			o.iMarkDirectionType = obj.iMarkDirectionType;
    			o.imgStartX = subMarkStartX;
    			obj.imgStartX = subMarkStartX;
    			subMarkStartX += o.blocks[0].iInterSectionWidth;
    		}
    		else if(obj.padType == 'inspectZone'){
    			o.periodX = obj.periodX || 0;
    			o.periodY = obj.periodY || 0;
    			o.D1G1 = obj.D1G1 || 0;
    		}else if(obj.padType == 'region'){
    			o.iFrameNo = obj.iFrameNo;
    		}
    		
    		pad.objs.push(o);
    	});
    	//pad.pMarkRegionArray = this.pMarkRegionArray;
    	
    	this._rpc({model: 'padtool.pad',method: 'save_pad',args: [this.glassName,this.panelName,pad],}).then(function(){
    		self.notification_manager.notify(_t('Operation Result'),_t('Pad was succesfully saved!'),false);
    		self.pad.isModified = false;
    		self.pad.isSubMarkModified = false;
    		self.pad.isMainMarkModified = false;
    		
    		var d = new Date();
			var src = '/glassdata/'+ self.glassName +'/'+ self.panelName +'/mainMark.bmp'+'?t='+ d.getTime();
			fabric.Image.fromURL(src, function(img) {
				self.mainMarkImage = img;
				self.mainMarkImage.originX = 'left';
				self.mainMarkImage.originY = 'top';
			});
			
			src = '/glassdata/'+ self.glassName +'/'+ self.panelName +'/subMark.bmp'+'?t='+ d.getTime();
			fabric.Image.fromURL(src, function(img) {
				self.subMarkImage = img;
				self.subMarkImage.originX = 'left';
				self.subMarkImage.originY = 'top';
			});
        });
    },
    
    _onButtonTrash:function(){
    	if(this.pad.selObjs.length == 0){
    		this.notification_manager.notify(_t('Incorrect Operation'),_t('Please select one object!'),false);
    		return;
    	}
    	
    	var self = this;
		Dialog.confirm(this, (_t("Are you sure you want to remove these items?")), {
            confirm_callback: function () {
            	var objs = self.pad.selObjs;
            	self.register(objs,'delete');
            	for(var i = 0; i< objs.length;i++){
            		objs[i].clear();
            		if(objs[i].padType == 'mainMark'){
            			self.pad.isMainMarkModified = true;
            		}
            		objs[i].points = [];
            		/*
            		var length = self.pad.objs.length;
            		for(var j =0 ; j<length; j++){
            			if(self.pad.objs[j] == objs[i]){
            				self.pad.objs.splice(j,1);
            				break;
            			}
            		}*/
            	}
            	
            	self.pad.isModified = true;
            	if(self.pad.isModified && self.hawkeye.visible)
            		self.hawkmap.drawPad();
            },
        });
    	
    	
    },
    
    _onButtonRefresh:function(){
    	this._drawSubMark();
    	this.notification_manager.notify(_t('Operation Result'),_t('SubMark has refreshed!'),false);
    },
    
    _renderButtons: function () {
    	this.$buttons = $(QWeb.render('Panelmap.Buttons'));
    	//this.$switch_buttons = $(QWeb.render('Panelmap.status'));
    	//this.$buttons.on('click', '.fa-eye',this._onButtonHawkeye.bind(this) );
    	this.$buttons.on('click', '.fa-refresh',this._onButtonRefresh.bind(this) );
    	
    	this.$buttons.on('click', '.fa-mouse-pointer',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-plus',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-search-minus',this._onButtonSelectMode.bind(this) );
    	this.$buttons.on('click', '.fa-trash',this._onButtonTrash.bind(this) );
    	
    	this.$buttons.on('click', '.fa-undo',this.undo.bind(this) );
    	this.$buttons.on('click', '.fa-repeat',this.redo.bind(this) );

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
    	var pos = this.cameraConf.general.glass_center.split(',');
 		this.glass_center_x = parseFloat(pos[0]);
 		this.glass_center_y = parseFloat(pos[1]);
 		this.glass_angle = parseFloat(this.cameraConf.general.angle);
 		
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