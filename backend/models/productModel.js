import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  category: { type: String, required: true },          // category
  name: { type: String, required: true },              // name
  color: { type: String, required: true },             // color
  size: { type: [String], required: true },            // Size  ['S', 'M', 'L'])
  description: { type: String, required: true },       // infor product
  price: { type: Number, required: true },             // price
  image: { type: String },                             // Link image
}, { timestamps: true });

const productModel = mongoose.model('Product', productSchema);
export default productModel;
