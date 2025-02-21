import express from 'express';
import { userLogin, userSignup} from '../controller/LoginController.js';
const router = express.Router();

//login route
router.post('/login', userLogin);


//Register
router.post('/register', userSignup);

export default router;