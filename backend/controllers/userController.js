import validator from 'validator'
import bcrypt from 'bcrypt'
import userModel from '../models/userModel.js'
import productModel from '../models/productModel.js'
import cartModel from '../models/cartModel.js'
import orderModel from '../models/orderModel.js'
import jwt from 'jsonwebtoken'
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECERT
});

export const registerUser = async (req, res) => {
    try {
        const { username, email, phone, password_1, password_2 } = req.body


        if (!username || !email || !phone || !password_1 || !password_2 ) {
            return res.json({ success: false, message: 'Please Fill In All Information' })
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Please Enter Valid Email" })
        }

        const isUser = await userModel.findOne({ email })

        if (isUser) {
            return res.json({ success: false, message: 'This email already exists' })
        }
        const isUsername = await userModel.findOne({ username })
        if (isUsername) {
            return res.json({ success: false, message: 'Username already exists' })
        }

        const isPhone = await userModel.findOne({ phone })
        if (isPhone) {
            return res.json({ success: false, message: 'This phone number already exists' })
        }

        if (phone.length !== 10) {
            return res.json({ success: false, message: 'Please Enter Valid Phone Number ' })
        }

        if (password_1.length < 3) {
            return res.json({ success: false, message: 'Password Not Strong Enough' })
        }

        if (password_1 !== password_2) {
            return res.json({ success: false, message: 'Passwords Are Not The Same' })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password_1, salt)

        const userData = {
            name: username,
            username,
            email,
            phone,
            password: hashedPassword,
        }

        const newUser = new userModel(userData)
        await newUser.save()

        res.json({ success: true })

    } catch (error) {
        console.log(error)
        res.status(400).json({ success: false, message: error.message })
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.json({ success: false, message: 'missing email or password' })
        }

        const user = await userModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: 'email not found' })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.json({ success: false, message: 'wrong password' })
        }

        const accesstoken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN_SECERT)

        return res.json({ success: true, message: 'login success', accesstoken })
    }
    catch (error) {
        console.log(error)
        res.status(400).json({ success: false, message: 'Some thing wrong' })
    }
}

// api get user
export const getUser = async (req, res) => {
    try {
        console.log('Getting user with req.user:', req.user);
        
        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: 'Không tìm thấy thông tin người dùng'
            });
        }

        const user = await userModel.findById(req.user.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        res.json({ 
            success: true, 
            user 
        });
    }
    catch (error) {
        console.log('Error in getUser:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
}

// api update profile
export const updateProfile = async (req, res) => {
    try {
        const { userId, name, phone, address } = req.body;
        const image = req.file;

        console.log(userId);
        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (name) {
            await userModel.findByIdAndUpdate(userId, { name });
        }

        if (phone) {
            await userModel.findByIdAndUpdate(userId, { phone });
        }
        if (address) {
            await userModel.findByIdAndUpdate(userId, { address });
        }
        if (image) {
            // Upload image to Cloudinary
            const imageUpload = await cloudinary.uploader.upload(image.path, { resource_type: "image" });
            const imageUrl = imageUpload.secure_url;

            await userModel.findByIdAndUpdate(userId, { image: imageUrl });
        }

        res.json({ success: true, message: "Profile updated" });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const listProduct = async (req, res) => {
    try {
        const products = await productModel.find();
        res.json({ success: true, products });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};


// Add item to cart
export const addToCart = async (req, res) => {
    try {
        console.log('Add to cart request:', {
            body: req.body,
            user: req.user,
            headers: req.headers
        });

        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: 'Người dùng chưa đăng nhập'
            });
        }

        const { productId, quantity } = req.body;
        if (!productId || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin sản phẩm hoặc số lượng'
            });
        }

        // Tìm sản phẩm để lấy giá
        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        // Tìm giỏ hàng của user
        let cart = await cartModel.findOne({ userId: req.user.userId });
        
        if (!cart) {
            // Tạo giỏ hàng mới nếu chưa có
            cart = new cartModel({
                userId: req.user.userId,
                items: [{
                    productId: productId,
                    quantity: quantity,
                    price: product.price
                }],
                totalAmount: product.price * quantity
            });
        } else {
            // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
            const existingItem = cart.items.find(item => 
                item.productId.toString() === productId
            );

            if (existingItem) {
                // Cập nhật số lượng nếu sản phẩm đã tồn tại
                existingItem.quantity += quantity;
                existingItem.price = product.price;
            } else {
                // Thêm sản phẩm mới vào giỏ hàng
                cart.items.push({
                    productId: productId,
                    quantity: quantity,
                    price: product.price
                });
            }

            // Tính lại tổng tiền
            cart.totalAmount = cart.items.reduce((total, item) => {
                const itemTotal = (item.price || 0) * (item.quantity || 0);
                console.log('Item price:', item.price, 'quantity:', item.quantity, 'total:', itemTotal);
                return total + itemTotal;
            }, 0);
        }

        await cart.save();

        res.json({
            success: true,
            message: 'Thêm vào giỏ hàng thành công',
            cart
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi thêm vào giỏ hàng',
            error: error.message
        });
    }
};

