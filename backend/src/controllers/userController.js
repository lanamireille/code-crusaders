import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import createHttpError from 'http-errors';
import supabase from '../config/db.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import validator from 'validator';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// cookies omnom
const app = express();
app.use(cookieParser());

/**
 * Registers a new user in the database after validating the input fields and password strength.
 *
 * @param {string} email - The email address of the user to be registered.
 * @param {string} password - The password for the user. Must meet the specified strength requirements.
 * @param {string} nameFirst - The first name of the user. Should not include special characters or numbers.
 * @param {string} nameLast - The last name of the user. Should not include special characters or numbers.
 * @returns {Object} An object containing a JWT token for the newly registered user.
 */
export const registerUser = async (email, password, nameFirst, nameLast) => {
  // checks if fields are provided
  if (!email || !password || !nameFirst || !nameLast) {
    throw createHttpError(400, 'All fields are required');
  }

  const isEmailValid = validator.isEmail(email);
  if (!isEmailValid) {
    throw createHttpError(400, 'Invalid email');
  }

  // length
  if (password.length < 8) {
    throw createHttpError(400, 'Password is too short');
  }

  // upper case char
  if (!(/[A-Z]/.test(password))) {
    throw createHttpError(400, 'Password requires an uppercase character');
  }

  // lower case char
  if (!(/[a-z]/.test(password))) {
    throw createHttpError(400, 'Password requires a lowercase character');
  }

  // number
  if (!(/[0-9]/.test(password))) {
    throw createHttpError(400, 'Password requires a number');
  }

  // special char
  if (!(/[!@#$%^&*(),.?":{}|<>]/.test(password))) {
    throw createHttpError(400, 'Password requires a special character');
  }

  // invalid character in name
  if ((/[!@#$%^&*(),.?":{}|<>]/.test(nameFirst)) ||
      (/[!@#$%^&*(),.?":{}|<>]/.test(nameLast)) ||
      (/[0-9]/.test(nameFirst)) ||
      (/[0-9]/.test(nameLast))) {
    throw createHttpError(400, 'Invalid character in name');
  }

  try {
    // check if user exists
    const { data: existingUser, error: findError } = await supabase
      .from('user')
      .select('*')
      .eq('email', email)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      throw createHttpError(500, 'Database error while checking existing user');
    }

    if (existingUser) {
      throw createHttpError(400, 'User already exists');
    }

    // hash pw
    const hashedPW = await bcrypt.hash(password, 10);

    // insert new user into supabase
    const { data: user, error: insertError } = await supabase
      .from('user')
      .insert([{ email, password: hashedPW, nameFirst, nameLast }])
      .select();

    if (insertError) {
      throw createHttpError(500, 'Error creating user in database');
    }

    // generate JWT token
    const token = jwt.sign(
      {
        email: user[0].email,
        nameFirst: user[0].nameFirst,
        nameLast: user[0].nameLast
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // optional
    );

    return { token };
  } catch (error) {
    if (!error.status) {
      throw createHttpError(500, 'Unexpected server error' + error);
    }
    throw error;
  }
};

/**
 * Authenticates a user by validating the input fields and checking the provided credentials.
 *
 * @param {string} email - The email address of the user attempting to log in.
 * @param {string} password - The password for the user attempting to log in.
 * @returns {Object} An object containing a JWT token for the user.
 */
export const loginUser = async (email, password) => {
  // checks if fields are provided
  if (!email || !password) {
    throw createHttpError(400, 'All fields are required');
  }

  try {
    // find user by email
    const { data: user, error: findError } = await supabase
      .from('user')
      .select('*')
      .eq('email', email)
      .single();

    // error handling
    if (!user) {
      throw createHttpError(401, 'User not found');
    }

    if (findError) {
      throw createHttpError(500, 'Database error');
    }

    // compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw createHttpError(401, 'Invalid email or password');
    }

    if (!process.env.JWT_SECRET) {
      throw createHttpError(500, 'Server configuration error');
    }

    // create JWT token
    const token = jwt.sign(
      {
        email: user.email,
        nameFirst: user.nameFirst,
        nameLast: user.nameLast
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // optional
    );

    return { token };
  } catch (error) {
    if (!error.status) {
      throw createHttpError(500, 'Unexpected server error' + error);
    }
    throw error;
  }
};

/**
 * Logs out a user by clearing the authentication cookie.
 *
 * @param {Object} req - The request object (not used in this function, but typically available in Express route handlers).
 * @param {Object} res - The response object, used to clear the authentication cookie.
 * @returns {void} Does not return a value.
 */

export const logoutUser = async (req, res) => {
  try {
    // clear cookie
    res.clearCookie('authToken', { httpOnly: true, secure: true });
  } catch (error) {
    throw createHttpError(500, 'Failed to logout user. Please try again.'); ;
  }
};

/**
 * Retries user information associated with a given email.
 *
 * @param {string} email - The email of the user to get details about.
 * @returns {{email: string, nameFirst: string, nameLast: string}} - Returns the email, first and last name of the user.
 */
export const getUserDetails = async (email) => {
  const { data: user, error: fetchError } = await supabase
    .from('user')
    .select('*')
    .eq('email', email);

  if (fetchError) {
    throw createHttpError(500, `Failed to fetch user details: ${fetchError.message}`);
  }

  return {
    email: user[0].email,
    nameFirst: user[0].nameFirst,
    nameLast: user[0].nameLast
  };
};

/**
 * Generates and stores a unique reset code with a five minute expiration time, and sends the code via
 * email to the email/user that requested to reset their password.
 *
 * @param {string} email - The email of the user requesting the reset code to reset their password.
 * @returns {{resetCode: string}} - Returns the reset code that will enable the user to reset their password.
 */
export const sendUserResetCode = async (email) => {
  const resetCode = crypto.randomBytes(4).toString('hex');
  const expirationTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { data: user, error: invalidUser } = await supabase
    .from('user')
    .select('*')
    .eq('email', email)
    .single();

  if (invalidUser) {
    throw createHttpError(401, email, ' does not belong to a registered user');
  }

  const { error: codeError } = await supabase
    .from('user')
    .update({ resetCode, codeExpirationTime: expirationTime })
    .eq('email', email);

  if (codeError) {
    throw createHttpError(500, `Failed to upsert reset code: ${codeError.message}`);
  }

  const transporter = await nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'codecrusaders100@gmail.com',
      pass: 'thnp fdsb jklz focg'
    }
  });

  const { error: emailError } = await transporter.sendMail({
    from: '"Code Crusaders" <codecrusaders100@gmail.com>',
    to: email,
    subject: 'Reset Password',
    html: await htmlEmailContent(user.nameFirst + ' ' + user.nameLast, resetCode),
  });
  if (emailError) {
    throw createHttpError(500, `Failed to send email with reset code: ${emailError}`);
  }

  return { resetCode };
};

/**
 * Generates the contents of the reset password request email in html, and is customised to the user
 * requesting this route.
 *
 * @param {string} name - The name of the user who will be sent the email, must be registered on supabase.
 * @param {string} resetCode - An 8 character long string that the user can use to reset their password, with a 5 minute expiration.
 * @returns {string} - Returns the html content of the email in string form.
 */
const htmlEmailContent = (name, resetCode) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Request</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #9370db;
        margin: 0;
        padding: 0;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px #9370db;
      }

      h2 {
        color: #333;
        font-size: 24px;
        text-align: center;
      }

      .content {
        margin-top: 20px;
        font-size: 16px;
        color: #555;
        line-height: 1.6;
      }

      .reset-code {
        display: block;
        margin: 20px 0;
        padding: 12px;
        font-size: 18px;
        background-color: #f7f7f7;
        color: #333;
        font-weight: bold;
        text-align: center;
        border-radius: 4px;
        border: 1px solid #ddd;
      }

      .cta-button {
        display: inline-block;
        margin-top: 20px;
        padding: 10px 20px;
        font-size: 16px;
        color: #fff;
        background-color: #007bff;
        text-decoration: none;
        border-radius: 4px;
        text-align: center;
        width: 100%;
      }

      .cta-button:hover {
        background-color: #0056b3;
      }

      .footer {
        margin-top: 30px;
        font-size: 14px;
        color: #777;
        text-align: center;
      }

      .footer a {
        color: #007bff;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Password Reset Request</h2>
      
      <div class="content">
        <p>Dear ${name},</p>
        <p>We received a request to reset your password. Please use the following code to reset your password:</p>
        
        <div class="reset-code">
          ${resetCode}
        </div>
        
        <p>This code will expire in 5 minutes, so please use it as soon as possible.</p>
        <p>If you didn’t request a password reset, you can safely ignore this email.</p>
        
        <a href="[Reset Password Link]" class="cta-button">Reset Your Password</a>
      </div>
      
      <div class="footer">
        <p>If you have any questions or need further assistance, feel free to <a href="mailto:codecrusaders100@gmail.com">contact our support team</a>.</p>
        <p>Kind Regards,<br>Code Crusaders</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

/**
 * Retrieves statistics about a user's top three items, number of orders per month, total number of orders,
 * and total amount of money spent per month
 *
 * @param {string} token - The authentication token of the user
 * @returns {topThreeItems: string[], numOrdersMonthly: number[], totalOrders: number, totalAmountMonth: number}
 */
export const getUserStatistics = async (email) => {
  try {
    // Fetch all orders for the user
    const { data: orders, error: ordersError } = await supabase
      .from('registeredOrder')
      .select('orderId, cost, order_date')
      .eq('creator', email);

    if (!orders || ordersError) {
      throw createHttpError(500, `Failed to fetch user orders: ${ordersError.message}`);
    }
    // If there are no orders, give values of 0 for all areas
    if (!orders || orders.length === 0) {
      return {
        topThreeItems: [],
        numOrdersMonthly: new Array(12).fill(0),
        totalOrders: 0,
        totalAmountMonth: 0.0,
      };
    }

    // Fetch products for each order
    const orderIds = orders.map((order) => order.orderId);
    const { data: orderProducts, error: orderProductsError } = await supabase
      .from('registeredOrderProduct')
      .select('orderId, productId, quantity')
      .in('orderId', orderIds);

    if (orderProductsError) {
      throw createHttpError(500, `Failed to fetch order products: ${orderProductsError.message}`);
    }

    // Fetch product details
    const productIds = orderProducts.map((op) => op.productId);
    const { data: products, error: productsError } = await supabase
      .from('product')
      .select('productId, name')
      .in('productId', productIds);

    if (productsError) {
      throw createHttpError(500, `Failed to fetch product details: ${productsError.message}`);
    }

    // Calculate statistics

    // Map productId to product name
    const productIdToName = {};
    products.forEach((product) => {
      productIdToName[product.productId] = product.name;
    });

    // Calculate top three items
    const itemFrequency = {};
    orderProducts.forEach((op) => {
      const productName = productIdToName[op.productId];
      if (productName) {
        itemFrequency[productName] = (itemFrequency[productName] || 0) + op.quantity;
      }
    });

    const topThreeItems = Object.entries(itemFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([itemName]) => itemName);

    // Calculate number of orders per month (past 12 months)
    const numOrdersMonthly = new Array(12).fill(0);
    const currentDate = new Date();
    orders.forEach((order) => {
      const orderDate = new Date(order.order_date);
      const monthDiff = (currentDate.getFullYear() - orderDate.getFullYear()) * 12 + (currentDate.getMonth() - orderDate.getMonth());
      if (monthDiff >= 0 && monthDiff < 12) {
        numOrdersMonthly[11 - monthDiff]++;
      }
    });

    // Calculate total orders
    const totalOrders = orders.length;

    // Calculate total amount for the month
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const totalAmountMonth = orders
      .filter((order) => {
        const orderDate = new Date(order.order_date);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      })
      .reduce((total, order) => total + (order.cost || 0), 0);

    // Return the statistics
    return {
      topThreeItems,
      numOrdersMonthly,
      totalOrders,
      totalAmountMonth,
    };
  } catch (error) {
    if (!error.status) {
      throw createHttpError(500, 'Unexpected server error: ' + error.message);
    }
    throw error;
  }
};
