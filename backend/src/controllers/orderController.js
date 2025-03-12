import createHttpError from 'http-errors';
import supabase from '../config/db.js';
import { create } from 'xmlbuilder2';

export const orderFormCreate = async (orderData) => {
  try {
    // Generate a unique order ID
    const orderId = Math.floor(Math.random() * 1000000);

    await insertOrderIntoDatabase(orderId, orderData); 

    return { orderId: orderId };

  } catch (error) {
    throw createHttpError(500, 'Failed to create order. Please try again.');
  }
};

const insertOrderIntoDatabase = async (orderId, orderData) => {
  const { xml, totalCost } = generateXML(orderData, orderId);

  // Insert order into the database
  const { error: orderError } = await supabase
  .from('order')
  .insert([{ orderId, xml }]);

  if (orderError) {
    throw createHttpError(500, `Failed to insert order: ${orderError.message}`);
  }

  // Insert registered order into the database
  const { error: registeredOrderError } = await supabase
  .from('registeredOrder')
  .insert([{ orderId, cost: totalCost }]);

  if (registeredOrderError) {
    throw createHttpError(500, `Failed to insert registered order: ${registeredOrderError.message}`);
  }

  const productInsertPromises = orderData.orderLines.map(async (line) => {
    const productId = line.lineItem.item.itemId;

    // Insert product into the database
    const { error: productError } = await supabase
      .from('product')
      .upsert([{ 
        productId,
        sellerItemId: orderData.seller.sellerId,
        cost: line.lineItem.price,
        description: line.lineItem.item.description,
        name: line.lineItem.item.name,
      }]);

    if (productError) {
      throw createHttpError(500, `Failed to insert product: ${productError.message}`);
    }

    // Insert relationship between order and product into the database
    const { error: orderProductError } = await supabase
      .from('registeredOrderProduct')
      .insert([{ 
        orderId,
        productId,
        quantity: line.lineItem.quantity,
      }]);

    if (orderProductError) {
      throw createHttpError(500, `Failed to insert order-product relationship: ${orderProductError.message}`);
    }
  });

  await Promise.all(productInsertPromises);
};

