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
    'category': 'Specific Industry Applications',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': ['web'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/views.xml',
        'views/templates.xml',
        'data/bif_data.xml',
        'security/pad_security.xml',
        'views/res_config_settings_views.xml',
        'views/help.xml'
    ],
    # only loaded in demonstration mode
    'demo': [
        'demo/demo.xml',
    ],
    'qweb': [
        "static/src/xml/glassmap.xml",
        "static/src/xml/panelmap.xml",
    ],
    'installable': True,
    'auto_install': True,
    'application': True,
}