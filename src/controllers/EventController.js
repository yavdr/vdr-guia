var Epg = require('../lib/Epg');
var events = mongoose.model('Event');

io.sockets.on('connection', function (socket) {
    socket.on('EventCollection:read', function (data, callback) {
        if (!socket.handshake.session.loggedIn) {
            return false;
        }

        var date = new Date();

        date.setFullYear(
            parseInt(data.date.year, 10),
            parseInt(data.date.month, 10) - 1,
            parseInt(data.date.day, 10)
        );

        date.setHours(5);
        date.setMinutes(0);
        var primetime = new Date(date.getFullYear() + '-' + ((date.getMonth() + 1 < 10) ? '0' + (date.getMonth() + 1) : (date.getMonth()) + 1) + '-' + ((date.getDate() < 10) ? '0' + date.getDate() : date.getDate()) + ' 20:13:00');
        primetime = primetime.getTime() / 1000;

        var starttime = date;
        starttime = parseInt(starttime.getTime() / 1000);

        var stoptime = starttime + 86400;

        var epg = new Epg();
        epg.getEventsRange(data.channel_id, starttime, stoptime, callback);
    });

    socket.on('EventModel:read', function (data, callback) {
        var epg = new Epg();
        epg.getEvent(data._id, callback);
    });

    socket.on('Event:readOne', function (data, callback) {
        rest.get(vdr.restful + '/events/' + data.channel_id + '/' +  + data.event_id + '.json').on('success', function (data) {
            callback(data.events[0]);
        }).on('error', function () {
        }).on('403', function () {
        });
    });

    socket.on('Event:record', function (data, callback) {
        rest.post(vdr.restful + '/timers', {
            data: {
                channel: data.channel_id,
                eventid: data.event_id,
                minpre: 5,
                minpost: 15
            }
        }).on('success', function (data) {
            callback(data.timers[0]);
        }).on('error', function () {
        }).on('403', function () {
        });
    });

    socket.on('Event:deleteTimer', function (data, callback) {
        rest.del(vdr.restful + '/timers/' + data.timer_id).on('success', function (data) {
            callback();
        }).on('error', function () {
        }).on('403', function (e) {
        });
    });
});