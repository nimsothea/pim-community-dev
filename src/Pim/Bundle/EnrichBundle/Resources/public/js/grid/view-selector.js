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
        'pim/form-builder',
        'oro/mediator'
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
        FormBuilder,
        mediator
    ) {
        return BaseForm.extend({
            template: _.template(template),
            resultsPerPage: 20,
            queryTimer: null,
            config: {},
            currentView: null,
            defaultColumns: [],
            defaultUserView: null,

            /**
             * {@inheritdoc}
             */
            configure: function () {
                mediator.bind('grid:product-grid:state_changed', this.onGridStateChange.bind(this));

                this.listenTo(this.getRoot(), 'grid:product-grid:view-created', this.onViewCreated.bind(this));
                this.listenTo(this.getRoot(), 'grid:product-grid:view-saved', this.onViewSaved.bind(this));
                this.listenTo(this.getRoot(), 'grid:product-grid:view-removed', this.onViewRemoved.bind(this));

                return $.when(
                    FetcherRegistry.getFetcher('datagrid-view').defaultColumns('product-grid'),
                    FetcherRegistry.getFetcher('datagrid-view').defaultUserView('product-grid')
                ).then(function (columns, defaultView) {
                    this.defaultColumns = columns[0];
                    this.defaultUserView = defaultView[0].view;

                    return BaseForm.prototype.configure.apply(this, arguments);
                }.bind(this));
            },

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
                        }.bind(this));
                    }.bind(this),

                    /**
                     * Format current selection method of select2.
                     */
                    formatSelection: function (item, $container) {
                        FormBuilder.buildForm('pim-grid-view-selector-current').then(function (form) {
                            form.setParent(this);
                            return form.configure(item).then(function () {
                                $container.append(form.render().$el);
                                this.onGridStateChange();
                            }.bind(this));
                        }.bind(this));
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

                                if (page === 1) {
                                    choices = this.ensureDefaultView(choices);
                                }

                                options.callback({
                                    results: choices,
                                    more: choices.length >= this.resultsPerPage,
                                    context: {
                                        page: page + 1
                                    }
                                });
                            }.bind(this));

                        }.bind(this), 400);
                    }.bind(this),

                    /**
                     * Initialize the select2 with current selected view. If no current view is selected,
                     * we select the user's one. If he doesn't have one, we create one for him!
                     */
                    initSelection : function (element, callback) {
                        var activeViewId = DatagridState.get('product-grid', 'view');
                        var initView = null;
                        var deferred = $.Deferred();

                        if (activeViewId) {
                            FetcherRegistry.getFetcher('datagrid-view').fetch(activeViewId, {alias: 'product-grid'}).then(function (view) {
                                if (_.has(view, 'id')) {
                                    view.text = view.label;
                                    deferred.resolve(view);
                                } else {
                                    deferred.resolve(this.getDefaultView());
                                }
                            }.bind(this));
                        } else if (initView) {
                            initView = this.defaultUserView;
                            initView.text = initView.label;

                            deferred.resolve(initView);
                        } else {
                            deferred.resolve(this.getDefaultView());
                        }

                        deferred.then(function (initView) {
                            this.currentView = initView;
                            callback(initView);
                            this.getRoot().trigger('datagrid-view:selector:initialized', initView);
                        }.bind(this));
                    }.bind(this)
                };

                //opts = $.extend(true, {}, this.config.select2, opts);
                $select = initSelect2.init($select, opts);

                // On select2 "selecting" event, we bypass the selection to handle it ourself.
                $select.on('select2-selecting', function (event) {
                    var view = event.object;

                    this.selectView(view);
                }.bind(this));
            },

            /**
             * Return the default view object which contains default columns & no filter.
             *
             * @returns {Object}
             */
            getDefaultView: function () {
                return {
                    id: 0,
                    text: 'Default view',   // TODO: translation
                    order: this.defaultColumns,
                    filters: ''
                };
            },

            /**
             * Ensure given choices contain a default view if user doesn't have one.
             *
             * @param choices
             *
             * @return {array}
             */
            ensureDefaultView: function (choices) {
                if (null !== this.defaultUserView) {
                    return choices;
                }

                choices.push({
                    id: 0,
                    text: 'Default view',   // TODO: translation
                    order: this.defaultColumns,
                    filters: ''
                });

                return choices;
            },

            /**
             * Method called when the grid state changes.
             * It allows this selector to react to new filters / columns etc..
             */
            onGridStateChange: function () {
                var datagridState = DatagridState.get('product-grid', ['filters', 'columns']);

                this.getRoot().trigger('datagrid-view:selector:state-changed', datagridState);
            },

            /**
             * Method called when a new view has been created.
             * This method fetches the newly created view thanks to its id, then selects it.
             *
             * @param {int} viewId
             */
            onViewCreated: function (viewId) {
                FetcherRegistry.getFetcher('datagrid-view').clear();
                FetcherRegistry.getFetcher('datagrid-view').fetch(viewId, {alias: 'product-grid'}).then(function (view) {
                    this.selectView(view);
                }.bind(this));
            },

            /**
             * Method called when a view has been saved.
             * This method fetches the saved view thanks to its id, then selects it.
             *
             * @param {int} viewId
             */
            onViewSaved: function (viewId) {
                FetcherRegistry.getFetcher('datagrid-view').clear();
                FetcherRegistry.getFetcher('datagrid-view').fetch(viewId, {alias: 'product-grid'}).then(function (view) {
                    this.selectView(view);
                }.bind(this));
            },

            /**
             * Method called when a view is removed.
             * We reset all filters on the grid.
             */
            onViewRemoved: function () {
                FetcherRegistry.getFetcher('datagrid-view').clear();
                this.selectView(this.getDefaultView());
            },

            /**
             * Method called when the user selects a view through this selector.
             *
             * @param view The selected view
             */
            selectView: function (view) {
                DatagridState.set('product-grid', {
                    view: view.id,
                    filters: view.filters,
                    columns: view.order
                });

                this.currentView = view;
                this.trigger('datagrid-view:selector:view-selected', view);
                this.reloadPage();
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
                    alias: 'product-grid',
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
            },

            /**
             * Reload the page.
             */
            reloadPage: function () {
                var url = window.location.hash;
                Backbone.history.fragment = new Date().getTime();
                Backbone.history.navigate(url, true);
            }
        });
    }
);
