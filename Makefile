build:
<<<<<<< HEAD
	@npm config set registry http://registry.npmjs.org/
=======
    @npm config set registry http://registry.npmjs.org/
>>>>>>> 93250c8... new check for lp build
	@npm install --prefix $(CURDIR)

install:
	install -d $(DESTDIR)/usr/share/vdr-guia/
	install -d $(DESTDIR)/etc/init/

	cp -r node_modules $(DESTDIR)/usr/share/vdr-guia/

	install -m 644 upstart/vdr-guia.conf $(DESTDIR)/etc/init/
	cp -r src/* $(DESTDIR)/usr/share/vdr-guia/

clean:
	rm -r  $(DESTDIR)
