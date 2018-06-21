# -*- coding: utf-8 -*-
import json
from odoo import http
from odoo.http import request

class Padtool(http.Controller):
    @http.route('/padtool/web', type='http', auth='user')
    def pos_web(self, debug=False, **k):
        context = {
            'session_info': json.dumps(request.env['ir.http'].session_info())
        }
        return request.render('padtool.teaching', qcontext=context)     
    
    @http.route('/padtool/pad/save', type='json', auth="user")
    def save_pad(self, path, arch):
        """
        Edit a custom view

        :param int custom_id: the id of the edited custom view
        :param str arch: the edited arch of the custom view
        :returns: dict with acknowledged operation (result set to True)
        """
        #custom_view = request.env['ir.ui.view.custom'].browse(custom_id)
        #custom_view.write({ 'arch': arch })
        return {'result': True}
    
#     @http.route('/padtool/padtool/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/padtool/padtool/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('padtool.listing', {
#             'root': '/padtool/padtool',
#             'objects': http.request.env['padtool.padtool'].search([]),
#         })

#     @http.route('/padtool/padtool/objects/<model("padtool.padtool"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('padtool.object', {
#             'object': obj
#         })