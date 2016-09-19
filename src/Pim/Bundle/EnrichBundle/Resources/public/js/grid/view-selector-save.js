'use strict';

/**
 * View selector for datagrid
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
        'text!pim/template/grid/view-selector-save',
        'pim/datagrid/state',
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
        DatagridState,
        Dialog,
        Routing,
        messenger
    ) {
        return BaseForm.extend({
            template: _.template(template),
            hidden: true,
            events: {
                'click [data-action="save"]': 'saveView'
            },

            /**
             * {@inheritdoc}
             */
            configure: function () {
                this.listenTo(this.getRoot(), 'datagrid-view:selector:state-changed', this.onDatagridStateChange);

                return BaseForm.prototype.configure.apply(this, arguments);
            },

            /**
             * {@inheritdoc}
             */
            render: function () {
                this.$el.html(this.template({
                    dirty: this.dirty
                }));
            },

            /**
             * Method called on datagrid state change (when columns or filters are modified)
             *
             * @param {Object} datagridState
             */
            onDatagridStateChange: function (datagridState) {
                var currentView = this.getRoot().currentView;
                var currentViewExists = null !== currentView && 0 != currentView.id;
                var filtersModified = currentView.filters != datagridState.filters || currentView.order != datagridState.columns;

                this.dirty = currentViewExists && filtersModified;
                this.render();
            },

            /**
             * Save the current Datagrid view in database and triggers an event to the parent
             * to select it.
             */
            saveView: function () {
                var gridAlias = 'product-grid';
                var gridState = DatagridState.get(gridAlias, ['filters', 'columns']);
                var saveRoute = Routing.generate('pim_datagrid_view_rest_save', {alias: gridAlias});
                var currentView = _.extend({}, this.getRoot().currentView);
                currentView.filters = gridState.filters;
                currentView.columns = gridState.columns;

                $.post(saveRoute, {view: currentView}, function (response) {
                    if (response && response.errors && response.errors.length) {
                        _.each(response.errors, function(error) {
                            messenger.notificationFlashMessage('error', error);
                        })
                    } else if (response && response.id) {
                        this.getRoot().trigger('grid:product-grid:view-saved', response.id);
                    }
                }.bind(this));
            }
        });
    }
);
