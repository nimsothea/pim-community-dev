'use strict';

/**
 * Current selection in the view-selector.
 * This view is used to display the selected view in the select2 module.
 *
 * @author    Adrien Petremann <adrien.petremann@akeneo.com>
 * @copyright 2016 Akeneo SAS (http://www.akeneo.com)
 * @license   http://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */
define(
    [
        'jquery',
        'underscore',
        'backbone',
        'pim/form',
        'text!pim/template/grid/view-selector-current'
    ],
    function (
        $,
        _,
        Backbone,
        BaseForm,
        template
    ) {
        return BaseForm.extend({
            template: _.template(template),
            datagridView: null,
            dirty: false,

            configure: function (datagridView) {
                this.datagridView = datagridView;

                this.listenTo(this.getRoot(), 'grid:view-selector:state-changed', this.onDatagridStateChange);

                return BaseForm.prototype.configure.apply(this, arguments);
            },

            /**
             * {@inheritdoc}
             */
            render: function () {
                this.$el.html(this.template({
                    view: this.datagridView,
                    dirty: this.dirty
                }));

                this.renderExtensions();

                return this;
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
                var defaultValues = ('' == datagridState.filters) && (this.getRoot().defaultColumns == datagridState.columns);

                this.dirty = (currentViewExists && filtersModified) || (!defaultValues && !currentViewExists);
                this.render();
            }
        });
    }
);
