'use strict';

/**
 * @namespace Order
 */

var server = require('server');

var base = module.superModule;

var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var externalCustomers = require('~/cartridge/scripts/services/externalCustomers')

/**
 * Order-Confirm : This endpoint is invoked when the shopper's Order is Placed and Confirmed
 * @name Base/Order-Confirm
 * @function
 * @memberof Order
 * @param {middleware} - consentTracking.consent
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.generateToken
 * @param {querystringparameter} - ID - Order ID
 * @param {querystringparameter} - token - token associated with the order
 * @param {category} - sensitive
 * @param {serverfunction} - get
 */
server.replace(
    'Confirm',
    consentTracking.consent,
    server.middleware.https,
    csrfProtection.generateToken,
    function (req, res, next) {
        var CustomerMgr = require('dw/customer/CustomerMgr');
        var reportingUrlsHelper = require('*/cartridge/scripts/reportingUrls');
        var OrderMgr = require('dw/order/OrderMgr');
        var OrderModel = require('*/cartridge/models/order');
        var Locale = require('dw/util/Locale');
        var UUIDUtils = require('dw/util/UUIDUtils');

        var order;

        if (!req.form.orderToken || !req.form.orderID) {
            res.render('/error', {
                message: Resource.msg('error.confirmation.error', 'confirmation', null)
            });

            return next();
        }

        order = OrderMgr.getOrder(req.form.orderID, req.form.orderToken);

        if (!order || order.customer.ID !== req.currentCustomer.raw.ID
        ) {
            res.render('/error', {
                message: Resource.msg('error.confirmation.error', 'confirmation', null)
            });

            return next();
        }
        var lastOrderID = Object.prototype.hasOwnProperty.call(req.session.raw.custom, 'orderID') ? req.session.raw.custom.orderID : null;
        if (lastOrderID === req.querystring.ID) {
            res.redirect(URLUtils.url('Home-Show'));
            return next();
        }

        var config = {
            numberOfLineItems: '*'
        };

        var currentLocale = Locale.getLocale(req.locale.id);

        var orderModel = new OrderModel(
            order,
            { config: config, countryCode: currentLocale.country, containerView: 'order' }
        );
        var passwordForm;

        var reportingURLs = reportingUrlsHelper.getOrderReportingURLs(order);

        const UUID = UUIDUtils.createUUID();

        let externalBillingAddress = orderModel.billing.billingAddress.address;

        for (let key in externalBillingAddress) {
            if (externalBillingAddress[key] === null) {
                delete externalBillingAddress[key];
            }
        }

        let externalShippingAddress = orderModel.shipping[0].shippingAddress;

        for (let key in externalShippingAddress) {
            if (externalShippingAddress[key] === null) {
                delete externalShippingAddress[key];
            }
        }

        let { orderEmail, orderNumber, priceTotal } = orderModel;

        let { grandTotal, subTotal, totalShippingCost, totalTax } = orderModel.totals

        var response = externalCustomers.externalCustomers({
            method: "POST", url: "shippingAndBillingAddress", body: {
                id: UUID,
                orderInfo: { orderEmail, orderNumber, priceTotal },
                orderTotalsInfo: { grandTotal, subTotal, totalShippingCost, totalTax },
                billingAddress: externalBillingAddress,
                shippingAddress: externalShippingAddress
            }
        })

        if (!req.currentCustomer.profile) {
            passwordForm = server.forms.getForm('newPasswords');
            passwordForm.clear();
            res.render('checkout/confirmation/confirmation', {
                order: orderModel,
                returningCustomer: false,
                passwordForm: passwordForm,
                reportingURLs: reportingURLs,
                orderUUID: order.getUUID()
            });
        } else {
            res.render('checkout/confirmation/confirmation', {
                order: orderModel,
                returningCustomer: true,
                reportingURLs: reportingURLs,
                orderUUID: order.getUUID()
            });
        }
        req.session.raw.custom.orderID = req.querystring.ID; // eslint-disable-line no-param-reassign
        return next();
    }
);

