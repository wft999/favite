odoo.define('padtool.coordinate', function (require) {
"use strict";

var Class = require('web.Class');

var USE_IP_NO =		8;
var CAMERAROW	=	2;
var USE_SCAN_NO	=	40;
var USE_BLOCK_X_NO=	10;
var USE_BLOCK_Y_NO=	10;

var SCAN_PARA =  Class.extend({
    init: function () {
/*    	this.dResolutionX = opt.dResolutionX;				//Scan Resolution X
    	this.dResolutionY = opt.dResolutionY;				//Scan Resolution Y
    	this.dOffsetX = opt.dOffsetX;					//Scan Offset X
    	this.dOffsetY = opt.dOffsetY;					//Scan Offset Y
    	this.dRange_Left = opt.dRange_Left;					//Scan Range Left(UM)
    	this.dRange_Right = opt.dRange_Right;				//Scan Range Right(UM)
    	this.dRange_Bottom = opt.dRange_Bottom;				//Scan Range Bottom(UM)
    	this.dRange_Top = opt.dRange_Top;					//Scan Range Top(UM)
    	this.iRange_Left = opt.iRange_Left;					//Scan Range Left(Pixel)
    	this.iRange_Right = opt.iRange_Right;					//Scan Range Right(Piexl)
    	this.iRange_Bottom = opt.iRange_Bottom;					//Scan Range Bottom(Pixel)
    	this.iRange_Top = opt.iRange_Top;						//Scan Range Top(Pixel)
    	this.iScanWidth = opt.iScanWidth;						//Scan Width(Pixel)
    	this.iScanHeight = opt.iScanHeight;					//Scan Height(Pixel)
    	this.iBlockHeight = opt.iBlockHeight;					//Block Height(Pixel)
*/
    },
});

var IP_PARA =  Class.extend({
    init: function (opt) {
    	//this.iTotalScan = opt.iTotalScan;				//IP Total Scan Num
    	this.aScanParaArray = new Array();
    	
    },
});

var MACHINE_PARA =  Class.extend({
    init: function (cameraConf,bifConf) {
    	this.aIPParaArray = new Array();
    	this.iTotalIP = 0;
    	
    	var keys = _.keys(cameraConf);
    	for(var i = 0; i < keys.length; i++){
    		var res = keys[i].match(/\d+/g);
    		var ip = parseInt(res[0])-1;
    		var scan = parseInt(res[1])-1;
    		
    		if(!this.aIPParaArray[ip]){
    			this.iTotalIP++;
    			this.aIPParaArray[ip] = new IP_PARA();
        		this.aIPParaArray[ip].iTotalScan = 1;
        		
        		this.aIPParaArray[ip].aScanParaArray = new Array();
        		this.aIPParaArray[ip].aScanParaArray[scan] = new SCAN_PARA();
        		
    		}else{
    			this.aIPParaArray[ip].iTotalScan++;
    			
    			if(!this.aIPParaArray[ip].aScanParaArray[scan]){
    				this.aIPParaArray[ip].aScanParaArray[scan] = new SCAN_PARA();
    			}
    		}
    		
    		this.aIPParaArray[ip].aScanParaArray[scan].dOffsetX = parseFloat(cameraConf[keys[i]].table_x_offset);
    		this.aIPParaArray[ip].aScanParaArray[scan].dOffsetY = parseFloat(cameraConf[keys[i]].table_y_offset);
    		this.aIPParaArray[ip].aScanParaArray[scan].dResolutionX = parseFloat(cameraConf[keys[i]].camera_x_res);
    		this.aIPParaArray[ip].aScanParaArray[scan].dResolutionY = parseFloat(cameraConf[keys[i]].camera_y_res);
    		
    		var size = bifConf['auops.config.image.size'].match(/\d+/g);
    		this.aIPParaArray[ip].aScanParaArray[scan].iScanWidth = parseInt(size[0]);
    		this.aIPParaArray[ip].aScanParaArray[scan].iScanHeight = parseInt(size[1]);
    		this.aIPParaArray[ip].aScanParaArray[scan].iBlockHeight = parseInt(bifConf['auops.config.image.block_height']);
    		
    	}
    	this.iTotalScan = this.aIPParaArray[0].iTotalScan;
    	this.iTotalBlock = parseInt(bifConf['auops.config.image.block_buf_num']);
    	this.iCameraRaw = CAMERAROW;
    	
    	this.GetScanRangePixel();
    	this.GetScanRangeUM();
    	
    },
    
    GetScanRangeUM: function(){
    	var dResolutionX;
    	var dResolutionY;
    	
    	for(var i = 0; i < this.iTotalIP; i ++)
    	{
    		for(var j = 0; j < this.iTotalScan; j ++)
    		{
    			dResolutionX = this.aIPParaArray[i].aScanParaArray[j].dResolutionX;
    			dResolutionY = this.aIPParaArray[i].aScanParaArray[j].dResolutionY;
    			
    			this.aIPParaArray[i].aScanParaArray[j].dRange_Left = this.aIPParaArray[i].aScanParaArray[j].dOffsetX;
    			this.aIPParaArray[i].aScanParaArray[j].dRange_Bottom = this.aIPParaArray[i].aScanParaArray[j].dOffsetY;
    			this.aIPParaArray[i].aScanParaArray[j].dRange_Right = this.aIPParaArray[i].aScanParaArray[j].dOffsetX + dResolutionX * this.aIPParaArray[i].aScanParaArray[j].iScanWidth;
    			this.aIPParaArray[i].aScanParaArray[j].dRange_Top = this.aIPParaArray[i].aScanParaArray[j].dOffsetY + dResolutionY * this.aIPParaArray[i].aScanParaArray[j].iScanHeight;
    		}
    	}
    },
    
    GetScanRangePixel: function()
    {
    	var iCameraNoPerRow;
    	var iTotalScan;
    	var dLeft;
    	var dBottom;
    	var iLeftTemp;
    	var iBottomTemp;
    	
    	iCameraNoPerRow = this.iTotalIP / this.iCameraRaw;
    	dLeft = 0;
    	dBottom = 0;
    	
    	for(var i = 0; i < this.iTotalIP; i ++)
    	{
    		iTotalScan = this.aIPParaArray[i].iTotalScan;
    		
    		for(var j = 0; j < iTotalScan; j ++)
    		{
    			if(i % iCameraNoPerRow == 0 && j == 0)
    			{
    				dLeft = (this.aIPParaArray[i].aScanParaArray[j].dOffsetX - this.aIPParaArray[0].aScanParaArray[0].dOffsetX) / this.aIPParaArray[i].aScanParaArray[j].dResolutionX;
    			}
    			else if(j == 0)
    			{
    				dLeft += (this.aIPParaArray[i].aScanParaArray[j].dOffsetX - this.aIPParaArray[i - 1].aScanParaArray[this.aIPParaArray[i - 1].iTotalScan - 1].dOffsetX) / this.aIPParaArray[i - 1].aScanParaArray[this.aIPParaArray[i - 1].iTotalScan - 1].dResolutionX;
    			}
    			else
    			{
    				dLeft += (this.aIPParaArray[i].aScanParaArray[j].dOffsetX - this.aIPParaArray[i].aScanParaArray[j - 1].dOffsetX) / this.aIPParaArray[i].aScanParaArray[j - 1].dResolutionX;
    			}
    			
    			if(i >= iCameraNoPerRow)
    			{
    				dBottom = (this.aIPParaArray[i].aScanParaArray[j].dOffsetY - this.aIPParaArray[i - iCameraNoPerRow].aScanParaArray[j].dOffsetY) / this.aIPParaArray[i - iCameraNoPerRow].aScanParaArray[j].dResolutionY + (this.aIPParaArray[i - iCameraNoPerRow].aScanParaArray[j].dOffsetY - this.aIPParaArray[0].aScanParaArray[0].dOffsetY) / this.aIPParaArray[i - iCameraNoPerRow].aScanParaArray[j].dResolutionY;
    			}
    			else
    			{
    				dBottom = (this.aIPParaArray[i].aScanParaArray[j].dOffsetY - this.aIPParaArray[0].aScanParaArray[0].dOffsetY) / this.aIPParaArray[i].aScanParaArray[j].dResolutionY;
    			}
    			
    			iLeftTemp = Math.ceil(dLeft);
    			iBottomTemp = Math.ceil(dBottom);
    			
    			this.aIPParaArray[i].aScanParaArray[j].iRange_Left = iLeftTemp;
    			this.aIPParaArray[i].aScanParaArray[j].iRange_Bottom = iBottomTemp;
    			this.aIPParaArray[i].aScanParaArray[j].iRange_Right = iLeftTemp + this.aIPParaArray[i].aScanParaArray[j].iScanWidth - 1;
    			this.aIPParaArray[i].aScanParaArray[j].iRange_Top = iBottomTemp + this.aIPParaArray[i].aScanParaArray[j].iScanHeight - 1;
    		}
    	}
    }
});

var GLASS_MAP_PARA = Class.extend({
	init: function (padConf) {
    	this.dRatioX = parseFloat(padConf['GLASS_INFORMATION']['GLASS_MAP_RATIO_X'.toLowerCase()]);
    	this.dRatioY = parseFloat(padConf['GLASS_INFORMATION']['GLASS_MAP_RATIO_Y'.toLowerCase()]);
    },
});

var PANEL_MAP_PARA = Class.extend({
	init: function (padConf,panelName) {
    	this.dRatioX = parseFloat(padConf[panelName]['PANEL_MAP_RATIO_X'.toLowerCase()]);
    	this.dRatioY = parseFloat(padConf[panelName]['PANEL_MAP_RATIO_Y'.toLowerCase()]);
    	this.dPanelCenterX = parseFloat(padConf[panelName]['PANEL_CENTER_X'.toLowerCase()]);
    	this.dPanelCenterY = parseFloat(padConf[panelName]['PANEL_CENTER_Y'.toLowerCase()]);
    },
});

var BLOCK_MAP_MATRIX = Class.extend({
	init: function () {
		this.m_BlockMap = new Array();
	},
    
    IsInMap:function(iIPIndex, iScanIndex,iBlockIndex){
    	var iBlockMapXIndex, iBlockMapYIndex;
    	
    	for(var i = 0; i < this.iTotalBlockX; i ++){
    		for(var j = 0; j < this.iTotalBlockY; j ++){
    			if((this.m_BlockMap[i][j].iIPIndex == iIPIndex) && (this.m_BlockMap[i][j].iScanIndex == iScanIndex) && (this.m_BlockMap[i][j].iBlockIndex == iBlockIndex))
    			{
    				iBlockMapXIndex = i;
    				iBlockMapYIndex = j;
    				return {iBlockMapXIndex,iBlockMapYIndex};
    			}
    		}
    	}
    	
    	return null;
    },

    IsInMap:function(iInputX,iInputY){
    	var iOutputX, iOutputY, iBlockMapXIndex, iBlockMapYIndex;
    	
    	for(var i = 0; i < this.iTotalBlockX; i ++){
    		for(var j = 0; j < this.iTotalBlockY; j ++){
    			if(iInputX >= this.m_BlockMap[i][j].iRange_Left && iInputX <= this.m_BlockMap[i][j].iRange_Right && iInputY >= this.m_BlockMap[i][j].iRange_Bottom && iInputY <= this.m_BlockMap[i][j].iRange_Top)
    			{
    				iBlockMapXIndex = i;
    				iBlockMapYIndex = j;
    				
    				iOutputX = iInputX - m_BlockMap[i][j].iRange_Left;
    				iOutputY = iInputY - m_BlockMap[i][j].iRange_Bottom;
    				
    				return {iOutputX,iOutputY,iBlockMapXIndex,iBlockMapYIndex};
    			}
    		}
    	}
    	
    	return null;
    }
});

var COORDINATE_TRANSFER =  Class.extend({
    init: function (cameraConf,bifConf,padConf,panelName) {
    	this.mpMachinePara = new MACHINE_PARA(cameraConf,bifConf);
    	this.gmpGlassMapPara = new GLASS_MAP_PARA(padConf);
    	this.pmpPanelMapPara = new PANEL_MAP_PARA(padConf,panelName);
    	
    },
    
    JudgeIPScanUM: function(dInputX, dInputY){
    	var iIP, iScan;
    	
    	var iTotalScan;
    	var dRange_Left;
    	var dRange_Right;
    	var dRange_Bottom;
    	var dRange_Top;
    	
    	var iTotalIP = this.mpMachinePara.iTotalIP;
    	
    	for(var iIPIndex = iTotalIP - 1; iIPIndex >= 0; iIPIndex --)
    	{
    		iTotalScan = this.mpMachinePara.aIPParaArray[iIPIndex].iTotalScan;

    		for(var iScanIndex = iTotalScan - 1; iScanIndex >= 0; iScanIndex --)
    		{
    			dRange_Left = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Left;
    			dRange_Right = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Right;
    			dRange_Bottom = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Bottom;
    			dRange_Top = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Top;
    			
    			if((dInputX >= dRange_Left) && (dInputX <= dRange_Right) && (dInputY >= dRange_Bottom) && (dInputY <= dRange_Top))
    			{
    				iIP = iIPIndex;
    				iScan = iScanIndex;

    				return {iIP,iScan};
    			}
    		}
    	}
    	
    	return {};
    },
    
    UMCoordinateToBlockMapCoordinate: function(dInputX, dInputY){
    	var dOutputX, dOutputY, iBlockIndex;
    	
    	var dOffsetX;
    	var dOffsetY;
    	var dResolutionX;
    	var dResolutionY;
    	var iBlockHeight;

    	let {iIP:iIPIndex,iScan:iScanIndex} = this.JudgeIPScanUM(dInputX, dInputY);

    	if(iIPIndex != undefined && iScanIndex != undefined)
    	{
    		dOffsetX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetX;
    		dOffsetY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetY;
    		dResolutionX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
    		dResolutionY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;
    		iBlockHeight = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iBlockHeight;
    		
    		dOutputX = (dInputX - dOffsetX) / dResolutionX;
    		dOutputY = Math.floor((dInputY - dOffsetY) / dResolutionY) % iBlockHeight;
    		iBlockIndex = Math.floor(((dInputY - dOffsetY) / dResolutionY) / iBlockHeight);
    		
    		return {dOutputX,dOutputY,iIPIndex,iScanIndex,iBlockIndex};
    	}
    	
    	return {};
    },
    
    InitialBlockMapMatrix:function(iRangeLeft,iRangeBottom, iRangeRight,iRangeTop){
    	if(this.bmpBlockMapPara)
    		delete this.bmpBlockMapPara;
    	
    	this.bmpBlockMapPara = new BLOCK_MAP_MATRIX();

    	var iBlockMapXIndex;
    	var iBlockMapYIndex;
    	
    	let {dOutputX:dRangeLeft, dOutputY:dRangeBottom} = this.PanelMapCoordinateToUMCoordinate(iRangeLeft, iRangeBottom);
    	
    	if(dRangeLeft == undefined || dRangeBottom == undefined)
    	{
    		return false;
    	}
    	
    	let {dOutputX:dRangeRight, dOutputY:dRangeTop} = this.PanelMapCoordinateToUMCoordinate(iRangeRight, iRangeTop);

    	if(dRangeRight == undefined || dRangeTop == undefined)
    	{
    		return false;
    	}
    	
    	let {iIPIndex:iIPIndex_BL, iScanIndex:iScanIndex_BL, iBlockIndex:iBlockIndex_BL} = this.UMCoordinateToBlockMapCoordinate(dRangeLeft, dRangeBottom);
    	
    	if(iIPIndex_BL == undefined )
    	{
    		return false;
    	}
    	
    	let {iIPIndex:iIPIndex_BR, iScanIndex:iScanIndex_BR, iBlockIndex:iBlockIndex_BR} = this.UMCoordinateToBlockMapCoordinate(dRangeRight, dRangeBottom);
    	
    	if(iIPIndex_BR == undefined)
    	{
    		return false;
    	}
    	
    	iBlockMapXIndex = 0;
    	this.bmpBlockMapPara.iTotalBlockX = 0;
    	this.bmpBlockMapPara.iTotalBlockY = 0;
    	
    	for(var iIPIndex = iIPIndex_BL; iIPIndex <= iIPIndex_BR; iIPIndex ++)
    	{
    		if(this.mpMachinePara.aIPParaArray[iIPIndex] == undefined)
    			continue;
    			
    		var iScanIndexMin;
    		var iScanIndexMax;
    		
    		if(iIPIndex == iIPIndex_BL)
    		{
    			iScanIndexMin = iScanIndex_BL;
    		}
    		else
    		{
    			iScanIndexMin = 0;
    		}
    		
    		if(iIPIndex == iIPIndex_BR)
    		{
    			iScanIndexMax = iScanIndex_BR;
    		}
    		else
    		{
    			iScanIndexMax = this.mpMachinePara.iTotalScan;
    		}
    		
    		for(var iScanIndex = iScanIndexMin; iScanIndex <= iScanIndexMax; iScanIndex ++)
    		{
    			if(this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex] == undefined)
        			continue;
    			
    			var ptTopPointX;
    			var ptTopPointY;
    			var ptBottomPointX;
    			var ptBottomPointY;

    			var iPreIPIndex;
    			var iPreScanIndex;
    			var iNextIPIndex;
    			var iNextScanIndex;
    			
    			if(iIPIndex == iIPIndex_BL && iScanIndex == iScanIndex_BL)
    			{
    				ptBottomPointX = dRangeLeft;
    				ptTopPointX = dRangeLeft;
    			}
    			else if(iIPIndex == iIPIndex_BR && iScanIndex == iScanIndex_BR)
    			{
    				ptBottomPointX = dRangeRight;
    				ptTopPointX = dRangeRight;
    			}
    			else
    			{
    				if(iScanIndex == 0)
    				{
    					iPreIPIndex = iIPIndex - 1;
    					iPreScanIndex = this.mpMachinePara.iTotalScan - 1;
    				}
    				else
    				{
    					iPreIPIndex = iIPIndex;
    					iPreScanIndex = iScanIndex - 1;
    				}
    				
    				if(iScanIndex >= this.mpMachinePara.iTotalScan - 1)
    				{
    					iNextIPIndex = iIPIndex + 1;
    					iNextScanIndex = 0;
    				}
    				else
    				{
    					iNextIPIndex = iIPIndex;
    					iNextScanIndex = iScanIndex + 1;
    				}
    				
    				ptBottomPointX = (this.mpMachinePara.aIPParaArray[iPreIPIndex].aScanParaArray[iPreScanIndex].dRange_Right + this.mpMachinePara.aIPParaArray[iNextIPIndex].aScanParaArray[iNextScanIndex].dRange_Left) / 2;
    				ptTopPointX = (this.mpMachinePara.aIPParaArray[iPreIPIndex].aScanParaArray[iPreScanIndex].dRange_Right + this.mpMachinePara.aIPParaArray[iNextIPIndex].aScanParaArray[iNextScanIndex].dRange_Left) / 2;
    			}
    			
    			ptBottomPointY = dRangeBottom;
    			ptTopPointY = dRangeTop;
    
    			let {iIPIndex:iIPIndex_TopPoint, iScanIndex:iScanIndex_TopPoint, iBlockIndex:iBlockIndex_TopPoint} = this.UMCoordinateToBlockMapCoordinate(ptTopPointX, ptTopPointY);

    			if(iBlockIndex_TopPoint == undefined)
    			{
    				return false;
    			}

    			let {iIPIndex:iIPIndex_BottomPoint, iScanIndex:iScanIndex_BottomPoint, iBlockIndex:iBlockIndex_BottomPoint} = this.UMCoordinateToBlockMapCoordinate(ptBottomPointX, ptBottomPointY);

    			if(iBlockIndex_BottomPoint == undefined)
    			{
    				return false;
    			}
    			
    			
    			iBlockMapYIndex = 0;
    			this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex] = new Array();
    			
    			if(iIPIndex_BottomPoint == iIPIndex_TopPoint && iScanIndex_BottomPoint == iScanIndex_TopPoint)
    			{
    				for(var iBlockIndex = iBlockIndex_BottomPoint; iBlockIndex <= iBlockIndex_TopPoint; iBlockIndex ++)
    				{
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex] = new Object();
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iIPIndex = iIPIndex;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iScanIndex = iScanIndex;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockIndex = iBlockIndex;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockMapWidth = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iScanWidth;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockMapHeight = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iBlockHeight;

    					iBlockMapYIndex ++;
    				}
    			}
    			else
    			{
    				for(var iBlockIndex = iBlockIndex_BottomPoint; iBlockIndex < this.mpMachinePara.iTotalBlock; iBlockIndex ++)
    				{
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex] = new Object();
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iIPIndex = iIPIndex_BottomPoint;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iScanIndex = iScanIndex_BottomPoint;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockIndex = iBlockIndex;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockMapWidth = this.mpMachinePara.aIPParaArray[iIPIndex_BottomPoint].aScanParaArray[iScanIndex_BottomPoint].iScanWidth;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockMapHeight = this.mpMachinePara.aIPParaArray[iIPIndex_BottomPoint].aScanParaArray[iScanIndex_BottomPoint].iBlockHeight;

    					iBlockMapYIndex ++;
    				}

    				for(var iBlockIndex = 0; iBlockIndex <= iBlockIndex_TopPoint; iBlockIndex ++)
    				{
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex] = new Object();
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iIPIndex = iIPIndex_TopPoint;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iScanIndex = iScanIndex_TopPoint;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockIndex = iBlockIndex;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockMapWidth = mpMachinePara.aIPParaArray[iIPIndex_TopPoint].aScanParaArray[iScanIndex_TopPoint].iScanWidth;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockMapHeight = mpMachinePara.aIPParaArray[iIPIndex_TopPoint].aScanParaArray[iScanIndex_TopPoint].iBlockHeight;

    					iBlockMapYIndex ++;
    				}
    			}
    			
    			if(iBlockMapYIndex >= this.bmpBlockMapPara.iTotalBlockY)
    			{
    				this.bmpBlockMapPara.iTotalBlockY = iBlockMapYIndex;
    			}
    			
    			iBlockMapXIndex ++;
    		}
    	}
    	
    	this.bmpBlockMapPara.iTotalBlockX = iBlockMapXIndex;
    },
    
    GetBlockMapMatrixBlockRangeUM:function(){
    	var iIPIndex;
    	var iScanIndex;
    	var iBlockIndex;
    	var dResolutionX;
    	var dResolutionY;
    	var iBlockMapWidth;
    	var iBlockMapHeight;
    	
    	for(var i = 0; i < this.bmpBlockMapPara.iTotalBlockX; i ++)
    	{
    		for(var j = 0; j < this.bmpBlockMapPara.iTotalBlockY; j ++)
    		{
    			if(this.bmpBlockMapPara.m_BlockMap[i][j] == undefined)
    				continue;
    			
    			iIPIndex = this.bmpBlockMapPara.m_BlockMap[i][j].iIPIndex;
    			iScanIndex = this.bmpBlockMapPara.m_BlockMap[i][j].iScanIndex;
    			iBlockIndex = this.bmpBlockMapPara.m_BlockMap[i][j].iBlockIndex;

    			if(iIPIndex >= 0 && iIPIndex < this.mpMachinePara.iTotalIP && iScanIndex >= 0 && iScanIndex < this.mpMachinePara.iTotalScan && iBlockIndex >= 0 && iBlockIndex < this.mpMachinePara.iTotalBlock)
    			{
    				dResolutionX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
    				dResolutionY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;
    				iBlockMapWidth = this.bmpBlockMapPara.m_BlockMap[i][j].iBlockMapWidth;
    				iBlockMapHeight = this.bmpBlockMapPara.m_BlockMap[i][j].iBlockMapHeight;
    				
    				this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Left = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetX;
    				this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Bottom = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetY + dResolutionY * iBlockIndex * iBlockMapHeight;
    				this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Right = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetX + dResolutionX * iBlockMapWidth;
    				this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Top = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetY + dResolutionY * (iBlockIndex + 1) * iBlockMapHeight;
    			}
    		}
    	}
    },
    
    PanelMapCoordinateToUMCoordinate: function(iInputX, iInputY){
    	var dOutputX, dOutputY
    	var dResolutionX;
    	var dResolutionY;
    	
    	dResolutionX = this.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionX;
    	dResolutionY = this.mpMachinePara.aIPParaArray[0].aScanParaArray[0].dResolutionY;
    	
    	if(iInputX < 0 || iInputX >= this.pmpPanelMapPara.iPanelMapWidth || iInputY < 0 || iInputY >= this.pmpPanelMapPara.iPanelMapHeight || this.pmpPanelMapPara.dRatioX == 0 || this.pmpPanelMapPara.dRatioY == 0)
    	{
    		return {};
    	}
    	else
    	{
    		dOutputX = (iInputX - this.pmpPanelMapPara.iPanelMapWidth / 2) / this.pmpPanelMapPara.dRatioX * dResolutionX + this.pmpPanelMapPara.dPanelCenterX;
    		dOutputY = (iInputY - this.pmpPanelMapPara.iPanelMapHeight / 2) / this.pmpPanelMapPara.dRatioY * dResolutionY + this.pmpPanelMapPara.dPanelCenterY;
    	}
    	
    	return {dOutputX,dOutputY};
    },
    
    GetTwoRectInter: function(rtA_BottomLeftX,rtA_BottomLeftY,rtA_TopRightX,rtA_TopRightY,rtB_BottomLeftX,rtB_BottomLeftY,rtB_TopRightX,rtB_TopRightY){
    	var rtInter_BottomLeftX, rtInter_BottomLeftY, rtInter_TopRightX, rtInter_TopRightY;
    	if(rtA_BottomLeftX >= rtB_BottomLeftX && rtA_BottomLeftY >= rtB_BottomLeftY && rtA_TopRightX <= rtB_TopRightX && rtA_TopRightY <= rtB_TopRightY)
    	{
    		rtInter_BottomLeftX = rtA_BottomLeftX;
    		rtInter_BottomLeftY = rtA_BottomLeftY;
    		rtInter_TopRightX = rtA_TopRightX;
    		rtInter_TopRightY = rtA_TopRightY;
    	}
    	else if(rtA_BottomLeftX <= rtB_BottomLeftX && rtA_BottomLeftY <= rtB_BottomLeftY && rtA_TopRightX >= rtB_TopRightX && rtA_TopRightY >= rtB_TopRightY)
    	{
    		rtInter_BottomLeftX = rtB_BottomLeftX;
    		rtInter_BottomLeftY = rtB_BottomLeftY;
    		rtInter_TopRightX = rtB_TopRightX;
    		rtInter_TopRightY = rtB_TopRightY;
    	}
    	else if(rtB_TopRightX < rtA_BottomLeftX || rtB_TopRightY < rtA_BottomLeftY || rtB_BottomLeftX > rtA_TopRightX || rtB_BottomLeftY > rtA_TopRightY)
    	{
    		return {};
    	}
    	else
    	{
    		if(rtA_BottomLeftX < rtB_TopRightX && rtA_BottomLeftX > rtB_BottomLeftX)
    		{
    			rtInter_BottomLeftX = rtA_BottomLeftX;
    		}
    		else
    		{
    			rtInter_BottomLeftX = rtB_BottomLeftX;
    		}

    		if(rtA_TopRightX > rtB_BottomLeftX && rtA_TopRightX < rtB_TopRightX)
    		{
    			rtInter_TopRightX = rtA_TopRightX;
    		}
    		else
    		{
    			rtInter_TopRightX = rtB_TopRightX;
    		}

    		if(rtA_BottomLeftY < rtB_TopRightY && rtA_BottomLeftY > rtB_BottomLeftY)
    		{
    			rtInter_BottomLeftY = rtA_BottomLeftY;
    		}
    		else
    		{
    			rtInter_BottomLeftY = rtB_BottomLeftY;
    		}

    		if(rtA_TopRightY > rtB_BottomLeftY && rtA_TopRightY < rtB_TopRightY)
    		{
    			rtInter_TopRightY = rtA_TopRightY;
    		}
    		else
    		{
    			rtInter_TopRightY = rtB_TopRightY;
    		}
    	}

    	if((rtInter_TopRightX - rtInter_BottomLeftX) <= 0 || (rtInter_TopRightY - rtInter_BottomLeftY) <= 0)
    	{
    		return {};
    	}
    	
    	
    	return {rtInter_BottomLeftX, rtInter_BottomLeftY, rtInter_TopRightX, rtInter_TopRightY};
    },
    
    GetRectIntersectionInfoInBlockMapMatrix:function(iRangeLeft,iRangeBottom, iRangeRight,iRangeTop){

    	var dBlockRangeLeft;
    	var dBlockRangeBottom;
    	var dBlockRangeRight;
    	var dBlockRangeTop;

    	var iBlockMapXIndex;
    	var iBlockMapYIndex;
    	var iIPIndex;
    	var iScanIndex;
    	var dResolutionX;
    	var dResolutionY;
    	var iStartX;
    	var iStartY;
    	var iEndX;
    	var iEndY;
    	var iWidth;
    	var iHeight;
    	
    	this.InitialBlockMapMatrix(iRangeLeft,iRangeBottom, iRangeRight,iRangeTop);
    	this.GetBlockMapMatrixBlockRangeUM();
 
    	let {dOutputX:dRangeLeft, dOutputY:dRangeBottom} = this.PanelMapCoordinateToUMCoordinate(iRangeLeft, iRangeBottom);
    	
    	if(dRangeLeft == undefined)
    	{
    		return false;
    	}
    	
    	let {dOutputX:dRangeRight, dOutputY:dRangeTop} = this.PanelMapCoordinateToUMCoordinate(iRangeRight, iRangeTop);
    	
    	if(dRangeRight == undefined)
    	{
    		return false;
    	}
    	
    	for(var i = 0; i < this.bmpBlockMapPara.iTotalBlockX; i ++)
    	{
    		for(var j = 0; j < this.bmpBlockMapPara.iTotalBlockY; j ++)
    		{
    			if(this.bmpBlockMapPara.m_BlockMap[i][j] == undefined)
    				continue;
    			dBlockRangeLeft = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Left;
    			dBlockRangeBottom = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Bottom;
    			dBlockRangeRight = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Right;
    			dBlockRangeTop = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Top;

    			let {rtInter_BottomLeftX:dInterRangeLeft, rtInter_BottomLeftY:dInterRangeBottom, rtInter_TopRightX:dInterRangeRight, rtInter_TopRightY:dInterRangeTop} = this.GetTwoRectInter(dRangeLeft, dRangeBottom, dRangeRight, dRangeTop, dBlockRangeLeft, dBlockRangeBottom, dBlockRangeRight, dBlockRangeTop);

    			if(dInterRangeLeft != undefined)
    			{
    				iIPIndex = this.bmpBlockMapPara.m_BlockMap[i][j].iIPIndex;
    				iScanIndex = this.bmpBlockMapPara.m_BlockMap[i][j].iScanIndex;
    				dResolutionX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
    				dResolutionY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;
    				
    				iStartX = Math.floor((dInterRangeLeft - dBlockRangeLeft) / dResolutionX + 0.5);
    				iStartY = Math.floor((dInterRangeBottom - dBlockRangeBottom) / dResolutionY + 0.5);
    				iEndX = Math.floor((dInterRangeRight - dBlockRangeLeft) / dResolutionX + 0.5);
    				iEndY = Math.floor((dInterRangeTop - dBlockRangeBottom) / dResolutionY + 0.5);
    				
    				iWidth = iEndX - iStartX;
    				iHeight = iEndY - iStartY;
    				
    				this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionStartX = iStartX;
    				this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionStartY = iStartY;
    				this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionWidth = iWidth;
    				this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionHeight = iHeight;
    				
    				this.bmpBlockMapPara.m_BlockMap[i][j].bHasIntersection = true;
    			}
    			else
    			{
    				this.bmpBlockMapPara.m_BlockMap[i][j].bHasIntersection = false;
    			}
    		}
    	}
    	
    	return true;
    }
    
    
});



return COORDINATE_TRANSFER;

});
