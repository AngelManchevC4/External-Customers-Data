var externalCustomers = require('~/cartridge/scripts/services/externalCustomers')

function createCustomer(UUID, registrationForm) {

    var body = {
        id: UUID,
        firstName: registrationForm.firstName,
        lastName: registrationForm.lastName,
        email: registrationForm.email,
        password: registrationForm.password,
        phone: registrationForm.phone,
    }

    var response = externalCustomers.externalCustomers({
        method: "POST", url: "customers", body: body
    })

    return response;
}

function editCustomer(customer, formInfo) {

    var body = {
        firstName: formInfo.firstName,
        lastName: formInfo.lastName,
        email: formInfo.email,
        password: formInfo.password,
        phone: formInfo.phone,
    };

    var response = externalCustomers.externalCustomers({
        method: "PATCH", url: `customers/${customer.profile.custom.externalDataBaseID}`, body: body
    })

    return response;
}

function editCustomerPassword(customer, formInfo) {

    var body = {
        password: formInfo.newPassword,
    }

    var response = externalCustomers.externalCustomers({
        method: "PATCH", url: `customers/${customer.profile.custom.externalDataBaseID}`, body: body
    })

    return response;
}

function updateAddress(addressExternal, formInfo) {

    let customAddress = formInfo;
    customAddress.customerEmail = customer.profile.email;
    customAddress.customerNumber = customer.profile.customerNo;
    customAddress.customerExternalDataBaseID = customer.profile.custom.externalDataBaseID;
    delete customAddress.addressForm;
    delete customAddress.action;
    delete customAddress.queryString;

    var response = externalCustomers.externalCustomers({
        method: "PATCH", url: `addressBook/${addressExternal}`, body: { id: addressExternal, customAddress: customAddress }
    })

    return response;
}

function createAddress(UUID, formInfo) {

    let customAddress = formInfo;
    customAddress.customerEmail = customer.profile.email;
    customAddress.customerNumber = customer.profile.customerNo;
    customAddress.customerExternalDataBaseID = customer.profile.custom.externalDataBaseID;
    delete customAddress.addressForm;
    delete customAddress.action;
    delete customAddress.queryString;

    response = externalCustomers.externalCustomers({
        method: "POST", url: "addressBook", body: { id: UUID, customAddress: customAddress },
    });

    return response;
}

function deleteAddress(address) {

    var response = externalCustomers.externalCustomers({
        method: "DELETE", url: `addressBook/${address.custom.externalDataBaseID}`
    });

    return response;
}

function createShippingAndBillingAddress(UUID, orderModel) {

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

    return response;
}

function createAccountFromOrder(UUID, registrationData) {

    var body = {
        id: UUID,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        email: registrationData.email,
        password: registrationData.password,
        phone: registrationData.phone,
    }

    var response = externalCustomers.externalCustomers({
        method: "POST", url: "customers", body: body
    });

    return response;
}

function createAddressFromOrder(guestCustomerAddresses) {

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

        return responseAddress;
    })
}

module.exports = {
    createCustomer: createCustomer,
    editCustomer: editCustomer,
    editCustomerPassword: editCustomerPassword,
    updateAddress: updateAddress,
    createAddress: createAddress,
    deleteAddress: deleteAddress,
    createShippingAndBillingAddress: createShippingAndBillingAddress,
    createAddressFromOrder: createAddressFromOrder,
    createAccountFromOrder:createAccountFromOrder,
}
