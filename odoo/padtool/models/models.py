# -*- coding: utf-8 -*-

from odoo import models, fields, api,_
from odoo.http import request
import odoo
import json
import os
import re
import math
from PIL import Image
from io import BytesIO
import base64
from ctypes import *

from odoo.exceptions import UserError, ValidationError

try:
    import configparser as ConfigParser
except ImportError:
    import ConfigParser
import logging   

_logger = logging.getLogger(__name__) 

PADNAME_PATTERN = '^[a-zA-Z0-9][a-zA-Z0-9_-]+$'
class Pad(models.Model):
    _name = 'padtool.pad'
    
    name = fields.Char(required=True)
    glassName = fields.Selection(selection='_get_glassName', string='GlassName',required=True)
    #panelName = fields.Selection(selection='_get_panelName', string='PanelName')
    #glassName = fields.Char(required=True)
    panelName = fields.Char(required=True)
    summary = fields.Text('Summary', translate=True)
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Pad name already exists !"),
    ]
    
    @api.model
    def _get_glassName(self):
        Menu = self.env['ir.ui.menu'].with_context({'ir.ui.menu.full_list': True})
        menus = Menu.sudo().search([('parent_id', '=', self.env.ref('padtool.menu_glass_root').id),])
        return [(m.name, m.name) for m in menus]
    
    @api.onchange('glassName')
    def _onchange_glassName(self):
        if self.glassName:
            Menu = self.env['ir.ui.menu'].with_context({'ir.ui.menu.full_list': True})
            menus = Menu.sudo().search([('parent_id.name', '=', self.glassName),])
            self.panelName = menus[0].name
            
    @api.one
    @api.constrains('glassName', 'panelName')
    def _check_name(self):
        Menu = self.env['ir.ui.menu'].with_context({'ir.ui.menu.full_list': True})
        menus = Menu.sudo().search([('name','=',self.panelName),('parent_id.name', '=', self.glassName),])
        if len(menus) < 1:
            raise ValidationError("GlassName and PanelName must be match")

    GolbalToleranceRegularX = fields.Integer(string="ToleranceRegularX",default=10)
    GolbalToleranceRegularY = fields.Integer(string="ToleranceRegularY",default=10)
    GolbalToleranceUnregularX = fields.Integer(string="ToleranceUnregularX",default=15)
    GolbalToleranceUnregularY = fields.Integer(string="ToleranceUnregularY",default=15)
    GolbalIndentRegularX = fields.Float(string = "IndentRegularX(um)",default=50)
    GolbalIndentRegularY = fields.Float(string = "IndentRegularY(um)",default=50)
    GolbalIndentUnregularX = fields.Float(string = "IndentUnregularX(um)",default=50)
    GolbalIndentUnregularY = fields.Float(string = "IndentUnregularX(um)",default=50)
    
    GolbalToleranceRegularDynamicX = fields.Float(string="ToleranceRegularDynamicX",default=0.15)
    GolbalToleranceRegularDynamicY = fields.Float(string="ToleranceRegularDynamicY",default=0.15)
    
    GlassToGlassMode  = fields.Selection([(0, 'panel to panel'), (1, 'glass to glass'), (2, 'glass to golden'),], string='PadMode', default=0)
    NeglectInspIfNoMarkResult = fields.Integer(string="NeglectInspIfNoMarkResult",default=0)
    
    BMMode = fields.Boolean(string='BMMode',default=False)
    BMPeriodX0 = fields.Float(string = "BM.PeriodX0(um)",default=0)
    BMPeriodY0 = fields.Float(string = "BM.PeriodY0(um)",default=0)
    BMPeriodX1 = fields.Float(string = "BM.PeriodX1(um)",default=0)
    BMPeriodY1 = fields.Float(string = "BM.PeriodY1(um)",default=0)
    
    content = fields.Text()
    mainMark = fields.Binary(attachment=True)
    subMark = fields.Binary(attachment=True)

    @api.one
    @api.depends('content')
    def _compute_attachment(self):
        self.mainMark_attachment_id = self.env['ir.attachment'].search([('res_field', '=', 'mainMark'),('res_id', '=', self.id), ('res_model', '=', 'padtool.pad')], limit=1)
        self.subMark_attachment_id = self.env['ir.attachment'].search([('res_field', '=', 'subMark'),('res_id', '=', self.id), ('res_model', '=', 'padtool.pad')], limit=1)
        
    mainMark_attachment_id = fields.Many2one('ir.attachment', compute='_compute_attachment', ondelete='restrict', readonly=True)
    subMark_attachment_id = fields.Many2one('ir.attachment', compute='_compute_attachment', ondelete='restrict', readonly=True)
    
    @api.model
    def create(self, vals):
        if not re.match(PADNAME_PATTERN, vals['name']):
            raise ValidationError(_('Invalid pad name. Only alphanumerical characters, underscore, hyphen are allowed.'))
        
        if ('glassName' not in vals):
            menu_id = self.env.context['params']['menu_id']
            menu = self.env['ir.ui.menu'].browse(menu_id)
            parts=[c for c in menu.complete_name.split('/') if c]
            vals['glassName'] = parts[2]
            vals['panelName'] = parts[3]
            
        if ('panelName' not in vals):
            Menu = self.env['ir.ui.menu'].with_context({'ir.ui.menu.full_list': True})
            menus = Menu.sudo().search([('parent_id.name', '=', vals['glassName']),])
            vals['panelName'] = menus[0].name
            
        pad = super(Pad, self).create(vals)
        return pad
    
    @api.multi
    def copy(self, default=None):
        if default is None:
            default = {}
        if not default.get('name'):
            default['name'] = "%s_copy" % self.name

        return super(Pad, self).copy(default)
    
    @api.multi
    def save_mark(self,pad):
        root = odoo.tools.config['glass_root_path']    
        mainMark = None
        subMark = None
        mainMarkWidth = 0
        subMarkWidth = 0
        mainMarkHeight = 0
        subMarkHeight = 0
        mainMarkStartx = 0
        subMarkStartx = 0    
        mainMarkList = []
        subMarkList = []
        for obj in pad['objs']:
            if obj['padType'] == 'mainMark' and pad.get('isMainMarkModified',False):
                height = 0     
                block_list = []
                iInterSectionWidth = 0
                
                for block in obj['blocks']:
                    if (not 'iInterSectionHeight' in block):
                        continue;
                    if iInterSectionWidth == 0:
                        iInterSectionWidth = block['iInterSectionWidth']
                    
                    height += block['iInterSectionHeight']
                    imgFile = root + '/'+ self.glassName+'/JpegFile/IP'+str(block['iIPIndex']+1)+'/'+'AoiL_IP'+str(block['iIPIndex'])+'_scan'+str(block['iScanIndex'])+'_block'+str(block['iBlockIndex'])+'.jpg'
                    with Image.open(imgFile) as im:
                        left = block['iInterSectionStartX']
                        right = block['iInterSectionStartX'] + block['iInterSectionWidth']
                        upper = im.height - (block['iInterSectionStartY'] + block['iInterSectionHeight'])
                        lower = im.height - block['iInterSectionStartY']
                        im = im.transpose(Image.FLIP_TOP_BOTTOM)
                        region = im.crop((left ,upper, right, lower))
                        block_list.append(region)
                
                mainMarkWidth += iInterSectionWidth       
                mainMarkStartx += iInterSectionWidth
                mainMarkHeight = height if height > mainMarkHeight else mainMarkHeight   
                if len(block_list):
                    mainMarkList.append(block_list)
            elif obj['padType'] == 'subMark' and pad.get('isSubMarkModified',False):
                height = 0     
                block_list = []
                iInterSectionWidth = 0
                
                for block in obj['blocks']:
                    if (not 'iInterSectionHeight' in block):
                        continue;
                    if iInterSectionWidth == 0:
                        iInterSectionWidth = block['iInterSectionWidth']
                    
                    height += block['iInterSectionHeight']
                    imgFile = root + '/'+ self.glassName+'/JpegFile/IP'+str(block['iIPIndex']+1)+'/'+'AoiL_IP'+str(block['iIPIndex'])+'_scan'+str(block['iScanIndex'])+'_block'+str(block['iBlockIndex'])+'.jpg'
                    with Image.open(imgFile) as im:
                        left = block['iInterSectionStartX']
                        right = block['iInterSectionStartX'] + block['iInterSectionWidth']
                        upper = im.height - (block['iInterSectionStartY'] + block['iInterSectionHeight'])
                        lower = im.height - block['iInterSectionStartY']
                        im = im.transpose(Image.FLIP_TOP_BOTTOM)
                        region = im.crop((left ,upper, right, lower))
                        block_list.append(region)
                        
                subMarkWidth += iInterSectionWidth
                subMarkStartx += iInterSectionWidth
                subMarkHeight = height if height > subMarkHeight else subMarkHeight   
                if len(block_list):
                    subMarkList.append(block_list)
                    
        if len(mainMarkList):
            mark = Image.new('L', (mainMarkWidth,mainMarkHeight))
            left = 0
            for blocks in mainMarkList:
                lower = mainMarkHeight
                for region in blocks:
                    upper = lower - region.size[1]
                    right = left+region.size[0]
                    mark.paste(region, (left ,upper, right, lower))
                    
                    lower = mainMarkHeight - region.size[1]
                left += blocks[0].size[0]
            
            b = BytesIO()
            mark.save(b, 'BMP')
            mainMark = base64.b64encode(b.getvalue())
            
        if len(subMarkList):
            mark = Image.new('L', (subMarkWidth,subMarkHeight))
            left = 0
            for blocks in subMarkList:
                lower = subMarkHeight
                for region in blocks:
                    upper = lower - region.size[1]
                    right = left+region.size[0]
                    mark.paste(region, (left ,upper, right, lower))
                    
                    lower = subMarkHeight - region.size[1]
                left += blocks[0].size[0]

            b = BytesIO()
            mark.save(b, 'BMP')
            subMark = base64.b64encode(b.getvalue())
        
        return (mainMark,subMark)  
            
    @api.multi
    def write(self, values):
        if 'content' in values:
            content = json.loads(values['content'])
            if content.get('isMainMarkModified',False) or content.get('isSubMarkModified',False):
                mainMark,subMark = self.save_mark(content)
                if mainMark is not None:
                    values['mainMark'] = mainMark
                if subMark is not None:
                    values['subMark'] = subMark
            
        return super(Pad, self).write(values)
    
    @api.multi
    def close_dialog(self):
        return {'type': 'ir.actions.act_window_close'}

    @api.multi
    def edit_dialog(self):
        form_view = self.env.ref('padtool.pad_view_form')
        return {
            'name': _('Pad'),
            'res_model': 'padtool.pad',
            'res_id': self.id,
            'views': [(form_view.id, 'form'),],
            'type': 'ir.actions.act_window',
            'target': 'inline'
        }
        
    @api.model
    def open_kanban(self):
        menu_id = self.env.context['params']['menu_id']
        menu = self.env['ir.ui.menu'].browse(menu_id)
        parts=[c for c in menu.complete_name.split('/') if c]
        return {
            'type': 'ir.actions.act_window',
            'name': "Pads",
            'res_model': "padtool.pad",
            'view_mode': 'kanban,form',
            'view_id': False,
            'view_type': 'form',
            'domain': [('glassName', '=', parts[2]), ('panelName', '=', parts[3])],
            'target': 'current',
            'flags':{'import_enabled':False,'import_pad_enabled':True}
            }
        
    @api.model
    def glass_information(self,menu_id):
        if menu_id is None:
            return
        
        menu = request.env['ir.ui.menu'].sudo().browse(int(menu_id))
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
        if menu_id is None:
            return
        
        menu = request.env['ir.ui.menu'].sudo().browse(int(menu_id))
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
            "glassName":parts[2],
            "panelName": parts[3],
            "globalConf":globalConf,
        }
        
    @api.model
    def import_pad(self,file,menu_id):
        written = True
        message = ''

        content = {'objs':[]}
        pad = {'name':file.filename.split('.')[0]}
        
        try:
            menu = self.env['ir.ui.menu'].browse(int(menu_id))
            parts=[c for c in menu.complete_name.split('/') if c]
            pad['glassName'] = parts[2]
            pad['panelName'] = parts[3]
            
            root = odoo.tools.config['glass_root_path']   
            padConfFile = root + '/' + parts[2] + "/PadToolConfig.ini"
            if not os.path.isfile(padConfFile):
                raise Exception("File(%s) doesn't exist" % padConfFile)
            padConf = ConfigParser.ConfigParser()
            padConf.read(padConfFile)
            cameraFile = root + '/' + parts[2]  +'/' + padConf['GLASS_INFORMATION']['CAMERA_FILE']
            if not os.path.isfile(cameraFile):
                raise Exception("File(%s) doesn't exist" % cameraFile)
            cameraConf = ConfigParser.RawConfigParser()
            with open(cameraFile, 'r') as f:
                cameraConf.read_string("[general]\r\n" + f.read())
            
                
            padParser = ConfigParser.RawConfigParser()
            padParser.read_string("[DEFAULT]\r\n" + file.read().decode())
            par = padParser._defaults
            
            content['dPanelCenterX'],content['dPanelCenterY'] = (float(s) for s in par['PanelCenter'.lower()].split(','))
            pad['GolbalToleranceRegularX'],pad['GolbalToleranceRegularY'] = (int(s) for s in par['GolbalToleranceRegular'.lower()].split(','))
            pad['GolbalToleranceUnregularX'],pad['GolbalToleranceUnregularY'] = (int(s) for s in par['GolbalToleranceUnregular'.lower()].split(','))
            pad['GolbalIndentRegularX'],pad['GolbalIndentRegularY'] = (float(s) for s in par['GolbalIndentRegular'.lower()].split(','))
            pad['GolbalIndentUnregularX'],pad['GolbalIndentUnregularY'] = (float(s) for s in par['GolbalIndentUnregular'.lower()].split(','))
            
            if ('GolbalToleranceRegularDynamic'.lower() in par):
                pad['GolbalToleranceRegularDynamicX'],pad['GolbalToleranceRegularDynamicY'] = (float(s) for s in par['GolbalToleranceRegularDynamic'.lower()].split(','))
            
            
            pad['GlassToGlassMode'] = int(par['GlassToGlassMode'.lower()])
            pad['NeglectInspIfNoMarkResult'] = int(par['NeglectInspIfNoMarkResult'.lower()])
            pad['BMMode'] = int(par['BMMode'.lower()])
            pad['BMPeriodX0'] = float(par['BMPeriodX0'.lower()])
            pad['BMPeriodY0'] = float(par['BMPeriodY0'.lower()])
            pad['BMPeriodX1'] = float(par['BMPeriodX1'.lower()])
            pad['BMPeriodY1'] = float(par['BMPeriodY1'.lower()])
            
            frameLeft0,frameBottom0 = (float(s) for s in par['PadFrame0.postion_topleft'.lower()].split(','))
            frameRight0,frameBottom0 = (float(s) for s in par['PadFrame0.postion_topright'.lower()].split(','))
            frameLeft0,frameTop0 = (float(s) for s in par['PadFrame0.postion_bottomleft'.lower()].split(','))
            frameRight0,frameTop0 = (float(s) for s in par['PadFrame0.postion_bottomright'.lower()].split(','))
            
            frameLeft1,frameBottom1 = (float(s) for s in par['PadFrame1.postion_topleft'.lower()].split(','))
            frameRight1,frameBottom1 = (float(s) for s in par['PadFrame1.postion_topright'.lower()].split(','))
            frameLeft1,frameTop1 = (float(s) for s in par['PadFrame1.postion_bottomleft'.lower()].split(','))
            frameRight1,frameTop1 = (float(s) for s in par['PadFrame1.postion_bottomright'.lower()].split(','))
            
            frameLeft2,frameBottom2 = (float(s) for s in par['PadFrame2.postion_topleft'.lower()].split(','))
            frameRight2,frameBottom2 = (float(s) for s in par['PadFrame2.postion_topright'.lower()].split(','))
            frameLeft2,frameTop2 = (float(s) for s in par['PadFrame2.postion_bottomleft'.lower()].split(','))
            frameRight2,frameTop2 = (float(s) for s in par['PadFrame2.postion_bottomright'.lower()].split(','))
            
            frameLeft3,frameBottom3 = (float(s) for s in par['PadFrame3.postion_topleft'.lower()].split(','))
            frameRight3,frameBottom3 = (float(s) for s in par['PadFrame3.postion_topright'.lower()].split(','))
            frameLeft3,frameTop3 = (float(s) for s in par['PadFrame3.postion_bottomleft'.lower()].split(','))
            frameRight3,frameTop3 = (float(s) for s in par['PadFrame3.postion_bottomright'.lower()].split(','))
            
            innerFrame = {"padType":"frame","points":[{},{}]}
            innerFrame['points'][0]['ux'] = frameRight0 + content['dPanelCenterX']
            innerFrame['points'][0]['uy'] = frameTop1 + content['dPanelCenterY']
            innerFrame['points'][1]['ux'] = frameLeft2 + content['dPanelCenterX']
            innerFrame['points'][1]['uy'] = frameBottom3 + content['dPanelCenterY']
            content['objs'].append(innerFrame)
            
            outrtFrame = {"padType":"frame","points":[{},{}]}
            outrtFrame['points'][0]['ux'] = frameLeft0 + content['dPanelCenterX']
            outrtFrame['points'][0]['uy'] = frameBottom1 + content['dPanelCenterY']
            outrtFrame['points'][1]['ux'] = frameRight1 + content['dPanelCenterX']
            outrtFrame['points'][1]['uy'] = frameTop3 + content['dPanelCenterY']
            content['objs'].append(outrtFrame)
            
            TotalRegionNumber = int(par.get('TotalRegionNumber'.lower(),0))
            for i in range(0, TotalRegionNumber):
                (regionLeft,regionBottom),(regionRight,_),(_1,regionTop),(_2,_3) = ((float(s2) for s2 in s1.split(',')) for s1 in par[('Region%d.region' % i).lower()].split(';'))
                region = {'points':[{},{}],'padType':'region'}
                region['points'][0]['ux'] = regionLeft + content['dPanelCenterX']
                region['points'][0]['uy'] = regionBottom + content['dPanelCenterY']
                region['points'][1]['ux'] = regionRight + content['dPanelCenterX']
                region['points'][1]['uy'] = regionTop + content['dPanelCenterY']
                content['objs'].append(region)
                
            MainMarkNumber = int(par.get('MainMarkNumber'.lower(),0))
            for i in range(0, MainMarkNumber):
                ipindex = int(par[('MainMark%d.ipindex' % i).lower()]) + 1
                scanindex = int(par[('MainMark%d.scanindex' % i).lower()]) + 1
                resolutionx = float(cameraConf['IP%dscantimes%d' % (ipindex,scanindex)]['Camera_X_Res'])
                resolutiony = float(cameraConf['IP%dscantimes%d' % (ipindex,scanindex)]['Camera_Y_Res'])
                sizex,sizey = (int(s)  for s in par[('MainMark%d.size' % i).lower()].split(','))
                sizex *= resolutionx
                sizey *= resolutiony
                posx,posy = (float(s)  for s in par[('MainMark%d.pos' % i).lower()].split(','))
                posx += content['dPanelCenterX']
                posy += content['dPanelCenterY']
                mainMark = {'points':[{},{}],'padType':'mainMark'}
                mainMark['points'][0]['ux'] = posx - sizex/2
                mainMark['points'][0]['uy'] = posy - sizey/2
                mainMark['points'][1]['ux'] = posx + sizex/2
                mainMark['points'][1]['uy'] = posy + sizey/2
                content['objs'].append(mainMark)
            
            SubMarkNumber = int(par.get('SubMarkNumber'.lower(),0))
            for i in range(0, SubMarkNumber):
                ipindex = int(par[('SubMark%d.ipindex' % i).lower()]) + 1
                scanindex = int(par[('SubMark%d.scanindex' % i).lower()]) + 1
                resolutionx = float(cameraConf['IP%dscantimes%d' % (ipindex,scanindex)]['Camera_X_Res'])
                resolutiony = float(cameraConf['IP%dscantimes%d' % (ipindex,scanindex)]['Camera_Y_Res'])
                sizex,sizey = (int(s)  for s in par[('SubMark%d.size' % i).lower()].split(','))
                sizex *= resolutionx
                sizey *= resolutiony
                posx,posy = (float(s)  for s in par[('SubMark%d.pos' % i).lower()].split(','))
                posx += content['dPanelCenterX']
                posy += content['dPanelCenterY']
                subMark = {'points':[{},{}],'padType':'subMark'}
                subMark['points'][0]['ux'] = posx - sizex/2
                subMark['points'][0]['uy'] = posy - sizey/2
                subMark['points'][1]['ux'] = posx + sizex/2
                subMark['points'][1]['uy'] = posy + sizey/2
                content['objs'].append(subMark)    
                
            Pad_Filterpos_Number = int(par.get('Pad_Filterpos_Number'.lower(),0))
            for i in range(0, Pad_Filterpos_Number):
                uninspectZone = {'points':[],'padType':'uninspectZone'} 
                Left,Bottom = (float(s)  for s in par[('Pad.Filterpos%d.BottomLeft' % i).lower()].split(','))
                Right,Top = (float(s)  for s in par[('Pad.Filterpos%d.TopRight' % i).lower()].split(','))
                uninspectZone['points'].append({'ux':Left + content['dPanelCenterX'],'uy':Bottom + content['dPanelCenterY']})
                uninspectZone['points'].append({'ux':Right + content['dPanelCenterX'],'uy':Top + content['dPanelCenterY']})
                content['objs'].append(uninspectZone)  
                 
            Pad_Filter_Number = int(par.get('Pad_Filter_Number'.lower(),0))
            for i in range(0, Pad_Filter_Number):
                uninspectZone = {'points':[],'padType':'uninspectZone'}
                for p in par[('Pad.Filter%d' % i).lower()].split(';'):
                    if p == '':
                        continue
                    x,y = (float(s)  for s in p.split(','))
                    uninspectZone['points'].append({'ux':x + content['dPanelCenterX'],'uy':y + content['dPanelCenterY']})
                content['objs'].append(uninspectZone)
                
            Pad_Inspect_Number = int(par.get('Pad_Inspect_Number'.lower(),0))
            for i in range(0, Pad_Inspect_Number):
                inspectZone = {'points':[],'padType':'inspectZone'}
                xPeriod,yPeriod = (float(s)  for s in par[('Pad.Inspect%d.Period' % i).lower()].split(','))
                inspectZone['periodX'] = xPeriod
                inspectZone['periodY'] = yPeriod
                inspectZone['D1G1'] = int(par[('Pad.Inspect%d.D1G1' % i).lower()])
                for p in par[('Pad.Inspect%d' % i).lower()].split(';'):
                    if p == '':
                        continue
                    x,y = (float(s)  for s in p.split(','))
                    inspectZone['points'].append({'ux':x + content['dPanelCenterX'],'uy':y + content['dPanelCenterY']})
                content['objs'].append(inspectZone)
                    
            pad['content'] = json.dumps(content)
            self.create(pad)
        except Exception as e:
            written = False
            message = str(e)
        return {'success': written,'message':message}
    
    @api.model
    def search_goa(self,glass_name,width,height,strBlocks,strPoints):
        root = odoo.tools.config['glass_root_path']
        blocks = json.loads(strBlocks)
        points = json.loads(strPoints)
         
        dest = Image.new('L', (width,height))   
        left = 0
        top = 0 
        for x in range(len(blocks)):
            for y in range(len(blocks[x])-1,-1,-1):
                b = blocks[x][y]    
                if b is None or b['bHasIntersection'] == False:
                    continue;
                
                imgFile = '%s/%s/JpegFile/IP%d/AoiL_IP%d_scan%d_block%d.jpg' % (root,glass_name,b['iIPIndex']+1,b['iIPIndex'],b['iScanIndex'],b['iBlockIndex'])
                with Image.open(imgFile) as im:
                    im = im.transpose(Image.FLIP_TOP_BOTTOM)
                    region = im.crop((b['iInterSectionStartX'] ,im.height-(b['iInterSectionStartY']+b['iInterSectionHeight']),b['iInterSectionStartX']+ b['iInterSectionWidth'], im.height-b['iInterSectionStartY']))
                    dest.paste(region, (left,top))
                    if y == 0:
                        left += region.width
                        top = 0
                    else:
                        top += region.height

        pSrcStart = dest.tobytes()
        step = 1
        nVertices = len(points['x'])
        aVerticesX = (c_int * nVertices)(*points['x'])
        aVerticesY = (c_int * nVertices)(*points['y'])
        periodX = c_double()
        periodY = c_double()
        periodType = c_int()
        pMapStart = create_string_buffer(width*height*3)
        nMapStep = 3
        
        res = windll.IPPDllTest.GetPeriod(pSrcStart,width,height,step,nVertices,aVerticesX,aVerticesY,byref(periodX),byref(periodY),byref(periodType),pMapStart,nMapStep)
        if res == 1:
            out = Image.frombytes('RGB', (width,height), pMapStart)
            
            with open('d:/goa.bmp', 'wb') as f:
                out.save(f, format="BMP")
            
            b = BytesIO()
            out.save(b, 'JPEG')
        
            return {
                'result': True,
                "periodX":periodX.value,
                "periodY":periodY.value,
                'map':base64.b64encode(b.getvalue())
            }
        else:
            return {
                'result': False
            }

class PublishDirectory(models.Model):
    _name = "padtool.directory"
    _description = "Publich directory of pad"

    name = fields.Char(required=True,string = "directory")
    active = fields.Boolean(string="Active", default=True)

    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Directory already exists !"),
    ]     
    
    @api.multi
    def write(self, vals):
        if 'name' in vals:
            vals['name'] = os.path.normpath(vals['name'])
            if not os.path.exists(vals['name']):
                raise ValidationError(_('Invalid publish directory.'))
            
        return super(PublishDirectory, self).write(vals)

    @api.model
    def create(self, vals):
        vals['name'] = os.path.normpath(vals['name'])
        if not os.path.exists(vals['name']):
            raise ValidationError(_('Invalid publish directory.'))

        dir = super(PublishDirectory, self).create(vals)
        return dir   
    
