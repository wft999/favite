# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
import os
import re
from os.path import join as opj
try:
    import configparser as ConfigParser
except ImportError:
    import ConfigParser
    
from odoo import api, fields, models, tools, _
from odoo.http import request
import odoo

class IrUiMenu(models.Model):
    _inherit = 'ir.ui.menu'
    
    @api.multi
    def unlink(self,recursion=False):
        # Detach children and promote them to top-level, because it would be unwise to
        # cascade-delete submenus blindly. We also can't use ondelete=set null because
        # that is not supported when _parent_store is used (would silently corrupt it).
        # TODO: ideally we should move them under a generic "Orphans" menu somewhere?
        extra = {'ir.ui.menu.full_list': True}
        direct_children = self.with_context(**extra).search([('parent_id', 'in', self.ids)])
        if(direct_children):
            if(recursion):
                direct_children.unlink(recursion)
            else:   
                direct_children.write({'parent_id': False})

        self.clear_caches()
        return super(IrUiMenu, self).unlink()

class Http(models.AbstractModel):
    _inherit = 'ir.http'

    def webclient_rendering_context(self):
        
        root = odoo.tools.config['glass_root_path']    
        if not root or not os.path.isdir(root):
            return super(Http,self).webclient_rendering_context()

        #root = os.path.normpath(root)
        #if glass_root_path == '.':
        #    glass_root_path = ''
        #if glass_root_path.startswith('..') or (glass_root_path and glass_root_path[0] == '/'):
        #    raise Exception('Cannot access file outside the module')

        glass={}
        Menu = request.env['ir.ui.menu'].with_context({'ir.ui.menu.full_list': True})
        for dir in os.listdir(root):   

            iniFilePath = root + '/' + dir + "/PadToolConfig.ini"
            conf = ConfigParser.RawConfigParser()
            try:
                conf.read([iniFilePath])
                for sec in conf.sections():
                    for (name, value) in conf.items(sec):
                        if sec == 'GLASS_INFORMATION':
                            if name == 'glass_map' :
                                if not os.path.isfile(root + '/' + dir+'/'+value):
                                    contonue
                                gmenu = Menu.sudo().search([('name', '=', dir),('parent_id', '=', self.env.ref('padtool.menu_glass_root').id),], limit=1)
                                if(not gmenu.id):
                                    gmenu = Menu.sudo().create({'name': dir, 'parent_id': self.env.ref('padtool.menu_glass_root').id})
                                    action = 'ir.actions.client,%s' % self.env.ref('padtool.action_glassmap').id
                                    Menu.sudo().create({'name': 'GlassMap', 'parent_id': gmenu.id,'action':action})

                                glass[dir] = {'id':gmenu.id,'panel':[]}
                            continue
                        elif sec == 'GLASS_INFORMATION':
                            pass      
                        else:
                            pname = sec
                            if name == 'panel_map' and os.path.isfile(root + '/' + dir+'/'+pname+'/'+value):
                                parent = glass[dir]['id']
                                pmenu = Menu.sudo().search([('name', '=', pname),('parent_id', '=', parent)], limit=1)
                                if(not pmenu.id):
                                    pmenu = Menu.sudo().create({'name': pname, 'parent_id': parent})
                                    
                                    action = 'ir.actions.act_window,%s' % self.env.ref('padtool.action_pad_parameter_window').id
                                    Menu.sudo().create({'name': 'Parameter', 'parent_id': pmenu.id,'action':action})
                            
                                    action = 'ir.actions.client,%s' % self.env.ref('padtool.action_panelmap').id
                                    Menu.sudo().create({'name': 'PanelMap', 'parent_id': pmenu.id,'action':action})

                                glass[dir]['panel'].append(pname)    
                        
            except IOError:
                pass
            except ConfigParser.NoSectionError:
                pass
                          
        menus = Menu.search([('parent_id', '=', self.env.ref('padtool.menu_glass_root').id)])
        for menu in menus:
            if(menu.name not in glass):
                menu.unlink(True)
            else:
                sub_menus = Menu.search([('parent_id', '=', menu.id)])
                for smenu in sub_menus:
                    if(smenu.name != 'GlassMap' and smenu.name not in glass[menu.name]['panel']):
                        smenu.unlink(True)
                    
                        
        
        #root = Menu.create({'name': 'Test root'})
        #child1 = Menu.create({'name': 'Test child 1', 'parent_id': self.env.ref('padtool.menu_root').id,'action':'ir.actions.act_window,3'})
        return super(Http,self).webclient_rendering_context()

