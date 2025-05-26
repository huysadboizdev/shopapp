import React, { useState, useCallback } from 'react';
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
  Modal,
  TextInput,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  FlatList,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import COLORS from '../../constants/colors';
import { useCartStore } from '../../store/cartStore';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const Cart = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { cart, setCart, updateCartItemQuantity, removeFromCart } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [note, setNote] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [qrImage, setQrImage] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const fetchUserInfo = async () => {
    try {
      if (!user?.token) return;

      const response = await axios.get('http://192.168.19.104:4000/api/user/get-user', {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      if (response.data.success) {
        setUserInfo(response.data.user);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const calculateTotalAmount = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((total, item) => {
      if (!item?.productId?.price || !item?.quantity) return total;
      return total + (item.productId.price * item.quantity);
    }, 0);
  };

  const fetchCartItems = async () => {
    try {
      setLoading(true);
      // Lấy giỏ hàng từ AsyncStorage trước
      const storedCart = await AsyncStorage.getItem('cart');
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        // Tính toán lại tổng tiền
        const total = calculateTotalAmount(parsedCart.items || []);
        setCart({
          items: parsedCart.items || [],
          totalAmount: total
        });
      }

      // Nếu đang đăng nhập, lấy giỏ hàng từ server
      if (user?.token) {
        const response = await axios.get('http://192.168.19.104:4000/api/user/cart', {
          headers: {
            token: user.token
          }
        });

        if (response.data.success) {
          const cartData = response.data.cart;
          // Tính toán lại tổng tiền
          const total = calculateTotalAmount(cartData.items || []);
          const updatedCart = {
            items: cartData.items || [],
            totalAmount: total
          };
          setCart(updatedCart);
          await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
        }
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      const storedCart = await AsyncStorage.getItem('cart');
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        // Tính toán lại tổng tiền từ dữ liệu local
        const total = calculateTotalAmount(parsedCart.items || []);
        setCart({
          items: parsedCart.items || [],
          totalAmount: total
        });
      } else {
        Alert.alert('Lỗi', 'Không thể lấy thông tin giỏ hàng');
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCartItems();
      fetchUserInfo();
    }, [])
  );

  const handleRemoveItem = async (productId) => {
    try {
      // Cập nhật state sau khi xóa item
      const updatedItems = cart.items.filter(item => item.productId._id !== productId);
      const total = calculateTotalAmount(updatedItems);
      const updatedCart = {
        items: updatedItems,
        totalAmount: total
      };

      setCart(updatedCart);
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));

      if (user?.token) {
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
          fetchCartItems();
          Alert.alert('Lỗi', response.data.message || 'Không thể xóa sản phẩm');
        }
      }
    } catch (error) {
      console.error('Error removing item:', error);
      fetchCartItems();
      Alert.alert('Lỗi', 'Không thể xóa sản phẩm');
    }
  };

  const handleUpdateQuantity = async (productId, newQuantity) => {
    try {
      if (newQuantity < 1) {
        Alert.alert('Lỗi', 'Số lượng phải lớn hơn 0');
        return;
      }

      // Cập nhật số lượng trong state
      const updatedItems = cart.items.map(item => {
        if (item.productId._id === productId) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      });

      // Tính toán lại tổng tiền
      const total = calculateTotalAmount(updatedItems);
      const updatedCart = {
        items: updatedItems,
        totalAmount: total
      };

      setCart(updatedCart);
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));

      if (user?.token) {
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
          fetchCartItems();
          Alert.alert('Lỗi', response.data.message || 'Không thể cập nhật số lượng');
        }
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      fetchCartItems();
      Alert.alert('Lỗi', 'Không thể cập nhật số lượng');
    }
  };

  const handleCheckout = async () => {
    if (!cart.items || cart.items.length === 0) {
      Alert.alert('Thông báo', 'Giỏ hàng trống');
      return;
    }

    if (!userInfo?.name || !userInfo?.phone || !userInfo?.address) {
      Alert.alert(
        'Thông báo',
        'Vui lòng cập nhật đầy đủ thông tin cá nhân (tên, số điện thoại và địa chỉ) trước khi đặt hàng',
        [
          {
            text: 'Hủy',
            style: 'cancel'
          },
          {
            text: 'Cập nhật',
            onPress: () => router.push('/profile')
          }
        ]
      );
      return;
    }

    setShowPaymentModal(true);
  };

  const handleConfirmOrder = async () => {
    try {
      setLoading(true);

      if (!user?.token) {
        Alert.alert('Thông báo', 'Vui lòng đăng nhập để đặt hàng');
        router.replace('/login');
        return;
      }

      if (!cart?.items || cart.items.length === 0) {
        Alert.alert('Thông báo', 'Giỏ hàng trống');
        return;
      }

      // Kiểm tra thông tin giao hàng
      if (!userInfo?.address || !userInfo?.phone) {
        Alert.alert('Thông báo', 'Vui lòng cập nhật đầy đủ thông tin giao hàng');
        router.push('/profile');
        return;
      }

      const orderData = {
        items: cart.items.map(item => ({
          product: item.productId._id,
          quantity: item.quantity,
          price: item.productId.price
        })),
        shippingAddress: {
          address: userInfo.address,
          phone: userInfo.phone,
          city: 'Hà Nội',
          country: 'Việt Nam',
          postalCode: '100000'
        },
        paymentMethod: paymentMethod === 'QR' ? 'QR_PAYMENT' : 'COD',
        note: note || '',
        totalAmount: cart.totalAmount,
        status: 'pending'
      };

      console.log('Sending order data:', orderData);

      const response = await axios.post(
        'http://192.168.19.104:4000/api/user/createorders',
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Order response:', response.data);

      if (response.data.success) {
        // Xóa giỏ hàng sau khi đặt hàng thành công
        setCart({ items: [], totalAmount: 0 });
        await AsyncStorage.setItem('cart', JSON.stringify({ items: [], totalAmount: 0 }));
        setShowPaymentModal(false);
        setNote('');
        
        Alert.alert(
          'Thành công',
          'Đặt hàng thành công!',
          [
            {
              text: 'Xem đơn hàng',
              onPress: () => router.push('/order')
            }
          ]
        );
      } else {
        Alert.alert('Lỗi', response.data.message || 'Đặt hàng thất bại');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        Alert.alert('Lỗi', error.response.data.message || 'Có lỗi xảy ra khi đặt hàng');
      } else {
        Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0đ';
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + 'đ';
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Image 
        source={{ uri: item?.productId?.image || 'https://via.placeholder.com/80' }} 
        style={styles.image} 
      />
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item?.productId?.name || 'Sản phẩm không xác định'}</Text>
        <Text style={styles.itemPrice}>
          {formatCurrency(item?.productId?.price)}
        </Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => handleUpdateQuantity(item?.productId?._id, (item?.quantity || 0) - 1)}
            disabled={!item?.quantity || item.quantity <= 1}
          >
            <Ionicons 
              name="remove-circle-outline" 
              size={24} 
              color={!item?.quantity || item.quantity <= 1 ? '#ccc' : COLORS.primary} 
            />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item?.quantity || 0}</Text>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => handleUpdateQuantity(item?.productId?._id, (item?.quantity || 0) + 1)}
          >
            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleRemoveItem(item?.productId?._id)}
      >
        <Ionicons name="trash-outline" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );

  const handleShowQR = () => {
    setShowQRModal(true);
  };

  const handleCloseQR = () => {
    setShowQRModal(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.navbar}>
            <Text style={styles.navbarTitle}>Giỏ Hàng</Text>
          </View>
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loading} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.navbar}>
          <Text style={styles.navbarTitle}>Giỏ Hàng</Text>
        </View>
        <FlatList
          data={cart?.items || []}
          keyExtractor={(item) => item?._id || Math.random().toString()}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.emptyCart}>Giỏ hàng trống</Text>}
          contentContainerStyle={styles.listContent}
        />
        {cart?.items && cart.items.length > 0 && (
          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Tổng cộng:</Text>
              <Text style={styles.totalAmount}>
                {formatCurrency(cart?.totalAmount)}
              </Text>
            </View>
            <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
              <Text style={styles.checkoutText}>Đặt Hàng</Text>
            </TouchableOpacity>
          </View>
        )}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showPaymentModal}
          onRequestClose={() => setShowPaymentModal(false)}
        >
          <View style={styles.modalContainer}>
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Thông tin đặt hàng</Text>
                
                <View style={styles.deliveryInfo}>
                  <Text style={styles.deliveryTitle}>Thông tin giao hàng</Text>
                  <View style={styles.deliveryDetail}>
                    <Text style={styles.deliveryLabel}>Địa chỉ:</Text>
                    <Text style={styles.deliveryValue}>{userInfo?.address}</Text>
                  </View>
                  <View style={styles.deliveryDetail}>
                    <Text style={styles.deliveryLabel}>Số điện thoại:</Text>
                    <Text style={styles.deliveryValue}>{userInfo?.phone}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.updateProfileButton}
                    onPress={() => {
                      setShowPaymentModal(false);
                      router.push('/profile');
                    }}
                  >
                    <Text style={styles.updateProfileText}>Cập nhật thông tin</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.noteLabel}>Ghi chú cho đơn hàng:</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Nhập ghi chú (nếu có)"
                  placeholderTextColor="#666"
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.modalTitle}>Chọn phương thức thanh toán</Text>
                <View style={styles.paymentOptions}>
                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'COD' && styles.selectedPayment]}
                    onPress={() => setPaymentMethod('COD')}
                  >
                    <Text style={styles.paymentText}>Thanh toán khi nhận hàng</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'QR' && styles.selectedPayment]}
                    onPress={() => setPaymentMethod('QR')}
                  >
                    <Text style={styles.paymentText}>Thanh toán qua QR Code</Text>
                  </TouchableOpacity>
                </View>

                {paymentMethod === 'QR' && (
                  <View style={styles.qrSection}>
                    <Text style={styles.qrTitle}>Mã QR thanh toán</Text>
                    <Image 
                      source={require('../../assets/images/qr.jpg')} 
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.qrInstruction}>
                      Vui lòng quét mã QR bằng ứng dụng ngân hàng của bạn
                    </Text>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowPaymentModal(false);
                      setNote('');
                    }}
                  >
                    <Text style={styles.buttonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleConfirmOrder}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Xác nhận đặt hàng</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent={true}
          visible={showQRModal}
          onRequestClose={() => setShowQRModal(false)}
          statusBarTranslucent={true}
        >
          <View style={styles.qrModalOverlay}>
            <View style={styles.qrModalContainer}>
              <View style={styles.qrModalContent}>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowQRModal(false)}
                >
                  <Ionicons name="close-circle" size={32} color="#333" />
                </TouchableOpacity>
                <Text style={styles.qrModalTitle}>
                  Quét mã QR để thanh toán
                </Text>
                <Image 
                  source={require('../../assets/images/qr.jpg')} 
                  style={styles.qrModalImage}
                  resizeMode="contain"
                />
                <Text style={styles.qrModalText}>
                  Vui lòng quét mã QR bằng ứng dụng ngân hàng của bạn
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default Cart;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: -40,
  },
  navbar: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    height: 190,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  navbarTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
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
    padding: 5,
  },
  quantity: {
    marginHorizontal: 15,
    fontSize: 16,
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScrollView: {
    width: '100%',
    maxHeight: '80%',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    marginVertical: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  deliveryInfo: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  deliveryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  deliveryDetail: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  deliveryLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
    fontWeight: '500',
  },
  deliveryValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  updateProfileButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    alignItems: 'center',
  },
  updateProfileText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  paymentOptions: {
    marginBottom: 20,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedPayment: {
    borderColor: COLORS.primary,
    backgroundColor: '#f0f9f0',
  },
  paymentText: {
    marginLeft: 10,
    fontSize: 16,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  itemContainer: {
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
  image: {
    width: 100,
    height: 100,
    borderRadius: 5,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 5,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  quantityText: {
    marginHorizontal: 15,
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    padding: 5,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 15,
  },
  qrSection: {
    marginVertical: 20,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  qrImage: {
    width: 250,
    height: 250,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginVertical: 10,
  },
  qrInstruction: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  },
  qrModalImage: {
    width: 280,
    height: 280,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    marginVertical: 20,
  },
  qrModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
});
