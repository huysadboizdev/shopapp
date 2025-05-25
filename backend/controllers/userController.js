import validator from 'validator'
import bcrypt from 'bcrypt'
import userModel from '../models/userModel.js'
import productModel from '../models/productModel.js'
import cartModel from '../models/cartModel.js'
import orderModel from '../models/orderModel.js'
import jwt from 'jsonwebtoken'
import { v2 as cloudinary } from 'cloudinary';
import Review from '../models/reviewModel.js';

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

// Checkout (Create order)
export const checkout = async (req, res) => {
    try {
        const { paymentMethod, address, phone } = req.body;
        const userId = req.user.userId;

        console.log('Checkout request - UserId:', userId);
        console.log('Checkout request - Body:', req.body);

        // Lấy giỏ hàng của người dùng
        const cart = await cartModel.findOne({ userId }).populate('items.productId');
        console.log('Found cart:', cart);

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Giỏ hàng trống' 
            });
        }

        // Tính tổng tiền
        const totalAmount = cart.items.reduce((sum, item) => {
            return sum + (item.productId.price * item.quantity);
        }, 0);

        // Tạo đơn hàng mới
        const order = new orderModel({
            userId,
            items: cart.items.map(item => ({
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.productId.price
            })),
            totalAmount,
            paymentMethod,
            address,
            phone,
            note: req.body.note || '',
            status: 'Pending'
        });

        // Lưu đơn hàng
        await order.save();

        // Xóa giỏ hàng
        await cartModel.findOneAndDelete({ userId });

        return res.status(200).json({
            success: true,
            message: 'Đặt hàng thành công',
            order
        });

    } catch (error) {
        console.error('Error in checkout:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi đặt hàng',
            error: error.message
        });
    }
};


// Tạo đơn hàng mới
export const createOrder = async (req, res) => {
    try {
        const {
            items,
            shippingAddress,
            paymentMethod,
            note,
            totalAmount
        } = req.body;

        const userId = req.user.userId;

        if (!items || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng thêm sản phẩm vào đơn hàng' 
            });
        }

        if (!shippingAddress || !shippingAddress.address || !shippingAddress.phone) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp đầy đủ thông tin giao hàng' 
            });
        }

        if (!paymentMethod) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng chọn phương thức thanh toán' 
            });
        }

        // Lấy thông tin sản phẩm để tạo orderItems
        const orderItems = await Promise.all(items.map(async (item) => {
            const product = await productModel.findById(item.product);
            return {
                name: product.name,
                quantity: item.quantity,
                image: product.image,
                price: item.price,
                product: item.product,
                size: product.size[0], // Lấy size đầu tiên làm mặc định
                color: product.color
            };
        }));

        // Tạo đơn hàng mới
        const order = new orderModel({
            user: userId,
            orderItems,
            shippingAddress,
            paymentMethod,
            note: note || '',
            totalPrice: totalAmount,
            status: 'Pending'
        });

        // Lưu đơn hàng
        await order.save();

        // Xóa giỏ hàng sau khi đặt hàng thành công
        await cartModel.findOneAndUpdate(
            { userId },
            { $set: { items: [], totalAmount: 0 } }
        );

        res.status(201).json({
            success: true,
            message: 'Đặt hàng thành công',
            order
        });

    } catch (error) {
        console.error('Error in createOrder:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo đơn hàng',
            error: error.message
        });
    }
};

// Get user's orders
export const getUserOrders = async (req, res) => {
    try {
        console.log('Getting orders for user:', req.user);
        const userId = req.user.userId;

        // Lấy danh sách đơn hàng và populate thông tin sản phẩm
        const orders = await orderModel.find({ user: userId })
            .populate('orderItems.product')
            .sort({ createdAt: -1 });

        console.log('Found orders:', orders);

        return res.status(200).json({
            success: true,
            message: "Lấy danh sách đơn hàng thành công",
            orders
        });
    } catch (error) {
        console.error("Error in getUserOrders:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách đơn hàng",
            error: error.message
        });
    }
};

// Cancel order
export const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.userId;

        console.log('Cancelling order:', { orderId, userId });

        // Tìm đơn hàng trước khi cập nhật
        const order = await orderModel.findOne({ _id: orderId, user: userId });
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Kiểm tra trạng thái trước khi cập nhật
        if (order.status === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng đã được hủy trước đó'
            });
        }

        if (order.status === 'Successful') {
            return res.status(400).json({
                success: false,
                message: 'Không thể hủy đơn hàng đã hoàn thành'
            });
        }

        // Cập nhật trạng thái đơn hàng
        const updatedOrder = await orderModel.findOneAndUpdate(
            { _id: orderId, user: userId },
            { $set: { status: 'Cancelled' } },
            { new: true, runValidators: false }
        );

        res.json({
            success: true,
            message: 'Hủy đơn hàng thành công',
            order: updatedOrder
        });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hủy đơn hàng',
            error: error.message
        });
    }
};

// Get order details
export const getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.userId;

        // Tìm đơn hàng theo id và kiểm tra quyền sở hữu
        const order = await orderModel.findOne({ _id: orderId, user: userId })
            .populate('items.productId');

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Lấy thông tin đơn hàng thành công',
            order 
        });

    } catch (error) {
        console.error('Error in getOrderDetails:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy thông tin đơn hàng',
            error: error.message 
        });
    }
};

// Update order status (for admin)
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        // Kiểm tra trạng thái hợp lệ
        const validStatuses = ['Pending', 'Accepted', 'Delivery', 'Successful', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái không hợp lệ'
            });
        }

        const order = await orderModel.findByIdAndUpdate(
            orderId,
            { status },
            { new: true }
        ).populate('items.productId');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật trạng thái đơn hàng thành công',
            order
        });

    } catch (error) {
        console.error('Error in updateOrderStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái đơn hàng',
            error: error.message
        });
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

export const submitReview = async (req, res) => {
  try {
    const { orderId, rating, comment, products } = req.body;
    const userId = req.user.userId;

    // Kiểm tra đơn hàng
    const order = await orderModel.findOne({
      _id: orderId,
      user: userId,
      status: 'Success'
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng hoặc đơn hàng chưa hoàn thành'
      });
    }

    // Kiểm tra xem đã đánh giá chưa
    const existingReview = await Review.findOne({ order: orderId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đánh giá đơn hàng này rồi'
      });
    }

    // Tạo đánh giá cho từng sản phẩm
    const reviewPromises = products.map(product => {
      const review = new Review({
        user: userId,
        order: orderId,
        product: product.productId,
        rating: product.rating,
        comment: product.comment
      });
      return review.save();
    });

    await Promise.all(reviewPromises);

    // Cập nhật trạng thái đã đánh giá cho đơn hàng
    order.isReviewed = true;
    await order.save();

    res.json({
      success: true,
      message: 'Cảm ơn bạn đã đánh giá!'
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể gửi đánh giá'
    });
  }
};

// Lấy đánh giá của người dùng
export const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('Getting reviews for user:', userId);

    const reviews = await Review.find({ user: userId })
      .populate('product', 'name image price')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 });

    console.log('Found reviews:', reviews);

    res.json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('Error in getUserReviews:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đánh giá'
    });
  }
};

// Xóa đánh giá
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId;

    console.log('Deleting review:', { reviewId, userId });

    const review = await Review.findOne({ _id: reviewId, user: userId });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    await Review.findByIdAndDelete(reviewId);

    res.json({
      success: true,
      message: 'Xóa đánh giá thành công'
    });
  } catch (error) {
    console.error('Error in deleteReview:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa đánh giá'
    });
  }
};