// Edit item in cart (update quantity)
export const editCart = async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('User:', req.user);

        const { productId, quantity } = req.body;
        const { userId } = req.user;

        // Kiểm tra chi tiết hơn
        if (!productId) {
            return res.json({ success: false, message: 'Vui lòng chọn sản phẩm cần cập nhật' });
        }

        // Chuyển đổi quantity thành số và kiểm tra
        const quantityNumber = Number(quantity);
        if (isNaN(quantityNumber) || quantityNumber < 0) {
            return res.json({ 
                success: false, 
                message: 'Số lượng không hợp lệ. Vui lòng nhập số lớn hơn hoặc bằng 0',
                receivedQuantity: quantity
            });
        }

        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            return res.json({ success: false, message: 'Không tìm thấy giỏ hàng' });
        }

        const index = cart.items.findIndex(item => item.productId.toString() === productId);
        if (index > -1) {
            if (quantityNumber === 0) {
                // Nếu số lượng là 0, xóa sản phẩm khỏi giỏ hàng
                cart.items.splice(index, 1);
                await cart.save();
                return res.json({ 
                    success: true, 
                    message: 'Đã xóa sản phẩm khỏi giỏ hàng',
                    cart,
                    removed: true
                });
            } else {
                // Cập nhật số lượng mới
                cart.items[index].quantity = quantityNumber;
                await cart.save();
                return res.json({ 
                    success: true, 
                    message: 'Đã cập nhật giỏ hàng thành công', 
                    cart,
                    updatedItem: cart.items[index]
                });
            }
        } else {
            return res.json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ hàng' });
        }

    } catch (error) {
        console.log('Error in editCart:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};


// Remove item from cart
export const removeFromCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const { userId } = req.user; // Lấy userId từ req.user thay vì req.body

        if (!productId) {
            return res.json({ success: false, message: 'Thiếu ID sản phẩm' });
        }

        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            return res.json({ success: false, message: 'Không tìm thấy giỏ hàng' });
        }

        // Tìm sản phẩm trong giỏ và xóa nó
        const index = cart.items.findIndex(item => item.productId.toString() === productId);
        if (index > -1) {
            cart.items.splice(index, 1); // Xóa sản phẩm khỏi giỏ
            await cart.save();
            return res.json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng', cart });
        } else {
            return res.json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ hàng' });
        }

    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};


// Clear all items in cart
export const clearCart = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.json({ success: false, message: 'User ID is required' });
        }

        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            return res.json({ success: false, message: 'Cart not found' });
        }

        // Xóa toàn bộ giỏ hàng của người dùng
        cart.items = [];
        await cart.save();

        res.json({ success: true, message: 'Cart cleared', cart });

    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get cart items
