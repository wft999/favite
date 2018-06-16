# -*- coding: utf-8 -*-

from odoo import models, fields, api
from odoo.http import request
import odoo

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
        Menu = request.env['ir.ui.menu']
        m = Menu.browse(menu_id)

        return m.complete_name


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