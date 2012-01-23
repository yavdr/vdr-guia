var events =  mongoose.model('Event');
var actors =  mongoose.model('Actor');
var actorDetails =  mongoose.model('ActorDetail');
var async = require('async');

var tmdb = require('../Media/Scraper/Tmdb').init({
    apikey:'5a6a0d5a56395c2e497ebc7c889ca88d'
});

function Actor () {
}

Actor.prototype.fetchInformation = function (actor, callback) {
    log.dbg('Fetching actor informations for: ' + actor.name);

    tmdb.Person.search({
        query: actor.name,
        lang: 'de'
    }, function (err, res) {
        if(typeof(err) != 'undefined') {
            log.dbg('Errors fetching ' + actor.name + ' with error: ' + err);
            
            callback.call();
            return;
        }

        async.mapSeries(res, function (tmdbActor, callback) {
            if (tmdbActor == "Nothing found.") {
                log.dbg('Nothing found for: ' + actor.name);

                actor.set({tmdbSearched: new Date().getTime()});
                actor.save(function () {
                    callback('Fin');
                });

                return;
            }
            
            tmdb.Person.getInfo({
                query: tmdbActor.id.toString(),
                lang: 'de'
            }, function (err, res) {
                if(typeof(err) != 'undefined') {
                    log.dbg('Errors fetching ' + actor.name + ' with error: ' + err);

                    callback(null, null);
                    return;
                }

                var name = new RegExp("^" + actor.name + "$", 'ig');

                if (name.test(res[0].name)) {
                    actorDetails.findOne({tmdbId: tmdbActor.id}, function (err, doc) {
                        if (doc == null) {
                            res[0].tmdbId = tmdbActor.id;

                            var actorDetailsSchema = new actorDetails(res[0]);
                            actorDetailsSchema.save(function (err) {
                                if (err == null) {
                                    actor.set({tmdbId: actorDetailsSchema._id});

                                    actor.save(function () {
                                        log.dbg('Details saved for: ' + actor.name);
                                        callback('Fin');
                                    });
                                } else {
                                    callback('Fin');
                                }
                            });
                        } else {
                            actor.set({tmdbId: doc._id});
                            actor.save(function () {
                                log.dbg('Details saved for: ' + actor.name);
                                callback('fin');
                            });
                        }
                    });
                } else {
                    callback(null, null);
                }
            });
        }, function (err, result) {
            actor.set({tmdbSearched: new Date().getTime()});
            actor.save(function () {
                callback();
            });
        });
    });
};

Actor.prototype.fetchAll = function (callback) {
    var self = this;
    var query = actors.find({
        tmdbId: {$exists: false},
        tmdbSearched: {$exists: false}
    });

    query.sort('name', 1);

    query.each(function (err, actor, next) {
        if (actor == null) {
            log.dbg('Fetching actors finished ..');
            callback();
            return;
        }

        self.fetchInformation(actor, next)
    });
};

module.exports = Actor;