export const getCart = async (req, res) => {
    try {
        console.log('Request user:', req.user);

        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: 'Không tìm thấy thông tin người dùng'
            });
        }

        const userId = req.user.userId;
        console.log('Getting cart for user:', userId);

        const cart = await cartModel.findOne({ userId }).populate('items.productId');
        console.log('Found cart:', cart);

        if (!cart) {
            // Nếu không tìm thấy giỏ hàng, tạo giỏ hàng mới
            const newCart = new cartModel({
                userId,
                items: []
            });
            await newCart.save();
            return res.json({ 
                success: true, 
                message: 'Giỏ hàng trống',
                cart: newCart 
            });
        }

        // Tính tổng tiền
        const totalAmount = cart.items.reduce((sum, item) => {
            return sum + (item.productId.price * item.quantity);
        }, 0);

        // Cập nhật tổng tiền vào giỏ hàng
        cart.totalAmount = totalAmount;
        await cart.save();

        return res.json({ 
            success: true, 
            message: 'Lấy giỏ hàng thành công',
            cart 
        });
    } catch (error) {
        console.error('Error in getCart:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy giỏ hàng',
            error: error.message 
        });
    }
};

// Tạo đơn hàng mới
export const createOrder = async (req, res) => {
    try {
        const {
            userId,
            shippingAddress,
            paymentMethod,
            items
        } = req.body;

        if (!userId || !shippingAddress || !paymentMethod || !items || items.length === 0) {
            return res.json({ success: false, message: 'Vui lòng điền đầy đủ thông tin đơn hàng' });
        }

        // Kiểm tra phương thức thanh toán
        if (!['COD', 'QR_PAYMENT'].includes(paymentMethod)) {
            return res.json({ success: false, message: 'Phương thức thanh toán không hợp lệ' });
        }

        // Tính tổng tiền
        const totalPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);

        const order = new orderModel({
            user: userId,
            orderItems: items,
            shippingAddress,
            paymentMethod,
            totalPrice,
            paymentStatus: paymentMethod === 'COD' ? 'pending' : 'pending'
        });

        // Nếu thanh toán qua QR, tạo mã QR và thông tin thanh toán
        if (paymentMethod === 'QR_PAYMENT') {
            // Đây là nơi bạn sẽ tích hợp với cổng thanh toán
            // Đây là dữ liệu mẫu cho thông tin thanh toán QR
            order.paymentResult = {
                qrCode: 'https://example.com/qr-code', // Thay thế bằng mã QR thực tế
                qrExpiryTime: new Date(Date.now() + 15 * 60 * 1000), // Hết hạn sau 15 phút
                bankName: 'Ngân hàng ABC',
                accountNumber: '1234567890',
                accountName: 'Tên Cửa Hàng Của Bạn'
            };
        }

        await order.save();

        // Xóa giỏ hàng sau khi đặt hàng thành công
        await cartModel.findOneAndUpdate(
            { userId },
            { $set: { items: [], totalPrice: 0, totalItems: 0 } }
        );

        res.json({ 
            success: true, 
            message: 'Đặt hàng thành công', 
            order,
            paymentDetails: paymentMethod === 'QR_PAYMENT' ? order.paymentResult : null
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: 'Có lỗi xảy ra khi tạo đơn hàng' });
    }
};

// Get user's orders
export const getUserOrders = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.json({ success: false, message: 'User ID is required' });
        }

        const orders = await orderModel.find({ user: userId })
            .sort({ createdAt: -1 }); // Sort by newest first

        res.json({ success: true, orders });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get single order details
export const getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { userId } = req.body;

        if (!orderId || !userId) {
            return res.json({ success: false, message: 'Order ID and User ID are required' });
        }

        const order = await orderModel.findOne({
            _id: orderId,
            user: userId
        });

        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!orderId || !status) {
            return res.json({ success: false, message: 'Order ID and status are required' });
        }

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }

        order.status = status;
        
        // Update delivery status if order is delivered
        if (status === 'delivered') {
            order.isDelivered = true;
            order.deliveredAt = Date.now();
        }

        await order.save();
        res.json({ success: true, message: 'Order status updated', order });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// Cập nhật trạng thái thanh toán
