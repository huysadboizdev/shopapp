import jwt from 'jsonwebtoken'
import userModel from '../models/userModel.js'

// user authentication middleware
const authUser = async (req, res, next) => {
    try {
        // Log headers for debugging
        console.log('Request headers:', req.headers);
        
        const token = req.headers.token || req.headers.authorization?.split(' ')[1];
        console.log('Token:', token);

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Không tìm thấy token. Vui lòng đăng nhập lại" 
            });
        }

        // Verify token
        const token_decode = jwt.verify(token, process.env.ACCESS_TOKEN_SECERT);
        console.log('Decoded token:', token_decode);
        
        // Find user
        const user = await userModel.findById(token_decode.id);
        console.log('Found user:', user);

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: "Không tìm thấy người dùng" 
            });
        }

        // Set user info in request
        req.user = {
            userId: user._id,
            isAdmin: user.isAdmin
        };
        console.log('Set user in request:', req.user);

        next();
    } catch (error) {
        console.log('Auth middleware error:', error);
        return res.status(401).json({ 
            success: false, 
            message: "Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại" 
        });
    }
}

export default authUser