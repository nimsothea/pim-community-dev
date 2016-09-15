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
        'backbone',
        'pim/form',
        'pim/grid/view-selector-line',
        'text!pim/template/grid/view-selector',
        'pim/initselect2',
        'pim/datagrid/state',
        'pim/fetcher-registry',
        'pim/form-builder'
    ],
    function (
        $,
        _,
        __,
        Backbone,
        BaseForm,
        ViewSelectorLine,
        template,
        initSelect2,
        DatagridState,
        FetcherRegistry,
        FormBuilder
    ) {
        return BaseForm.extend({
            template: _.template(template),
            resultsPerPage: 20,
            config: {},
            queryTimer: null,

            /**
             * {@inheritdoc}
             */
            render: function () {
                this.$el.html(this.template());
                this.initializeSelectWidget();
                this.renderExtensions();
            },

            /**
             * Initialize select2 and format elements.
             */
            initializeSelectWidget: function () {
                var $select = this.$('input[type="hidden"]');

                var opts = {
                    dropdownCssClass: 'bigdrop view-selector',
                    width: '250px',

                    /**
                     * Format result (datagrid view list) method of select2.
                     * This way we can display views and their infos beside them.
                     */
                    formatResult: function (item, $container) {
                        FormBuilder.buildForm('pim-grid-view-selector-line').then(function (form) {
                            return form.configure(item).then(function () {
                                $container.append(form.render().$el);
                            });
                        });
                    }.bind(this),

                    query: function (options) {
                        clearTimeout(this.queryTimer);
                        this.queryTimer = setTimeout(function () {

                            var page = 1;
                            if (options.context && options.context.page) {
                                page = options.context.page;
                            }
                            var searchParameters = this.getSelectSearchParameters(options.term, page);

                            FetcherRegistry.getFetcher('datagrid-view').search(searchParameters).then(function (views) {
                                var choices = this.toSelect2Format(views);

                                options.callback({
                                    results: choices,
                                    more: choices.length === this.resultsPerPage,
                                    context: {
                                        page: page + 1
                                    }
                                });
                            }.bind(this));

                        }.bind(this), 400);
                    }.bind(this)
                };

                //opts = $.extend(true, {}, this.config.select2, opts);
                $select = initSelect2.init($select, opts);

                // On select2 "selecting" event, we bypass the selection to handle it ourself.
                $select.on('select2-selecting', function (event) {
                    var view = event.object;

                    DatagridState.set('product-grid', {
                        view: view.id,
                        filters: view.filters,
                        columns: view.order
                    });

                    // Reload page
                    var url = window.location.hash;
                    Backbone.history.fragment = new Date().getTime();
                    Backbone.history.navigate(url, true);
                }.bind(this));
            },

            /**
             * Get grid view fetcher search parameters by giving select2 search term & page
             *
             * @param {string} term
             * @param {int}    page
             *
             * @return {Object}
             */
            getSelectSearchParameters: function (term, page) {
                return $.extend(true, {}, this.config.searchParameters, {
                    search: term,
                    gridAlias: 'product-grid',
                    options: {
                        limit: this.resultsPerPage,
                        page: page
                    }
                });
            },

            /**
             * Take incoming data and format them to have all required parameters
             * to be used by the select2 module.
             *
             * @param {array} data
             *
             * @returns {array}
             */
            toSelect2Format: function (data) {
                return _.map(data, function (view) {
                    view.text = view.label;

                    return view;
                });
            }
        });
    }
);
