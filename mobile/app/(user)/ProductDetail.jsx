import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import axios from 'axios';
import COLORS from '../../constants/colors';

export default function ProductDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToCart: addToCartStore } = useCartStore();
  const [quantity, setQuantity] = useState('1');
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);

  console.log('Raw params:', params);
  console.log('Product param:', params.product);

  // Parse product data safely
  const parsedProduct = React.useMemo(() => {
    try {
      console.log('Attempting to parse product data');
      if (typeof params.product === 'string') {
        const parsed = JSON.parse(params.product);
        console.log('Successfully parsed product:', parsed);
        return parsed;
      }
      console.log('Product is not a string, returning as is:', params.product);
      return params.product;
    } catch (error) {
      console.error('Error parsing product:', error);
      return null;
    }
  }, [params.product]);

  console.log('Final parsed product:', parsedProduct);

  // Show error if product data is invalid
  if (!parsedProduct) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết sản phẩm</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Không thể tải thông tin sản phẩm</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const addToCart = async () => {
    try {
      if (!user?.token) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập để thêm vào giỏ hàng');
        router.push('/login');
        return;
      }

      const cartItem = {
        productId: parsedProduct,
        quantity: parseInt(quantity)
      };

      // Cập nhật UI ngay lập tức
      addToCartStore(cartItem);

      const response = await axios.post(
        'http://192.168.19.104:4000/api/user/add_cart',
        {
          productId: parsedProduct._id,
          quantity: parseInt(quantity)
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'token': user.token
          }
        }
      );

      if (response.data.success) {
        Alert.alert(
          'Thành công',
          'Đã thêm sản phẩm vào giỏ hàng',
          [
            {
              text: 'Xem giỏ hàng',
              onPress: () => router.push('/cart')
            },
            {
              text: 'Tiếp tục mua sắm',
              style: 'cancel'
            }
          ]
        );
        setQuantityModalVisible(false);
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể thêm vào giỏ hàng');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi thêm vào giỏ hàng');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết sản phẩm</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Product Image */}
        <Image
          source={{ uri: parsedProduct.image }}
          style={styles.productImage}
          resizeMode="cover"
        />

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{parsedProduct.name}</Text>
          <Text style={styles.productPrice}>
            {parsedProduct.price ? parsedProduct.price.toLocaleString('vi-VN') + 'đ' : '0đ'}
          </Text>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mô tả</Text>
            <Text style={styles.description}>{parsedProduct.description}</Text>
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin chi tiết</Text>
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Size:</Text>
                <Text style={styles.detailValue}>
                  {Array.isArray(parsedProduct.size) ? parsedProduct.size.join(', ') : parsedProduct.size}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Màu sắc:</Text>
                <Text style={styles.detailValue}>{parsedProduct.color}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Danh mục:</Text>
                <Text style={styles.detailValue}>{parsedProduct.category}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add to Cart Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={() => setQuantityModalVisible(true)}
        >
          <Text style={styles.addToCartButtonText}>Thêm vào giỏ hàng</Text>
        </TouchableOpacity>
      </View>

      {/* Quantity Modal */}
      <Modal
        visible={quantityModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn số lượng</Text>
            <TextInput
              style={styles.quantityInput}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="Nhập số lượng"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setQuantityModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={addToCart}
              >
                <Text style={styles.modalButtonText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.primary,
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  productImage: {
    width: '100%',
    height: 300,
  },
  productInfo: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  productPrice: {
    fontSize: 22,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  detailsContainer: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailLabel: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    flex: 2,
    fontSize: 16,
    color: '#333',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  addToCartButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#ff3b30',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 