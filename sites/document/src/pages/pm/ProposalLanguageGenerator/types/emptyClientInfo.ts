import { ClientInfo, getCurrentLocalDateInputValue } from "./proposalTypes";

export const EMPTY_CLIENT: ClientInfo = {
    clientName: "",
    contactName: "",
    clientAddressLine1: "",
    clientCity: "",
    clientState: "",
    clientZip: "",
    phone: "",
    email: "",
    projectNumber: "",
    projectName: "",
    proposalDate: getCurrentLocalDateInputValue(),
    address: "",
    approxAddress: false,
    jurisdiction: "",
    isJurisdictionUnincorporated: false,
    county: "",
    state: "",
    zipCode: "",
    parcelIdList: "",
    whitePointSigner: "",
    whitePointTitle: "",
    projectCost: "",
    projectRetainer: ""
};