const generateXML = (orderData, orderId) => {
  const now = new Date();
  const issueDate = now.toISOString().split("T")[0];
  const issueTime = now.toTimeString().split(" ")[0];
    
  let totalAllowance = 0;
  let totalCharge = 0;

  const xml = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('Order', {
        'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Order-2',
        'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
        'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
    })
      .ele('cbc:UBLVersionID').txt('2.1').up()
      .ele('cbc:CustomizationID').txt('urn:www.cenbii.eu:transaction:biicoretrdm001:ver1.0').up()
      .ele('cbc:ProfileID', { schemeAgencyID: 'BII', schemeID: 'Profile' }).txt('urn:www.cenbii.eu:profile:BII01:ver1.0').up()
      .ele('cbc:ID').txt(orderId).up()
      .ele('cbc:IssueDate').txt(issueDate).up()
      .ele('cbc:IssueTime').txt(issueTime).up()
      .ele('cbc:Note').txt(orderData.order.note).up()
      .ele('cbc:DocumentCurrencyCode').txt(orderData.order.documentCurrencyCode).up()
      .ele('cbc:AccountingCostCode').txt(orderData.order.accountingCostCode).up()
      .ele('cac:ValidityPeriod')
        .ele('cbc:EndDate').txt(orderData.order.validityEndDate).up()
      .up()
      .ele('cac:QuotationDocumentReference')
        .ele('cbc:ID').txt(orderData.order.quotationDocumentReferenceId).up()
      .up()
      .ele('cac:OrderDocumentReference')
        .ele('cbc:ID').txt(orderData.order.orderDocumentReferenceId).up()
      .up()
      .ele('cac:OriginatorDocumentReference')
        .ele('cbc:ID').txt(orderData.order.originatorDocumentReferenceId).up()
      .up();

  // Additional Document Reference
  if (orderData.additionalDocumentReference && orderData.additionalDocumentReference.length > 0) {
    orderData.additionalDocumentReference.forEach((doc, index) => {
      let docRef = xml.ele('cac:AdditionalDocumentReference')
          .ele('cbc:ID').txt("doc" + (index + 1)).up()
          .ele('cbc:DocumentType').txt(doc.documentType).up();

      if (doc.attachment) {
          let attachment = docRef.ele('cac:Attachment');
          
          if (doc.attachment.uri) {
              // Handle external reference
              attachment.ele('cac:ExternalReference')
                  .ele('cbc:URI').txt(doc.attachment.uri).up()
              .up();
          } else if (doc.attachment.binaryObject && doc.attachment.mimeCode) {
              // Handle binary object
              attachment.ele('cbc:EmbeddedDocumentBinaryObject')
                  .txt(doc.attachment.binaryObject)
                  .att('mimeCode', doc.attachment.mimeCode)
              .up();
          }
      }

      docRef.up();
    });
  }

  // Contract Section
  xml.ele('cac:Contract')
    .ele('cbc:ID').txt(orderData.order.contractId).up()
    .ele('cbc:ContractType').txt(orderData.order.contractType).up()
  .up()

  // Buyer Party
  .ele('cac:BuyerCustomerParty')
    .ele('cac:Party')
        .ele('cbc:EndpointID', { schemeAgencyID: '9', schemeID: 'GLN' }).txt(orderData.buyer.buyerId).up()
        .ele('cac:PartyIdentification')
          .ele('cbc:ID', { schemeAgencyID: '9', schemeID: 'GLN' }).txt(orderData.buyer.buyerId).up()
        .up()
        .ele('cac:PartyName')
          .ele('cbc:Name').txt(orderData.buyer.name).up()
        .up()
        .ele('cac:PostalAddress')
          .ele('cbc:Postbox').txt(orderData.buyer.postalAddress.postBox).up()
          .ele('cbc:StreetName').txt(orderData.buyer.postalAddress.streetName).up()
          .ele('cbc:AdditionalStreetName').txt(orderData.buyer.postalAddress.additionalStreetName).up()
          .ele('cbc:BuildingNumber').txt(orderData.buyer.postalAddress.buildingNumber).up()
          .ele('cbc:Department').txt(orderData.buyer.postalAddress.department).up()
          .ele('cbc:CityName').txt(orderData.buyer.postalAddress.cityName).up()
          .ele('cbc:PostalZone').txt(orderData.buyer.postalAddress.postalZone).up()
          .ele('cbc:CountrySubentity').txt(orderData.buyer.postalAddress.countrySubentity).up()
          .ele('cbc:Country')
            .ele('cbc:IdentificationCode').txt(orderData.buyer.postalAddress.countryCode).up()
          .up()
        .up()
        .ele('cac:PartyTaxScheme')
          .ele('cac:RegistrationAddress')
            .ele('cbc:CityName').txt(orderData.buyer.postalAddress.cityName).up()
            .ele('cac:Country')
              .ele('cbc:IdentificationCode').txt(orderData.buyer.postalAddress.countryCode).up()
            .up()
          .up()
          .ele('cbc:TaxScheme', { schemeID: 'UN/ECE 515', schemeAgencyID: '6' })
            .ele('cbc:ID').txt(orderData.buyer.taxScheme).up()
          .up()
        .up()
        .ele('cac:PartyLegalEntity')
          .ele('cbc:RegistrationName').txt(orderData.buyer.name).up()
          .ele('cbc:CompanyID', { schemeID: 'SE:ORGNR' }).txt(orderData.buyer.buyerId).up()
          .ele('cac:RegistrationAddress')
            .ele('cbc:CityName').txt(orderData.buyer.postalAddress.cityName).up()
            .ele('cbc:CountrySubentity').txt(orderData.buyer.postalAddress.countrySubentity).up()
            .ele('cac:Country')
              .ele('cbc:IdentificationCode').txt(orderData.buyer.postalAddress.countryCode).up()
            .up()
          .up()
        .up()
        .ele('cac:Contact')
          .ele('cbc:Telephone').txt(orderData.buyer.contact.telephone).up()
          .ele('cbc:Telefax').txt(orderData.buyer.contact.telefax).up()
          .ele('cbc:ElectronicMail').txt(orderData.buyer.contact.email).up()
        .up()
        .ele('cac:Person')
          .ele('cbc:FirstName').txt(orderData.buyer.person.firstName).up()
          .ele('cbc:FamilyName').txt(orderData.buyer.person.familyName).up()
          .ele('cbc:MiddleName').txt(orderData.buyer.person.middleName).up()
          .ele('cbc:JobTitle').txt(orderData.buyer.person.jobTitle).up()
        .up()
      .up()
      .ele('cac:DeliveryContact')
        .ele('cbc:Name').txt(orderData.buyer.deliveryContact.name).up()
        .ele('cbc:Telephone').txt(orderData.buyer.deliveryContact.telephone).up()
        .ele('cbc:Telefax').txt(orderData.buyer.deliveryContact.telefax).up()
        .ele('cbc:ElectronicMail').txt(orderData.buyer.deliveryContact.email).up()
      .up()
  .up()

  // Seller Party
  .ele('cac:SellerSupplierParty')
    .ele('cac:Party')
      .ele('cbc:EndpointID', { schemeAgencyID: '9', schemeID: 'GLN' }).txt(orderData.seller.sellerId).up()
      .ele('cac:PartyIdentification')
        .ele('cbc:ID').txt(orderData.seller.sellerId).up()
      .up()
      .ele('cac:PartyName')
        .ele('cbc:Name').txt(orderData.seller.name).up()
      .up()
      .ele('cac:PostalAddress')
        .ele('cbc:Postbox').txt(orderData.seller.postalAddress.postBox).up()
        .ele('cbc:StreetName').txt(orderData.seller.postalAddress.streetName).up()
        .ele('cbc:AdditionalStreetName').txt(orderData.seller.postalAddress.additionalStreetName).up()
        .ele('cbc:BuildingNumber').txt(orderData.seller.postalAddress.buildingNumber).up()
        .ele('cbc:Department').txt(orderData.seller.postalAddress.department).up()
        .ele('cbc:CityName').txt(orderData.seller.postalAddress.cityName).up()
        .ele('cbc:PostalZone').txt(orderData.seller.postalAddress.postalZone).up()
        .ele('cbc:CountrySubentity').txt(orderData.seller.postalAddress.countrySubentity).up()
        .ele('cac:Country')
          .ele('cbc:IdentificationCode').txt(orderData.seller.postalAddress.countryCode).up()
        .up()
      .up()
      .ele('cac:PartyLegalEntity')
        .ele('cbc:RegistrationName').txt(orderData.seller.name).up()
        .ele('cbc:CompanyID', { schemeID: 'SE:ORGNR' }).txt(orderData.seller.sellerId).up()
        .ele('cac:RegistrationAddress')
          .ele('cbc:CityName').txt(orderData.seller.postalAddress.cityName).up()
          .ele('cbc:CountrySubentity').txt(orderData.seller.postalAddress.countrySubentity).up()
          .ele('cac:Country')
            .ele('cbc:IdentificationCode').txt(orderData.seller.postalAddress.countryCode).up()
          .up()
        .up()
      .up()
      .ele('cac:Contact')
        .ele('cbc:Telephone').txt(orderData.seller.contact.telephone).up()
        .ele('cbc:Telefax').txt(orderData.seller.contact.telefax).up()
        .ele('cbc:ElectronicMail').txt(orderData.seller.contact.email).up()
      .up()
      .ele('cac:Person')
        .ele('cbc:FirstName').txt(orderData.seller.person.firstName).up()
        .ele('cbc:FamilyName').txt(orderData.seller.person.familyName).up()
        .ele('cbc:MiddleName').txt(orderData.seller.person.middleName).up()
        .ele('cbc:JobTitle').txt(orderData.seller.person.jobTitle).up()
      .up()
    .up()
  .up()

  // Originator Customer Party
  .ele('cac:OriginatorCustomerParty')
    .ele('cac:Party')
      .ele('cac:PartyIdentification')
        .ele('cbc:ID', { schemeAgencyID: '9', schemeID: 'GLN' }).txt(orderData.seller.sellerId).up()
      .up()
      .ele('cac:PartyName')
        .ele('cbc:Name').txt(orderData.seller.name).up()
      .up()
      .ele('cac:Contact')
        .ele('cbc:Telephone').txt(orderData.seller.contact.telephone).up()
        .ele('cbc:Telefax').txt(orderData.seller.contact.telefax).up()
        .ele('cbc:ElectronicMail').txt(orderData.seller.contact.email).up()
      .up()
      .ele('cac:Person')
        .ele('cbc:FirstName').txt(orderData.seller.person.firstName).up()
        .ele('cbc:MiddleName').txt(orderData.seller.person.middleName).up()
        .ele('cbc:FamilyName').txt(orderData.seller.person.familyName).up()
        .ele('cbc:JobTitle').txt(orderData.seller.person.jobTitle).up()
      .up()
    .up()
  .up()

  // Delivery Section
  .ele('cac:Delivery')
    .ele('cac:DeliveryLocation')
      .ele('cac:Address')
        .ele('cbc:Postbox').txt(orderData.delivery.deliveryAddress.postBox).up()
        .ele('cbc:StreetName').txt(orderData.delivery.deliveryAddress.streetName).up()
        .ele('cbc:AdditionalStreetName').txt(orderData.delivery.deliveryAddress.additionalStreetName).up()
        .ele('cbc:BuildingNumber').txt(orderData.delivery.deliveryAddress.buildingNumber).up()
        .ele('cbc:Department').txt(orderData.delivery.deliveryAddress.department).up()
        .ele('cbc:CityName').txt(orderData.delivery.deliveryAddress.cityName).up()
        .ele('cbc:PostalZone').txt(orderData.delivery.deliveryAddress.postalZone).up()
        .ele('cbc:CountrySubentity').txt(orderData.delivery.deliveryAddress.countrySubentity).up()
        .ele('cac:Country')
          .ele('cbc:IdentificationCode').txt(orderData.delivery.deliveryAddress.countryCode).up()
        .up()
      .up()
    .up()
    .ele('cac:RequestedDeliveryPeriod')
      .ele('cbc:StartDate').txt(orderData.delivery.requestedDeliveryPeriod.startDate).up()
      .ele('cbc:EndDate').txt(orderData.delivery.requestedDeliveryPeriod.endDate).up()
    .up()
    .ele('cac:DeliveryParty')
      .ele('cac:PartyIdentification')
        .ele('cbc:ID', { schemeAgencyID: '9', schemeID: 'GLN' }).txt(orderData.delivery.deliveryParty.name).up()
      .up()
      .ele('cac:PartyName')
        .ele('cbc:Name').txt(orderData.delivery.deliveryParty.name).up()
      .up()
      .ele('cac:Contact')
        .ele('cbc:Name').txt(orderData.delivery.deliveryParty.name).up()
        .ele('cbc:Telephone').txt(orderData.delivery.deliveryParty.telephone).up()
        .ele('cbc:Telefax').txt(orderData.delivery.deliveryParty.telefax).up()
        .ele('cbc:ElectronicMail').txt(orderData.delivery.deliveryParty.email).up()
      .up()
    .up()
  .up()

  // Allowance Charge
  if (orderData.monetaryTotal.allowanceCharge && orderData.monetaryTotal.allowanceCharge.length > 0) {
    orderData.monetaryTotal.allowanceCharge.forEach(charge => {
      xml.ele('cac:AllowanceCharge')
        .ele('cbc:ChargeIndicator').txt(charge.chargeIndicator).up()
        .ele('cbc:AllowanceChargeReason').txt(charge.allowanceChargeReason).up()
        .ele('cbc:Amount', { currencyID: orderData.order.documentCurrencyCode }).txt(charge.amount).up()
      .up();

      if (charge.chargeIndicator === 'true') {
        totalCharge += charge.amount;
      } else {
        totalAllowance += charge.amount;
      }
    });
  }

  const payableAmount = orderData.monetaryTotal.lineExtensionAmount - totalAllowance + totalCharge;
  // Tax Total
  xml.ele('cac:TaxTotal')
    .ele('cbc:TaxAmount', { currencyID: orderData.order.documentCurrencyCode }).txt(orderData.monetaryTotal.taxTotal).up()
  .up()

  // Anticipated Monetary Total
  .ele('cac:AnticipatedMonetaryTotal')
    .ele('cbc:LineExtensionAmount', { currencyID: orderData.order.documentCurrencyCode }).txt(orderData.monetaryTotal.lineExtensionAmount).up()
    .ele('cbc:AllowanceTotalAmount', { currencyID: orderData.order.documentCurrencyCode }).txt(totalAllowance).up()
    .ele('cbc:ChargeTotalAmount', { currencyID: orderData.order.documentCurrencyCode }).txt(totalCharge).up()
    .ele('cbc:PayableAmount', { currencyID: orderData.order.documentCurrencyCode }).txt(payableAmount).up()
  .up()

  // Order Lines
  orderData.orderLines.forEach((line, index) => {
    let lineItemEle = xml.ele('cac:OrderLine')
      .ele('cbc:Note').txt(line.note).up()
      .ele('cac:LineItem')
        .ele('cbc:ID').txt(index + 1).up()
        .ele('cbc:Quantity', { unitCode: line.lineItem.baseQuantity.unitCode }).txt(line.lineItem.quantity).up()
        .ele('cbc:LineExtensionAmount', { currencyID: orderData.order.documentCurrencyCode }).txt(line.lineItem.quantity * line.lineItem.price).up()
        .ele('cbc:TotalTaxAmount', { currencyID: orderData.order.documentCurrencyCode }).txt(line.lineItem.totalTaxAmount).up()
        .ele('cac:Delivery')
          .ele('cbc:RequestedDeliveryPeriod')
            .ele('cbc:StartDate').txt(orderData.delivery.requestedDeliveryPeriod.startDate).up()
            .ele('cbc:EndDate').txt(orderData.delivery.requestedDeliveryPeriod.endDate).up()
          .up()
        .up()
        .ele('cbc:Price')
          .ele('cbc:PriceAmount', { currencyID: orderData.order.documentCurrencyCode }).txt(line.lineItem.price).up()
          .ele('cbc:BaseQuantity', { unitCode: line.lineItem.baseQuantity.unitCode }).txt(line.lineItem.baseQuantity.quantity).up()
        .up()

    let itemEle = lineItemEle.ele('cac:Item')
      .ele('cbc:Description').txt(line.lineItem.item.description).up()
      .ele('cbc:Name').txt(line.lineItem.item.name).up()
      .ele('cac:SellersItemIdentification')
        .ele('cbc:ID').txt(line.lineItem.item.itemId).up()
      .up()

    if (line.lineItem.item.properties && Object.keys(line.lineItem.item.properties).length > 0) {
      Object.entries(line.lineItem.item.properties).forEach(([key, value]) => {
        itemEle.ele('cac:AdditionalItemProperty')
          .ele('cbc:Name').txt(key).up()
          .ele('cbc:Value').txt(value).up()
        .up();
      });
    }

    itemEle.up();
    lineItemEle.up();
  });

  xml.up();

  return { 
    xml: xml.end({ prettyPrint: true }), 
    totalCost: payableAmount + orderData.monetaryTotal.taxTotal 
  };
}

