import supabase from '../../config/db.js';
import {
  deleteUserFromDB,
  registerUserRequest,
  loginUserRequest,
  logoutUserRequest,
  getUserDetailsRequest,
  sendUserResetCodeRequest,
  getUserStatisticsRequest
} from '../wrapper';

// constants
const password = 'Password123!';
const nameFirst = 'John';
const nameLast = 'Doe';

describe('POST /v1/user/register route', () => {
  test('success, registers user and returns 200 and token', async () => {
    const email1 = 'test1@example.com';
    const res = await registerUserRequest(email1, password, nameFirst, nameLast);
    const body = res.body;

    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty('token');
    expect(typeof body.token).toBe('string');

    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('email', email1)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.email).toBe(email1);
    expect(data.nameFirst).toBe(nameFirst);
    expect(data.nameLast).toBe(nameLast);

    // verify the Set-Cookie header
    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader[0]).toMatch(/authToken=/);
    expect(setCookieHeader[0]).toMatch(/HttpOnly/);
    expect(setCookieHeader[0]).toMatch(/Secure/);

    await deleteUserFromDB(email1);
  });

  describe('error, missing a field', () => {
    test('email', async () => {
      const res = await registerUserRequest('', password, nameFirst, nameLast);
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'All fields are required');
    });

    test('password', async () => {
      const res = await registerUserRequest('test2@example.com', '', nameFirst, nameLast);
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'All fields are required');
    });

    test('first name', async () => {
      const res = await registerUserRequest('test3@example.com', password, '', nameLast);
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'All fields are required');
    });

    test('last name', async () => {
      const res = await registerUserRequest('test4@example.com', password, nameFirst, '');
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'All fields are required');
    });
  });

  test('invalid email error', async () => {
    const res = await registerUserRequest('example', password, nameFirst, nameLast);
    const body = res.body;

    expect(res.statusCode).toBe(400);
    expect(body).toHaveProperty('error', 'Invalid email');
  });

  describe('password errors', () => {
    test('password too short', async () => {
      const res = await registerUserRequest('pw@example.com', 'Pw1!', nameFirst, nameLast);
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'Password is too short');
    });

    test("password doesn't contain capital letter", async () => {
      const res = await registerUserRequest('pw@example.com', 'password1!', nameFirst, nameLast);
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'Password requires an uppercase character');
    });

    test("password doesn't contain lowercase letter", async () => {
      const res = await registerUserRequest('pw@example.com', 'PASSWORD1!', nameFirst, nameLast);
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'Password requires a lowercase character');
    });

    test("password doesn't have a number", async () => {
      const res = await registerUserRequest('pw@example.com', 'Password!', nameFirst, nameLast);
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'Password requires a number');
    });

    test("password doesn't have a special character", async () => {
      const res = await registerUserRequest('pw@example.com', 'Password12', nameFirst, nameLast);
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'Password requires a special character');
    });
  });

  describe('name errors', () => {
    test('first name contains special character', async () => {
      const res = await registerUserRequest('pw@example.com', 'Password1!', '!@#$%^&*', nameLast);
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'Invalid character in name');
    });

    test('last name contains special character', async () => {
      const res = await registerUserRequest('pw@example.com', 'Password1!', nameFirst, '!@#$%^&*');
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'Invalid character in name');
    });

    test('first name contains number', async () => {
      const res = await registerUserRequest('pw@example.com', 'Password1!', '12345', nameLast);
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'Invalid character in name');
    });

    test('last name contains number', async () => {
      const res = await registerUserRequest('pw@example.com', 'Password1!', nameFirst, '12345');
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'Invalid character in name');
    });
  });

  describe('error, user already exists', () => {
    test('existing user', async () => {
      const email2 = 'test5@example.com'; // Define the email variable
      // Ensure the user exists
      await registerUserRequest(email2, password, nameFirst, nameLast);

      const res = await registerUserRequest(email2, password, nameFirst, nameLast);
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'User already exists');
      await deleteUserFromDB(email2);
    });
  });
});

describe('POST /v1/user/login route', () => {
  // register user for each test
  const email = 'guy@example.com';
  beforeEach(async () => {
    await registerUserRequest(email, password, nameFirst, nameLast);
  });

  afterEach(async () => {
    await deleteUserFromDB(email);
  });

  test('success, logs in and returns 200 and token', async () => {
    const res = await loginUserRequest(email, password);
    const body = res.body;

    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty('token');
    expect(typeof body.token).toBe('string');
    // verify the Set-Cookie header
    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader[0]).toMatch(/authToken=/);
    expect(setCookieHeader[0]).toMatch(/HttpOnly/);
    expect(setCookieHeader[0]).toMatch(/Secure/);
  });

  describe('error, missing a field', () => {
    test('email', async () => {
      const res = await loginUserRequest('', password);
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'All fields are required');
    });

    test('password', async () => {
      const res = await loginUserRequest('guy@example.com', '');
      const body = res.body;

      expect(res.statusCode).toBe(400);
      expect(body).toHaveProperty('error', 'All fields are required');
    });
  });

  test('error, user not found', async () => {
    const res = await loginUserRequest('nonexistent@example.com', password);
    const body = res.body;

    expect(res.statusCode).toBe(401);
    expect(body).toHaveProperty('error', 'User not found');
  });

  test('error, incorrect password', async () => {
    const res = await loginUserRequest(email, 'wrongPW69');
    const body = res.body;

    expect(res.statusCode).toBe(401);
    expect(body).toHaveProperty('error', 'Invalid email or password');
  });
});

