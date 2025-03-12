import express, { json } from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import { orderFormCreate, orderFormUpdate, isOrderIdValid } from '../../controllers/orderController.js';
import orderSchema from '../../schemas/orderSchema.js';
const router = express.Router();

// !!! this file is just for parsing the request and sending a response (see the first route for an example). the actual logic should be implemented in controllers. !!! //

// *************** CREATE ORDERS *************** //

router.post('/create/form', authMiddleware, async (req, res) => {
  try {
    // validate request body
    const { error } = orderSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ error: `Validation Error: ${error.message}` });
    }

    // get response from controller
    const response = await orderFormCreate(req.body);

    // send response
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /v1/order/create/bulk
router.post('/create/bulk', authMiddleware, async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Invalid orderList given' });
    } else {
      let orderIds = [];
      for (const order of orders) {
        const { error } = orderSchema.validate(order);
        if (error) {
          return res.status(400).json({ error: `Validation Error: ${error.message}` });
        } else {
          const response = await orderFormCreate(order);
          orderIds.push(response.orderId);
        }
      }
      return res.status(200).json({ orderIds });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /v1/order/create/pdf
router.post('/create/pdf', authMiddleware, (req, res) => {
  // replace the following with actual logic
  res.json({ message: 'Order PDF uploaded successfully' });
});

// **************** SEND ORDERS **************** //

// POST /v1/order/send
router.post('/send', authMiddleware, (req, res) => {
  // replace the following with actual logic
  res.json({ message: 'Order sent successfully' });
});

// GET /v1/order/sent/list
router.get('/sent/list', authMiddleware, (req, res) => {
  // replace the following with actual logic
  res.json({ message: 'Sent orders list fetched successfully' });
});

// DELETE /v1/order/sent/{orderId}
router.delete('/sent/:orderId', authMiddleware, (req, res) => {
  const { orderId } = req.params;

  // replace the following with actual logic
  res.json({ message: 'Sent order deleted successfully' });
});

// ************** RECEIVED ORDERS ************** //

// GET /v1/order/received/list
router.get('/received/list', authMiddleware, async (req, res) => {
  try {
    const userId = req.authUserId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorised Request' });
    }

    const ublOrderDocuments = await getUserUblOrders(userId);

    if (!Array.isArray(ublOrderDocuments)) {
      return res.status(400).json({ error: 'Client error: Failed to retrieve order' });
    }

    res.status(200).json({ ublOrderDocuments });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' })
  }
  
  res.json({ message: 'Received orders list fetched successfully' });
});

// DELETE /v1/order/received/{orderId}
router.delete('/received/:orderId', authMiddleware, (req, res) => {
  const { orderId } = req.params;

  // replace the following with actual logic
  res.json({ message: 'Received order deleted successfully' });
});

// *************** GETTING ORDERS *************** //

// GET /v1/order/list
router.get('/list', authMiddleware, (req, res) => {
  // replace the following with actual logic
  res.json({ message: 'Order list fetched successfully' });
});

// GET /v1/order/{orderId}
router.get('/:orderId', authMiddleware, (req, res) => {
  const { orderId } = req.params;

  // replace the following with actual logic
  res.json({ message: `Order details for ${orderId} fetched successfully` });
});

// GET /v1/order/{orderId}/pdf
router.get('/:orderId/pdf', authMiddleware, (req, res) => {
  const { orderId } = req.params;

  // replace the following with actual logic
  res.json({ message: `Order PDF for ${orderId} downloaded successfully` });
});

// *************** UPDATE ORDERS *************** //

// PUT /v1/order/{orderId}
router.put('/:orderId', authMiddleware, async (req, res) => {
  const  orderId  = parseInt(req.params.orderId);

  try {
    // validate request body and order id
    const { error } = orderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: `Validation Error: ${error.message}` });
    }
    const isValid = await isOrderIdValid(orderId);
    if (!isValid) {
      return res.status(400).json({ error: `Invalid orderId given` });
    }

    // get response from controller
    const response = await orderFormUpdate(orderId, req.body);

    // send response
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /v1/order/{orderId}
router.delete('/:orderId', authMiddleware, (req, res) => {
  const { orderId } = req.params;

  // replace the following with actual logic
  res.json({ message: 'Order deleted successfully' });
});

export default router;