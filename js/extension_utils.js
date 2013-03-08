define([
    'jquery',
    'underscore',
    'backbone',
    'utils/deep_model'
    ], function(jQuery, _, Backbone, DeepModel) {

        /*
            This code handles objects extension functionality
            & the backbone-objectifying.
        */

        function create(oldObj){
            if (!_.isObject(oldObj)) {
                throw 'Error: cannot extend: ' + oldObj + '. Forgot to return "that"?';
            }
            function F(){}
            F.prototype = oldObj;
            return new F();
        }

        // Memoization improves performance when rendering many objects, but could hog memory??
        /*var bbMaker = _.memoize( function(BBClass, params){
                return Backbone[BBClass].extend(params);
            }, function( BBClass, params ){
                params.name = params.name || _.uniqueId();
                return params.name;
        });*/

        function bbMaker(BBClass, params) {
            return Backbone[BBClass].extend(params);
        }

        function bbCreator(fn) {
            return function (params) {
                switch (fn.bbType) {
                    case 'view':
                        return new (bbMaker('View', fn(params)))();
                    case 'model':
                        return new (bbMaker('Model', fn(params)))();
                    case 'deepModel':
                        return new (bbMaker('DeepModel', fn(params)))();
                    case 'collection':
                        return new (bbMaker('Collection', fn(params)))();
                    default:
                        console.log('Unknown bbType: ' + fn.bbType);
                }
            };
        }

        function extend() {
            var that = this;
            // return function to create a closure where we allways have access to "that"
            return function (newFunction, type) {
                function fn(params) {
                    return newFunction(create(that()), params);
                }

                // Give the new function access to the extension utilities:
                fn.bbType = that.bbType;

                fn.permissions = that.permissions;
                fn.setType = that.setType;

                fn.classId = _.uniqueId('crockBone');

                fn.extend = extend.call(fn);
                fn.create = bbCreator(fn);

                return fn;
            };
        }

        /*

        // We start off with a simple module that returns an object:

        var baseModule = function(){
            // Private var
            var name = 'base';

            // Public
            return {
                get : function () { return name; },
                set : function (val) { name = val; }
            };
        }

        // In order to let other objects safely inherit from baseModule
        // we assign the extend function to it.
        // We use .apply() to assign 'this' to baseModule.

        baseModule.extend = extend.apply( baseModule );

        // Now we can let other modules inherit from baseModule without
        // risking leaking variables.

        var extendedModule = baseModule.extend( function( that ){ // that = the result of baseModule();
            var name;

            return that;
        });

        var doubleExtendedModule = extendedModule.extend(function(that){

            return that;
        });
*/

        return extend;
});