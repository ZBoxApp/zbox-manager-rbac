// require_helper.js
process.env.zbox_rbac_config="/Users/pbruna/Proyectos/nodejs/zbox-manager-rbac/test/config.json";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
module.exports = function (path) {
    return require((process.env.APP_DIR_FOR_CODE_COVERAGE || '../lib/') + path);
};
