var EventCastView = Backbone.View.extend({
    template: 'EventCastTemplate',
    
    render: function () {
        console.log(this.model);
        $(this.el).html(_.template( $('#' + this.template).html(), {cast: this.model} ));
        return this;
    }
});