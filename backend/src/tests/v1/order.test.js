import { 
  getOrderFromOrderIdRequest,
  orderBulkCreateRequest,
  orderFormCreateRequest,
  orderFormUpdateRequest,
  registerUserRequest,
  orderDeleteRequest,
} from '../wrapper';
import supabase from '../../config/db.js';
import { XMLParser } from 'fast-xml-parser'

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

const password = 'password123';
const nameFirst = 'John';
const nameLast = 'Doe';
const email = 'testUser@example.com'

let token;

export const deleteUserFromDB = async (e) => {
  const { error } = await supabase.from('user').delete().eq('email', e);

  if (error) {
    throw new createHttpError(500, error.message);
  }
}

const retry = async (fn, retries = 5, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Operation failed after multiple retries.");
};

beforeAll(async () => {
  await retry(async () => {
    await deleteUserFromDB(email);
    const res = await registerUserRequest(email, password, nameFirst, nameLast);
    
    if (!res || !res.body || !res.body.token) {
      throw new Error("Failed to register user and retrieve token.");
    }

    token = res.body.token;
  });
});

afterAll(async () => {
  await deleteUserFromDB(email);
});

describe('POST /v1/order/create/form', () => {
  test('should return 200 and an orderId', async () => {
    const res = await orderFormCreateRequest(validParams, token);
    const body = res.body;

    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty('orderId');
    expect(typeof body.orderId).toBe('number');
    expect(Number.isInteger(body.orderId)).toBe(true);
});

  test('should return 400 and an error message', async () => {
    const invalidParams = { ...validParams };
    delete invalidParams.order;

    const res = await orderFormCreateRequest(invalidParams, token);
    const body = res.body;

    expect(res.statusCode).toBe(400);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  test('should return 401 and an error message', async () => {
    const res = await orderFormCreateRequest(validParams, "imInvalid");
    const body = res.body;

    expect(res.statusCode).toBe(401);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });
});

describe('PUT /v1/order/{orderId}', () => {
  let orderId;
  beforeEach(async () => {
    const res = await orderFormCreateRequest(validParams, token)
    orderId = res.body.orderId;
  });
  test('Successful order update, should return 200 and an orderId', async () => {
    const newParams = {...validParams};
    newParams.orderLines[0].lineItem.item.description = "Yellow paint";
    newParams.orderLines[0].lineItem.item.itemId = 10000000;
    newParams.orderLines[1].lineItem.item.description = "Rainbow pencils";
   
    const { data: preUpdateData } = await supabase
      .from('registeredOrderProduct')
      .select('product(productId, description)')
      .eq('orderId', orderId)
      .order('product(productId)');
    expect(preUpdateData).toEqual([
      {product: {productId: 45252, description: 'Red paint'}}, 
      {product: {productId: 54223, description: 'Very good pencils for red paint.'}}]);

    const res = await orderFormUpdateRequest(orderId, newParams, token);
    const body = res.body;

    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty('orderId');
    expect(typeof body.orderId).toBe('number');
    expect(Number.isInteger(body.orderId)).toBe(true);

    const { data: postUpdateData } = await supabase
    .from('registeredOrderProduct')
    .select('product(productId, description)')
    .eq('orderId', orderId)
    .order('product(productId)');
    expect(postUpdateData).toEqual([
    {product: {productId: 54223, description: 'Rainbow pencils'}},
    {product: {productId: 10000000, description: 'Yellow paint'}}]); 
  });

  test('Invalid order data given, should return 400 and an error message', async () => {
    const invalidParams = { ...validParams };
    delete invalidParams.orderLines;

    const res = await orderFormUpdateRequest(orderId, invalidParams, token);
    const body = res.body;

    expect(res.statusCode).toBe(400);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  test('Invalid order id given, should return 400 and an error message', async () => {
    const newParams = {...validParams};
    newParams.orderLines[0].lineItem.item.description = "Rainbow paint";

    const res = await orderFormUpdateRequest(-1, newParams, token);
    const body = res.body;

    expect(res.statusCode).toBe(400);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  test('Invalid token, return 401', async () => {
    const res = await orderFormUpdateRequest(orderId, validParams,'InvalidTokenGiven');
  
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid token');
    expect(typeof res.body.error).toBe('string');
  });
});

describe('POST /v1/order/create/bulk', () => {
  test('should return 200 and an array of orderIds', async () => {
    const res = await orderBulkCreateRequest({ orders: [validParams, validParams, validParams] }, token);
    const body = res.body;

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
    const body = res.body;

    expect(res.statusCode).toBe(400);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  test('should return 401 and an error message', async () => {
    const res = await orderBulkCreateRequest({ orders: [validParams, validParams, validParams] }, "imInvalid");
    const body = res.body;

    expect(res.statusCode).toBe(401);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });
})

describe('GET /v1/order/{orderId}', () => {
  let orderId;

  beforeAll(async () => {
    const res = await orderFormCreateRequest(validParams, token)
    orderId = res.body.orderId;
  });

  test('should return 200 and xml order document', async () => {
    const res = await getOrderFromOrderIdRequest(orderId, token)
    const { statusCode, body, headers } = res;

    expect(statusCode).toBe(200);
    expect(headers['content-type']).toMatch(/xml/);

    // Validate if body is valid XML
    const parser = new XMLParser();
    expect(() => parser.parse(body)).not.toThrow();
    const parsedXML = parser.parse(body);
    expect(parsedXML.Order).toBeDefined();
  })

  test('invalid orderId should return 400 and error message', async () => {
    const res = await getOrderFromOrderIdRequest('imInvalid', token)
    const { statusCode, body } = res;

    expect(statusCode).toBe(400);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  test('invalid token should return 401 and error message', async () => {
    const res = await getOrderFromOrderIdRequest(orderId, "imInvalid")
    const { statusCode, body } = res;

    expect(statusCode).toBe(401);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });
});

describe('DELETE /v1/order/{orderId}', () => {
  let orderId;
  beforeEach(async () => {
    const res = await orderFormCreateRequest(validParams, token)
    orderId = res.body.orderId;
  });
  test('Successfully deleted order, should return 200 and empty object', async () => {   
    const { data: preDeletionData, error: preDeletionError } = await supabase
      .from('order')
      .select('*')
      .eq('orderId', orderId)
      .single();

    expect(preDeletionError).toBeNull();
    expect(preDeletionData.orderId).toStrictEqual(orderId);
    
    const res = await orderDeleteRequest(orderId, token);
    const body = res.body;

    expect(res.statusCode).toBe(200);
    expect(body).toStrictEqual({});

    const { error: postDeletionError } = await supabase
      .from('order')
      .select('*')
      .eq('orderId', orderId)
      .single();

    expect(postDeletionError).not.toBeNull();  
  });

  test('Invalid orderId, should return 400 and an error message', async () => {
    const res = await orderDeleteRequest(-1,token);
    const body = res.body;

    expect(res.statusCode).toBe(400);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  test('Invalid token, return 401', async () => {
      const res = await orderDeleteRequest(orderId,'InvalidTokenGiven');
    
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid token');
      expect(typeof res.body.error).toBe('string');
  });
});