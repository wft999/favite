# -*- coding: utf-8 -*-
import json
import io
import random
import imghdr
from PIL import Image
import odoo
from odoo import http
from odoo.http import request

class Padtool(http.Controller):
    @http.route('/padtool/<string:glass_name>/image<int:width>X<int:height>', type='http', auth='user')
    def get_image(self,glass_name,width,height,strBlocks, **k):
        root = odoo.tools.config['glass_root_path']
        blocks = json.loads(strBlocks)
         
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

        output = io.BytesIO()
        dest.save(output, format="JPEG")
        response = http.send_file(output,filename="imgname.jpg")  
        return response
    
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