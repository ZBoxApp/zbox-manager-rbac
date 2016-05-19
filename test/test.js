"use strict";

var requireHelper = require('./require_helper'),
    jsPowerdns = requireHelper('index.js'),
    expect = require('chai').expect,
    superagent = require('superagent');

(function() {

  describe('Temp Record', function() {
    var tmp_zone = null;

    beforeEach(function(done) {
      let api = new jsPowerdns({ url: 'http://127.0.0.1:8081', token: 'otto' });
      const zone_name = 'tempdomain.com.';
      const record_name = `test.${zone_name.replace(/\.$/, '')}`;
      const record_name2 = `test2.${zone_name.replace(/\.$/, '')}`;
      const records = [ {"content": "192.0.5.4", "disabled": false, "name": record_name, "ttl": 86400, "type": "A" } ];
      records.push({ "content": "192.0.5.5", "disabled": false, "name": record_name2, "ttl": 86400, "type": "A" });
      const zone_data = { name: zone_name, kind: 'Master', nameservers: []};
      api.createZoneWithRecords(zone_data, records, done);
    });

    afterEach(function(done) {
      let api = new jsPowerdns({ url: 'http://127.0.0.1:8081', token: 'otto' });
      const zone_name = 'tempdomain.com.';
      api.deleteZone('/servers/localhost/zones/' + zone_name, done);
    });
  });
})();