export const isOrderIdValid = async (orderId) => {
  const { count, error } = await supabase
  .from('order')
  .select('*', { count: 'exact' })
  .eq('orderId', orderId);

  if (count == 0) {
    return false;
  }

  return true;
};

export const orderFormUpdate = async (orderId, orderData) => {
  try {
    await deleteOrderFromDatabase(orderId);
    await insertOrderIntoDatabase(orderId, orderData);

    return { orderId };
  } catch (error) {
    throw createHttpError(500, 'Failed to update order. Please try again.');
  }
};

const deleteOrderFromDatabase = async (orderId) => {
  const { error: orderError } = await supabase
  .from('order')
  .delete()
  .eq('orderId', orderId)

  if (orderError) {
    throw createHttpError(500, `Failed to delete order: ${orderError.message}`);
  }
};

export const listReceivedOrders = async (req, resizeBy, next) => {
  try {
    // Fetch all orders from database
    const { data: orders, error } = await supabase
      .from('order')
      .select('xml');

    if (error) {
      throw createHttpError(500, 'Failed to fetch orders: $(error.message}');
    }

    // Extract the XML docs from the orders
    const ublOrderDocuments = orders.map(order => order.xml);

    // Return the XML docs in an array
    res.status(200).json({ ublOrderDocuments });
  } catch (error) {
    next(error);
  }
};

export const getUserUblOrders = async (userId) => {
  try {
    const { data: orders, error } = await supabase
      .from('order')
      .select('xml')
      .eq('userId', userId);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return orders.map(order => order.xml);
  } catch (error) {
    throw error; // Re-throws error to be handled by the routing
  }
};