'use strict';

/**
 * Footer extension for the Datagrid View Selector.
 *
 * Contains a "create" button to allow the user to create a view from the current
 * state of the grid (regarding filters and columns).
 *
 * @author    Adrien Petremann <adrien.petremann@akeneo.com>
 * @copyright 2016 Akeneo SAS (http://www.akeneo.com)
 * @license   http://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */
define(
    [
        'jquery',
        'underscore',
        'oro/translator',
        'pim/form',
        'text!pim/template/grid/view-selector-footer',
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
            buttonTitle: '[create]',

            events: {
                'click [data-action="prompt-creation"]': 'promptCreation'
            },

            /**
             * {@inheritdoc}
             */
            render: function () {
                this.$el.html(this.template({
                    buttonTitle: __('grid.view_selector.create')
                }));

                return this;
            },

            /**
             * Prompt the view creation modal.
             */
            promptCreation: function () {
                this.getRoot().trigger('grid:view-selector:close-selector');

                var placeholder = __('grid.view_selector.placeholder');
                var content = '<input name="label" id="view-label" type="text" placeholder="' + placeholder + '">';
                var label = null;

                Dialog.confirm(content, __('grid.view_selector.choose_label'), function () {
                    this.saveView();
                }.bind(this));

                var $input = $('#view-label');
                var $submitBtn = $input.parent().parent().find('.ok').hide();

                $input.on('input', function () {
                    label = $input.val();
                    if (!label.length) {
                        $submitBtn.hide();
                    } else {
                        $submitBtn.show();
                    }
                }).on('keypress', function (e) {
                    if ((e.keyCode || e.which) === 13 && label.length) {
                        $submitBtn.trigger('click');
                    }
                });
            },

            /**
             * Save the current Datagrid view in database and triggers an event to the parent
             * to select it.
             */
            saveView: function () {
                var gridState = DatagridState.get(this.getRoot().gridAlias, ['filters', 'columns']);
                var saveRoute = Routing.generate('pim_datagrid_view_rest_save', {alias: this.getRoot().gridAlias});
                var newView = {
                    filters: gridState.filters,
                    columns: gridState.columns,
                    label: $('#view-label').val()
                };

                $.post(saveRoute, {view: newView}, function (response) {
                    if (response && response.errors && response.errors.length) {
                        _.each(response.errors, function (error) {
                            messenger.notificationFlashMessage('error', error);
                        });
                    } else if (response && response.id) {
                        this.getRoot().trigger('grid:view-selector:view-created', response.id);
                    }
                }.bind(this));
            }
        });
    }
);
