import jwt from 'jsonwebtoken';

const authAdmin = async (req, res, next) => {
    try {
        const { token } = req.headers;
        if (!token) {
            return res.json({ success: false, message: "Not Authorized Login Again" });
        }

        const token_decode = jwt.verify(token, process.env.ACCESS_TOKEN_SECERT);
        if (token_decode.id !== 'admin') {
            return res.json({ success: false, message: "Not Authorized" });
        }

        next();
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export default authAdmin; 