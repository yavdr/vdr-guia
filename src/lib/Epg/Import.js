var rest = require('restler');
var EventSchema = mongoose.model('Event');
var ActorSchema = mongoose.model('Actor');
var ChannelSchema = mongoose.model('Channel');
var async = require('async');

Object.defineProperty(Object.prototype, "extend", {
    enumerable: false,
    value: function(from) {
        var props = Object.getOwnPropertyNames(from);
        var dest = this;
        props.forEach(function(name) {
            if (name in dest) {
                var destination = Object.getOwnPropertyDescriptor(from, name);
                Object.defineProperty(dest, name, destination);
            }
        });
        return this;
    }
});

function EpgImport (restful, numEvents) {
    this.newEpg = false;

    this.restful = restful;
    this.numEvents = numEvents || 100;

    var ChannelImport = require(__dirname + '/../Channel/Import');
    this.channelImporter = new ChannelImport(restful);
}

EpgImport.prototype.start = function (callback) {
    var self = this;
    this.newEpg = false;

    log.dbg("Starting epg import ...");

    var channelQuery = ChannelSchema.find({active: true});

    channelQuery.each(function (err, channel, next) {
        if (channel === undefined) {
            callback(self.newEpg);
            return;
        }

        if (next === undefined) {
            callback(self.newEpg);
            return;
        }

        self.fetchEpg(channel, next);
    });
};

EpgImport.prototype.fetchEpg = function (channel, next) {
    var self = this;

    var from = new Date().getTime() / 1000 - (3600 * 24);
    var query = EventSchema.findOne({});

    query.where('channel_id', channel._id);
    query.sort('number', 1);
    query.sort('stop', -1);

    query.exec(function (err, e) {
        if (e != null) {
            from = Math.round(e.stop - 60);
        }

        log.dbg('Get events from channel: ' + channel.name);
        log.dbg(self.restful + '/events/' + channel.channel_id + '.json?timespan=0&from=' + from + '&start=0&limit=' + self.numEvents);
        rest.get(self.restful + '/events/' + channel.channel_id + '.json?timespan=0&from=' + from + '&start=0&limit=' + self.numEvents).on('success', function (res) {
            if (res.events.length == 0) {
                next.call();
                return;
            }

            if (res.events.length == self.numEvents) {
                self.newEpg = true;
            }

            log.dbg('Found ' + res.events.length + ' new events');

            async.mapSeries(res.events, function (event, callback) {
                if (socialize !== undefined && socialize && dnodeVdr) {
                    log.dbg('Sync event ' + event.title);
                    
                    var transmit = {
                        channel: null,
                        title: null
                    };

                    transmit.extend(event);

                    dnodeVdr.getEvent(transmit, function (res) {
                        res.start = event.start_time;
                        res.duration = event.duration;
                        res.stop = res.start + res.duration;
                        res.channel_id = channel._id;
                        res.event_id = event.id;
                        
                        delete(res.id);
                        delete(res._id);
                        
                        ChannelSchema.findOne({channel_id: res.channel}, function (err, channel) {
                            if (channel) {
                                res.channel_id = channel.get('_id');
                            
                                self.insertEpg(res, function () {
                                    log.dbg('Finished syncing ' + event.title);
                                    callback(null);
                                });
                            }
                        });
                    });
                } else {
                    self.extractDetails(channel, event, function (event) {
                        self.insertEpg(event, callback);
                    });
                }
            }, function (err, result) {
                next.call();
            });
        }).on('error', function () {
            next.call();
        });
    });
};

