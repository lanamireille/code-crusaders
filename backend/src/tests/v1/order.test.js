import config from '../../config/test.json';
import { 
  orderBulkCreateRequest,
  orderFormCreateRequest,
  orderFormUpdateRequest,
  registerUserRequest,
  listReceivedOrdersRequest
} from '../wrapper';

const port = config.port;
const url = config.url;

const token =  JSON.parse(registerUserRequest('orders@example.com', 'password', 'nameFirst', 'nameLast').body).token;

const validParams = {
  "order": {
    "note": "Information text for the whole order",
    "documentCurrencyCode": "SEK",
    "accountingCostCode": "Project123",
    "validityEndDate": "2010-01-31",
    "quotationDocumentReferenceId": "QuoteID123",
    "orderDocumentReferenceId": "RejectedOrderID123",
    "originatorDocumentReferenceId": "MAFO",
    "contractType": "FrameworkAgreementID123",
    "contractId": 34322
  },
  "buyer": {
    "buyerId": "7300070011115",
    "name": "Johnssons byggvaror",
    "postalAddress": {
      "postBox": "PoBox123",
      "streetName": "Rådhusgatan",
      "additionalStreetName": "2nd floor",
      "buildingNumber": "5",
      "department": "Purchasing department",
      "cityName": "Stockholm",
      "postalZone": "11000",
      "countrySubentity": "RegionX",
      "countryCode": "SE"
    },
    "taxScheme": "VAT",
    "contact": {
      "telephone": "123456",
      "telefax": "123456",
      "email": "pelle@johnsson.se"
    },
    "person": {
      "firstName": "Pelle",
      "middleName": "X",
      "familyName": "Svensson",
      "jobTitle": "Boss"
    },
    "deliveryContact": {
      "name": "Eva Johnsson",
      "telephone": "123456",
      "telefax": "123455",
      "email": "eva@johnsson.se"
    }
  },
  "seller": {
    "sellerId": "7304231321341",
    "name": "Moderna Produkter AB",
    "postalAddress": {
      "postBox": "321",
      "streetName": "Kungsgatan",
      "additionalStreetName": "suite12",
      "buildingNumber": "22",
      "department": "Sales department",
      "cityName": "Stockholm",
      "postalZone": "11000",
      "countrySubentity": "RegionX",
      "countryCode": "SE"
    },
    "contact": {
      "telephone": "34557",
      "telefax": "3456767",
      "email": "lars@moderna.se"
    },
    "person": {
      "firstName": "Lars",
      "middleName": "M",
      "familyName": "Petersen",
      "jobTitle": "Sales Manager"
    }
  },
  "delivery": {
    "deliveryAddress": {
      "postBox": "321",
      "streetName": "Avon Way",
      "additionalStreetName": "2nd floor",
      "buildingName": "Thereabouts",
      "buildingNumber": "56A",
      "department": "Purchasing department",
      "cityName": "Bridgtow",
      "postalZone": "ZZ99 1ZZ",
      "countrySubentity": "RegionX",
      "countryCode": "SE"
    },
    "requestedDeliveryPeriod": {
      "startDate": "2005-06-29",
      "endDate": "2005-06-29"
    },
    "deliveryParty": {
      "deliveryPartyId": 67654328394567,
      "name": "Swedish Trucking",
      "telephone": "987098709",
      "email": "bill@svetruck.se",
      "telefax": "34673435"
    }
  },
  "monetaryTotal": {
    "lineExtensionAmount": "6225",
    "taxTotal": 100,
    "allowanceCharge": [
      {
        "chargeIndicator": "true",
        "allowanceChargeReason": "Transport Documents",
        "amount": 100
      },
      {
        "chargeIndicator": "false",
        "allowanceChargeReason": "Total order value discount",
        "amount": 100
      }
    ]
  },
  "orderLines": [
    {
      "note": "Freetext note on line 1",
      "lineItem": {
        "quantity": 120,
        "totalTaxAmount": 10,
        "price": 50,
        "baseQuantity": {
          "quantity": 1,
          "unitCode": "LTR"
        },
        "item": {
          "itemId": 45252,
          "description": "Red paint",
          "name": "Falu Rödfärg",
          "properties": {
            "paintType": "Acrylic",
            "solvent": "Water"
          }
        }
      }
    },
    {
      "note": "Freetext note on line 2",
      "lineItem": {
        "quantity": 15,
        "totalTaxAmount": 10,
        "price": 15,
        "baseQuantity": {
          "quantity": 1,
          "unitCode": "C62"
        },
        "item": {
          "itemId": 54223,
          "description": "Very good pencils for red paint.",
          "name": "Pensel 20 mm",
          "properties": {
            "hairColor": "Black",
            "width": "20mm"
          }
        }
      }
    }
  ],
  "additionalDocumentReference": [
    {
      "documentType": "Timesheet",
      "attachment": {
        "uri": "http://www.suppliersite.eu/sheet001.html"
      }
    },
    {
      "documentType": "Drawing",
      "attachment": {
        "binaryObject": "UjBsR09EbGhjZ0dTQUxNQUFBUUNBRU1tQ1p0dU1GUXhEUzhi",
        "mimeCode": "application/pdf"
      }
    }
  ]
}

