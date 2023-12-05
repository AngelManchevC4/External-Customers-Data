const base = module.superModule;
var externalCustomers = require("~/cartridge/scripts/services/externalCustomers");

/**
 * Copy information from address object and save it in the system
 * @param {dw.customer.CustomerAddress} newAddress - newAddress to save information into
 * @param {*} address - Address to copy from
 */
base.updateAddressFields = function (newAddress, address) {
    newAddress.setAddress1(address.address1 || "");
    newAddress.setAddress2(address.address2 || "");
    newAddress.setCity(address.city || "");
    newAddress.setFirstName(address.firstName || "");
    newAddress.setLastName(address.lastName || "");
    newAddress.setPhone(address.phone || "");
    newAddress.setPostalCode(address.postalCode || "");

    if (address.states && address.states.stateCode) {
        newAddress.setStateCode(address.states.stateCode);
    }

    if (address.country) {
        newAddress.setCountryCode(address.country);
    }

    newAddress.setJobTitle(address.jobTitle || "");
    newAddress.setPostBox(address.postBox || "");
    newAddress.setSalutation(address.salutation || "");
    newAddress.setSecondName(address.secondName || "");
    newAddress.setCompanyName(address.companyName || "");
    newAddress.setSuffix(address.suffix || "");
    newAddress.setSuite(address.suite || "");
    newAddress.setTitle(address.title || "");

    newAddress.custom.externalDataBaseID = (address.externalDataBaseID || '');
}

module.exports = base;