EpgImport.prototype.extractDetails = function (channel, event, callback) {
    async.series([
        function (callback) {
            event.event_id = event.id;
            delete(event.id);

            event.channel_id = channel._id;

            if (event.description.match(/\nShow-Id: [0-9]{0,}/)) {
                var show_id = event.description.match(/\nShow-Id: ([0-9]{0,})/);
                event.show_id = show_id[1];
            }

            event.short_description = event.short_text;
            delete(event.short_text);

            event.start = event.start_time;
            event.stop = event.start_time + event.duration;
            delete(event.start_time);

            if (event.description.match(/\nKategorie: .*?\n/)) {
                var event_type = event.description.match(/\nKategorie: (.*?)\n/);
                event.category = event_type[1];
            }

            if (event.category == null) {
                if (event.duration > 5400) {
                    event.category = 'eventually film';
                }

                if (event.duration > 2400 && event.duration < 3900) {
                    event.category = 'eventually series';
                }
            }

            if (event.description.match(/\[[\*]{1,}\] /)) {
                var rating = event.description.match(/\[([\*]{1,})\] /);
                event.rating = rating[1].length;

                event.description = event.description.replace(/\[[\*]{1,}\] /, '');
            }

            if (event.description.match(/\[Genretipp .*?\] /)) {
                var tip = event.description.match(/\[Genretipp (.*?)\] /);
                event.tip = {
                    genre: tip[1],
                    style: 'genre'
                };

                event.description = event.description.replace(/\[Genretipp .*?\] /, '');
            }

            if (event.description.match(/\[Spartentipp .*?\] /)) {
                var tip = event.description.match(/\[Spartentipp (.*?)\] /);
                event.tip = {
                    genre: tip[1],
                    style: 'sparte'
                };

                event.description = event.description.replace(/\[Spartentipp .*?\] /, '');
            }

            event.genre = new Array();

            event.contents.forEach(function (content) {
                event.genre.push(content.split('/'));
            });

            delete(event.contents);

            callback(null, null);
        }, function (callback) {
            if (event.details === undefined) {
                callback(null, null);
            }

            event.details.forEach(function (details) {
                if (details.key == "YEAR") {
                    event.year = details.value;
                }

                if (details.key == "COUNTRY") {
                    event.country = details.value;
                }

                if (details.key == "SEQUENCE") {
                    event.episode = details.value;
                }

                if (details.key == "REGISSEUR") {
                    event.regisseur = details.value;
                }
            });

            callback(null, null);
        }, function (callback) {
            if (event.details === undefined) {
                callback(null, null);
                return;
            }

            async.map(event.details, function (details, callback) {
                if (details.key == "ACTORS") {
                    event.actors = new Array();

                    var actors = details.value.split(' - ');

                    async.map(actors, function (a, callback) {
                        var actor_details = a.match(/(.*?) \((.*?)\)$/);

                        if (actor_details == null) {
                            actor_details = [null, a, null]
                        }

                        ActorSchema.findOne({name: actor_details[1], character: actor_details[2]}, function (err, doc) {
                            if (doc == null) {
                                var actor = new ActorSchema({
                                    name: actor_details[1],
                                    character: actor_details[2]
                                });

                                actor.save(function () {
                                    event.actors.push(actor._id);
                                    callback(null, null);
                                });
                            } else {
                                event.actors.push(doc._id);
                                callback(null, null);
                            }
                        });
                    }, function (err, result) {
                        callback(null, null);
                    });
                } else {
                    callback(null, null);
                }
            }, function (err, results) {
                callback(null, null);
            });
        }, function (callback) {
            delete(event.details);
            event.description = event.description.replace(new RegExp( "\\n.*", "g" ), '');

            callback(null, null);
        }
    ], function (err, results) {
        callback(event);
    });
};

EpgImport.prototype.evaluateType = function (callback) {
    mongoose.connection.db.executeDbCommand({
        group : {
           ns: 'events',
           cond: {},
           initial: {'count': 0},
           $reduce: 'function(doc, out){ out.count++ }',
           key: {title: 1, channel_id: 1}
        }
    }, function(err, dbres) {
        if (dbres.documents[0].retval !== undefined) {
            //If you need to alert users, etc. that the mapreduce has been run, enter code here
            async.map(dbres.documents[0].retval, function (doc, callback) {
                if (doc.count > 3) {
                    log.dbg('Set as series: ' + doc.title + ' :: ' + doc.channel_id);
                    EventSchema.update({title: doc.title, channel_id: doc.channel_id}, {type: 'series'}, {multi: true}, function () {
                        callback(null, null);
                    });
                } else {
                    callback(null, null);
                }
            }, function (err, result) {
                log.dbg('Type evaluation done ..');
                callback();
            });
        } else {
            callback();
        }
    });
};

EpgImport.prototype.insertEpg = function (event, callback) {
    var eventSchema = new EventSchema(event);
    eventSchema.save(function (err, doc) {
        if (err) {
            if (err.code == 11000) {
                EventSchema.update({event_id: event.event_id, channel_id: event.channel_id}, event, {upsert: true}, function (err, doc) {
                    callback(null, doc);
                });
            } else {
                console.log(err);
                callback(null, doc);
            }
        } else {
            callback(null, doc);
        }
    });
};

module.exports = EpgImport;