/**
 * BC Standard Real Estate Form Definitions
 * Each form is defined with sections and fields that get pre-filled
 * from listing data and rendered as editable HTML.
 */

export type FieldType = "text" | "date" | "textarea" | "checkbox" | "signature" | "select";

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  value?: string;
  options?: string[];
  placeholder?: string;
  width?: "full" | "half" | "third";
}

export interface FormSection {
  title: string;
  fields: FormField[];
}

export interface FormDefinition {
  key: string;
  title: string;
  subtitle: string;
  formNumber?: string;
  sections: FormSection[];
  footer?: string;
}

// Helper to get today's date formatted
function today(): string {
  return new Date().toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Build form definitions pre-filled with listing data
 */
export function getFormDefinition(
  formKey: string,
  listing: {
    propAddress?: string;
    listPrice?: string | number;
    mlsNumber?: string;
    propType?: string;
    agentName?: string;
    agentPhone?: string;
    agentEmail?: string;
    brokerage?: string;
    sellers?: { fullName?: string; phone?: string; email?: string }[];
  }
): FormDefinition | null {
  const seller = listing.sellers?.[0];
  const addr = listing.propAddress ?? "";
  const price = listing.listPrice
    ? Number(listing.listPrice).toLocaleString("en-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 0,
      })
    : "";

  const forms: Record<string, FormDefinition> = {
    dorts: {
      key: "dorts",
      title: "Disclosure of Representation in Trading Services",
      subtitle: "DORTS — British Columbia Real Estate Association",
      formNumber: "BCREA Form",
      sections: [
        {
          title: "Client Information",
          fields: [
            { id: "clientName", label: "Client Name", type: "text", value: seller?.fullName ?? "", width: "half" },
            { id: "clientPhone", label: "Phone", type: "text", value: seller?.phone ?? "", width: "half" },
            { id: "clientEmail", label: "Email", type: "text", value: seller?.email ?? "", width: "half" },
            { id: "clientAddress", label: "Client Address", type: "text", value: "", width: "half" },
          ],
        },
        {
          title: "Property Information",
          fields: [
            { id: "propAddress", label: "Property Address", type: "text", value: addr, width: "full" },
            { id: "listPrice", label: "List Price", type: "text", value: price, width: "half" },
            { id: "mlsNumber", label: "MLS Number", type: "text", value: listing.mlsNumber ?? "", width: "half" },
          ],
        },
        {
          title: "Representation Disclosure",
          fields: [
            { id: "repType", label: "Type of Representation", type: "text", value: "Seller's Agent", width: "half" },
            { id: "repDate", label: "Effective Date", type: "date", value: today(), width: "half" },
            { id: "repDetails", label: "Details of Representation Agreement", type: "textarea", value: "The licensee represents the seller in the sale of the above property. The licensee owes a duty of loyalty, confidentiality, and full disclosure to the client.", width: "full" },
          ],
        },
        {
          title: "Licensee Information",
          fields: [
            { id: "agentName", label: "Licensee Name", type: "text", value: listing.agentName ?? "", width: "half" },
            { id: "brokerage", label: "Brokerage", type: "text", value: listing.brokerage ?? "", width: "half" },
            { id: "agentPhone", label: "Licensee Phone", type: "text", value: listing.agentPhone ?? "", width: "half" },
            { id: "agentEmail", label: "Licensee Email", type: "text", value: listing.agentEmail ?? "", width: "half" },
          ],
        },
        {
          title: "Acknowledgement & Signatures",
          fields: [
            { id: "ackDate", label: "Date", type: "date", value: today(), width: "third" },
            { id: "clientSig", label: "Client Signature", type: "signature", width: "third" },
            { id: "agentSig", label: "Licensee Signature", type: "signature", width: "third" },
          ],
        },
      ],
      footer: "This form is used to disclose the nature of the agency relationship between the licensee and the client in accordance with the Real Estate Services Act of British Columbia.",
    },

    mlc: {
      key: "mlc",
      title: "Multiple Listing Contract",
      subtitle: "MLC — Exclusive Seller Listing Agreement",
      formNumber: "BCREA Form",
      sections: [
        {
          title: "Seller Information",
          fields: [
            { id: "sellerName", label: "Seller Name(s)", type: "text", value: seller?.fullName ?? "", width: "full" },
            { id: "sellerPhone", label: "Phone", type: "text", value: seller?.phone ?? "", width: "half" },
            { id: "sellerEmail", label: "Email", type: "text", value: seller?.email ?? "", width: "half" },
          ],
        },
        {
          title: "Property Details",
          fields: [
            { id: "propAddress", label: "Property Address", type: "text", value: addr, width: "full" },
            { id: "legalDesc", label: "Legal Description", type: "text", value: "", width: "full" },
            { id: "propType", label: "Property Type", type: "text", value: listing.propType ?? "Residential", width: "half" },
            { id: "listPrice", label: "List Price", type: "text", value: price, width: "half" },
          ],
        },
        {
          title: "Listing Terms",
          fields: [
            { id: "startDate", label: "Listing Start Date", type: "date", value: today(), width: "half" },
            { id: "endDate", label: "Listing Expiry Date", type: "date", value: "", placeholder: "Select expiry date", width: "half" },
            { id: "commRate", label: "Commission Rate", type: "text", value: "", placeholder: "e.g., 7% on first $100K, 2.5% on balance", width: "full" },
            { id: "buyerAgentComm", label: "Buyer Agent Commission", type: "text", value: "", placeholder: "e.g., 3.222%", width: "half" },
            { id: "mlsNumber", label: "MLS Number", type: "text", value: listing.mlsNumber ?? "", width: "half" },
          ],
        },
        {
          title: "Listing Agent",
          fields: [
            { id: "agentName", label: "Agent Name", type: "text", value: listing.agentName ?? "", width: "half" },
            { id: "brokerage", label: "Brokerage", type: "text", value: listing.brokerage ?? "", width: "half" },
          ],
        },
        {
          title: "Signatures",
          fields: [
            { id: "signDate", label: "Date", type: "date", value: today(), width: "third" },
            { id: "sellerSig", label: "Seller Signature", type: "signature", width: "third" },
            { id: "agentSig", label: "Agent Signature", type: "signature", width: "third" },
          ],
        },
      ],
    },

    pds: {
      key: "pds",
      title: "Property Disclosure Statement",
      subtitle: "PDS — Seller's Disclosure of Property Condition",
      formNumber: "BCREA Form",
      sections: [
        {
          title: "Property Identification",
          fields: [
            { id: "propAddress", label: "Property Address", type: "text", value: addr, width: "full" },
            { id: "sellerName", label: "Seller Name", type: "text", value: seller?.fullName ?? "", width: "half" },
            { id: "pdsDate", label: "Date of Disclosure", type: "date", value: today(), width: "half" },
          ],
        },
        {
          title: "Structure",
          fields: [
            { id: "yearBuilt", label: "Year Built (approx.)", type: "text", value: "", width: "half" },
            { id: "foundation", label: "Foundation Type", type: "text", value: "", placeholder: "Concrete, crawlspace, slab, etc.", width: "half" },
            { id: "roofAge", label: "Roof Age / Condition", type: "text", value: "", width: "half" },
            { id: "heating", label: "Heating System", type: "text", value: "", placeholder: "Forced air, baseboard, heat pump, etc.", width: "half" },
            { id: "structIssues", label: "Known Structural Issues", type: "textarea", value: "", placeholder: "Describe any known foundation cracks, settling, water damage, etc.", width: "full" },
          ],
        },
        {
          title: "Systems & Services",
          fields: [
            { id: "plumbing", label: "Plumbing", type: "text", value: "", placeholder: "Copper, PEX, etc. Note any known issues.", width: "half" },
            { id: "electrical", label: "Electrical", type: "text", value: "", placeholder: "Panel size, known issues", width: "half" },
            { id: "waterSource", label: "Water Source", type: "text", value: "Municipal", width: "half" },
            { id: "sewerType", label: "Sewer / Septic", type: "text", value: "Municipal Sewer", width: "half" },
          ],
        },
        {
          title: "Environmental & Legal",
          fields: [
            { id: "envIssues", label: "Environmental Concerns", type: "textarea", value: "", placeholder: "Asbestos, lead paint, mould, underground storage tanks, flood plain, etc.", width: "full" },
            { id: "legalIssues", label: "Legal / Title Issues", type: "textarea", value: "", placeholder: "Easements, encroachments, bylaws, pending litigation, etc.", width: "full" },
            { id: "insurance", label: "Insurance Claims", type: "textarea", value: "", placeholder: "Describe any insurance claims in the past 5 years.", width: "full" },
          ],
        },
        {
          title: "Seller Declaration",
          fields: [
            { id: "declarationDate", label: "Date", type: "date", value: today(), width: "third" },
            { id: "sellerSig", label: "Seller Signature", type: "signature", width: "third" },
            { id: "witnessSig", label: "Witness Signature", type: "signature", width: "third" },
          ],
        },
      ],
      footer: "The seller declares that the information provided above is true and correct to the best of their knowledge. The seller agrees to indemnify the listing agent and brokerage against any claims arising from incorrect or incomplete disclosure.",
    },

    fintrac: {
      key: "fintrac",
      title: "FINTRAC Individual Identification Information Record",
      subtitle: "Financial Transactions and Reports Analysis Centre of Canada",
      formNumber: "FINTRAC — Client ID",
      sections: [
        {
          title: "Person Identified",
          fields: [
            { id: "fullName", label: "Full Legal Name", type: "text", value: seller?.fullName ?? "", width: "half" },
            { id: "dob", label: "Date of Birth", type: "date", value: "", width: "half" },
            { id: "address", label: "Current Address", type: "text", value: "", width: "full" },
            { id: "phone", label: "Phone", type: "text", value: seller?.phone ?? "", width: "half" },
            { id: "email", label: "Email", type: "text", value: seller?.email ?? "", width: "half" },
            { id: "occupation", label: "Occupation", type: "text", value: "", width: "half" },
            { id: "employer", label: "Employer", type: "text", value: "", width: "half" },
          ],
        },
        {
          title: "Identification Document",
          fields: [
            { id: "idType", label: "ID Type", type: "text", value: "", placeholder: "Driver's License, Passport, etc.", width: "half" },
            { id: "idNumber", label: "ID Number", type: "text", value: "", width: "half" },
            { id: "idExpiry", label: "Expiry Date", type: "date", value: "", width: "half" },
            { id: "idIssuer", label: "Issuing Authority / Country", type: "text", value: "", placeholder: "e.g., Province of BC, Canada", width: "half" },
          ],
        },
        {
          title: "Transaction Information",
          fields: [
            { id: "propAddress", label: "Property Address", type: "text", value: addr, width: "full" },
            { id: "transType", label: "Transaction Type", type: "text", value: "Sale of Real Estate", width: "half" },
            { id: "transAmount", label: "Transaction Amount", type: "text", value: price, width: "half" },
          ],
        },
        {
          title: "Third Party Determination",
          fields: [
            { id: "thirdParty", label: "Is a third party involved?", type: "text", value: "No", width: "half" },
            { id: "thirdPartyDetails", label: "If yes, provide details", type: "textarea", value: "", width: "full" },
          ],
        },
        {
          title: "Verification",
          fields: [
            { id: "verifiedBy", label: "Verified By (Agent)", type: "text", value: listing.agentName ?? "", width: "half" },
            { id: "verifyDate", label: "Date of Verification", type: "date", value: today(), width: "half" },
            { id: "agentSig", label: "Agent Signature", type: "signature", width: "half" },
          ],
        },
      ],
      footer: "This record must be kept for a minimum of 5 years following the completion of the transaction, as required by the Proceeds of Crime (Money Laundering) and Terrorist Financing Act.",
    },

    privacy: {
      key: "privacy",
      title: "Privacy Notice & Consent",
      subtitle: "Personal Information Protection Act (BC)",
      sections: [
        {
          title: "Client Information",
          fields: [
            { id: "clientName", label: "Client Name", type: "text", value: seller?.fullName ?? "", width: "half" },
            { id: "propAddress", label: "Property Address", type: "text", value: addr, width: "half" },
          ],
        },
        {
          title: "Consent",
          fields: [
            { id: "consent", label: "Privacy Consent Details", type: "textarea", value: "I consent to the collection, use, and disclosure of my personal information by the brokerage and its licensees for the purpose of facilitating the real estate transaction, including but not limited to: listing the property on MLS, marketing, communication with potential buyers, and compliance with legal and regulatory requirements.", width: "full" },
          ],
        },
        {
          title: "Signatures",
          fields: [
            { id: "consentDate", label: "Date", type: "date", value: today(), width: "third" },
            { id: "clientSig", label: "Client Signature", type: "signature", width: "third" },
            { id: "agentSig", label: "Agent Signature", type: "signature", width: "third" },
          ],
        },
      ],
    },

    c3: {
      key: "c3",
      title: "Working with a REALTOR\u00AE",
      subtitle: "C3 — Disclosure to Unrepresented Parties",
      sections: [
        {
          title: "Party Information",
          fields: [
            { id: "partyName", label: "Name of Party", type: "text", value: "", width: "half" },
            { id: "partyRole", label: "Party Role", type: "text", value: "", placeholder: "Buyer / Seller", width: "half" },
            { id: "propAddress", label: "Property Address", type: "text", value: addr, width: "full" },
          ],
        },
        {
          title: "Disclosure",
          fields: [
            { id: "disclosure", label: "Disclosure Statement", type: "textarea", value: "This notice is to inform you that the licensee named below represents the other party in this transaction. The licensee does not represent you and does not owe you the duties of a client. You may wish to seek independent advice or representation.", width: "full" },
          ],
        },
        {
          title: "Licensee & Signatures",
          fields: [
            { id: "agentName", label: "Licensee Name", type: "text", value: listing.agentName ?? "", width: "half" },
            { id: "brokerage", label: "Brokerage", type: "text", value: listing.brokerage ?? "", width: "half" },
            { id: "discDate", label: "Date", type: "date", value: today(), width: "third" },
            { id: "partySig", label: "Party Signature", type: "signature", width: "third" },
            { id: "agentSig", label: "Agent Signature", type: "signature", width: "third" },
          ],
        },
      ],
    },

    drup: {
      key: "drup",
      title: "Disclosure of Remuneration",
      subtitle: "DRUP — Disclosure of Referral Fees & Payments",
      sections: [
        {
          title: "Transaction Details",
          fields: [
            { id: "propAddress", label: "Property Address", type: "text", value: addr, width: "full" },
            { id: "clientName", label: "Client Name", type: "text", value: seller?.fullName ?? "", width: "half" },
            { id: "transDate", label: "Date", type: "date", value: today(), width: "half" },
          ],
        },
        {
          title: "Remuneration Disclosure",
          fields: [
            { id: "commSource", label: "Source of Remuneration", type: "text", value: "", placeholder: "e.g., Seller, Listing Brokerage", width: "half" },
            { id: "commAmount", label: "Amount / Percentage", type: "text", value: "", placeholder: "e.g., 3.222% of sale price", width: "half" },
            { id: "referralFee", label: "Referral Fee (if any)", type: "text", value: "None", width: "half" },
            { id: "referralTo", label: "Referral Fee Paid To", type: "text", value: "N/A", width: "half" },
            { id: "otherComp", label: "Other Compensation", type: "textarea", value: "", placeholder: "Describe any other compensation or benefits", width: "full" },
          ],
        },
        {
          title: "Signatures",
          fields: [
            { id: "ackDate", label: "Date", type: "date", value: today(), width: "third" },
            { id: "clientSig", label: "Client Signature", type: "signature", width: "third" },
            { id: "agentSig", label: "Agent Signature", type: "signature", width: "third" },
          ],
        },
      ],
    },

    mls: {
      key: "mls",
      title: "MLS Listing Input Sheet",
      subtitle: "Multiple Listing Service Data Entry",
      sections: [
        {
          title: "Basic Information",
          fields: [
            { id: "mlsNumber", label: "MLS Number", type: "text", value: listing.mlsNumber ?? "", width: "half" },
            { id: "listPrice", label: "List Price", type: "text", value: price, width: "half" },
            { id: "propAddress", label: "Address", type: "text", value: addr, width: "full" },
            { id: "propType", label: "Property Type", type: "text", value: listing.propType ?? "", width: "half" },
            { id: "style", label: "Style", type: "text", value: "", placeholder: "2-Storey, Rancher, Split-Level, etc.", width: "half" },
          ],
        },
        {
          title: "Property Details",
          fields: [
            { id: "bedrooms", label: "Bedrooms", type: "text", value: "", width: "third" },
            { id: "bathrooms", label: "Bathrooms", type: "text", value: "", width: "third" },
            { id: "sqft", label: "Sq Ft (approx)", type: "text", value: "", width: "third" },
            { id: "lotSize", label: "Lot Size", type: "text", value: "", width: "half" },
            { id: "yearBuilt", label: "Year Built", type: "text", value: "", width: "half" },
            { id: "parking", label: "Parking", type: "text", value: "", placeholder: "Garage, carport, etc.", width: "half" },
            { id: "heating", label: "Heating", type: "text", value: "", width: "half" },
          ],
        },
        {
          title: "Description",
          fields: [
            { id: "publicRemarks", label: "Public Remarks", type: "textarea", value: "", placeholder: "Marketing description for MLS (max 500 characters)", width: "full" },
            { id: "agentRemarks", label: "Agent Remarks (Private)", type: "textarea", value: "", placeholder: "Showing instructions, lockbox info, etc.", width: "full" },
          ],
        },
        {
          title: "Listing Agent",
          fields: [
            { id: "agentName", label: "Agent", type: "text", value: listing.agentName ?? "", width: "half" },
            { id: "brokerage", label: "Brokerage", type: "text", value: listing.brokerage ?? "", width: "half" },
          ],
        },
      ],
    },

    mktauth: {
      key: "mktauth",
      title: "Marketing Authorization",
      subtitle: "Seller Authorization for Marketing Activities",
      sections: [
        {
          title: "Property & Seller",
          fields: [
            { id: "sellerName", label: "Seller Name", type: "text", value: seller?.fullName ?? "", width: "half" },
            { id: "propAddress", label: "Property Address", type: "text", value: addr, width: "half" },
          ],
        },
        {
          title: "Authorized Activities",
          fields: [
            { id: "activities", label: "The seller authorizes the following marketing activities", type: "textarea", value: "- MLS listing with photos and virtual tour\n- For Sale signage on property\n- Open houses (with prior notice)\n- Online advertising (brokerage website, social media)\n- Print advertising (brochures, flyers)\n- Email marketing to buyer agents\n- Professional photography and videography", width: "full" },
          ],
        },
        {
          title: "Signatures",
          fields: [
            { id: "authDate", label: "Date", type: "date", value: today(), width: "third" },
            { id: "sellerSig", label: "Seller Signature", type: "signature", width: "third" },
            { id: "agentSig", label: "Agent Signature", type: "signature", width: "third" },
          ],
        },
      ],
    },

    agency: {
      key: "agency",
      title: "Agency Relationships Disclosure",
      subtitle: "Disclosure of Agency Relationships in Real Estate",
      sections: [
        {
          title: "Parties",
          fields: [
            { id: "clientName", label: "Client Name", type: "text", value: seller?.fullName ?? "", width: "half" },
            { id: "propAddress", label: "Property Address", type: "text", value: addr, width: "half" },
          ],
        },
        {
          title: "Agency Relationship",
          fields: [
            { id: "agencyType", label: "Type of Agency", type: "text", value: "Seller Agency", placeholder: "Seller Agency, Buyer Agency, Dual Agency, etc.", width: "half" },
            { id: "agentName", label: "Agent Name", type: "text", value: listing.agentName ?? "", width: "half" },
            { id: "agencyDesc", label: "Description of Duties", type: "textarea", value: "As the seller's agent, the licensee owes the following duties: loyalty, obedience, disclosure, confidentiality, reasonable care, and full accounting. The agent will act in the best interests of the seller at all times.", width: "full" },
          ],
        },
        {
          title: "Acknowledgement",
          fields: [
            { id: "ackDate", label: "Date", type: "date", value: today(), width: "third" },
            { id: "clientSig", label: "Client Signature", type: "signature", width: "third" },
            { id: "agentSig", label: "Agent Signature", type: "signature", width: "third" },
          ],
        },
      ],
    },

    c3conf: {
      key: "c3conf",
      title: "Confirmation of Representation",
      subtitle: "C3 Confirmation — Agency Confirmation",
      sections: [
        {
          title: "Transaction Details",
          fields: [
            { id: "propAddress", label: "Property Address", type: "text", value: addr, width: "full" },
            { id: "sellerName", label: "Seller", type: "text", value: seller?.fullName ?? "", width: "half" },
            { id: "buyerName", label: "Buyer", type: "text", value: "", width: "half" },
          ],
        },
        {
          title: "Representation Confirmation",
          fields: [
            { id: "sellerAgent", label: "Seller's Agent", type: "text", value: listing.agentName ?? "", width: "half" },
            { id: "sellerBrokerage", label: "Seller's Brokerage", type: "text", value: listing.brokerage ?? "", width: "half" },
            { id: "buyerAgent", label: "Buyer's Agent", type: "text", value: "", width: "half" },
            { id: "buyerBrokerage", label: "Buyer's Brokerage", type: "text", value: "", width: "half" },
          ],
        },
        {
          title: "Signatures",
          fields: [
            { id: "confDate", label: "Date", type: "date", value: today(), width: "third" },
            { id: "sellerSig", label: "Seller Signature", type: "signature", width: "third" },
            { id: "buyerSig", label: "Buyer Signature", type: "signature", width: "third" },
          ],
        },
      ],
    },

    fairhsg: {
      key: "fairhsg",
      title: "Fair Housing Declaration",
      subtitle: "Equal Opportunity in Housing",
      sections: [
        {
          title: "Declaration",
          fields: [
            { id: "declaration", label: "Fair Housing Statement", type: "textarea", value: "It is the policy of this brokerage to provide equal professional service without regard to the race, colour, religion, sex, handicap, familial status, national origin, sexual orientation, gender identity, or age of any prospective client, customer, or resident.\n\nThe Canadian Human Rights Act and the BC Human Rights Code prohibit discrimination in housing. All parties to this transaction acknowledge their commitment to fair housing principles.", width: "full" },
          ],
        },
        {
          title: "Transaction Details",
          fields: [
            { id: "propAddress", label: "Property Address", type: "text", value: addr, width: "full" },
            { id: "agentName", label: "Agent", type: "text", value: listing.agentName ?? "", width: "half" },
            { id: "brokerage", label: "Brokerage", type: "text", value: listing.brokerage ?? "", width: "half" },
          ],
        },
        {
          title: "Acknowledgement",
          fields: [
            { id: "ackDate", label: "Date", type: "date", value: today(), width: "third" },
            { id: "clientSig", label: "Client Signature", type: "signature", width: "third" },
            { id: "agentSig", label: "Agent Signature", type: "signature", width: "third" },
          ],
        },
      ],
    },
    receipt_of_funds: {
      key: "receipt_of_funds",
      title: "FINTRAC Receipt of Funds Record",
      subtitle: "Proceeds of Crime (Money Laundering) and Terrorist Financing Act",
      sections: [
        {
          title: "Transaction Details",
          fields: [
            { id: "transactionDate", label: "Date Funds Received", type: "date", value: today(), width: "third" },
            { id: "amount", label: "Amount Received ($CAD)", type: "text", value: listing.listPrice ? String(listing.listPrice) : "", width: "third" },
            { id: "currency", label: "Currency", type: "select", options: ["CAD", "USD", "Other"], value: "CAD", width: "third" },
            { id: "method", label: "Method of Receipt", type: "select", options: ["Wire Transfer", "Bank Draft", "Certified Cheque", "Personal Cheque", "Cash", "Electronic Funds Transfer", "Other"], value: "Wire Transfer", width: "half" },
            { id: "description", label: "Description/Purpose", type: "text", value: "Deposit on purchase of property", width: "half" },
            { id: "largeCash", label: "Cash amount ≥ $10,000?", type: "select", options: ["No", "Yes — Large Cash Transaction Report required"], value: "No", width: "full" },
          ],
        },
        {
          title: "Payor Information",
          fields: [
            { id: "payorName", label: "Full Name of Payor", type: "text", value: "", width: "half" },
            { id: "payorAddress", label: "Address", type: "text", value: "", width: "half" },
            { id: "payorPhone", label: "Phone", type: "text", value: "", width: "third" },
            { id: "payorRelationship", label: "Relationship to Transaction", type: "select", options: ["Buyer", "Buyer's Agent", "Third Party", "Other"], value: "Buyer", width: "third" },
            { id: "onBehalfOf", label: "On Behalf Of (if different)", type: "text", value: "", width: "third" },
          ],
        },
        {
          title: "Deposit Account",
          fields: [
            { id: "institution", label: "Financial Institution", type: "text", value: "", width: "half" },
            { id: "accountType", label: "Account Type", type: "select", options: ["Trust Account", "Client Account", "Other"], value: "Trust Account", width: "half" },
            { id: "accountNumber", label: "Account # (last 4 digits)", type: "text", value: "", width: "third" },
            { id: "depositDate", label: "Date Deposited", type: "date", value: today(), width: "third" },
            { id: "confirmationNumber", label: "Confirmation/Reference #", type: "text", value: "", width: "third" },
          ],
        },
        {
          title: "Verification",
          fields: [
            { id: "propAddress", label: "Property Address", type: "text", value: addr, width: "full" },
            { id: "agentName", label: "Receiving Agent", type: "text", value: listing.agentName ?? "", width: "half" },
            { id: "verifyDate", label: "Date", type: "date", value: today(), width: "half" },
            { id: "agentSig", label: "Agent Signature", type: "signature", width: "half" },
          ],
        },
      ],
      footer: "This record must be kept for a minimum of 5 years. If cash received is $10,000 or more, a Large Cash Transaction Report must also be filed with FINTRAC within 15 calendar days.",
    },
  };

  return forms[formKey] ?? null;
}