export const updatePaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentStatus, paymentResult } = req.body;

        if (!orderId || !paymentStatus) {
            return res.json({ success: false, message: 'Vui lòng cung cấp ID đơn hàng và trạng thái thanh toán' });
        }

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        // Kiểm tra trạng thái thanh toán
        if (!['pending', 'paid', 'failed', 'refunded'].includes(paymentStatus)) {
            return res.json({ success: false, message: 'Trạng thái thanh toán không hợp lệ' });
        }

        order.paymentStatus = paymentStatus;
        
        if (paymentStatus === 'paid') {
            order.isPaid = true;
            order.paidAt = Date.now();
            if (paymentResult) {
                order.paymentResult = {
                    ...order.paymentResult,
                    ...paymentResult,
                    status: 'completed',
                    update_time: new Date().toISOString()
                };
            }
        } else if (paymentStatus === 'failed') {
            order.paymentResult = {
                ...order.paymentResult,
                status: 'failed',
                update_time: new Date().toISOString()
            };
        }

        await order.save();
        res.json({ success: true, message: 'Cập nhật trạng thái thanh toán thành công', order });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: 'Có lỗi xảy ra khi cập nhật trạng thái thanh toán' });
    }
};

// Xác minh thanh toán QR
export const verifyQRPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { transactionId } = req.body;

        if (!orderId || !transactionId) {
            return res.json({ success: false, message: 'Vui lòng cung cấp ID đơn hàng và ID giao dịch' });
        }

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        if (order.paymentMethod !== 'QR_PAYMENT') {
            return res.json({ success: false, message: 'Đơn hàng này không phải thanh toán qua QR' });
        }

        // Kiểm tra mã QR đã hết hạn chưa
        if (order.paymentResult.qrExpiryTime < new Date()) {
            return res.json({ success: false, message: 'Mã QR đã hết hạn' });
        }

        // Đây là nơi bạn sẽ xác minh thanh toán với cổng thanh toán
        // Đây là mã mẫu cho việc xác minh thanh toán
        order.paymentStatus = 'paid';
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = {
            ...order.paymentResult,
            id: transactionId,
            status: 'completed',
            update_time: new Date().toISOString()
        };

        await order.save();
        res.json({ success: true, message: 'Xác minh thanh toán thành công', order });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: 'Có lỗi xảy ra khi xác minh thanh toán' });
    }
};

// Lấy thông tin thanh toán
export const getPaymentDetails = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.json({ success: false, message: 'Vui lòng cung cấp ID đơn hàng' });
        }

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        const paymentDetails = {
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            totalPrice: order.totalPrice,
            isPaid: order.isPaid,
            paidAt: order.paidAt
        };

        if (order.paymentMethod === 'QR_PAYMENT') {
            paymentDetails.qrDetails = {
                qrCode: order.paymentResult.qrCode,
                qrExpiryTime: order.paymentResult.qrExpiryTime,
                bankName: order.paymentResult.bankName,
                accountNumber: order.paymentResult.accountNumber,
                accountName: order.paymentResult.accountName
            };
        }

        res.json({ success: true, paymentDetails });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: 'Có lỗi xảy ra khi lấy thông tin thanh toán' });
    }
};

