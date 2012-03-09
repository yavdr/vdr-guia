var SettingsView = Backbone.View.extend({
    template: 'SettingsTemplate',

    events: {
        'click .nav-tabs > li': 'switchSection'
    },

    initialize: function () {
        $(this.el).html(_.template( $('#' + this.template).html(), {} ));

        if (this.options.section === undefined) {
            this.options.section = 'Guia';
        }

        $('.nav-tabs > li[data-section="' + this.options.section + '"]', this.el).addClass('active');

        this.loadSection();
    },

    render: function () {
        return this;
    },

    switchSection: function (ev) {
        if ($(ev.currentTarget).hasClass('active')) {
            return;
        }

        $('.nav-tabs').find('li.active').removeClass('active');
        $(ev.currentTarget).addClass('active');

        this.options.section = $(ev.currentTarget).data('section');

        this.loadSection();
    },

    loadSection: function () {
        if (this.subView != null) {
            this.subView.remove();
        }

        this.subView = new window['Settings' + this.options.section + 'View']({});
        $('#settingssection', this.el).html(this.subView.render().el);

        GUIA.router.navigate('!/Settings/' + this.options.section);
    }
});