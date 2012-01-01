io.sockets.on('connection', function (socket) {
    var hs = socket.handshake;

    socket.on('NavigationCollection:read', function (data, callback) {
        if (hs.session.loggedIn) {
            var menu = [{
                title: __('Highlights'),
                link: '#/highlights',
                view: 'Highlights'
            }, {
                title: __('TV Guide'),
                link: '#/TVGuide',
                view: 'TVGuide'
            }, {
                title: __('Recordings'),
                link: '#/recordings',
                view: 'Recordings'
            }, {
                title: __('Me'),
                items: [{
                    title: __('My Profile'),
                    link: '#/me',
                    view: 'Me'
                }, {
                    title: __('Help'),
                    link: '#/help',
                    view: 'Help'
                }, {
                    title: __('Shortcuts'),
                    link: '#/shortcuts',
                    view: 'Shortcuts'
                }, {
                    title: __('Settings'),
                    link: '#/settings',
                    view: 'Settings'
                }, {
                    title: __('Logout'),
                    link: '#/logout',
                    view: 'Logout',
                    id: 'logoutBtn'
                }]
            }];

            callback({items: menu, loggedIn: true});
        } else {
            var menu = [{
                title: __('Home'),
                link: '#'
            }, {
                title: __('Contact'),
                link: '#/contact'
            }];

            callback({items: menu, loggedIn: false});
        }
    });
});