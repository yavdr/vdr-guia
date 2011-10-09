var ProgramView = Backbone.View.extend({
    url: "program",
    
    events: {
        'click tr': "loadEpg"
    },
    
    generateHTML: function (callback) {
        var self = this;
        if (typeof(Application.collections.channellist) == 'undefined') {
            var ChannelCollection = require('./ChannelCollection');
            Application.collections.channellist = new ChannelCollection();
            
            Application.collections.channellist.fetch({success: function (collection, data) {
                data.channels.forEach(function (channel) {
                    collection.add(channel);
                });
                
                callback.apply(this, [_.template(self.template, {channels: collection})]);
            }});
        } else {
            callback.apply(this, [_.template(self.template, {channels: collection})]);
        }
    },
    
    postRender: function () {
        var diff = $('#content').height() - $('#channellist').parent().height() - $('#header_div').height();
        
        $('#channellist').parent().css('height', $(window).height() - $('#channellist').parent().offset().top - diff).data({
            height: $(window).height() - $('#channellist').offset().top,
            top: $('#channellist').offset().top
        });
        
        $('#channellist').css('height', '100%');
    },
    
    loadEpg: function (event) {
        console.log(event.currentTarget);
        
        EventCollection = require('./EventCollection');
        var epglist = new EventCollection;
        
        epglist.fetch({data: {channel_id: $(event.currentTarget).attr('channelid')}, success: function () {
                console.log('ARG');
        }});
    }
});