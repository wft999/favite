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
    glassName = fields.Char(required=True)
    panelName = fields.Char(required=True)
    summary = fields.Text('Summary', translate=True)
    _sql_constraints = [
        ('name_uniq', 'unique (name)', "Pad name already exists !"),
    ]

    GolbalToleranceRegularX = fields.Integer(string="ToleranceRegularX",default=10)
    GolbalToleranceRegularY = fields.Integer(string="ToleranceRegularY",default=10)
    GolbalToleranceUnregularX = fields.Integer(string="ToleranceUnregularX",default=15)
    GolbalToleranceUnregularY = fields.Integer(string="ToleranceUnregularY",default=15)
    GolbalIndentRegularX = fields.Float(string = "IndentRegularX(um)",default=50)
    GolbalIndentRegularY = fields.Float(string = "IndentRegularY(um)",default=50)
    GolbalIndentUnregularX = fields.Float(string = "IndentUnregularX(um)",default=50)
    GolbalIndentUnregularY = fields.Float(string = "IndentUnregularX(um)",default=50)
    
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
        menu_id = self.env.context['params']['menu_id']
        menu = self.env['ir.ui.menu'].browse(menu_id)
        parts=[c for c in menu.complete_name.split('/') if c]
        vals['glassName'] = parts[2]
        vals['panelName'] = parts[3]
        vals['GlassToGlassMode'] = 0
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
            'target': 'current'
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