describe('POST /v1/order/create/form', () => {
  test('should return 200 and an orderId', async () => {
    const res = await orderFormCreateRequest(validParams,token);
    const body = JSON.parse(res.body.toString());

    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty('orderId');
    expect(typeof body.orderId).toBe('number');
    expect(Number.isInteger(body.orderId)).toBe(true);
  });

  test('should return 400 and an error message', async () => {
    const invalidParams = { ...validParams };
    delete invalidParams.order;

    const res = await orderFormCreateRequest(invalidParams, token);
    const body = JSON.parse(res.body.toString());

    expect(res.statusCode).toBe(400);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  test.todo('should return 401 and an error message');
});

describe('PUT /v1/order/{orderId}', () => {
  let orderId;
  beforeEach(() => {
    orderId = JSON.parse(orderFormCreateRequest(validParams, token).body.toString()).orderId;
  });
  test('Successful order update, should return 200 and an orderId', async () => {
    // const respon = await orderFormCreateRequest(validParams);
    // const orderId = JSON.parse(respon.body.toString()).orderId;
    const newParams = {...validParams};
    newParams.orderLines[0].lineItem.item.description = "Yellow paint";
    newParams.orderLines[0].lineItem.item.itemId = 10000000;
   
    const res = await orderFormUpdateRequest(orderId, newParams, token);
    const body = JSON.parse(res.body.toString());

    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty('orderId');
    expect(typeof body.orderId).toBe('number');
    expect(Number.isInteger(body.orderId)).toBe(true);
  });

  test('Invalid order data given, should return 400 and an error message', async () => {
    const invalidParams = { ...validParams };
    delete invalidParams.orderLines;

    const res = await orderFormUpdateRequest(orderId, invalidParams, token);
    const body = JSON.parse(res.body.toString());

    expect(res.statusCode).toBe(400);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  test('Invalid order id given, should return 400 and an error message', async () => {
    const newParams = {...validParams};
    newParams.orderLines[0].lineItem.item.description = "Rainbow paint";

    const res = await orderFormUpdateRequest(-1, newParams, token);
    const body = JSON.parse(res.body.toString());

    expect(res.statusCode).toBe(400);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  test.todo('should return 401 and an error message');
});

describe('POST /v1/order/create/bulk', () => {
  test('should return 200 and an array of orderIds', async () => {
    const res = await orderBulkCreateRequest({ orders: [validParams, validParams, validParams] }, token);
    const body = JSON.parse(res.body.toString());

    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty('orderIds');
    expect(Array.isArray(body.orderIds)).toBe(true);
    expect(body.orderIds.length).toBe(3);
    expect(body.orderIds.every(id => Number.isInteger(id))).toBe(true);
  });

  test('should return 400 and an error message', async () => {
    const invalidParams = [{ ...validParams }, { ...validParams }];
    delete invalidParams[0].order;

    const res = await orderBulkCreateRequest({ orders: invalidParams }, token);
    const body = JSON.parse(res.body.toString());

    expect(res.statusCode).toBe(400);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  test.todo('should return 401 and an error message');
})

describe('GET /v1/order/received/list', () => {
  test('should return 200 and an array of UBL documents', () => {
    const res = listReceivedOrdersRequest(token);
    const body = JSON.parse(res.getBody('utf8'));

    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty('ublOrderDocuments');
    expect(Array.isArray(body.ublOrderDocuments)).toBe(true);
    expect(body.ublOrderDocuments.length).toBeGreaterThanOrEqual(1); // At least one order exists
    expect(typeof body.ublOrderDocuments[0]).toBe('string'); // Each document is a string
  });

  test('should return 401 for unauthorized requests', () => {
    const invalidToken = 'invalid-token';
    const res = listReceivedOrdersRequest(invalidToken);
    const body = JSON.parse(res.getBody('utf8'));

    expect(res.statusCode).toBe(401);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  test('should return an empty array if no orders exist', () => {
    // Delete all orders for the user (assuming you have access to Supabase in your test environment)
    // await supabase.from('order').delete().eq('userId', req.authUserId);

    const res = listReceivedOrdersRequest(token);
    const body = JSON.parse(res.getBody('utf8'));

    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty('ublOrderDocuments');
    expect(Array.isArray(body.ublOrderDocuments)).toBe(true);
    expect(body.ublOrderDocuments.length).toBe(0); // No orders exist
  });
});