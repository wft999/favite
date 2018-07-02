# -*- coding: utf-8 -*-

from odoo import models, fields, api
from odoo.http import request
import odoo
import json
import os
import math
from PIL import Image

class Pad(models.TransientModel):
    _name = 'padtool.pad'
    
    name = fields.Char(default='wft')
    PanelCenter = fields.Char()
    GolbalToleranceRegular = fields.Char()
    GolbalToleranceUnregular = fields.Char()
    GolbalIndentRegular = fields.Char()
    GolbalIndentUnregular = fields.Char()
    GlassToGlassMode = fields.Integer()
    NeglectInspIfNoMarkResult = fields.Integer()


    @api.model
    def get_information(self,menu_id):
        config = request.env['res.config.settings'].get_values();
        Menu = request.env['ir.ui.menu']
        m = Menu.browse(menu_id)

        return {"menu":m.complete_name,"config":config}
    
    @api.model
    def save_map(self,padFile,pads):
        #root = odoo.tools.config['glass_root_path'] 
        config = request.env['res.config.settings'].get_values();
        root = config.glass_root_path;
        
        padFile = padFile.replace('/glassdata',root)
        with open(padFile, 'w') as f:
            str = json.dumps(pads, separators=(',', ':'))
            f.write(str)
        
        region_list = []
        path,ext = os.path.splitext(padFile)
        imgFile = path+'.bmp'
        width = 0
        height = 0
        if len(pads):
            with Image.open(imgFile) as im:
                for obj in pads:
                    if obj['padType'] != 'mainMark':
                        continue
                    left = min(obj['points'][0]['x'],obj['points'][1]['x'])
                    right = max(obj['points'][0]['x'],obj['points'][1]['x'])
                    upper = min(obj['points'][0]['y'],obj['points'][1]['y'])
                    lower = max(obj['points'][0]['y'],obj['points'][1]['y'])
                    region = im.crop((left ,upper, right, lower))
                    region_list.append(region)
                    width += (right-left)
                    height = (lower-upper) if (lower-upper) > height else height
                
        if len(region_list):
            markFile = path+'mark.jpg'
            width = math.ceil(width)
            height = math.ceil(height)
            mark = Image.new('L', (width,height))
            left = 0
            for region in region_list:
                upper = height - region.size[1]
                right = left+region.size[0]
                lower = height
                mark.paste(region, (left ,upper, right, lower))
                left += region.size[0]
            mark.save(markFile, 'JPEG')    
            


class Bif(models.Model):
     _name = 'padtool.bif'
     
     COMPLETE_STATE = [
        ('opening_control', 'Opening Control'),  # method action_pos_session_open
        ('opened', 'In Progress'),               # method action_pos_session_closing_control
        ('closing_control', 'Closing Control'),  # method action_pos_session_close
        ('closed', 'Closed & Posted'),
    ]

     name = fields.Char()
     value = fields.Integer()
     description = fields.Text()
     state = fields.Selection(COMPLETE_STATE, string='Status',required=True, readonly=True,copy=False, default='opening_control')

     @api.multi
     def teaching(self):
        """ open the teaching interface """
        self.ensure_one()
        return {
            'type': 'ir.actions.client',
            'tag': 'padtool.teaching',
            'target': 'fullscreen',
        }