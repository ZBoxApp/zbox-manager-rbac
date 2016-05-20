// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

'use strict';

var restify = require('restify');
var jszimbra = require('js-zimbra');
var pjson = require('../package.json');

try {
  console.log(process.env.zbox_rbac_config);
  var config = require(process.env.zbox_rbac_config);
}
catch(err) {
  console.error(err);
  throw "Problem with config file";
}

var jszimbra_client = new jszimbra.Communication({url: config.zimbra_url});
var DOMAIN_ADMIN_RIGHT = "domainAdminRights";

var getAdminByToken = function(token, callback) {
  jszimbra_client.token = token;
  const request = { name: 'GetInfoRequest', namespace: "zimbraAccount" };
  jszimbra_client.getRequest({}, (err, req) => {
    if (err) return callback(err);
    req.addRequest(request, function(err){
      if (err) return callback(err);
      jszimbra_client.send(req, (err, data) => {
        if (err) return callback(err);
        return callback(null, data.response[0].GetInfoResponse);
      });
    });
  });
};

var isValidZonePath = function(path) {
  const prePath = "/servers/localhost/zones/";
  return /^\/servers\/localhost\/zones\/.*\.$/.test(path);
};

var validateRequest = function(token, path, callback) {
  getAdminByToken(token, function(err, data){
    if (err) return callback(null, false);
    const isGlobalAdmin = data.attrs._attrs.zimbraIsAdminAccount === 'TRUE' ? true : false;
    if (isGlobalAdmin) return callback(null, true);
    if (!isValidZonePath(path)) return callback(null, false);
    const admin_id = data.id;
    const domain = path.split("zones/").pop();
    validateDomainOwnership(token, admin_id, domain, function(err, data){
      if (err) return callback(null, false);
      return callback(null, data);
    });
  });
};

var validateDomainOwnership = function(token, admin_id, domain, callback) {
  jszimbra_client.token = token;
  const params = { domain: { by: 'name', '_content': domain.replace(/\.$/, '')}};
  params.attrs = 'zimbraACE';
  const request = {
    name: 'GetDomainRequest',
    namespace: "zimbraAdmin", params: params
  };
  jszimbra_client.getRequest({}, (err, req) => {
    if (err) return callback(err);
    req.addRequest(request, function(err){
      if (err) return callback(err);
      jszimbra_client.send(req, (err, data) => {
        if (err) return callback(null, false);
        const domain = data.get().GetDomainResponse.domain[0];
        if (!domain.a) return callback(null, false); // Porque no tiene ACE
        return callback(null, validateDomainAce(domain.a, admin_id));
      });
    });
  });
};

var validateDomainAce = function(aces, admin_id) {
  const content = [];
  aces.forEach((ace) => {
    if (ace['_content']) {
      const id = ace['_content'].split(" ")[0];
      if(id === admin_id) content.push(id);
    }
  });
  return (content.length > 0);
};

var server = restify.createServer({
  name: pjson.name,
  version: pjson.version
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.get('/powerdns', function (req, res, next) {
  const token = req.headers['x-api-key'];
  const path = req.headers['x-original-uri'];
  if (!token) return next(new restify.UnauthorizedError());
  validateRequest(token, path, function(err, valid){
    if (err) throw err;
    if (!valid) return next(new restify.UnauthorizedError());
    res.send(200, {Auth: 'Ok'});
    return next();
  });
});


server.listen(config.port, function () {
  console.log('%s listening at %s - V%s', pjson.name, server.url, pjson.version);
});


module.exports = server;
