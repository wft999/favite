# -*- coding: utf-8 -*-
{
    'name': "padtool",

    'summary': """
        Short (1 phrase/line) summary of the module's purpose, used as
        subtitle on modules listing or apps.openerp.com""",

    'description': """
        Long description of module's purpose
    """,

    'author': "My Company",
    'website': "http://www.yourcompany.com",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/master/odoo/addons/base/module/module_data.xml
    # for the full list
    'category': 'Favite Tools',
    'version': '2.7',

    # any module necessary for this one to work correctly
    'depends': ['web'],

    # always loaded
    'data': [
        'security/ir.model.access.csv',
        'data/favite_data.xml',
        'views/templates.xml',
        'security/pad_security.xml',
        'views/views.xml',
        'views/res_config_settings_views.xml',
        'wizard/pad_publish_wizard_views.xml',
    ],
    # only loaded in demonstration mode
    'demo': [
        'demo/demo.xml',
    ],
    'qweb': [
        "static/src/xml/map.xml",
        "static/src/xml/pad_import.xml",
    ],
    'installable': True,
    'auto_install': False,
    'application': True,
}