# -*- coding: utf-8 -*-

from odoo import models, fields, api
from odoo.http import request
import odoo
import json
import os
import math
from PIL import Image
try:
    import configparser as ConfigParser
except ImportError:
    import ConfigParser
import logging   

strDefaultParmeter = '''
GolbalToleranceRegular = 10,10
GolbalToleranceUnregular = 15,15
GolbalIndentRegular = 50.000000,50.000000
GolbalIndentUnregular = 50.000000,50.000000
GlassToGlassMode = 0
NeglectInspIfNoMarkResult = 0
'''

_logger = logging.getLogger(__name__) 

class Pad(models.TransientModel):
    _name = 'padtool.pad'
    
    name = fields.Char()

    GolbalToleranceRegularX = fields.Integer()
    GolbalToleranceRegularY = fields.Integer()
    GolbalToleranceUnregularX = fields.Integer()
    GolbalToleranceUnregularY = fields.Integer()
    GolbalIndentRegularX = fields.Float()
    GolbalIndentRegularY = fields.Float()
    GolbalIndentUnregularX = fields.Float()
    GolbalIndentUnregularY = fields.Float()
    
    GlassToGlassMode = fields.Integer()
    NeglectInspIfNoMarkResult = fields.Integer()
    
    
    @api.model
    def default_get(self, fields):
        res = super(Pad, self).default_get(fields)
        
        menu_id = self.env.context['params']['menu_id']
        menu = self.env['ir.ui.menu'].browse(menu_id)
        parts=[c for c in menu.complete_name.split('/') if c]
        
        root = odoo.tools.config['glass_root_path']   
        parFile = "%s/%s/%s/%s.par" % (root,parts[2],parts[3],parts[3])
        if not os.path.isfile(parFile):
            res.update(
                name = parts[2]+'/' +parts[3],
                GolbalToleranceRegularX = 10,
                GolbalToleranceRegularY = 10,
                GolbalToleranceUnregularX = 15,
                GolbalToleranceUnregularY = 15,
                GolbalIndentRegularX = 50,
                GolbalIndentRegularY = 50,
                GolbalIndentUnregularX = 50,
                GolbalIndentUnregularY = 50,
    
                GlassToGlassMode = 0,
                NeglectInspIfNoMarkResult = 0,
            )
        else:
            parConf = ConfigParser.ConfigParser()
            try:
                parConf.read(parFile)
            except Exception as e:
                raise e
            
            res.update(
                name = parts[2]+'/' +parts[3],
                GolbalToleranceRegularX = int(parConf['OPT']['GolbalToleranceRegularX']),
                GolbalToleranceRegularY = int(parConf['OPT']['GolbalToleranceRegularY']),
                GolbalToleranceUnregularX = int(parConf['OPT']['GolbalToleranceUnregularX']),
                GolbalToleranceUnregularY = int(parConf['OPT']['GolbalToleranceUnregularY']),
                GolbalIndentRegularX = float(parConf['OPT']['GolbalIndentRegularX']),
                GolbalIndentRegularY = float(parConf['OPT']['GolbalIndentRegularY']),
                GolbalIndentUnregularX = float(parConf['OPT']['GolbalIndentUnregularX']),
                GolbalIndentUnregularY = float(parConf['OPT']['GolbalIndentUnregularY']),
                GlassToGlassMode = int(parConf['OPT']['GlassToGlassMode']),
                NeglectInspIfNoMarkResult = int(parConf['OPT']['NeglectInspIfNoMarkResult']),
            )

        return res
    
    @api.multi
    def write(self, values):
        
        menu_id = self.env.context['params']['menu_id']
        menu = self.env['ir.ui.menu'].browse(menu_id)
        parts=[c for c in menu.complete_name.split('/') if c]
        
        root = odoo.tools.config['glass_root_path']   
        parFile = "%s/%s/%s/%s.par" % (root,parts[2],parts[3],parts[3])
        
        strParameter = '[OPT]\n'
        strParameter += 'GolbalToleranceRegularX = %d\n' % values.get('GolbalToleranceRegularX',self.GolbalToleranceRegularX)
        strParameter += 'GolbalToleranceRegularY = %d\n' % values.get('GolbalToleranceRegularY',self.GolbalToleranceRegularY)
        strParameter += 'GolbalToleranceUnregularX = %d\n' % values.get('GolbalToleranceUnregularX',self.GolbalToleranceUnregularX)
        strParameter += 'GolbalToleranceUnregularY = %d\n' % values.get('GolbalToleranceUnregularY',self.GolbalToleranceUnregularY)
        strParameter += 'GolbalIndentRegularX = %f\n' % values.get('GolbalIndentRegularX',self.GolbalIndentRegularX)
        strParameter += 'GolbalIndentRegularY = %f\n' % values.get('GolbalIndentRegularY',self.GolbalIndentRegularY)
        strParameter += 'GolbalIndentUnregularX = %f\n' % values.get('GolbalIndentUnregularX',self.GolbalIndentUnregularX)
        strParameter += 'GolbalIndentUnregularY = %f\n' % values.get('GolbalIndentUnregularY',self.GolbalIndentUnregularY)
        strParameter += 'GlassToGlassMode = %d\n' % values.get('GlassToGlassMode',self.GlassToGlassMode)
        strParameter += 'NeglectInspIfNoMarkResult = %d\n' % values.get('NeglectInspIfNoMarkResult',self.NeglectInspIfNoMarkResult)
        with open(parFile, 'w') as f:
            f.write( strParameter )

        return super(Pad, self).write(values)
    
    @api.model
    def create(self, values):
        
        menu_id = self.env.context['params']['menu_id']
        menu = self.env['ir.ui.menu'].browse(menu_id)
        parts=[c for c in menu.complete_name.split('/') if c]
        
        root = odoo.tools.config['glass_root_path']   
        parFile = "%s/%s/%s/%s.par" % (root,parts[2],parts[3],parts[3])
        
        strParameter = '[OPT]\n'
        strParameter += 'GolbalToleranceRegularX = %d\n' % values.get('GolbalToleranceRegularX',self.GolbalToleranceRegularX)
        strParameter += 'GolbalToleranceRegularY = %d\n' % values.get('GolbalToleranceRegularY',self.GolbalToleranceRegularY)
        strParameter += 'GolbalToleranceUnregularX = %d\n' % values.get('GolbalToleranceUnregularX',self.GolbalToleranceUnregularX)
        strParameter += 'GolbalToleranceUnregularY = %d\n' % values.get('GolbalToleranceUnregularY',self.GolbalToleranceUnregularY)
        strParameter += 'GolbalIndentRegularX = %f\n' % values.get('GolbalIndentRegularX',self.GolbalIndentRegularX)
        strParameter += 'GolbalIndentRegularY = %f\n' % values.get('GolbalIndentRegularY',self.GolbalIndentRegularY)
        strParameter += 'GolbalIndentUnregularX = %f\n' % values.get('GolbalIndentUnregularX',self.GolbalIndentUnregularX)
        strParameter += 'GolbalIndentUnregularY = %f\n' % values.get('GolbalIndentUnregularY',self.GolbalIndentUnregularY)
        strParameter += 'GlassToGlassMode = %d\n' % values.get('GlassToGlassMode',self.GlassToGlassMode)
        strParameter += 'NeglectInspIfNoMarkResult = %d\n' % values.get('NeglectInspIfNoMarkResult',self.NeglectInspIfNoMarkResult)
        with open(parFile, 'w') as f:
            f.write( strParameter )
            
        para =  super(Pad, self).create(values)
        para.name = parts[2]+'/' +parts[3]    
        return para
    
    @api.model
    def glass_information(self,menu_id):
        menu = request.env['ir.ui.menu'].browse(menu_id)
        parts=[c for c in menu.complete_name.split('/') if c]
        
        _logger.info('cur menu:%s', menu.complete_name)
        
        root = odoo.tools.config['glass_root_path']   
        padConfFile = root + '/' + parts[2] + "/PadToolConfig.ini"
        if not os.path.isfile(padConfFile):
            raise Exception("File(%s) doesn't exist" % padConfFile)
    
        padConf = ConfigParser.ConfigParser()
        try:
            padConf.read(padConfFile)
        except Exception as e:
            raise e
        
        bifFile = root + '/' + parts[2]  +'/' + padConf['GLASS_INFORMATION']['BIF_FILE']
        if not os.path.isfile(bifFile):
            raise Exception("File(%s) doesn't exist" % bifFile)
        
        bifConf = ConfigParser.RawConfigParser()
        with open(bifFile, 'r') as f:
            bifConf.read_string("[DEFAULT]\r\n" + f.read())
        
        cameraFile = root + '/' + parts[2]  +'/' + padConf['GLASS_INFORMATION']['CAMERA_FILE']
        if not os.path.isfile(cameraFile):
            raise Exception("File(%s) doesn't exist" % cameraFile)
        
        cameraConf = ConfigParser.RawConfigParser()
        with open(cameraFile, 'r') as f:
            cameraConf.read_string("[general]\r\n" + f.read())
            
        globalConf = request.env['res.config.settings'].get_values();
        
        return {
            "cameraConf":cameraConf._sections,
            "bifConf":bifConf._defaults,
            "padConf":padConf._sections,
            "globalConf":globalConf,
            "glassName":parts[2],
        }
        
    @api.model
    def panel_information(self,menu_id):
        menu = request.env['ir.ui.menu'].browse(menu_id)
        parts=[c for c in menu.complete_name.split('/') if c]
        
        _logger.info('cur menu:%s', menu.complete_name)
        
        root = odoo.tools.config['glass_root_path']   
        padConfFile = root + '/' + parts[2] + "/PadToolConfig.ini"
        if not os.path.isfile(padConfFile):
            raise Exception("File(%s) doesn't exist" % padConfFile)
    
        padConf = ConfigParser.ConfigParser()
        try:
            padConf.read(padConfFile)
        except Exception as e:
            raise e
        
        bifFile = root + '/' + parts[2]  +'/' + padConf['GLASS_INFORMATION']['BIF_FILE']
        if not os.path.isfile(bifFile):
            raise Exception("File(%s) doesn't exist" % bifFile)
        
        bifConf = ConfigParser.RawConfigParser()
        with open(bifFile, 'r') as f:
            bifConf.read_string("[DEFAULT]\r\n" + f.read())
        
        cameraFile = root + '/' + parts[2]  +'/' + padConf['GLASS_INFORMATION']['CAMERA_FILE']
        if not os.path.isfile(cameraFile):
            raise Exception("File(%s) doesn't exist" % cameraFile)
        
        cameraConf = ConfigParser.RawConfigParser()
        with open(cameraFile, 'r') as f:
            cameraConf.read_string("[DEFAULT]\r\n" + f.read())
            
        globalConf = request.env['res.config.settings'].get_values();
        return {
            "cameraConf":cameraConf._sections,
            "bifConf":bifConf._defaults,
            "padConf":padConf._sections,
            "glassName":parts[2],
            "panelName": parts[3],
            "globalConf":globalConf,
        }

    @api.model
    def save_pad(self,glassName,panelName,pad):
        root = odoo.tools.config['glass_root_path']         
        padFile = root + '/'+glassName +'/'+ panelName +'/'+ panelName+'.json';
        with open(padFile, 'w') as f:
            f.write(json.dumps(pad, separators=(',', ':')))
            
        strParameter = 'PanelCenter = %f,%f\n' % (pad['dPanelCenterX'],pad['dPanelCenterY'])
        parFile = root + '/'+glassName +'/'+ panelName +'/'+ panelName+'.par'; 
        if not os.path.isfile(parFile):  
            strParameter+=strDefaultParmeter 
        else:
            parConf = ConfigParser.ConfigParser()
            try:
                parConf.read(parFile)
            except Exception as e:
                raise e
            strParameter += 'GolbalToleranceRegular = %s,%s\n' % (parConf['OPT']['GolbalToleranceRegularX'],parConf['OPT']['GolbalToleranceRegularY'])
            strParameter += 'GolbalToleranceUnregular = %s,%s\n' % (parConf['OPT']['GolbalToleranceUnregularX'],parConf['OPT']['GolbalToleranceUnregularY'])
            strParameter += 'GolbalIndentRegular = %s,%s\n' % (parConf['OPT']['GolbalIndentRegularX'],parConf['OPT']['GolbalIndentRegularY'])
            strParameter += 'GolbalIndentUnregular = %s,%s\n' % (parConf['OPT']['GolbalIndentUnregularX'],parConf['OPT']['GolbalIndentUnregularY'])
            strParameter += 'GlassToGlassMode = %s\n' % parConf['OPT']['GlassToGlassMode']
            strParameter += 'NeglectInspIfNoMarkResult = %s\n' % parConf['OPT']['NeglectInspIfNoMarkResult']

        
        strFrame = ''
        strRegion = ''
        strMainMark = ''
        mainMarkStartx = 0
        region_list = []
        
        strPad_Filterpos = ''
        Pad_Filterpos_Number = 0
        
        strPad_Filter = ''
        Pad_Filter_Number = 0
 
        strPad_Inspect = ''
        Pad_Inspect_Number = 0
        
        width = 0
        max_height = 0
        innerFrame = None
        outrtFrame = None
        for obj in pad['objs']:
            if obj['padType'] == 'frame':
                if innerFrame == None:
                    innerFrame = obj
                else:
                    if innerFrame['points'][0]['x'] > obj['points'][0]['x'] and innerFrame['points'][1]['x'] < obj['points'][1]['x']:
                        outrtFrame = obj
                    else:
                        outrtFrame = innerFrame
                        innerFrame = obj
                        
            elif obj['padType'] == 'uninspectZone' and len(obj['points'])==2:
                strPad_Filterpos += 'Pad.Filterpos%d.BottomLeft = %f,%f\n' % (Pad_Filterpos_Number,obj['points'][0]['ux']-pad['dPanelCenterX'],obj['points'][0]['uy']-pad['dPanelCenterY'])
                strPad_Filterpos += 'Pad.Filterpos%d.BottomRight = %f,%f\n' % (Pad_Filterpos_Number,obj['points'][1]['ux']-pad['dPanelCenterX'],obj['points'][0]['uy']-pad['dPanelCenterY'])
                strPad_Filterpos += 'Pad.Filterpos%d.TopLeft = %f,%f\n' % (Pad_Filterpos_Number,obj['points'][0]['ux']-pad['dPanelCenterX'],obj['points'][1]['uy']-pad['dPanelCenterY'])
                strPad_Filterpos += 'Pad.Filterpos%d.TopRight = %f,%f\n' % (Pad_Filterpos_Number,obj['points'][1]['ux']-pad['dPanelCenterX'],obj['points'][1]['uy']-pad['dPanelCenterY'])
                
                Pad_Filterpos_Number += 1
            elif obj['padType'] == 'uninspectZone' and len(obj['points'])>2:
                strPad_Filter += 'Pad.Filter'+str(Pad_Filter_Number)+' = '
                for p in obj['points']:
                    strPad_Filter += str(p['ux']--pad['dPanelCenterX'])+','+str(p['uy']--pad['dPanelCenterY'])+';'
                strPad_Filter += '\n'        
                Pad_Filter_Number += 1
            elif obj['padType'] == 'inspectZone' and len(obj['points'])>1:
                strPad_Inspect += 'Pad.Inspect'+str(Pad_Inspect_Number)+' = '
                for p in obj['points']:
                    strPad_Inspect += str(p['ux']--pad['dPanelCenterX'])+','+str(p['uy']--pad['dPanelCenterY'])+';'
                strPad_Inspect += '\n' 
                strPad_Inspect += 'Pad.Inspect%d.Period = %f,%f\n' % (Pad_Inspect_Number,obj['periodX'],obj['periodY'])
                strPad_Inspect += 'Pad.Inspect%d.D1G1 = %d\n' % (Pad_Inspect_Number,obj['D1G1'])
                       
                Pad_Inspect_Number += 1
            elif obj['padType'] == 'mainMark':
                height = 0     
                block_list = []
                width += obj['blocks'][0]['iInterSectionWidth']
                for block in obj['blocks']:
                    imgFile = root + '/'+ glassName+'/JpegFile/IP'+str(block['iIPIndex']+1)+'/'+'AoiL_IP'+str(block['iIPIndex'])+'_scan'+str(block['iScanIndex'])+'_block'+str(block['iBlockIndex'])+'.jpg'
                    with Image.open(imgFile) as im:
                        left = block['iInterSectionStartX'];
                        right = block['iInterSectionStartX'] + block['iInterSectionWidth']
                        upper = im.height - (block['iInterSectionStartY'] + block['iInterSectionHeight'])
                        lower = im.height - block['iInterSectionStartY']
                        im = im.transpose(Image.FLIP_TOP_BOTTOM)
                        region = im.crop((left ,upper, right, lower))
                        block_list.append(region)
                        height += (lower-upper)
                        
                strMainMark += 'MainMark'+str(len(region_list))+'.size = '+ str(block['iInterSectionWidth']) +','+str(height)+'\n'
                strMainMark += 'MainMark'+str(len(region_list))+'.startx = '+ str(mainMarkStartx) + '\n'
                strMainMark += 'MainMark'+str(len(region_list))+'.pos = '+str(obj['points'][0]['ux']-pad['dPanelCenterX'])+','+str(obj['points'][0]['uy']-pad['dPanelCenterY'])+'\n'
                strMainMark += 'MainMark'+str(len(region_list))+'.ipindex = '+str(block['iIPIndex'])+'\n'
                strMainMark += 'MainMark'+str(len(region_list))+'.scanindex = '+str(block['iScanIndex'])+'\n'
                
                mainMarkStartx += block['iInterSectionWidth']
                max_height = height if height > max_height else max_height   
                region_list.append(block_list)
                
        if innerFrame is not None  and outrtFrame is not None:
            frameLeft0 = outrtFrame['points'][0]['ux']-pad['dPanelCenterX']
            frameRight0 = innerFrame['points'][0]['ux']-pad['dPanelCenterX']
            frameTop0 = innerFrame['points'][1]['uy']+pad['region_overlap']-pad['dPanelCenterY']
            frameBottom0 = innerFrame['points'][0]['uy']+pad['region_overlap']-pad['dPanelCenterY']
            strFrame += 'PadFrameNum = 4\n'
            strFrame += 'PadFrame0.iDirection = 0\n'
            strFrame += 'PadFrame0.postion_topleft = '+str(frameLeft0)+','+str(frameTop0)+'\n'
            strFrame += 'PadFrame0.postion_topright = '+str(frameRight0)+','+str(frameTop0)+'\n'
            strFrame += 'PadFrame0.postion_bottomleft = '+str(frameLeft0)+','+str(frameBottom0)+'\n'
            strFrame += 'PadFrame0.postion_bottomright = '+str(frameRight0)+','+str(frameBottom0)+'\n'
            
            frameLeft1 = outrtFrame['points'][0]['ux']-pad['dPanelCenterX']
            frameRight1 = outrtFrame['points'][1]['ux']-pad['dPanelCenterX']
            frameTop1 = innerFrame['points'][0]['uy']-pad['dPanelCenterY']
            frameBottom1 = outrtFrame['points'][0]['uy']-pad['dPanelCenterY']
            strFrame += 'PadFrame1.iDirection = 1\n'
            strFrame += 'PadFrame1.postion_topleft = '+str(frameLeft1)+','+str(frameTop1)+'\n'
            strFrame += 'PadFrame1.postion_topright = '+str(frameRight1)+','+str(frameTop1)+'\n'
            strFrame += 'PadFrame1.postion_bottomleft = '+str(frameLeft1)+','+str(frameBottom1)+'\n'
            strFrame += 'PadFrame1.postion_bottomright = '+str(frameRight1)+','+str(frameBottom1)+'\n'
            
            frameLeft2 = innerFrame['points'][1]['ux']-pad['dPanelCenterX']
            frameRight2 = outrtFrame['points'][1]['ux']-pad['dPanelCenterX']
            frameTop2 = innerFrame['points'][1]['uy']+pad['region_overlap']-pad['dPanelCenterY']
            frameBottom2 = innerFrame['points'][0]['uy']+pad['region_overlap']-pad['dPanelCenterY']
            strFrame += 'PadFrame2.iDirection = 2\n'
            strFrame += 'PadFrame2.postion_topleft = '+str(frameLeft2)+','+str(frameTop2)+'\n'
            strFrame += 'PadFrame2.postion_topright = '+str(frameRight2)+','+str(frameTop2)+'\n'
            strFrame += 'PadFrame2.postion_bottomleft = '+str(frameLeft2)+','+str(frameBottom2)+'\n'
            strFrame += 'PadFrame2.postion_bottomright = '+str(frameRight2)+','+str(frameBottom2)+'\n'
            
            frameLeft3 = outrtFrame['points'][0]['ux']-pad['dPanelCenterX']
            frameRight3 = outrtFrame['points'][1]['ux']-pad['dPanelCenterX']
            frameTop3 = outrtFrame['points'][1]['uy']-pad['dPanelCenterY']
            frameBottom3 = innerFrame['points'][1]['uy']-pad['dPanelCenterY']
            strFrame += 'PadFrame3.iDirection = 3\n'
            strFrame += 'PadFrame3.postion_topleft = '+str(frameLeft3)+','+str(frameTop3)+'\n'
            strFrame += 'PadFrame3.postion_topright = '+str(frameRight3)+','+str(frameTop3)+'\n'
            strFrame += 'PadFrame3.postion_bottomleft = '+str(frameLeft3)+','+str(frameBottom3)+'\n'
            strFrame += 'PadFrame3.postion_bottomright = '+str(frameRight3)+','+str(frameBottom3)+'\n'
            
            region_id = 0
            regionTop = frameTop0
            while True:
                regionHeight = pad['region_height']
                nextRegionTop = regionTop - pad['region_height'] + pad['region_overlap']
                if (nextRegionTop - pad['region_height'])  < frameBottom0:
                    regionHeight =  regionTop - frameBottom0;
                    
                regionLeft0 = frameLeft0
                regionRight0 = frameRight0
                regionLeft2 = frameLeft2
                regionRight2 = frameRight2
                regionBottom = regionTop + regionHeight
                strRegion += 'Region'+str(region_id)+'.region = '+str(regionLeft0)+','+str(regionBottom)+';'+str(regionRight0)+','+str(regionBottom)+';'+str(regionRight0)+','+str(regionTop)+';'+str(regionLeft0)+','+str(regionTop)+'\n'
                strRegion += 'Region'+str(region_id)+'.iFrameNo = 0\n'
                region_id = region_id + 1
                strRegion += 'Region'+str(region_id)+'.region = '+str(regionLeft2)+','+str(regionBottom)+';'+str(regionRight2)+','+str(regionBottom)+';'+str(regionRight2)+','+str(regionTop)+';'+str(regionLeft2)+','+str(regionTop)+'\n'    
                strRegion += 'Region'+str(region_id)+'.iFrameNo = 2\n'
                region_id = region_id + 1
                    
                regionTop = nextRegionTop
                if (regionTop - pad['region_height']) < frameBottom0:
                    break
                
            strRegion += 'Region'+str(region_id)+'.region = '+str(frameLeft1)+','+str(frameBottom1)+';'+str(frameRight1)+','+str(frameBottom1)+';'+str(frameRight1)+','+str(frameTop1)+';'+str(frameLeft1)+','+str(frameTop1)+'\n'
            strRegion += 'Region'+str(region_id)+'.iFrameNo = 1\n'
            region_id = region_id + 1
            strRegion += 'Region'+str(region_id)+'.region = '+str(frameLeft3)+','+str(frameBottom3)+';'+str(frameRight3)+','+str(frameBottom3)+';'+str(frameRight3)+','+str(frameTop3)+';'+str(frameLeft3)+','+str(frameTop3)+'\n'    
            strRegion += 'Region'+str(region_id)+'.iFrameNo = 3\n'
            region_id = region_id + 1
            strRegion = 'TotalRegionNumber = '+str(region_id)+'\n' + strRegion
            
        if len(region_list):
            strMainMark = 'MainMarkNumber = '+str(len(region_list))+'\n' + strMainMark
            
            markFile = root + '/'+glassName +'/'+ panelName +'/mainMark.jpg'
            mark = Image.new('L', (width,max_height))
            left = 0
            for blocks in region_list:
                lower = max_height
                for region in blocks:
                    upper = lower - region.size[1]
                    right = left+region.size[0]
                    mark.paste(region, (left ,upper, right, lower))
                    
                    lower = max_height - region.size[1]
                left += blocks[0].size[0]
            mark.save(markFile, 'JPEG')    
            
        if Pad_Filterpos_Number > 0:
            strPad_Filterpos = 'Pad_Filterpos_Number = '+str(Pad_Filterpos_Number) +'\n' + strPad_Filterpos   
        if Pad_Filter_Number > 0:
            strPad_Filter = 'Pad_Filter_Number = '+str(Pad_Filter_Number) +'\n'+ strPad_Filter 
        if Pad_Inspect_Number > 0:
            strPad_Inspect = 'Pad_Inspect_Number = '+str(Pad_Inspect_Number) +'\n'+ strPad_Inspect 
             
        with open(root + '/'+glassName +'/'+ panelName +'/'+ panelName+'.pad', 'w') as f:
            f.write(strParameter)
            f.write( strFrame )
            f.write( strRegion )
            f.write( strMainMark )
            f.write( strPad_Filterpos )
            f.write( strPad_Filter )
            f.write( strPad_Inspect )

            