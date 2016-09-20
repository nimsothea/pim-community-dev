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
        'pim/grid/view-selector-footer',
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
        ViewSelectorFooter,
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
            gridAlias: null,
            $select2Instance: null,

            /**
             * {@inheritdoc}
             */
            configure: function (gridAlias) {
                this.gridAlias = gridAlias;

                mediator.bind('grid:product-grid:state_changed', this.onGridStateChange.bind(this));

                this.listenTo(this.getRoot(), 'grid:view-selector:view-created', this.onViewCreated.bind(this));
                this.listenTo(this.getRoot(), 'grid:view-selector:view-saved', this.onViewSaved.bind(this));
                this.listenTo(this.getRoot(), 'grid:view-selector:view-removed', this.onViewRemoved.bind(this));
                this.listenTo(this.getRoot(), 'grid:view-selector:close-selector', this.closeSelect2.bind(this));

                return $.when(
                    FetcherRegistry.getFetcher('datagrid-view').defaultColumns(this.gridAlias),
                    FetcherRegistry.getFetcher('datagrid-view').defaultUserView(this.gridAlias)
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
                    dropdownCssClass: 'bigdrop grid-view-selector',
                    closeOnSelect: false,

                    /**
                     * Format result (datagrid view list) method of select2.
                     * This way we can display views and their infos beside them.
                     */
                    formatResult: function (item, $container) {
                        FormBuilder.buildForm('pim-grid-view-selector-line').then(function (form) {
                            form.setParent(this);
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

                                if (page === 1 && !options.term) {
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
                    initSelection: function (element, callback) {
                        var activeViewId = DatagridState.get(this.gridAlias, 'view');
                        var initView = this.defaultUserView;
                        var deferred = $.Deferred();

                        if (activeViewId) {
                            FetcherRegistry.getFetcher('datagrid-view').fetch(activeViewId, {alias: this.gridAlias})
                                .then(function (view) {
                                    if (_.has(view, 'id')) {
                                        view.text = view.label;
                                        deferred.resolve(view);
                                    } else {
                                        deferred.resolve(this.getDefaultView());
                                    }
                                }.bind(this));
                        } else if (initView) {
                            initView.text = initView.label;
                            deferred.resolve(initView);
                        } else {
                            deferred.resolve(this.getDefaultView());
                        }

                        deferred.then(function (initView) {
                            if (this.defaultUserView && initView.id === this.defaultUserView.id) {
                                DatagridState.set(this.gridAlias, {
                                    view: initView.id,
                                    filters: initView.filters,
                                    columns: initView.columnsOrder
                                });
                            }

                            this.currentView = initView;
                            callback(initView);
                            this.getRoot().trigger('grid:view-selector:initialized', initView);
                        }.bind(this));
                    }.bind(this)
                };

                this.$select2Instance = initSelect2.init($select, opts);

                var select2 = this.$select2Instance.data('select2');
                select2.onSelect = (function(fn) {
                    return function(data, options) {
                        var target;

                        if (options != null) {
                            target = $(options.target);
                        }

                        if (target && !target.hasClass('select2-result-label-view')) {
                            //alert('click!');
                        } else {
                            return fn.apply(this, arguments);
                        }
                    }
                })(select2.onSelect);

                // On select2 "selecting" event, we bypass the selection to handle it ourself.
                this.$select2Instance.on('select2-selecting', function (event) {
                    var view = event.object;
                    this.selectView(view);
                }.bind(this));

                var $menu = this.$('.select2-drop');

                FormBuilder.build('pim-grid-view-selector-footer').then(function (form) {
                    form.setParent(this);
                    $menu.append(form.render().$el);
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
                    text: __('datagrid_view.default'),   // TODO: translation
                    columnsOrder: this.defaultColumns,
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

                choices.push(this.getDefaultView());

                return choices;
            },

            /**
             * Method called when the grid state changes.
             * It allows this selector to react to new filters / columns etc..
             */
            onGridStateChange: function () {
                var datagridState = DatagridState.get(this.gridAlias, ['filters', 'columns']);

                this.getRoot().trigger('grid:view-selector:state-changed', datagridState);
            },

            /**
             * Method called when a new view has been created.
             * This method fetches the newly created view thanks to its id, then selects it.
             *
             * @param {int} viewId
             */
            onViewCreated: function (viewId) {
                FetcherRegistry.getFetcher('datagrid-view').clear();
                FetcherRegistry.getFetcher('datagrid-view')
                    .fetch(viewId, {alias: this.gridAlias})
                    .then(function (view) {
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
                this.onViewCreated(viewId);
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
             * Close the Select2 instance of this View Selector
             */
            closeSelect2: function () {
                if (null !== this.$select2Instance) {
                    this.$select2Instance.select2('close');
                }
            },

            /**
             * Method called when the user selects a view through this selector.
             *
             * @param view The selected view
             */
            selectView: function (view) {
                DatagridState.set(this.gridAlias, {
                    view: view.id,
                    filters: view.filters,
                    columns: view.columnsOrder
                });

                this.currentView = view;
                this.trigger('grid:view-selector:view-selected', view);
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
                    alias: this.gridAlias,
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
