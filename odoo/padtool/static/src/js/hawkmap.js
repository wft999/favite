odoo.define('padtool.Hawkmap', function (require) {
"use strict";

var core = require('web.core');
var Widget = require('web.Widget');
var MyMap = require('padtool.Map');
var Mycanvas = require('padtool.Canvas');

var QWeb = core.qweb;
var _t = core._t;

var HAWK_WIDTH = 400;
var HAWK_HEIGHT = 400;

var Hawkmap = MyMap.Map.extend({
    template: 'Hawkmap',
    
    events: {
        'mousedown .panel-heading': '_on_headMousedown',
    },

    init: function(parent,option){
    	this._x = this._y = 0;
    	this.handle = ".panel-heading";
    	this.minZoom = 1;
    	this.parent = parent;
        return this._super.apply(this, arguments);
    },

    start: function(){
    	var self = this;
    	this.blocks = new Map();

    	this.map  = new fabric.Canvas('hawk',{hoverCursor:'default',stopContextMenu:true});
    	this.map.on('mouse:move',_.debounce(this._onMouseMove.bind(this), 100));    		
		this.map.on('mouse:out', this._onMouseOut.bind(this));
		this.map.on('mouse:up', this._onMouseUp.bind(this));
		this.map.on('mouse:down',this._onMouseDown.bind(this));
    },
    
    showImage: function(){
    	//if(this.loading)
    	//	return;
    	
    	this.loading = true;

    	var left = this.parent.hawkeye.left - this.parent.hawkeye.scaleX*this.parent.hawkeye.width/2;
    	var right = this.parent.hawkeye.left + this.parent.hawkeye.scaleX*this.parent.hawkeye.width/2;
    	var top = this.parent.image.height - (this.parent.hawkeye.top - this.parent.hawkeye.scaleY*this.parent.hawkeye.height/2);
    	var bottom = this.parent.image.height - (this.parent.hawkeye.top + this.parent.hawkeye.scaleY*this.parent.hawkeye.height/2);
    	if(left < 0) left = 0;
    	if(right > this.parent.image.width) right = this.parent.image.width;
    	if(top > this.parent.image.height) top = right > this.parent.image.height;
    	if(bottom < 0 ) bottom = 0;
    	
    	this.parent.coordinate.GetRectIntersectionInfoInBlockMapMatrix(left,bottom,right,top);
    	if(this.parent.coordinate.bmpBlockMapPara.m_BlockMap.length == 0){
    		this.loading = false;
    		return
    	}	
    	
    	var width = _.reduce(this.parent.coordinate.bmpBlockMapPara.m_BlockMap, function(memo, block){ 
    		return memo + (block[0]&&block[0].bHasIntersection?block[0].iInterSectionWidth:0); 
    		}, 0);
    	var height = _.reduce(this.parent.coordinate.bmpBlockMapPara.m_BlockMap[0], function(memo, block){ 
    		return memo  + (block&&block.bHasIntersection?block.iInterSectionHeight:0); 
    		}, 0);
    	
    	if(width == 0 || height == 0){
    		this.parent.notification_manager.notify(_t('Incorrect Operation'),_t('Width  or height is 0!'),false);
    		return;
    	}
    		
    	var self = this;
    	var image = new fabric.Image();
    	var strBlocks = JSON.stringify(this.parent.coordinate.bmpBlockMapPara.m_BlockMap);
    	image.setSrc('/padtool/'+this.parent.glassName+'/image'+width+'X'+height+'?strBlocks='+strBlocks, function(img) {
    		if(img.width == 0 || img.height == 0){
    			self.parent.notification_manager.notify(_t('Incorrect Operation'),_t('Image is not exsit!'),false);
    			return;
    		}
    		
    		self.image = img;
        	self.map.clear();
        	
    		var zoom = Math.min(HAWK_WIDTH/img.width,HAWK_HEIGHT/img.height);
    		self.minZoom = zoom;
    		self.map.setZoom(zoom);
    		self.map.setDimensions({width:Math.ceil(img.width*zoom),height:Math.ceil(img.height*zoom)});
    		self.$(".canvas-map")[0].style.width = 1+self.map.width + 'px';
    		self.$(".canvas-map")[0].style.height = 1+self.map.height + 'px';
    		
    		self.map.add(img.set({hasControls:false,lockMovementX:true,lockMovementY:true,selectable:false,}));
    		//self.map.setBackgroundImage(img, self.map.renderAll.bind(self.map));
    		self.loading = false;
    		self.map.renderAll();
    		
    		top = self.parent.image.height -top;
    		bottom = self.parent.image.height -bottom;
    		self.parent.pad.objs.forEach(function(obj){
    			var res = _.some(obj.points,function(p){
    				return p.x > left && p.x < right && p.y > top && p.y < bottom;
    			});
    			
    			if(res){

            		var points = obj.points;
            		var polyline = new Mycanvas.MyPolyline(self.map,obj.padType);
            		for(var i = 0; i < points.length; i++){
            			polyline.addPoint({
            				x: (points[i].x - left)/self.parent.padConf[self.parent.panelName].panel_map_ratio_x,
            				y: (points[i].y - top)/self.parent.padConf[self.parent.panelName].panel_map_ratio_y,
            			});
            		}
            		//this.pad.objs.push(polyline);
            		
            		if(obj.goa){
            			polyline.goa = new Mycanvas.Goa({
         	    			left:(obj.goa.left - left)/self.parent.padConf.panel_map_ratio_x,
         	    			top:(obj.goa.top - top)/self.parent.padConf.panel_map_ratio_y,
         	    			padType:obj.padType,
         	    			polyline:polyline,
         	    			scaleX:obj.goa.scaleX,
        					scaleY:obj.goa.scaleY,
        					angle:obj.goa.angle,
        					visible:true
         	    		}); 
         	        	self.map.add(polyline.goa);
            		}
    			}
    		})
    		
        });
    	
    },
    
    drawImage: function(){
  //  	if(this.loading)
   // 		return;
    	
    	this.loading = true;
    	//this.parent.map.off("object:moving");
    	this.parent.coordinate.GetRectIntersectionInfoInBlockMapMatrix(this.parent.hawkeye.left,this.parent.image.height-this.parent.hawkeye.top,this.parent.hawkeye.left+10,this.parent.image.height-this.parent.hawkeye.top-10);

    	var self = this;
    	var objects = this.map.getObjects();
    	objects.forEach(function(obj){
    		self.map.remove(obj);
    	})
    	
    	var left = 0;
    	var top = 0;
    	var count = 0;
    	var maps = this.parent.coordinate.bmpBlockMapPara.m_BlockMap;
    	for(var x = 0; x<maps.length; x++){
    		for(var y = 0;y<maps[x].length;y++){
    			count++;
    			if(y == 0)
    				top = 0;
    			
    			var opt = {
            			objectCaching: false,
                		hasControls:false,
                        lockMovementX:true,
                        lockMovementY:true,
                        selectable:false,
                		left: left,
                        top: top,
                        cropX: maps[x][y].iInterSectionStartX,
                        cropY: maps[x][y].iInterSectionStartY,
                        width: maps[x][y].iInterSectionWidth,
                        height: maps[x][y].iInterSectionHeight,
                }

    			var key = 'ip'+maps[x][y].iIPIndex+'scan'+maps[x][y].iScanIndex+'_block'+maps[x][y].iBlockIndex;
                if(self.blocks.has(key)){
                	var img = self.blocks.get(key);
                	img.set(opt);
                	self.map.add(img);
                	self.map.renderAll();
                	/*if(self.map.getObjects().length == count){ 
                		self.loading = false;
                		self.parent.map.on('object:moving',self.parent._onObjectMoving.bind(self.parent));
                		console.log("draw finish\n");
                    }*/
                	
                }else{
                	var img = new fabric.Image();
                	img.opt = opt;
                	img.setSrc(self.parent.ipImagePath + "/IP"+(maps[x][y].iIPIndex+1)+"/AoiL_IP"+maps[x][y].iIPIndex+"_scan"+maps[x][y].iScanIndex+"_block"+maps[x][y].iBlockIndex+".jpg", function(img) {
                		img.set(img.opt);
                		self.map.add(img);
                		self.map.renderAll();
                		/*if(self.map.getObjects().length == count){ 
                    		//self.map.renderAll();
                    		self.loading = false;
                    		self.parent.map.on('object:moving',self.parent._onObjectMoving.bind(self.parent));
                    		console.log("draw finish\n");
                        }*/
                		self.blocks.set(key,img);
                    });
                	
                }
                
                top += maps[x][y].iInterSectionHeight;
    		}
    		
    		left += maps[x][0].iInterSectionWidth;
    	}
    	
        //this.map.setDimensions({width,height});
 
        
    },
    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _on_headMousedown: function(event){

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
    
});



return Hawkmap;

});