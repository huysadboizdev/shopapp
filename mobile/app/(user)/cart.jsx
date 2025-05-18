import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import COLORS from '../../constants/colors';
import { useCartStore } from '../../store/cartStore';
import { Ionicons } from '@expo/vector-icons';

export default function Cart() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { cart, setCart, updateCartItemQuantity, removeFromCart } = useCartStore();
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://192.168.19.104:4000/api/user/cart', {
        headers: {
          token: user.token
        }
      });

      if (response.data.success) {
        console.log('Cart data:', response.data);
        setCart(response.data.cart);
      } else {
        Alert.alert('Lỗi', 'Không thể lấy thông tin giỏ hàng');
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      Alert.alert('Lỗi', 'Không thể lấy thông tin giỏ hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const updateQuantity = async (productId, newQuantity) => {
    try {
      if (newQuantity < 1) {
        Alert.alert('Lỗi', 'Số lượng phải lớn hơn 0');
        return;
      }

      updateCartItemQuantity(productId, newQuantity);

      const response = await axios.put(
        'http://192.168.19.104:4000/api/user/edit_cart',
        {
          productId,
          quantity: newQuantity
        },
        {
          headers: {
            token: user.token,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.success) {
        fetchCart();
        Alert.alert('Lỗi', response.data.message || 'Không thể cập nhật số lượng');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      fetchCart();
      Alert.alert('Lỗi', 'Không thể cập nhật số lượng');
    }
  };

  const removeItem = async (productId) => {
    try {
      removeFromCart(productId);

      const response = await axios.delete(
        'http://192.168.19.104:4000/api/user/remove_cart',
        {
          data: { productId },
          headers: {
            token: user.token,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.success) {
        fetchCart();
        Alert.alert('Lỗi', response.data.message || 'Không thể xóa sản phẩm');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      fetchCart();
      Alert.alert('Lỗi', 'Không thể xóa sản phẩm');
    }
  };

  const formatPrice = (price) => {
    if (!price || isNaN(price)) return '0đ';
    return `${price.toLocaleString('vi-VN')}đ`;
  };

  const calculateItemTotal = (item) => {
    if (!item || !item.productId || !item.productId.price || !item.quantity) return 0;
    return item.productId.price * item.quantity;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.navbarTitle}>Giỏ Hàng</Text>
        <View style={styles.navbarRight} />
      </View>

      <ScrollView style={styles.cartList}>
        {cart.items && cart.items.length > 0 ? (
          cart.items.map((item) => {
            const itemTotal = calculateItemTotal(item);
            console.log('Rendering cart item:', item);
            console.log('Item total:', itemTotal);
            
            return (
              <View key={`${item._id}-${item.productId?._id}`} style={styles.cartItem}>
                <Image
                  source={{ uri: item.productId?.image }}
                  style={styles.productImage}
                />
                <View style={styles.itemDetails}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.productId?.name}
                  </Text>
                  <Text style={styles.productPrice}>
                    {formatPrice(item.productId?.price)}
                  </Text>
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.productId._id, item.quantity - 1)}
                    >
                      <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.productId._id, item.quantity + 1)}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeItem(item.productId._id)}
                  >
                    <Text style={styles.removeButtonText}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCart}>
            <Text style={styles.emptyCartText}>Giỏ hàng trống</Text>
            <TouchableOpacity
              style={styles.continueShoppingButton}
              onPress={() => router.back()}
            >
              <Text style={styles.continueShoppingText}>Tiếp tục mua sắm</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {cart.items && cart.items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalText}>Tổng cộng:</Text>
            <Text style={styles.totalAmount}>
              {formatPrice(cart.totalAmount)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={() => router.push('/checkout')}
          >
            <Text style={styles.checkoutButtonText}>Thanh toán</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
  },
  backButton: {
    padding: 5,
  },
  navbarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  navbarRight: {
    width: 40, // Để cân bằng với backButton
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartList: {
    flex: 1,
    padding: 15,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 5,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 5,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  quantityButton: {
    backgroundColor: COLORS.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantity: {
    marginHorizontal: 15,
    fontSize: 16,
  },
  itemTotal: {
    display: 'none',
  },
  removeButton: {
    backgroundColor: '#ff4444',
    padding: 5,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCartText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  continueShoppingButton: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 5,
  },
  continueShoppingText: {
    color: '#fff',
    fontSize: 16,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
