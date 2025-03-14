import Joi from 'joi';

// Define the schema for the JSON structure
const orderSchema = Joi.object({
  order: Joi.object({
    note: Joi.string().required(),
    documentCurrencyCode: Joi.string().required(),
    accountingCostCode: Joi.string().required(),
    validityEndDate: Joi.string().isoDate().required(),
    quotationDocumentReferenceId: Joi.string().required(),
    orderDocumentReferenceId: Joi.string().required(),
    originatorDocumentReferenceId: Joi.string().required(),
    contractType: Joi.string().required(),
    contractId: Joi.number().integer().required()
  }).required(),

  buyer: Joi.object({
    buyerId: Joi.string().length(13).required(),
    name: Joi.string().required(),
    postalAddress: Joi.object({
      postBox: Joi.string().required(),
      streetName: Joi.string().required(),
      additionalStreetName: Joi.string().optional(),
      buildingNumber: Joi.string().required(),
      department: Joi.string().required(),
      cityName: Joi.string().required(),
      postalZone: Joi.string().required(),
      countrySubentity: Joi.string().required(),
      countryCode: Joi.string().length(2).required()
    }).required(),
    taxScheme: Joi.string().valid('VAT').required(),
    contact: Joi.object({
      telephone: Joi.string().required(),
      telefax: Joi.string().optional(),
      email: Joi.string().email().required()
    }).required(),
    person: Joi.object({
      firstName: Joi.string().required(),
      middleName: Joi.string().optional(),
      familyName: Joi.string().required(),
      jobTitle: Joi.string().required()
    }).required(),
    deliveryContact: Joi.object({
      name: Joi.string().required(),
      telephone: Joi.string().required(),
      telefax: Joi.string().optional(),
      email: Joi.string().email().required()
    }).required()
  }).required(),

  seller: Joi.object({
    sellerId: Joi.string().length(13).required(),
    name: Joi.string().required(),
    postalAddress: Joi.object({
      postBox: Joi.string().required(),
      streetName: Joi.string().required(),
      additionalStreetName: Joi.string().optional(),
      buildingNumber: Joi.string().required(),
      department: Joi.string().required(),
      cityName: Joi.string().required(),
      postalZone: Joi.string().required(),
      countrySubentity: Joi.string().required(),
      countryCode: Joi.string().length(2).required()
    }).required(),
    contact: Joi.object({
      telephone: Joi.string().required(),
      telefax: Joi.string().optional(),
      email: Joi.string().email().required()
    }).required(),
    person: Joi.object({
      firstName: Joi.string().required(),
      middleName: Joi.string().optional(),
      familyName: Joi.string().required(),
      jobTitle: Joi.string().required()
    }).required()
  }).required(),

  delivery: Joi.object({
    deliveryAddress: Joi.object({
      postBox: Joi.string().required(),
      streetName: Joi.string().required(),
      additionalStreetName: Joi.string().optional(),
      buildingName: Joi.string().required(),
      buildingNumber: Joi.string().required(),
      department: Joi.string().required(),
      cityName: Joi.string().required(),
      postalZone: Joi.string().required(),
      countrySubentity: Joi.string().required(),
      countryCode: Joi.string().length(2).required()
    }).required(),
    requestedDeliveryPeriod: Joi.object({
      startDate: Joi.string().isoDate().required(),
      endDate: Joi.string().isoDate().required()
    }).required(),
    deliveryParty: Joi.object({
      deliveryPartyId: Joi.number().integer().required(),
      name: Joi.string().required(),
      telephone: Joi.string().required(),
      email: Joi.string().email().required(),
      telefax: Joi.string().optional()
    }).required()
  }).required(),

  monetaryTotal: Joi.object({
    lineExtensionAmount: Joi.number().required(),
    taxTotal: Joi.number().required(),
    allowanceCharge: Joi.array().items(Joi.object({
      chargeIndicator: Joi.boolean().required(),
      allowanceChargeReason: Joi.string().required(),
      amount: Joi.number().required()
    })).required()
  }).required(),

  orderLines: Joi.array().items(Joi.object({
    note: Joi.string().required(),
    lineItem: Joi.object({
      quantity: Joi.number().required(),
      totalTaxAmount: Joi.number().required(),
      price: Joi.number().required(),
      baseQuantity: Joi.object({
        quantity: Joi.number().required(),
        unitCode: Joi.string().required()
      }).required(),
      item: Joi.object({
        itemId: Joi.number().required(),
        description: Joi.string().required(),
        name: Joi.string().required(),
        properties: Joi.object().pattern(Joi.string(), Joi.string()).optional()
      }).required()
    }).required()
  })).required(),

  additionalDocumentReference: Joi.array().items(Joi.object({
    documentType: Joi.string().required(),
    attachment: Joi.object({
      uri: Joi.string().uri().optional(),
      binaryObject: Joi.string().base64().optional(),
      mimeCode: Joi.string().optional()
    }).required()
  })).optional()
});

export default orderSchema;
