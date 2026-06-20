import { ClientInfo } from "./proposalTypes";

const currentDateWithoffset = {
    toISOString: () => {
        return new Date().toISOString().split('T')[0];
    },
}

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
    proposalDate: currentDateWithoffset.toISOString(),
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