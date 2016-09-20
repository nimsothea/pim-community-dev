'use strict';

/**
 * Line for view selector.
 * This view is used to display a datagrid view line in list of the
 * view-selector select2 module.
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
        'text!pim/template/grid/view-selector-line'
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

            /**
             * {@inheritdoc}
             */
            configure: function (datagridView) {
                this.datagridView = datagridView;

                return BaseForm.prototype.configure.apply(this, arguments);
            },

            /**
             * {@inheritdoc}
             */
            render: function () {
                this.$el.html(this.template({
                    view: this.datagridView
                }));

                this.renderExtensions();

                return this;
            }
        });
    }
);