// Thêm đánh giá sản phẩm
export const addProductReview = async (req, res) => {
    try {
        const { orderId, productId, rating, comment } = req.body;
        const images = req.files; // Nếu có upload ảnh

        if (!orderId || !productId || !rating) {
            return res.json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin đánh giá' });
        }

        // Kiểm tra rating hợp lệ
        if (rating < 1 || rating > 5) {
            return res.json({ success: false, message: 'Đánh giá phải từ 1 đến 5 sao' });
        }

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        // Kiểm tra xem đơn hàng đã được giao chưa
        if (!order.isDelivered) {
            return res.json({ success: false, message: 'Chỉ có thể đánh giá sau khi nhận hàng' });
        }

        // Tìm sản phẩm trong đơn hàng
        const orderItem = order.orderItems.find(
            item => item.product.toString() === productId
        );

        if (!orderItem) {
            return res.json({ success: false, message: 'Không tìm thấy sản phẩm trong đơn hàng' });
        }

        // Kiểm tra xem đã đánh giá chưa
        if (orderItem.review) {
            return res.json({ success: false, message: 'Bạn đã đánh giá sản phẩm này' });
        }

        // Xử lý upload ảnh nếu có
        let reviewImages = [];
        if (images && images.length > 0) {
            for (const image of images) {
                const result = await cloudinary.uploader.upload(image.path, {
                    folder: 'reviews'
                });
                reviewImages.push(result.secure_url);
            }
        }

        // Thêm đánh giá
        orderItem.review = {
            rating,
            comment,
            images: reviewImages,
            createdAt: new Date()
        };

        await order.save();

        // Cập nhật đánh giá trung bình của sản phẩm
        const product = await productModel.findById(productId);
        if (product) {
            const allOrders = await orderModel.find({
                'orderItems.product': productId,
                'orderItems.review': { $exists: true }
            });

            const totalRatings = allOrders.reduce((sum, order) => {
                const item = order.orderItems.find(item => item.product.toString() === productId);
                return sum + (item.review ? item.review.rating : 0);
            }, 0);

            const reviewCount = allOrders.length;
            product.averageRating = totalRatings / reviewCount;
            await product.save();
        }

        res.json({ 
            success: true, 
            message: 'Đánh giá thành công',
            review: orderItem.review
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: 'Có lỗi xảy ra khi thêm đánh giá' });
    }
};

// Lấy đánh giá của sản phẩm
export const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;

        const orders = await orderModel.find({
            'orderItems.product': productId,
            'orderItems.review': { $exists: true }
        }).populate('user', 'username image');

        const reviews = orders.map(order => {
            const item = order.orderItems.find(item => item.product.toString() === productId);
            return {
                user: order.user,
                rating: item.review.rating,
                comment: item.review.comment,
                images: item.review.images,
                createdAt: item.review.createdAt
            };
        });

        res.json({ success: true, reviews });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: 'Có lỗi xảy ra khi lấy đánh giá' });
    }
};

// Cập nhật đánh giá
export const updateProductReview = async (req, res) => {
    try {
        const { orderId, productId, rating, comment } = req.body;
        const images = req.files;

        if (!orderId || !productId || !rating) {
            return res.json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin đánh giá' });
        }

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        const orderItem = order.orderItems.find(
            item => item.product.toString() === productId
        );

        if (!orderItem || !orderItem.review) {
            return res.json({ success: false, message: 'Không tìm thấy đánh giá' });
        }

        // Xử lý upload ảnh mới nếu có
        let reviewImages = orderItem.review.images || [];
        if (images && images.length > 0) {
            for (const image of images) {
                const result = await cloudinary.uploader.upload(image.path, {
                    folder: 'reviews'
                });
                reviewImages.push(result.secure_url);
            }
        }

        // Cập nhật đánh giá
        orderItem.review = {
            ...orderItem.review,
            rating,
            comment,
            images: reviewImages,
            updatedAt: new Date()
        };

        await order.save();

        // Cập nhật đánh giá trung bình của sản phẩm
        const product = await productModel.findById(productId);
        if (product) {
            const allOrders = await orderModel.find({
                'orderItems.product': productId,
                'orderItems.review': { $exists: true }
            });

            const totalRatings = allOrders.reduce((sum, order) => {
                const item = order.orderItems.find(item => item.product.toString() === productId);
                return sum + (item.review ? item.review.rating : 0);
            }, 0);

            const reviewCount = allOrders.length;
            product.averageRating = totalRatings / reviewCount;
            await product.save();
        }

        res.json({ 
            success: true, 
            message: 'Cập nhật đánh giá thành công',
            review: orderItem.review
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: 'Có lỗi xảy ra khi cập nhật đánh giá' });
    }
};
