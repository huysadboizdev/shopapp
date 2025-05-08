import Product from '../models/productModel.js';
import userModel from '../models/userModel.js';
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