describe('POST /v1/user/logout route', () => {
  let token;
  const email = 'logout@example.com';

  beforeEach(async () => {
    await deleteUserFromDB(email); // Ensures the user is removed before registering
    const res = await registerUserRequest(email, password, nameFirst, nameLast);
    token = res.body.token;
  });

  afterEach(async () => {
    await deleteUserFromDB(email);
  });

  test('success, logs out and returns 200', async () => {
    const res = await logoutUserRequest(token);
    const body = res.body.trim();

    expect(res.statusCode).toBe(200);
    expect(body).toBe('');
    const setCookieHeader = res.headers['set-cookie'];
    // verify the cookie is cleared
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader[0]).toMatch(/authToken=;/);
    expect(setCookieHeader[0]).toMatch(/Expires=/);
  });

  test('error, invalid token', async () => {
    const res = await logoutUserRequest('invalidToken');
    const body = res.body;

    expect(res.statusCode).toBe(401);
    expect(body).toHaveProperty('error', 'Invalid token');
    expect(typeof body.error).toBe('string');
    // check header is undefined
    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeUndefined();
  });
});

describe('GET /v1/user/details', () => {
  let token;
  const email = 'getDetails@example.com';

  beforeEach(async () => {
    await deleteUserFromDB(email); // Ensures the user is removed before registering
    const res = await registerUserRequest(email, password, nameFirst, nameLast);
    token = res.body.token;
  });

  afterEach(async () => {
    await deleteUserFromDB(email);
  });

  test('Successfully retrieves user details and returns 200', async () => {
    const res = await getUserDetailsRequest(token);
    const body = res.body;

    expect(res.statusCode).toBe(200);
    expect(body).toStrictEqual({ email: 'getDetails@example.com', nameFirst, nameLast });
  });

  test('Invalid token, return 401', async () => {
    const res = await getUserDetailsRequest('InvalidTokenGiven');

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid token');
    expect(typeof res.body.error).toBe('string');
  });
});

describe('POST /v1/user/forgot', () => {
  const email = 'code_crusaders@outlook.com';

  beforeEach(async () => {
    await deleteUserFromDB(email); // Ensures the user is removed before registering
    await registerUserRequest(email, password, nameFirst, nameLast);
  });

  afterEach(async () => {
    await deleteUserFromDB(email);
  });

  // The sending of the reset code via email has been manually checked. Furthermore, if the email
  // failed to be sent, it would return a 500 HTTP Status code.
  test('Successfully sends reset code to user\'s email and returns 200', async () => {
    const res = await sendUserResetCodeRequest(email);
    const body = res.body;

    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty('resetCode');
    expect(body.resetCode).toHaveLength(8);
    expect(typeof body.resetCode).toBe('string');
  }, 10000);

  test('Invalid email, return 401', async () => {
    const res = await sendUserResetCodeRequest('InvalidEmailGive@example.com');

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(typeof res.body.error).toBe('string');
  });
});

describe('GET /v1/user/statistics', () => {
  let token;
  const email = 'statistics@example.com';

  beforeEach(async () => {
    // Register a user and log in to get a token
    await deleteUserFromDB(email); // Ensures user is removed from database before registering
    const res = await registerUserRequest(email, password, nameFirst, nameLast);
    token = res.body.token;
  });

  afterEach(async () => {
    // Clean up by deleting the user
    await deleteUserFromDB(email);
  });

  test('Successfully retrieves user statistics and returns 200', async () => {
    // Mock orders data in Supabase for the user
    const orders = [
      {
        user_email: email,
        items: [{ name: 'Item A' }, { name: 'Item B' }, { name: 'Item A' }],
        order_date: new Date().toISOString(),
        total_amount: 100.0,
      },
      {
        user_email: email,
        items: [{ name: 'Item B' }, { name: 'Item C' }],
        order_date: new Date().toISOString(),
        total_amount: 200.0,
      },
      {
        user_email: email,
        items: [{ name: 'Item A' }, { name: 'Item C' }],
        order_date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
        total_amount: 150.0,
      },
    ];

    // Insert mock orders into the database
    const { error: insertError } = await supabase.from('orders').insert(orders);
    expect(insertError).toBeNull();

    // Call the endpoint
    const res = await getUserStatisticsRequest(token);
    const body = res.body;

    // Assert the response
    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty('topThreeItems');
    expect(body).toHaveProperty('numOrdersMonthly');
    expect(body).toHaveProperty('totalOrders');
    expect(body).toHaveProperty('totalAmountMonth');

    // Verify the statistics
    expect(body.topThreeItems).toEqual(['Item A', 'Item B', 'Item C']);
    expect(body.numOrdersMonthly).toHaveLength(12);
    expect(body.totalOrders).toBe(3);
    expect(body.totalAmountMonth).toBe(300.0); // Sum of orders in the current month
  });

  test('No orders found, returns default statistics', async () => {
    // Call the endpoint
    const res = await getUserStatisticsRequest(token);
    const body = res.body;

    // Assert the response
    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty('topThreeItems');
    expect(body).toHaveProperty('numOrdersMonthly');
    expect(body).toHaveProperty('totalOrders');
    expect(body).toHaveProperty('totalAmountMonth');

    // Verify default values
    expect(body.topThreeItems).toEqual([]);
    expect(body.numOrdersMonthly).toEqual(new Array(12).fill(0));
    expect(body.totalOrders).toBe(0);
    expect(body.totalAmountMonth).toBe(0.0);
  });

  test('Invalid token, returns 401', async () => {
    const res = await getUserStatisticsRequest('invalidToken');
    const body = res.body;

    // Assert the response
    expect(res.statusCode).toBe(401);
    expect(body).toHaveProperty('error', 'Invalid token');
  });
});
