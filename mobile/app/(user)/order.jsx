import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';

export default function Order() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { cart, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD'); // COD or QR_PAYMENT

  useEffect(() => {
    checkUserInfo();
  }, []);

  const checkUserInfo = () => {
    if (!user.name || !user.phone || !user.address) {
      Alert.alert(
        'Thông tin chưa đầy đủ',
        'Vui lòng cập nhật thông tin cá nhân trước khi đặt hàng',
        [
          {
            text: 'Hủy',
            style: 'cancel',
            onPress: () => router.back()
          },
          {
            text: 'Cập nhật ngay',
            onPress: () => router.push('/profile')
          }
        ]
      );
    }
  };

  const handleCheckout = async () => {
    try {
      setLoading(true);
      
      if (!cart.items || cart.items.length === 0) {
        Alert.alert('Lỗi', 'Giỏ hàng trống');
        return;
      }

      if (!user.name || !user.phone || !user.address) {
        Alert.alert(
          'Thông tin chưa đầy đủ',
          'Vui lòng cập nhật thông tin cá nhân trước khi đặt hàng',
          [
            {
              text: 'Hủy',
              style: 'cancel'
            },
            {
              text: 'Cập nhật ngay',
              onPress: () => router.push('/profile')
            }
          ]
        );
        return;
      }

      // Chuẩn bị dữ liệu đơn hàng
      const orderData = {
        userId: user._id,
        items: cart.items.map(item => ({
          product: item.productId._id,
          name: item.productId.name,
          quantity: item.quantity,
          price: item.productId.price,
          image: item.productId.image,
          size: item.size || 'M', // Mặc định size M nếu không có
          color: item.color || 'Đen' // Mặc định màu đen nếu không có
        })),
        shippingAddress: {
          address: user.address,
          city: 'Hà Nội', // Có thể thêm vào form nhập
          postalCode: '100000',
          country: 'Việt Nam'
        },
        paymentMethod: paymentMethod,
        totalPrice: cart.totalAmount
      };

      console.log('Sending order data:', orderData);

      const response = await axios.post(
        'http://192.168.19.104:4000/api/user/orders',
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        Alert.alert(
          'Thành công',
          'Đặt hàng thành công!',
          [
            {
              text: 'OK',
              onPress: () => {
                clearCart();
                router.replace('/');
              }
            }
          ]
        );
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể đặt hàng');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi đặt hàng');
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.navbarTitle}>Thanh Toán</Text>
        <View style={styles.navbarRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* Thông tin người nhận */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin người nhận</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Họ tên:</Text>
            <Text style={styles.infoValue}>{user.name || 'Chưa cập nhật'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số điện thoại:</Text>
            <Text style={styles.infoValue}>{user.phone || 'Chưa cập nhật'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Địa chỉ:</Text>
            <Text style={styles.infoValue}>{user.address || 'Chưa cập nhật'}</Text>
          </View>
          <TouchableOpacity
            style={styles.updateInfoButton}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.updateInfoText}>Cập nhật thông tin</Text>
          </TouchableOpacity>
        </View>

        {/* Thông tin đơn hàng */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
          {cart.items?.map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <Text style={styles.itemName}>{item.productId.name}</Text>
              <Text style={styles.itemQuantity}>Số lượng: {item.quantity}</Text>
              <Text style={styles.itemPrice}>
                {item.productId.price.toLocaleString('vi-VN')}đ
              </Text>
            </View>
          ))}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalAmount}>
              {cart.totalAmount?.toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>

        {/* Phương thức thanh toán */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          <TouchableOpacity
            style={[
              styles.paymentMethod,
              paymentMethod === 'COD' && styles.selectedPayment
            ]}
            onPress={() => setPaymentMethod('COD')}
          >
            <Ionicons 
              name="cash-outline" 
              size={24} 
              color={paymentMethod === 'COD' ? COLORS.primary : '#666'} 
            />
            <Text style={[
              styles.paymentText,
              paymentMethod === 'COD' && styles.selectedPaymentText
            ]}>
              Thanh toán khi nhận hàng
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethod,
              paymentMethod === 'QR_PAYMENT' && styles.selectedPayment
            ]}
            onPress={() => setPaymentMethod('QR_PAYMENT')}
          >
            <Ionicons 
              name="qr-code-outline" 
              size={24} 
              color={paymentMethod === 'QR_PAYMENT' ? COLORS.primary : '#666'} 
            />
            <Text style={[
              styles.paymentText,
              paymentMethod === 'QR_PAYMENT' && styles.selectedPaymentText
            ]}>
              Thanh toán qua QR
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Nút thanh toán */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.checkoutButton,
            (!user.name || !user.phone || !user.address) && styles.disabledButton
          ]}
          onPress={handleCheckout}
          disabled={loading || !user.name || !user.phone || !user.address}
        >
          <Text style={styles.checkoutButtonText}>
            {loading ? 'Đang xử lý...' : 'Đặt hàng'}
          </Text>
        </TouchableOpacity>
      </View>
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
    width: 40,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    flex: 2,
    fontSize: 16,
    color: '#333',
  },
  updateInfoButton: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  updateInfoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  orderItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  itemPrice: {
    fontSize: 16,
    color: COLORS.primary,
    marginTop: 5,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedPayment: {
    borderColor: COLORS.primary,
    backgroundColor: '#f0f8ff',
  },
  paymentText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
  selectedPaymentText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
