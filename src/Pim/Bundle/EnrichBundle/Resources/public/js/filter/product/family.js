/* global console */
'use strict';

define([
        'pim/form',
        'routing',
        'text!pim/template/filter/product/family',
        'pim/fetcher-registry',
        'pim/user-context',
        'pim/i18n',
        'jquery.select2'
    ], function (BaseForm, Routing, template, fetcherRegistry, userContext, i18n, initSelect2) {
    return BaseForm.extend({
        template: _.template(template),
        removable: false,
        events: {
            'change [name="filter-operator"], [name="filter-value"]': 'updateState',
            'click .remove': 'removeFilter'
        },
        initialize: function () {
            this.config = { //To remove
                operators: [
                    'IN',
                    'NOT IN',
                    'EMPTY',
                    'NOT EMPTY'
                ],
                url: 'pim_enrich_family_rest_index'
            };

            this.selectOptions = {
                allowClear: true,
                multiple: true,
                ajax: {
                    url: Routing.generate(this.config.url),
                    quietMillis: 250,
                    cache: true,
                    data: function (term, page) {
                        return {
                            search: term,
                            options: {
                                limit: 20,
                                page: page,
                                locale: userContext.get('uiLocale')
                            }
                        };
                    },
                    results: function (families) {
                        var data = {
                            more: 20 === _.keys(families).length,
                            results: []
                        };
                        _.each(families, function (value, key) {
                            data.results.push({
                                id: key,
                                text: i18n.getLabel(value.label, userContext.get('uiLocale'), value.code)
                            });
                        });

                        return data;
                    }
                },
                initSelection: function (element, callback) {
                    var families = this.getFormData().value;
                    if (null !== families) {
                        fetcherRegistry.getFetcher('family')
                            .fetchByIdentifiers(families)
                            .then(function (families) {
                                callback(_.map(families, function (family) {
                                    return {
                                        id: family.code,
                                        text: i18n.getLabel(family.label, userContext.get('uiLocale'), family.code)
                                    };
                                }));
                            });
                    }
                }.bind(this)
            };

            return BaseForm.prototype.initialize.apply(this, arguments);
        },
        render: function () {
            this.$el.empty();

            if (undefined === this.getOperator()) {
                this.setOperator(_.first(this.config.operators));
            }

            this.$el.append(this.template({
                field: this.getField(),
                operator: this.getOperator(),
                value: this.getFormData().value,
                removable: this.isRemovable(),
                operators: this.config.operators
            }));

            this.$('[name="filter-operator"]').select2();
            this.$('[name="filter-value"]').select2(this.selectOptions);

            this.delegateEvents();

            return this;
        },
        updateOperator: function (event) {
            $(event.target).val();
        },
        updateState: function () {
            var value = this.$('[name="filter-value"]').val();
            value = undefined !== value ? value.split(',') : value;
            this.setData({
                'field': this.getField(),
                'operator': this.$('[name="filter-operator"]').val(),
                'value': value
            });
        },
        setField: function (field) {
            var data = this.getFormData();
            data.field = field;
            this.setData(data, {silent: true});
        },
        getField: function () {
            return this.getFormData().field;
        },
        setOperator: function (operator) {
            var data = this.getFormData();
            data.operator = operator;
            this.setData(data, {silent: true});
        },
        getOperator: function () {
            return this.getFormData().operator;
        },
        setRemovable: function (removable) {
            this.removable = removable;
        },
        isRemovable: function () {
            return this.removable;
        },
        removeFilter: function () {
            this.trigger('filter:remove', this.getField());
        }
    });
});