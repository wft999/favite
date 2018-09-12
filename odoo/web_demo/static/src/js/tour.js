odoo.define('web_demo.update_kanban', function (require) {
'use strict';

var core = require('web.core');
var Dialog = require('web.Dialog');
var KanbanRecord = require('web.KanbanRecord');
var tour = require('web_tour.tour');
var QWeb = core.qweb;
var _t = core._t;

KanbanRecord.include({
    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
	 

    /**
     * @override
     * @private
     */
    _openRecord: function () {
        if (this.modelName === 'web_demo.tour' && this.$(".o_tour_kanban_boxes a").length) {
            this.$('.o_tour_kanban_boxes a').first().click();
        } else {
            this._super.apply(this, arguments);
        }
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @override
     * @private
     */
    _onGlobalClick: function (ev) {
    	if (this.modelName === 'web_demo.tour' && $(ev.target).data('type') === 'play') {
			 ev.preventDefault();
			 
			 var self = this;
			 this._rpc({
				 model: 'web_demo.step',
				 method: 'search_read',
				 domain: [['tour_id', '=', this.id]],
				 fields: ['id','trigger','extra_trigger','content','position','width','run','audio_attachment_id'],
			 	})
			 	.then(function(tips){
			 		if(tips.length == 0)
			 			return;
			 		
			 		if(tour.tours[self.recordData.name])
			 			delete tour.tours[self.recordData.name];
			 		
			 		tour.register(self.recordData.name, {
	                	    skip_enabled: true,
	                	}, tips);
			 		tour._register(true,tour.tours[self.recordData.name],self.recordData.name);
			 		tour.run(self.recordData.name,3000)
			 	});
	      } else {
	    	  this._super.apply(this, arguments);
	     }
	 },
});
});
