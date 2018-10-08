# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    'name': 'Favite import module',
    'description': """
Import a custom data module
===========================

This module allows authorized users to import a custom data module (.xml files and static assests)
for customization purpose.
""",
    'category': 'Extra Tools',
    'depends': ['web'],
    'installable': True,
    'auto_install': True,
    'data': ['views/import_module_view.xml','views/module_update_wizard_view.xml'],
    'qweb': [
        "static/src/xml/field_zip_file.xml",
    ],
}
