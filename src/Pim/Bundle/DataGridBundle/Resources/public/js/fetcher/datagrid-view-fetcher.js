'use strict';

define(
    [
        'jquery',
        'underscore',
        'routing',
        'pim/base-fetcher'
    ],
    function (
        $,
        _,
        Routing,
        BaseFetcher
    ) {
        return BaseFetcher.extend({
            defaultColumnsPromise: null,
            defaultUserViewPromise: null,

            /**
             * {@inheritdoc}
             */
            initialize: function (options) {
                this.defaultColumnsPromise = null;

                BaseFetcher.prototype.initialize.apply(this, arguments);
            },

            /**
             * {@inheritdoc}
             */
            clear: function (identifier) {
                if (undefined === identifier) {
                    this.defaultColumnsPromise = null;
                }

                BaseFetcher.prototype.clear.apply(this, arguments);
            },

            /**
             * Fetch default columns for grid with given alias
             *
             * @param {string} alias
             *
             * @return Promise
             */
            defaultColumns: function (alias) {
                if (null === this.defaultColumnsPromise) {
                    this.defaultColumnsPromise = $.getJSON(
                        Routing.generate(this.options.urls.columns, { alias: alias })
                    );
                }

                return this.defaultColumnsPromise;
            },

            /**
             * Fetch default datagrid view for given alias of the current user
             *
             * @param {string} alias
             *
             * @return Promise
             */
            defaultUserView: function (alias) {
                if (null === this.defaultUserViewPromise) {
                    this.defaultUserViewPromise = $.getJSON(
                        Routing.generate(this.options.urls.userDefaultView, { alias: alias })
                    );
                }

                return this.defaultUserViewPromise;
            }
        });
    }
);
