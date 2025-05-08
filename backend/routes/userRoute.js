import express from 'express'
import multer from 'multer'
import authUser from '../middlewares/authUser.js'
import {login, registerUser, getUser, updateProfile, listProduct } from '../controllers/userController.js'

const userRouter = express.Router()

const upload = multer({ dest: 'uploads/' });
// api login + register
userRouter.post('/register', registerUser)
userRouter.post('/login', login)
// api info user
userRouter.get('/get-user', authUser, getUser)
userRouter.put('/update-profile', authUser, upload.single('image'), updateProfile);
// api products
userRouter.get('/products', authUser, listProduct)

export default userRouter