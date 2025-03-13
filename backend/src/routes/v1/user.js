import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import { 
	registerUser,
	loginUser,
  logoutUser,
	getUserDetails
} from '../../controllers/userController.js';
import cookieParser from 'cookie-parser';

// cookies omnom
const app = express();
app.use(cookieParser());

const router = express.Router();

// !!! this file is just for parsing the request and sending a response. the actual logic should be implemented in controllers. !!! //

// *************** USER AUTHENTICATION *************** //

// POST /v1/user/register
router.post('/register', async (req, res) => {
  const { email, password, nameFirst, nameLast } = req.body;

  try {
    const response = await registerUser(email, password, nameFirst, nameLast);
     // set cookie 
    res.cookie('authToken', response.token, { httpOnly: true, secure: true });
    res.status(200).json(response);
  } catch (error) {
    if (error.status) {
      res.status(error.status).json({ error: error.message });
	  } else {
      // unknown error
      res.status(500).json({ error: 'Unexpected server error' });
	  }
  }
});

// POST /v1/user/login
router.post('/login', async (req, res) => {
	const { email, password } = req.body;

	try {
		const response = await loginUser(email, password);
    // set cookie 
    res.cookie('authToken', response.token, { httpOnly: true, secure: true });
		res.status(200).json(response);
	} catch (error) {
    if (error.status) {
      res.status(error.status).json({ error: error.message });
	  } else {
      // unknown error
      res.status(500).json({ error: 'Unexpected server error' });
	  }
  }
});

// POST /v1/user/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const response = await logoutUser(req, res);
    res.status(200).json(response);
  } catch (error) {
    if (error.status) {
      res.status(error.status).json({ error: error.message });
	  } else {
      // unknown error
      res.status(500).json({ error: 'Unexpected server error' });
	  }
  }
});


// *************** PASSWORD MANAGEMENT *************** //

// POST /v1/user/forgot
router.post('/forgot', (req, res) => {
	// replace the following with actual logic
	res.json({ message: 'Temporary code sent successfully' });
});

// POST /v1/user/reset
router.post('/reset', (req, res) => {
	// replace the following with actual logic
	res.json({ message: 'Password reset successfully' });
});

// *************** USER INFORMATION *************** //

// GET /v1/user/details
router.get('/details', authMiddleware, async (req, res) => {
	try {
		const response = await getUserDetails(req.user.email);
		res.status(200).json(response);
	} catch (error) {
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// PUT /v1/user/details
router.put('/details', authMiddleware, (req, res) => {
	// replace the following with actual logic
	res.json({ message: 'User details updated successfully' });
});

// GET /v1/user/statistics
router.get('/statistics', authMiddleware, (req, res) => {
	// replace the following with actual logic
	res.json({ message: 'User statistics fetched successfully' });
});


export default router;
