odoo.define('padtool.import_buttons', function (require) {
"use strict";

var KanbanController = require('web.KanbanController');
var KanbanView = require('web.KanbanView');
var ListController = require('web.ListController');
var ListView = require('web.ListView');


// Mixins that enable the 'Import' feature
var ImportViewMixin = {
    /**
     * @override
     */
    init: function (viewInfo, params) {
        var importPadEnabled = 'import_pad_enabled' in params ? params.import_pad_enabled : false;
        // if true, the 'Import' button will be visible
        this.controllerParams.importPadEnabled = importPadEnabled;
    },
};

var ImportControllerMixin = {
    /**
     * @override
     */
    init: function (parent, model, renderer, params) {
        this.importPadEnabled = params.importPadEnabled;
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Adds an event listener on the import button.
     *
     * @private
     */
    _bindImport: function () {
        if (!this.$buttons) {
            return;
        }
        var self = this;
        this.$buttons.on('click', '.o_button_import_pad', function () {
            var state = self.model.get(self.handle, {raw: true});
            self.do_action({
                type: 'ir.actions.client',
                tag: 'padtool.import',
                params: {
                    model: self.modelName,
                    context: state.getContext(),
                }
            }, {
                on_reverse_breadcrumb: self.reload.bind(self),
            });
        });
    }
};

// Activate 'Import' feature on List views
ListView.include({
    init: function () {
        this._super.apply(this, arguments);
        ImportViewMixin.init.apply(this, arguments);
    },
});

ListController.include({
    init: function () {
        this._super.apply(this, arguments);
        ImportControllerMixin.init.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Extends the renderButtons function of ListView by adding an event listener
     * on the import button.
     *
     * @override
     */
    renderButtons: function () {
        this._super.apply(this, arguments); // Sets this.$buttons
        ImportControllerMixin._bindImport.call(this);
    }
});

// Activate 'Import' feature on Kanban views
KanbanView.include({
    init: function () {
        this._super.apply(this, arguments);
        ImportViewMixin.init.apply(this, arguments);
    },
});

KanbanController.include({
    init: function () {
        this._super.apply(this, arguments);
        ImportControllerMixin.init.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Extends the renderButtons function of ListView by adding an event listener
     * on the import button.
     *
     * @override
     */
    renderButtons: function () {
        this._super.apply(this, arguments); // Sets this.$buttons
        ImportControllerMixin._bindImport.call(this);
    }
});

});
