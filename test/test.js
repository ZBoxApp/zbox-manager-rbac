"use strict";

// '/pdns-auth/servers/localhost/zones/1463325957115.com.';

var requireHelper = require('./require_helper'),
    server = requireHelper('index.js'),
    expect = require('chai').expect,
    jszimbra = require('js-zimbra'),
    global_admin_token = null,
    domain_admin_token = null,
    hippie = require('hippie');

var pdnsapi = function(token, path, callback) {
  hippie(server)
    .json()
    .get("/powerdns")
    .header("x-api-key", token)
    .header('x-original-uri', path)
    .end(callback);
};

(function() {

  describe('Getting admins', function(){
    const zimbra_url = 'https://zimbra.zboxapp.dev:7071/service/admin/soap';
    const auth_object = { 'isPassword': true, 'isAdmin': true };
    const jszimbra_client = new jszimbra.Communication({url: zimbra_url});

    before(function(done){
      // global_admin
      auth_object.username = "admin@zboxapp.dev";
      auth_object.secret = "12345678";
      jszimbra_client.auth(auth_object, function(e,d){
        if (e) return console.error(e);
        global_admin_token = jszimbra_client.token;
        // domain_admin
        auth_object.username = "domain_admin@customer.dev";
        auth_object.secret = "12345678";
        jszimbra_client.auth(auth_object, function(e,d){
          if (e) return console.error(e);
          domain_admin_token = jszimbra_client.token;
          done();
        });
      });
    });

    describe('PowerDNS RBAC', function() {
      it('Allow Global Admin to list all Domains', function(done){
        const path = '/servers/localhost/zones';
        pdnsapi(global_admin_token, path, function(req, res, b){
          expect(res.statusCode).to.be.equal(200);
          done();
        });
      });

      it('Should Allow Global Admin to get Whatever', function(done){
        const path = '/servers/localhost/zones/chupaloricodany.com.';
        pdnsapi(global_admin_token, path, function(req, res, b){
          expect(res.statusCode).to.be.equal(200);
          done();
        });
      });

      it('Deny Domain Admin to list all Domains', function(done){
        const path = '/servers/localhost/zones';
        pdnsapi(domain_admin_token, path, function(req, res, b){
          expect(res.statusCode).to.be.equal(401);
          done();
        });
      });

      it('Should allow Domain Admin to access his Domains', function(done){
        const path = '/servers/localhost/zones/customer.dev.';
        pdnsapi(domain_admin_token, path, function(req, res, b){
          expect(res.statusCode).to.be.equal(200);
          done();
        });
      });

      it('Should NOT allow Domain Admin to access others Domains', function(done){
        const path = '/servers/localhost/zones/reseller.dev.';
        pdnsapi(domain_admin_token, path, function(req, res, b){
          expect(res.statusCode).to.be.equal(401);
          done();
        });
      });

      it('Should NOT allow Domain Admin to access a non existing Domain', function(done){
        const path = '/servers/localhost/zones/chupaloricodany.com.';
        pdnsapi(domain_admin_token, path, function(req, res, b){
          expect(res.statusCode).to.be.equal(401);
          done();
        });
      });

    });
  });
})();
