import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
  SafeAreaView,
  ToastAndroid,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import COLORS from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const Order = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0đ';
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + 'đ';
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      if (!user?.token) {
        Alert.alert('Thông báo', 'Vui lòng đăng nhập để xem đơn hàng');
        router.replace('/login');
        return;
      }

      const response = await axios.get('http://192.168.19.104:4000/api/user/get-orders', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        const newOrders = response.data.orders || [];
        
        // Kiểm tra và thông báo các thay đổi trạng thái
        if (lastUpdate) {
          newOrders.forEach(newOrder => {
            const oldOrder = orders.find(o => o._id === newOrder._id);
            if (oldOrder && oldOrder.status !== newOrder.status) {
              const statusText = getStatusText(newOrder.status);
              if (newOrder.status === 'Success') {
                if (Platform.OS === 'android') {
                  ToastAndroid.show(`Đơn hàng #${newOrder._id.slice(-6)} đã giao thành công!`, ToastAndroid.LONG);
                } else {
                  Alert.alert('Thông báo', `Đơn hàng #${newOrder._id.slice(-6)} đã giao thành công!`);
                }
              } else {
                if (Platform.OS === 'android') {
                  ToastAndroid.show(`Đơn hàng #${newOrder._id.slice(-6)}: ${statusText}`, ToastAndroid.LONG);
                } else {
                  Alert.alert('Cập nhật đơn hàng', `Đơn hàng #${newOrder._id.slice(-6)}: ${statusText}`);
                }
              }
            }
          });
        }
        
        setOrders(newOrders);
        setLastUpdate(new Date());
      } else {
        console.error('Error in response:', response.data);
        Alert.alert('Lỗi', response.data.message || 'Không thể lấy danh sách đơn hàng');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        if (error.response.status === 401) {
          Alert.alert('Thông báo', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại');
          router.replace('/login');
        } else {
          Alert.alert('Lỗi', error.response.data.message || 'Không thể lấy danh sách đơn hàng');
        }
      } else if (error.request) {
        console.error('Error request:', error.request);
        Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ');
      } else {
        console.error('Error message:', error.message);
        Alert.alert('Lỗi', 'Có lỗi xảy ra khi lấy danh sách đơn hàng');
      }
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return '#FFA500';
      case 'Accepted':
        return '#4CAF50';
      case 'Delivery':
        return '#2196F3';
      case 'Successful':
        return '#4CAF50';
      case 'Cancelled':
        return '#FF0000';
      default:
        return '#000000';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'Pending':
        return 'Chờ xác nhận';
      case 'Approved':
        return 'Đã xác nhận';
      case 'Prepare':
        return 'Đơn hàng đã rời khỏi kho';
      case 'Delivered':
        return 'Đang giao hàng tại Thủ Đức ';
      case 'Success':
        return 'Giao hàng thành công';
      case 'Cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      if (!user?.token) {
        Alert.alert('Thông báo', 'Vui lòng đăng nhập để thực hiện thao tác này');
        router.replace('/login');
        return;
      }

      const response = await axios.post(
        `http://192.168.19.104:4000/api/user/cancel-order/${orderId}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setOrders(orders.map(order => 
          order._id === orderId 
            ? { ...order, status: 'Cancelled' }
            : order
        ));
        Alert.alert('Thông báo', 'Đã hủy đơn hàng thành công');
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể hủy đơn hàng');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      Alert.alert('Lỗi', 'Không thể hủy đơn hàng');
    }
  };

  const handleReview = async () => {
    try {
      if (!selectedOrder) return;

      // Kiểm tra trạng thái đơn hàng
      if (selectedOrder.status !== 'Success') {
        Alert.alert('Thông báo', 'Chỉ có thể đánh giá đơn hàng đã hoàn thành');
        setReviewModalVisible(false);
        return;
      }

      const response = await axios.post(
        'http://192.168.19.104:4000/api/user/review',
        {
          orderId: selectedOrder._id,
          rating,
          comment: reviewText,
          products: selectedOrder.orderItems.map(item => ({
            productId: item.product,
            rating,
            comment: reviewText
          }))
        },
        {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá!');
        setReviewModalVisible(false);
        setRating(5);
        setReviewText('');
        fetchOrders(); // Refresh orders to update review status
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể gửi đánh giá');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Lỗi', 'Không thể gửi đánh giá');
    }
  };

  const renderReviewModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={reviewModalVisible}
      onRequestClose={() => setReviewModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Đánh giá đơn hàng</Text>
          
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>Số sao:</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={30}
                    color="#FFD700"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            style={styles.reviewInput}
            placeholder="Nhập đánh giá của bạn..."
            multiline
            numberOfLines={4}
            value={reviewText}
            onChangeText={setReviewText}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setReviewModalVisible(false);
                setRating(5);
                setReviewText('');
              }}
            >
              <Text style={styles.buttonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton]}
              onPress={handleReview}
            >
              <Text style={styles.buttonText}>Gửi đánh giá</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Đơn hàng #{item._id.slice(-6)}</Text>
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
          {getStatusText(item.status)}
        </Text>
      </View>
      
      <Text style={styles.date}>Ngày đặt: {formatDate(item.createdAt)}</Text>
      
      <View style={styles.itemsContainer}>
        {item.orderItems.map((orderItem, index) => (
          <View key={index} style={styles.itemRow}>
            <Image 
              source={{ uri: orderItem.image }} 
              style={styles.itemImage}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{orderItem.name}</Text>
              <View style={styles.itemDetails}>
                <Text style={styles.itemQuantity}>x{orderItem.quantity}</Text>
                <Text style={styles.itemPrice}>{formatCurrency(orderItem.price * orderItem.quantity)}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalLabel}>Tổng tiền:</Text>
        <Text style={styles.totalAmount}>{formatCurrency(item.totalPrice)}</Text>
      </View>

      <View style={styles.paymentInfo}>
        <Text style={styles.paymentMethod}>
          Phương thức thanh toán: {item.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : 'Thanh toán qua QR Code'}
        </Text>
        
        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryTitle}>Thông tin giao hàng</Text>
          <View style={styles.deliveryDetail}>
            <Text style={styles.deliveryLabel}>Địa chỉ:</Text>
            <Text style={styles.deliveryValue}>{item.shippingAddress?.address || 'Chưa có địa chỉ'}</Text>
          </View>
          <View style={styles.deliveryDetail}>
            <Text style={styles.deliveryLabel}>Số điện thoại:</Text>
            <Text style={styles.deliveryValue}>{item.shippingAddress?.phone || 'Chưa có số điện thoại'}</Text>
          </View>
          {/* <View style={styles.deliveryDetail}>
            <Text style={styles.deliveryLabel}>Thành phố:</Text>
            <Text style={styles.deliveryValue}>{item.shippingAddress?.city || 'Thủ Đức'}</Text>
          </View> */}
        </View>

        {item.note && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Ghi chú:</Text>
            <Text style={styles.noteText}>{item.note}</Text>
          </View>
        )}
      </View>

      {item.status === 'Pending' && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            Alert.alert(
              'Xác nhận',
              'Bạn có chắc chắn muốn hủy đơn hàng này?',
              [
                {
                  text: 'Hủy',
                  style: 'cancel'
                },
                {
                  text: 'Xác nhận',
                  onPress: () => handleCancelOrder(item._id)
                }
              ]
            );
          }}
        >
          <Text style={styles.cancelButtonText}>Hủy đơn hàng</Text>
        </TouchableOpacity>
      )}

      {item.status === 'Success' && !item.isReviewed && (
        <TouchableOpacity
          style={styles.reviewButton}
          onPress={() => {
            setSelectedOrder(item);
            setReviewModalVisible(true);
          }}
        >
          <Text style={styles.reviewButtonText}>Đánh giá đơn hàng</Text>
        </TouchableOpacity>
      )}

      {item.status === 'Cancelled' && (
        <View style={styles.cancelledOrderInfo}>
          <Text style={styles.cancelledOrderText}>Đơn hàng đã bị hủy</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.navbar}>
          <Text style={styles.navbarTitle}>Đơn hàng của tôi</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchOrders}
            disabled={loading}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptyText}>Bạn chưa có đơn hàng nào</Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrderItem}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.listContainer}
            refreshing={loading}
            onRefresh={fetchOrders}
          />
        )}
        {renderReviewModal()}
      </View>
    </SafeAreaView>
  );
};

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
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  refreshButton: {
    padding: 9,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  paymentInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paymentMethod: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  deliveryInfo: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
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
  noteContainer: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  cancelButton: {
    backgroundColor: '#FF5252',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  ratingContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FF5252',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  reviewButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  reviewButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelledOrderInfo: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  cancelledOrderText: {
    color: '#FF5252',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default Order;
