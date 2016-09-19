'use strict';

/**
 * View selector for datagrid + FLAGS
 *
 * @author    Adrien Pétremann <adrien.petremann@akeneo.com>
 * @copyright 2016 Akeneo SAS (http://www.akeneo.com)
 * @license   http://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
define(
    [
        'jquery',
        'underscore',
        'oro/translator',
        'pim/form',
        'text!pim/template/grid/view-selector-add',
        'pim/dialog',
        'routing',
        'pim/datagrid/state',
        'oro/messenger'
    ],
    function (
        $,
        _,
        __,
        BaseForm,
        template,
        Dialog,
        Routing,
        DatagridState,
        messenger
    ) {
        return BaseForm.extend({
            template: _.template(template),
            events: {
                'click [data-action="prompt-creation"]': 'promptCreation'
            },

            /**
             * {@inheritdoc}
             */
            configure: function () {
            },

            /**
             * {@inheritdoc}
             */
            render: function () {
                this.$el.html(this.template());
            },

            /**
             * Prompt the datagrid view creation modal.
             */
            promptCreation: function () {
                var content = '<input name="label" id="view-label" type="text" placeholder="Name of new view">';
                var label = null;

                Dialog.confirm(content, 'CHOISIR', function() {
                    this.saveView();
                }.bind(this));

                var $input = $('#view-label');
                var $submitBtn = $input.parent().parent().find('.btn.ok').hide();

                $input.on('input', function() {
                    label = $input.val();
                    if (!label.length) {
                        $submitBtn.hide();
                    } else {
                        $submitBtn.show();
                    }
                }).on('keypress', function(e) {
                    if ((e.keyCode || e.which) == 13 && label.length) {
                        $submitBtn.trigger('click');
                    }
                });
            },

            /**
             * Save the current Datagrid view in database and triggers an event to the parent
             * to select it.
             */
            saveView: function () {
                var gridAlias = 'product-grid';
                var gridState = DatagridState.get(gridAlias, ['filters', 'columns']);
                var saveRoute = Routing.generate('pim_datagrid_view_rest_save', {alias: gridAlias});
                var newView = {filters: gridState.filters, columns: gridState.columns, label: $('#view-label').val()};

                $.post(saveRoute, {view: newView}, function (response) {
                    if (response && response.errors && response.errors.length) {
                        _.each(response.errors, function(error) {
                            messenger.notificationFlashMessage('error', error);
                        })
                    } else if (response && response.id) {
                        this.getRoot().trigger('grid:product-grid:view-created', response.id);
                    }
                }.bind(this));
            }
        });
    }
);
