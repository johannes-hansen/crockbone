/*jshint white:true browser:true unused:true undef:true quotmark:'single' newcap:true latedef:true indent:4 forin:true camelcase:true*/
/*global define console t */
define([
    'jquery',
    'underscore',
    'backbone',
    'utils/crockbone/extension_utils',
    'utils/crockbone/view',
    'utils/crockbone/areas',
    'shared/cancan'
], function ($, _, Backbone, extend, gsView, areas, cancan) {

    var baseController = function () {
        // Private:

        // Public:
        return {

            initialize : function (params) {
                console.log('<< Initializing Controller:' + this.name + ' >>');

                this.view.controller = this; // Create reference to this on this.view

                if (params) {
                    _.extend(this, params);
                }

                if (!_.isEmpty(this.model)) {
                    // If the controller is connected to a specific model, match its id.
                    // This ensures that we won't have any duplicate controllers.
                    this.id = 'ctrl_' + this.name + '_' + this.model.id;
                    this.set('id', this.id);
                }

                return this;
            },

            setup : function () {
                // Executed by parent controller/router.
                // setup initializes dataload and sets the controller view
                // to preloading state. Returns the view element to the parent.
                this.view.preload();
                return this;
            },

            renderView : function (container) {
                this.setup();
                this.view.render.apply(this.view, arguments);
                this.view.updateBindings();
                if (container) {
                    this.pageContainer = container;
                    container.html(this.view.$el);
                }
                return this.view.el;
            },

            validate : function (attributes, options) {
                // Validate attributes, before set & save.
            },

            sync : function () {} // Disable sync.
        };
    };

    baseController.permissions = function (rules) {
        var that = this;
        if (rules) {
            cancan.on('changed:session', function () {
                _.forEach(rules, function (roles, action) {
                    cancan.allow(action, that.classId,
                        0 <= _.indexOf(roles, cancan.getRole())
                    );
                });
            }, that);
        }
        return this;
    };

    baseController.setType = function (type) {
        this.bbType = type;
        return this;
    };

    baseController.bbType = 'deepModel'; // Used in extension_utils to know what to create with "object.create()".
    baseController.extend = extend.call(baseController);


        // Page controllers are actually collections
        // Controls the entire view. Childcontrollers are stored as models.
    var pageController = baseController.extend(function (that) {
        // Private vars
        var _super = _.clone(that);
        var moduleCollection = new Backbone.Collection();

        function delegateMethods (methods) {
            // Controller used to be a collection holding all modules
            var callback = function (mtd) {
                return function () {
                    return moduleCollection[mtd].apply(moduleCollection, arguments);
                };
            };

            for (var i = 0; i < methods.length; i++) {
                var method = methods[i];
                this[method] = callback(method);
            }

            this.listenTo(moduleCollection, 'all', function () {
                this.length = moduleCollection.length;
                this.models = moduleCollection.models;
                this.trigger.apply(this, arguments);
            }, this);
        }

        function routeCallback(callback, baseHash){
            // Create a callback function for a custom route.
            var that = this;
            var router = window.permissions.router;

            return function(){
                if( !that.view.$el.is(':visible') ) {
                    $('#app_view').children().hide();
                    that.reload(function () {
                        that.view.$el.fadeIn();
                    });
                }

                console.log('Triggered custom route:' + callback);
                that[callback].apply(that, arguments);
            };
        }

        function retriggerRoutes (hash) {
            // Retrigger the router to match new routes:
            var router = window.permissions.router;

            // Reset the route to retrigger the router. Hack? :P
            router.navigate("", {trigger:false, replace:true});
            router.navigate(hash, {trigger:true, replace:true});
        }

        function addRoutes(that) {

            var hash = window.location.hash;
            var baseHash = hash.split('/')[0].split(';')[0].split('#')[1];
            var router = window.permissions.router;
            var routes = [];

            if (_.isEmpty(baseHash)) {
                // Handle empty route
                baseHash = that.baseRoute;
                hash = '#' + baseHash;
                router.navigate(baseHash, {trigger:false, replace:true});
            }

            router.route(baseHash + '/*actions', baseHash, function () {
                this.pageContainer.children().hide();
                that.view.$el.fadeIn();
                $(window).trigger('msg', {
                    msg : 'Error: No such route: ' + window.location.hash,
                    type : 'danger',
                    ttl : 2000
                });
                router.navigate(baseHash, {trigger:false, replace:true});
            });

            router.route(baseHash, baseHash, function () {
                this.pageContainer.children().hide();
                that.reload(function () {
                    that.view.$el.fadeIn();
                });
            });

            for(var r in that.routes) {
                routes.unshift(r); // Reverse the order of the routes.
            }

            for (var i = 0; i < routes.length; i++) {
                var route = routes[i]; // Route pattern.
                var callback = that.routes[route]; // Callback function name.
                router.route(baseHash + '/' + route, callback, routeCallback.call(that, callback, baseHash));
            }

            if (hash !== '#'+baseHash) {
                if (!_.isUndefined(that.collection) && that.collection.length === 0) {
                    // Wait until the collection is loaded to retrigger the router
                    that.collection.once('reset', function () {
                        retriggerRoutes.call(that, hash);
                    }, router);
                } else {
                    retriggerRoutes.call(that, hash);
                }
            }
        }

        // Public vars
        that.areas = {};

        //that.name = '';

        // We probably won't have to specify a custom main view, so we'll create it here:
        that.view = gsView.page.create();

        // The Controller keeps track of its own routes.
        // All routes will be prefixed by that.name + '/'.
        that.routes = {};

        that.initialize = function(){
            var that = this;

            delegateMethods.call(this, ['add', 'remove', 'update', 'each', 'sort', 'reset', 'at', 'push', 'filter']);

            this.view.controller = this;

            this.listenTo(this, 'destroy', function() {
                that.removeChild.apply(that, arguments);
            }, that);

            this.setup();
            addRoutes(this);

            return this;
        };

        that.comparator = function (m) {
            return m.order;
        };

        that.setupAreas = function () {
            for(var area in areas){
                this.areas[area] = areas[area].create(this).render(this);
            }
        };

        that.addChild = function (child, area) {
            child.area = area || child.area;

            if(!_.isUndefined(this.getModule(child))) {
                this.update([child], {remove:false});
            } else {
                this.add(child);
            }

            // Modules *must* have an id defined in order to avoid duplicates...

            return this.getModule(child.id);
        };

        that.removeChild = function(child){
            window.permissions.router.navigate("#" + this.name, {trigger:false, replace:true});
            child.view.remove();
            child.view = undefined;
            this.remove(child);
        };

        that.reload = function (callback) {
            // Used to reload data.
            // TODO: Replace with event??
            if (!_.isUndefined(this.collection)) {
                this.collection.fetch({
                    success : function () {
                        callback();
                    }
                });
            } else {
                //callback
            }
        };

        that.getModule = function () {
            return moduleCollection.get.apply(moduleCollection, arguments);
        };

        return that;
    });

    pageController.bbType = 'collection'; // Used in extention_utils to know what to create with "object.new()".
    baseController.page = pageController;

    return baseController;
});