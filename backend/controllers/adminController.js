import Product from '../models/productModel.js';
import userModel from '../models/userModel.js';
import orderModel from '../models/orderModel.js';
import Review from '../models/reviewModel.js';
import jwt from 'jsonwebtoken';
import cloudinary from 'cloudinary';

export const login_admin = async (req, res) => {
    try {
        const { email, password } = req.body

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const accesstoken = jwt.sign({ id: 'admin' }, process.env.ACCESS_TOKEN_SECERT);
            return res.json({ success: true, accesstoken });
        }

        res.json({ success: false, message: "Invalid credentials" });
    }
    catch (error) {
        console.log(error)
        res.status(400).json({ success: false, message: error.message })
    }
}

export const getAllUser = async (req, res) => {
    try {
        const users = await userModel.find()

        res.json({ success: true, users })
    }
    catch (error) {
        console.log(error)
        res.status(400).json({ success: false, message: error.message })
    }
}

export const addProduct = async (req, res) => {
    try {
        const { category, name, color, size, description, price, imageLink } = req.body;
        const image = req.file;

        if (!category || !name || !color || !size || !description || !price) {
            return res.json({ success: false, message: "Please Fill In All Information" });
        }

       
        const imageUrl = image ? image.path : imageLink || null;

        const newProduct = new Product({
            category,
            name,
            color,
            size,
            description,
            price,
            image: imageUrl,
        });

        await newProduct.save();

        res.json({ success: true, newProduct });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};


export const editProduct = async (req, res) => {
    try {
        const { productId, category, name, color, size, description, price, imageLink } = req.body;
        const image = req.file;

        if (!productId || !category || !name || !color || !size || !description || !price) {
            return res.json({ success: false, message: "Please Fill In All Information" });
        }

        const updateData = { category, name, color, size, description, price };


        if (image) {
            updateData.image = image.path;
        } else if (imageLink) {
            updateData.image = imageLink;
        }

        const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true });

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.json({ success: true, updatedProduct });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};


