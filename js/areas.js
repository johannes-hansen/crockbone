define([
    'jquery',
    'underscore',
    'backbone',

    'utils/crockbone/view'
], function($, _, Backbone,
            baseView) {

    var area = baseView.extend(function(that){
        // Basic content area.
        var children = {};
        var _super = _.clone(that);
        var active = false;

        // Add a modile to the area
        function addChild(child){
            if(child.area === this.name){
                console.log('Add child ' + child.id +' to area: ' + this.name);
                active = true;
                this.$('.holder').prepend(child.preload().view.el);
                this.fit();
            }
        }

        that.tmpl = '<div class="holder"></div>';

        that.initialize = function(parent){
            _super.initialize.apply(this);
            this.parent = parent;
            this.parent.on('add', this.add, this);
            this.parent.on('destroy', this.remove, this);
        };

        that.render = function(){
            _super.render.apply(this, arguments);
            this.holder = this.$('.holder');
            this.fit();
            return this;
        };

        that.add = function(child){
            // Add child or children
            if(_.isArray(child)){
                for(var i=0; i<child.length; i++) {
                    addChild.call(this, child[i]);
                }
            } else {
                addChild.call(this, child);
            }
        };

        that.remove = function(child){
            console.log('remove event');
            var that = this;
            var modules = this.parent.filter(function(module){
                return module.area === that.name;
            });
            if(modules.length === 0){
                this.hide();
            }
        };

        that.fit = function(){}; // Resize area to fit.

        that.isActive = function(){
            return active;
        };

        that.hide = function(){
            // Hide this area. Should have an effect on setupUI()...
            console.log('hide area: ' + this.name);
        };

        return that;
    });

    return area;
});
