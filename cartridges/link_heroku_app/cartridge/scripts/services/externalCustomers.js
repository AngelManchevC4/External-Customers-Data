var externalCustomers = function(args) {

    var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

    var externalCustomersService = LocalServiceRegistry.createService("http.external.customer.data", {

        createRequest: function (svc, args) {

            svc.setRequestMethod(args.method);

            svc.addHeader("Content-Type", "application/json");

            svc.setURL(svc.getURL() + args.url);

            return JSON.stringify(args.body);
        },

        parseResponse: function (svc, client) {
            return client.text;
        },

        filterLogMessage: function (msg) {
            return msg.replace(
                /password\: \".*?\"/,
                "password:******"
            );
        }

    });

    return externalCustomersService.call(args).object;
}
module.exports = {
    externalCustomers: externalCustomers,
};