export const listProduct = async (req, res) => {
    try {
        const products = await Product.find();
        res.json({ success: true, products });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { productId } = req.body;
        await Product.findByIdAndDelete(productId);
        res.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getDashboardStats = async (req, res) => {
    try {
        // Get total products
        const totalProducts = await Product.countDocuments();
        
        // Get total users
        const totalUsers = await userModel.countDocuments();
        
        // Get products by category
        const productsByCategory = await Product.aggregate([
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get latest products
        const latestProducts = await Product.find()
            .sort({ createdAt: -1 })
            .limit(5);

        // Get latest users
        const latestUsers = await userModel.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('-password'); // Exclude password field

        res.json({
            success: true,
            stats: {
                totalProducts,
                totalUsers,
                productsByCategory,
                latestProducts,
                latestUsers
            }
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { userId, name, email, phone, address } = req.body;

        if (!userId) {
            return res.json({ success: false, message: "User ID is required" });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;
        if (address) updateData.address = address;

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.json({ success: false, message: "User not found" });
        }

        res.json({ success: true, updatedUser });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};


export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.json({ success: false, message: "User ID is required" });
        }

        const deletedUser = await userModel.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.json({ success: false, message: "User not found" });
        }

        res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getAllOrders = async (req, res) => {
    try {
        const orders = await orderModel.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        res.json({ success: true, orders });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await orderModel.findById(id)
            .populate('user', 'name email');

        if (!order) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, paymentStatus } = req.body;

        const validStatuses = ['Pending', 'Approved', 'Prepare', 'Delivered', 'Success', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: "Trạng thái không hợp lệ. Phải là một trong: " + validStatuses.join(', ') 
            });
        }

        const order = await orderModel.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
        }

        // Cập nhật trạng thái và các trường liên quan
        order.status = status;
        
        // Cập nhật isDelivered và deliveredAt nếu trạng thái là Delivered hoặc Success
        if (status === 'Delivered' || status === 'Success') {
            order.isDelivered = true;
            order.deliveredAt = Date.now();
        }

        // Cập nhật isPaid và paidAt nếu trạng thái là Success
        if (status === 'Success') {
            order.isPaid = true;
            order.paidAt = Date.now();
            order.paymentStatus = 'paid';
        }

        // Cập nhật paymentStatus nếu được cung cấp
        if (paymentStatus) {
            order.paymentStatus = paymentStatus;
        }

        // Cập nhật paymentStatus nếu đơn hàng bị hủy
        if (status === 'Cancelled') {
            order.paymentStatus = 'refunded';
        }

        await order.save();

        res.json({ success: true, order });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getOrderStats = async (req, res) => {
    try {
        // Get total orders
        const totalOrders = await orderModel.countDocuments();
        
        // Get orders by status
        const ordersByStatus = await orderModel.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get orders by payment method
        const ordersByPaymentMethod = await orderModel.aggregate([
            {
                $group: {
                    _id: "$paymentMethod",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get total revenue
        const totalRevenue = await orderModel.aggregate([
            {
                $match: {
                    status: 'Success'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalPrice" }
                }
            }
        ]);

        // Get latest orders
        const latestOrders = await orderModel.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            success: true,
            stats: {
                totalOrders,
                ordersByStatus,
                ordersByPaymentMethod,
                totalRevenue: totalRevenue[0]?.total || 0,
                latestOrders
            }
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('user', 'name email')
            .populate('product', 'name image')
            .populate('order', 'orderNumber')
            .sort({ createdAt: -1 });

        res.json({ success: true, reviews });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getReviewDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await Review.findById(id)
            .populate('user', 'name email')
            .populate('product', 'name image')
            .populate('order', 'orderNumber');

        if (!review) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đánh giá" });
        }

        res.json({ success: true, review });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.body;

        if (!reviewId) {
            return res.json({ success: false, message: "ID đánh giá là bắt buộc" });
        }

        const deletedReview = await Review.findByIdAndDelete(reviewId);

        if (!deletedReview) {
            return res.json({ success: false, message: "Không tìm thấy đánh giá" });
        }

        res.json({ success: true, message: "Xóa đánh giá thành công" });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;

        const reviews = await Review.find({ product: productId })
            .populate('user', 'name email')
            .populate('order', 'orderNumber')
            .sort({ createdAt: -1 });

        res.json({ 
            success: true, 
            reviews 
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ 
            success: false, 
            message: 'Có lỗi xảy ra khi lấy đánh giá sản phẩm' 
        });
    }
};

export const getOrderReviews = async (req, res) => {
    try {
        const { orderId } = req.params;

        const reviews = await Review.find({ order: orderId })
            .populate('user', 'name email')
            .populate('product', 'name image')
            .sort({ createdAt: -1 });

        res.json({ 
            success: true, 
            reviews 
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ 
            success: false, 
            message: 'Có lỗi xảy ra khi lấy đánh giá đơn hàng' 
        });
    }
};

export const getUserReviews = async (req, res) => {
    try {
        const { userId } = req.params;

        const reviews = await Review.find({ user: userId })
            .populate('product', 'name image')
            .populate('order', 'orderNumber')
            .sort({ createdAt: -1 });

        res.json({ 
            success: true, 
            reviews 
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ 
            success: false, 
            message: 'Có lỗi xảy ra khi lấy đánh giá của người dùng' 
        });
    }
};

export const getReviewStats = async (req, res) => {
    try {
        // Tổng số đánh giá
        const totalReviews = await Review.countDocuments();
        
        // Đánh giá theo rating
        const reviewsByRating = await Review.aggregate([
            {
                $group: {
                    _id: "$rating",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Đánh giá theo sản phẩm
        const reviewsByProduct = await Review.aggregate([
            {
                $group: {
                    _id: "$product",
                    count: { $sum: 1 },
                    averageRating: { $avg: "$rating" }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            {
                $unwind: "$productDetails"
            },
            {
                $project: {
                    productName: "$productDetails.name",
                    count: 1,
                    averageRating: 1
                }
            }
        ]);

        // Đánh giá mới nhất
        const latestReviews = await Review.find()
            .populate('user', 'name')
            .populate('product', 'name')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            success: true,
            stats: {
                totalReviews,
                reviewsByRating,
                reviewsByProduct,
                latestReviews
            }
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ 
            success: false, 
            message: 'Có lỗi xảy ra khi lấy thống kê đánh giá' 
        });
    }
};