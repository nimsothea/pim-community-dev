'use strict';

/**
 * Remove extension for the Datagrid View Selector.
 * It displays a button near the selector to allow the user to remove the current selected view
 * of the Datagrid View Selector.
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
        'text!pim/template/grid/view-selector-remove',
        'pim/dialog',
        'routing',
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
        messenger
    ) {
        return BaseForm.extend({
            template: _.template(template),
            hidden: true,
            events: {
                'click [data-action="prompt-deletion"]': 'promptDeletion'
            },

            /**
             * {@inheritdoc}
             */
            configure: function () {
                this.listenTo(this.getRoot(), 'grid:view-selector:initialized', this.onSelectorInitialized.bind(this));

                return BaseForm.prototype.configure.apply(this, arguments);
            },

            /**
             * {@inheritdoc}
             */
            render: function () {
                this.$el.html(this.template({
                    hidden: this.hidden
                }));
            },

            /**
             * Method called when the view selector has been initialized with a view.
             *
             * @param {Object} view
             */
            onSelectorInitialized: function (view) {
                this.hidden = view.id === 0;
                this.render();
            },

            /**
             * Prompt the datagrid view deletion modal.
             */
            promptDeletion: function () {
                Dialog.confirm('SUPPRIMER?', 'DELETE', function () {
                    this.removeView();
                }.bind(this));
            },

            /**
             * Remove the current Datagrid view and triggers an event to the parent.
             */
            removeView: function () {
                var currentView = this.getRoot().currentView;
                var removeRoute = Routing.generate('pim_datagrid_view_rest_remove', {identifier: currentView.id});

                $.ajax({
                    url: removeRoute,
                    type: 'DELETE',
                    success: function () {
                        this.getRoot().trigger('grid:view-selector:view-removed');
                    }.bind(this),
                    error: function (response) {
                        if (_.has(response, 'responseJSON') && _.has(response.responseJSON, 'error')) {
                            messenger.notificationFlashMessage('error', response.responseJSON.error);
                        }
                    }
                });
            }
        });
    }
);
