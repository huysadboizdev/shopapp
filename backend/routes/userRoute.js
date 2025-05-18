import express from 'express'
import multer from 'multer'
import authUser from '../middlewares/authUser.js'
import {
    login, 
    registerUser, 
    getUser, 
    updateProfile, 
    listProduct,
    addToCart,
    removeFromCart,
    getCart,
    editCart,
    createOrder,
    getUserOrders,
    getOrderDetails,
    updateOrderStatus,
    updatePaymentStatus,
    verifyQRPayment,
    getPaymentDetails,
    addProductReview,
    getProductReviews,
    updateProductReview
} from '../controllers/userController.js'

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

// api cart
userRouter.post('/add_cart', authUser, addToCart)
userRouter.delete('/remove_cart', authUser, removeFromCart)
userRouter.put('/edit_cart', authUser, editCart)
userRouter.get('/cart', authUser, getCart)

// api orders
userRouter.post('/orders', authUser, createOrder)
userRouter.get('/orders', authUser, getUserOrders)
userRouter.get('/orders/:orderId', authUser, getOrderDetails)
userRouter.put('/orders/:orderId/status', authUser, updateOrderStatus)
userRouter.put('/orders/:orderId/payment', authUser, updatePaymentStatus)
userRouter.post('/orders/:orderId/verify-payment', authUser, verifyQRPayment)
userRouter.get('/orders/:orderId/payment', authUser, getPaymentDetails)

// api reviews
userRouter.post('/reviews', authUser, upload.array('images', 5), addProductReview)
userRouter.get('/products/:productId/reviews', getProductReviews)
userRouter.put('/reviews', authUser, upload.array('images', 5), updateProductReview)

export default userRouter