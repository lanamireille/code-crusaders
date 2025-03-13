import axios from 'axios';
import config from '../config/test.json';

const port = config.port;
const url = config.url;
const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 10000;

export const requestHelper = async (method, path, payload = {}, token = '') => {
  try {
    const response = await axios({
      method,
      url: `${SERVER_URL}${path}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      timeout: TIMEOUT_MS,
      ...(method.toUpperCase() === 'GET' || method.toUpperCase() === 'DELETE'
        ? { params: payload }  // Use `params` for GET & DELETE requests
        : { data: payload })   // Use `data` for POST, PUT, etc.
    });
    return {
      statusCode: response.status,
      body: response.data,
      headers: response.headers
    };
  } catch (error) {
    return {
      statusCode: error.response?.status || 500,
      body: error.response?.data || { message: 'Internal Server Error' },
      headers: error.response.headers
    };
  }
};

// API Requests

export const orderFormCreateRequest = async (jsonOrderForm, token) =>
  requestHelper('POST', '/v1/order/create/form', jsonOrderForm, token);

export const orderFormUpdateRequest = async (orderId, jsonOrderForm, token) =>
  requestHelper('PUT', `/v1/order/${orderId}`, jsonOrderForm, token);

export const registerUserRequest = async (email, password, nameFirst, nameLast) =>
  requestHelper('POST', '/v1/user/register', { email, password, nameFirst, nameLast });

export const loginUserRequest = async (email, password) =>
  requestHelper('POST', '/v1/user/login', { email, password });

export const logoutUserRequest = async (token) =>
  requestHelper('POST', '/v1/user/logout', {}, token);

export const orderBulkCreateRequest = async (jsonOrderList, token) =>
  requestHelper('POST', '/v1/order/create/bulk', jsonOrderList, token);

export const getUserDetailsRequest = async (token) =>
  requestHelper('GET', '/v1/user/details', {}, token);

export const getOrderFromOrderIdRequest = (orderId, token) => {
  return requestHelper('GET', `/v1/order/${orderId}`, {}, token);
}

export const orderDeleteRequest = async (orderId, token) =>
  requestHelper('DELETE', `/v1/order/${orderId}`, {}, token);
