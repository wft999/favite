# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    test_procurement_jit = fields.Selection([
        (1, 'Immediately after sales order confirmation'),
        (0, 'Manually or based on automatic scheduler')
        ], "Reservation",
        help="Reserving products manually in delivery orders or by running the scheduler is advised to better manage priorities in case of long customer lead times or/and frequent stock-outs.")
    
    test_product_expiry = fields.Boolean("Expiration Dates",
        help="Track following dates on lots & serial numbers: best before, removal, end of life, alert. \n Such dates are set automatically at lot/serial number creation based on values set on the product (in days).")

    use_test_minimum_delta = fields.Boolean(
        string="No Rescheduling Propagation",
        help="Rescheduling applies to any chain of operations (e.g. Make To Order, Pick Pack Ship). In the case of MTO sales, a vendor delay (updated incoming date) impacts the expected delivery date to the customer. \n This option allows to not propagate the rescheduling if the change is not critical.")

    test_minimum_delta = fields.Integer( string="No Rescheduling Propagation")

    @api.onchange('use_test_minimum_delta')
    def _onchange_use_test_minimum_delta(self):
        if not self.use_test_minimum_delta:
            self.test_minimum_delta = 1

    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        res.update(
            use_test_minimum_delta=self.env['ir.config_parameter'].sudo().get_param('padtool.use_test_minimum_delta')
        )
        return res

    @api.multi
    def set_values(self):
        super(ResConfigSettings, self).set_values()
        if not self.user_has_groups('padtool.group_pad_manager'):
            return
        self.env['ir.config_parameter'].sudo().set_param('padtool.use_test_minimum_delta', self.use_test_minimum_delta)
        """ If we are not in multiple locations, we can deactivate the internal
        operation types of the warehouses, so they won't appear in the dashboard.
        Otherwise, activate them.
        """
        
