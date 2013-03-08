/*jshint white:true browser:true unused:true undef:true quotmark:'single' newcap:true latedef:true indent:4 forin:true camelcase:true*/
/*global define console t */
define([
    'jquery',
    'underscore',
    'utils/crockbone/extension_utils',
    'text!utils/crockbone/application.html'
], function ($, _, extend, template) {

    // Standard view module
    var baseView = function () {
        // Private methods & vars
        function populater(el, attr) {
            // Store the element for use in the returned callback function.
            var that = this;

            return _.throttle(function(){
                // @TODO: this should be able to handle different element types like checkboxes etc.
                var newAttr = that.controller.get(attr);

                function animateDone (el) {
                        // We don't want to empty the element before the animation is done
                        if (_.isEmpty(newAttr)) {
                            $(el).val('');
                            $(el).children().detach();
                        }
                        // Reset the width & height to auto to enable resizing.
                        $(el).css({
                            width: 'auto',
                            height: 'auto'
                        });
                }

                newAttr = !_.isNaN(newAttr) && _.isNumber(newAttr) ? newAttr.toString() : newAttr;

                // Populate en element with data when the corresponding attribute is changed.
                if ($(el).hasClass('animate')) {
                    $(el).css({
                        width : 'auto',
                        height : 'auto'
                    });
                } else if ($(el).hasClass('animate-y')) {
                    $(el).css({
                        height : 'auto'
                    });
                } else if ($(el).hasClass('animate-x')) {
                    $(el).css({
                        width : 'auto'
                    });
                }

                // Get the old dimensions of the element.
                var oldWidth = $(el).outerWidth();
                var oldHeight = $(el).outerHeight();
                var newWidth = $(el).outerWidth();
                var newHeight = $(el).outerHeight();

                // Get the new dimensions
                if (!_.isEmpty(newAttr)) {
                    $(el).val(newAttr);

                    if (!$(el).is('select')) {
                        $(el).html(newAttr);
                    }

                    newWidth = $(el).outerWidth();
                    newHeight = $(el).outerHeight();
                } else {
                    newWidth = 0;
                    newHeight = 0;
                }

                $(el).removeClass('pending').removeClass('error');

                if ($(el).hasClass('animate')) {
                    // Transition into the new dimensions.
                    $(el).css({
                        width : oldWidth,
                        height : oldHeight
                    }).animate({
                        width : newWidth,
                        height : newHeight,
                        opacity : 1
                    }, 400, function () {
                        animateDone(el);
                    });
                } else if ($(el).hasClass('animate-y')) {
                    // Transition into the new dimensions.
                    $(el).css({
                        height : oldHeight
                    }).animate({
                        height : newHeight,
                        opacity : 1
                    }, 400, function () {
                        animateDone(el);
                    });
                }  else if ($(el).hasClass('animate-x')) {
                    $(el).css({
                        width : oldWidth
                    }).animate({
                        width : newWidth,
                        opacity : 1
                    }, 400, function () {
                        animateDone(el);
                    });
                } else {
                    // No animation so just empty the element.
                    if (_.isEmpty(newAttr)) {
                        $(el).val('');
                        $(el).empty();
                    }
                }
            }, 400);
        }

        function updater(el, attr) {
            // When an attribute is changed, save it to the controller.
            var that = this;
            return function () {
                // Set the actual attributes.
                var $el = $(el);
                var val;
                if ($el.attr('type') === 'checkbox') {
                    val = $el.is(':checked');
                } else if ($el.attr('type') === 'radio') {
                    if ($el.is(':checked')) {
                        val = $el.val();
                    } else {
                        return false;
                    }
                } else {
                    val = $el.val();
                }

                if ($(el).is('input')) { $(el).addClass('pending'); }

                that.controller.set(attr, val, {
                    validate : true,
                    error : function () {
                        // Called if value doesn't pass the validator.
                        $(el).removeClass('pending').addClass('error');
                    },
                    success : function () {
                        $(el).removeClass('pending').addClass('success');
                    },
                    attr : attr
                });
                return false;
            };
        }

        function onKeyUp(el) {
            return function () {
                el.addClass('pending');
                return false;
            };
        }

        function populate(containers) {
            // Populates all data-bindings with data from the controller.
            // Binds eventlisteners to the attributes & element so it will update automatically.

            var l = containers.length;
            for (var i = 0; i < l; i++) {
                var c = containers[i];
                var attr = $(c).data('bind');
                var boundFn = populater.call(this, c, attr);
                boundFn();
                //$(c).html(this.controller.get(attr) || 'Preloading');

                // Bind changes from the controller to update the element.
                var baseAttr = attr.split('.')[0];
                this.controller.on('change:' + baseAttr, boundFn);

                // Bind changes on element to update controller.
                $(c).on('change', updater.call(this, c, attr));
                //$(c).on('keyup', onKeyUp($(c)));
            }
        }

        // Public methods & variables.
        return {

            tmpl : '', // Templates are defined as strings.

            params : {
                data : {},
                description : 'Standard View',
                t : window.t
            },

            events : {
                'click.crockView *[data-action]' : 'dispatch'
            },

            initialize : function () {
                _.bindAll(this, 'updateBindings');
                var obj = arguments[0] || {};
                this.params = {data : {}, t : window.t};
                $.extend(this, obj);
                // We don't want any clones of any collection or model:
                this.collection = this.collection || obj.collection || undefined;
                this.model = this.model || obj.model || undefined;
                return this;
            },

            /*  Note: There is no longer any need for convenience methods
                like "this.init()" or "this.rendered()".
                The module pattern allows us to overwrite methods, but still
                keep the old methods in a private variable.
                Example: see the overwritten "initialize()" in "function pageView()".*/

            dispatch : function (e) {
                // Dispatches events from the view directly to its controller.
                var target = $(e.target),
                    action;

                e.preventDefault();

                while (target && !target.data('action')) {
                    target = target.parent();
                }

                action = target.data('action');
                if (!$(target).hasClass('disabled') &&
                    this.controller &&
                    _.isFunction(this.controller[action])) {
                    return this.controller[action](target.data());
                }
            },

            render : function (data) {
                this.$el.removeClass('preloading');
                this.params.data = data || this.params.data;
                this.params.t = t;
                var html;
                if (_.isFunction(this.tmpl)) {
                    html = this.tmpl(this.params);
                } else {
                    html = _.template(this.tmpl, this.params);
                }
                this.$el.html(html);
                return this;
            },

            preload : function () {
                // The preload function is called when the controller is added to an area.
                this.$el.addClass('preloading');
                return this; // preload must always return this!
            },

            updateBindings : function () {
                // Find all data-bind to be populated with data and bound to eventlisteners.
                // This function has to be called manually.
                var listenerParams = this.$('*[data-bind]');
                populate.call(this, listenerParams);
                return this;
            }
        };
    };
    baseView.bbType = 'view'; // Needed for the.new() function to know what to create.
    baseView.extend = extend.apply(baseView); // This will be inherited to all modules extending baseView.

    // Main page view, contains all gui-areas.
    var pageView = baseView.extend(function (that) {

        // Private:
        var _super = _.clone(that); // Clone old methods in private variable for later use.

        // Public methods:
        that.el = $('#app_view');
        that.tmpl = template;

        that.initialize = function () {
            _super.initialize.apply(this, arguments); // We can overwrite a method and still use it!
            return this;
        };

        that.render = function () {
            _super.render.apply(this, arguments);
            this.controller.setupAreas();
        };

        return that;
    });

    baseView.page = pageView; // Just a neat way to access the pageView.
    return baseView;
});