server.replace(
    'CreateAccount',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var UUIDUtils = require('dw/util/UUIDUtils');

        var OrderMgr = require('dw/order/OrderMgr');

        var formErrors = require('*/cartridge/scripts/formErrors');

        var passwordForm = server.forms.getForm('newPasswords');
        var newPassword = passwordForm.newpassword.htmlValue;
        var confirmPassword = passwordForm.newpasswordconfirm.htmlValue;
        if (newPassword !== confirmPassword) {
            passwordForm.valid = false;
            passwordForm.newpasswordconfirm.valid = false;
            passwordForm.newpasswordconfirm.error =
                Resource.msg('error.message.mismatch.newpassword', 'forms', null);
        }

        var order = OrderMgr.getOrder(req.querystring.ID);
        if (!order || order.customer.ID !== req.currentCustomer.raw.ID || order.getUUID() !== req.querystring.UUID) {
            res.json({ error: [Resource.msg('error.message.unable.to.create.account', 'login', null)] });
            return next();
        }

        res.setViewData({ orderID: req.querystring.ID });
        var registrationObj = {
            firstName: order.billingAddress.firstName,
            lastName: order.billingAddress.lastName,
            phone: order.billingAddress.phone,
            email: order.customerEmail,
            password: newPassword
        };

        if (passwordForm.valid) {
            res.setViewData(registrationObj);
            res.setViewData({ passwordForm: passwordForm });

            this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
                var CustomerMgr = require('dw/customer/CustomerMgr');
                var Transaction = require('dw/system/Transaction');
                var accountHelpers = require('*/cartridge/scripts/helpers/accountHelpers');
                var addressHelpers = require('*/cartridge/scripts/helpers/addressHelpers');

                var registrationData = res.getViewData();

                var login = registrationData.email;
                var password = registrationData.password;
                var newCustomer;
                var authenticatedCustomer;
                var newCustomerProfile;
                var errorObj = {};

                const UUID = UUIDUtils.createUUID();

                var responseCustomer = externalCustomers.externalCustomers({
                    method: "POST", url: "customers", body: {
                        id: UUID,
                        firstName: registrationData.firstName,
                        lastName: registrationData.lastName,
                        email: registrationData.email,
                        password: registrationData.password,
                        phone: registrationData.phone,
                    }
                });

                delete registrationData.email;
                delete registrationData.password;

                // attempt to create a new user and log that user in.
                try {
                    Transaction.wrap(function () {
                        var error = {};
                        newCustomer = CustomerMgr.createCustomer(login, password);

                        var authenticateCustomerResult = CustomerMgr.authenticateCustomer(login, password);
                        if (authenticateCustomerResult.status !== 'AUTH_OK') {
                            error = { authError: true, status: authenticateCustomerResult.status };
                            throw error;
                        }

                        authenticatedCustomer = CustomerMgr.loginCustomer(authenticateCustomerResult, false);

                        if (!authenticatedCustomer) {
                            error = { authError: true, status: authenticateCustomerResult.status };
                            throw error;
                        } else {
                            // assign values to the profile
                            newCustomerProfile = newCustomer.getProfile();

                            newCustomerProfile.firstName = registrationData.firstName;
                            newCustomerProfile.lastName = registrationData.lastName;
                            newCustomerProfile.phoneHome = registrationData.phone;
                            newCustomerProfile.email = login;

                            order.setCustomer(newCustomer);

                            // save all used shipping addresses to address book of the logged in customer
                            var allAddresses = addressHelpers.gatherShippingAddresses(order);
                            allAddresses.forEach(function (address) {
                                addressHelpers.saveAddress(address, { raw: newCustomer }, addressHelpers.generateAddressName(address));
                            });

                            res.setViewData({ newCustomer: newCustomer });
                            res.setViewData({ order: order });
                        }
                    });
                } catch (e) {
                    errorObj.error = true;
                    errorObj.errorMessage = e.authError
                        ? Resource.msg('error.message.unable.to.create.account', 'login', null)
                        : Resource.msg('error.message.account.create.error', 'forms', null);
                }

                var guestCustomerAddresses = addressHelpers.gatherShippingAddresses(order);

                guestCustomerAddresses.forEach(address => {

                    for (let key in address) {
                        if (address[key] === null) {
                            delete address[key];
                        }
                    }

                    address.customerEmail = newCustomerProfile.email;
                    address.customerNumber = newCustomerProfile.customerNo;
                    address.customerExternalDataBaseID = UUID;

                    var responseAddress = externalCustomers.externalCustomers({
                        method: "POST", url: "addressBook", body: { id: UUIDUtils.createUUID(), customAddress: address },
                    });

                })

                delete registrationData.firstName;
                delete registrationData.lastName;
                delete registrationData.phone;

                if (errorObj.error) {
                    res.json({ error: [errorObj.errorMessage] });

                    return;
                }

                accountHelpers.sendCreateAccountEmail(authenticatedCustomer.profile);

                res.json({
                    success: true,
                    redirectUrl: URLUtils.url('Account-Show', 'registration', 'submitted').toString()
                });
            });
        } else {
            res.json({
                fields: formErrors.getFormErrors(passwordForm)
            });
        }

        return next();
    }
);

module.exports = server.exports();
