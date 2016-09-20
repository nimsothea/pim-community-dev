'use strict';

/**
 * Current selection in the view-selector.
 * This view is used to display the current selected view in the select2 module.
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

            /**
             * {@inheritdoc}
             */
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
             * Method called on datagrid state change (when columns or filters are modified).
             * Set the state to dirty if it's the case then re-render this extension.
             *
             * @param {Object} datagridState
             */
            onDatagridStateChange: function (datagridState) {
                var currentView = this.getRoot().currentView;
                var currentViewExists = null !== currentView && 0 !== currentView.id;

                var filtersModified = currentView.filters !== datagridState.filters;
                var columnsModified = currentView.columnsOrder !== datagridState.columns;

                if (currentViewExists) {
                    this.dirty = filtersModified || columnsModified;
                } else {
                    var isDefaultFilters = ('' === datagridState.filters);
                    var isDefaultColumns = (this.getRoot().defaultColumns === datagridState.columns);
                    this.dirty = !isDefaultColumns || !isDefaultFilters;
                }

                this.render();
            }
        });
    }
);
