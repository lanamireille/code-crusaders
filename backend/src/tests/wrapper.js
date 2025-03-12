import config from '../config/test.json';
import request from 'sync-request';
const port = config.port;
const url = config.url;
const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 10000;

export const requestHelper = (
  method,
  path,
  payload,
  token
  //headers = {}
) => {
  let qs = {};
  let json = {};
  if (['GET', 'DELETE'].includes(method.toUpperCase())) {
    qs = payload;
  } else {
    // PUT/POST
    json = payload;
  }
  const url = SERVER_URL + path;
  const res = request(method, url, { qs, json, headers: {'Authorization': `Bearer ${token}`}, timeout: TIMEOUT_MS });
  return res;
};

export const orderFormCreateRequest = (jsonOrderForm, token) => {
  return requestHelper('POST', '/v1/order/create/form', jsonOrderForm, token);
}

// make ur wrapper functions here for user endpoints below!!!
// format the name of ur wrapper as <functionName>Request

export const orderFormUpdateRequest = (orderId, jsonOrderForm, token) => {
  return requestHelper('PUT', `/v1/order/${orderId}`, jsonOrderForm, token);
}

export const registerUserRequest = (email, password, nameFirst, nameLast) => {
  const payload = { email, password, nameFirst, nameLast };
  return requestHelper('POST', '/v1/user/register', payload);
};

export const loginUserRequest = (email, password) => {
  const payload = { email, password };
  return requestHelper('POST', '/v1/user/login', payload);
};

export const orderBulkCreateRequest = (jsonOrderList, token) => {
  return requestHelper('POST', `/v1/order/create/bulk`, jsonOrderList, token);
}

export const getUserDetailsRequest = (token) => {
  return requestHelper('GET', '/v1/user/details',{},token);
}

export const listReceivedOrdersRequest = (token) => {
  return requestHelper('GET', '/v1/order/received/list', {}, token);
}
