import express from 'express';
import {login_admin, addProduct, editProduct, getAllUser, listProduct, deleteProduct, getDashboardStats, updateUser, deleteUser} from '../controllers/adminController.js';
import multer from 'multer';
import authAdmin from '../middlewares/authAdmin.js';

const adminRouter = express.Router();
const upload = multer({ dest: 'uploads/' });

// Public routes
adminRouter.post('/login', login_admin);

// Protected routes
adminRouter.get('/dashboard', authAdmin, getDashboardStats);
adminRouter.post('/add', authAdmin, upload.single('image'), addProduct);
adminRouter.post('/edit', authAdmin, upload.single('image'), editProduct); 
adminRouter.post('/delete', authAdmin, deleteProduct);
adminRouter.get('/list', authAdmin, listProduct);
adminRouter.get('/getuser', authAdmin, getAllUser);
adminRouter.post('/update-user', authAdmin, updateUser);
adminRouter.post('/delete-user', authAdmin, deleteUser);

export default adminRouter;