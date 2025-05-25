import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import COLORS from '../../constants/colors';

export default function ManagerOrder() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://192.168.19.104:4000/api/admin/orders', {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      if (response.data.success) {
        setOrders(response.data.orders);
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể lấy danh sách đơn hàng');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Lỗi', 'Không thể lấy danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      // Nếu trạng thái mới là Cancelled, hiển thị hộp thoại xác nhận
      if (newStatus === 'Cancelled') {
        Alert.alert(
          'Xác nhận hủy đơn',
          'Bạn có chắc chắn muốn hủy đơn hàng này?',
          [
            { text: 'Không', style: 'cancel' },
            {
              text: 'Có',
              style: 'destructive',
              onPress: async () => {
                try {
                  const response = await axios.put(
                    `http://192.168.19.104:4000/api/admin/order/${orderId}/status`,
                    { 
                      status: newStatus,
                      paymentStatus: 'refunded'
                    },
                    {
                      headers: {
                        Authorization: `Bearer ${user.token}`
                      }
                    }
                  );

                  if (response.data.success) {
                    Alert.alert('Thành công', 'Đã hủy đơn hàng và hoàn tiền');
                    fetchOrders();
                  } else {
                    Alert.alert('Lỗi', response.data.message || 'Không thể cập nhật trạng thái đơn hàng');
                  }
                } catch (error) {
                  console.error('Error updating order status:', error);
                  Alert.alert('Lỗi', 'Không thể cập nhật trạng thái đơn hàng');
                }
              },
            },
          ]
        );
        return;
      }

      // Xử lý các trạng thái khác
      const response = await axios.put(
        `http://192.168.19.104:4000/api/admin/order/${orderId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );

      if (response.data.success) {
        Alert.alert('Thành công', 'Cập nhật trạng thái đơn hàng thành công');
        fetchOrders();
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể cập nhật trạng thái đơn hàng');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái đơn hàng');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return '#FFA500';
      case 'Approved':
        return '#2196F3';
      case 'Prepare':
        return '#9C27B0';
      case 'Delivered':
        return '#4CAF50';
      case 'Success':
        return '#4CAF50';
      case 'Cancelled':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return '#4CAF50';
      case 'pending':
        return '#FFA500';
      case 'failed':
        return '#F44336';
      case 'refunded':
        return '#9C27B0';
      default:
        return '#666';
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
        return 'Đang giao hàng';
      case 'Success':
        return 'Hoàn thành';
      case 'Cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const getPaymentStatusText = (status, orderStatus) => {
    // Nếu đơn hàng đã hủy, hiển thị trạng thái thanh toán là "Đã hủy"
    if (orderStatus === 'Cancelled') {
      return 'Đã hủy đơn hàng';
    }

    // Các trạng thái thanh toán khác
    switch (status) {
      case 'paid':
        return 'Đã thanh toán';
      case 'pending':
        return 'Chờ thanh toán';
      case 'failed':
        return 'Thanh toán thất bại';
      case 'refunded':
        return 'Đã hoàn tiền';
      default:
        return status;
    }
  };

  const renderOrder = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Đơn hàng #{item._id.slice(-6)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.infoText}>Ngày đặt: {new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
        <Text style={styles.infoText}>Tổng tiền: {item.totalPrice.toLocaleString('vi-VN')}đ</Text>
        <Text style={styles.infoText}>Thanh toán: {item.paymentMethod === 'COD' ? 'Tiền mặt' : 'Chuyển khoản'}</Text>
        <View style={[styles.paymentStatusBadge, { backgroundColor: getPaymentStatusColor(item.paymentStatus) }]}>
          <Text style={styles.paymentStatusText}>
            {getPaymentStatusText(item.paymentStatus, item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.shippingInfo}>
        <Text style={styles.shippingTitle}>Thông tin giao hàng:</Text>
        <Text style={styles.shippingText}>Địa chỉ: {item.shippingAddress.address}</Text>
        {/* <Text style={styles.shippingText}>Thành phố: {item.shippingAddress.city}</Text> */}
        <Text style={styles.shippingText}>Số điện thoại: {item.shippingAddress.phone}</Text>
      </View>

      <View style={styles.orderItems}>
        <Text style={styles.itemsTitle}>Chi tiết đơn hàng:</Text>
        {item.orderItems.map((orderItem, index) => (
          <View key={index} style={styles.orderItem}>
            <Text style={styles.itemName}>{orderItem.name}</Text>
            <Text style={styles.itemDetails}>
              {orderItem.quantity}x - {orderItem.color} - Size {orderItem.size}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actionButtons}>
        {item.status === 'Pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleUpdateStatus(item._id, 'Approved')}
          >
            <Text style={styles.buttonText}>Xác nhận</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Approved' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.prepareButton]}
            onPress={() => handleUpdateStatus(item._id, 'Prepare')}
          >
            <Text style={styles.buttonText}>Chuẩn bị</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Prepare' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deliverButton]}
            onPress={() => handleUpdateStatus(item._id, 'Delivered')}
          >
            <Text style={styles.buttonText}>Giao hàng</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Delivered' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => handleUpdateStatus(item._id, 'Success')}
          >
            <Text style={styles.buttonText}>Hoàn thành</Text>
          </TouchableOpacity>
        )}
        {item.status !== 'Cancelled' && item.status !== 'Success' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleUpdateStatus(item._id, 'Cancelled')}
          >
            <Text style={styles.buttonText}>Hủy đơn</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý đơn hàng</Text>
        <TouchableOpacity onPress={fetchOrders} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  listContainer: {
    padding: 15,
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderInfo: {
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  paymentStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginTop: 5,
  },
  paymentStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shippingInfo: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
  },
  shippingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  shippingText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  orderItems: {
    marginBottom: 10,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  orderItem: {
    marginBottom: 5,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemDetails: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    padding: 10,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#2196F3',
  },
  prepareButton: {
    backgroundColor: '#9C27B0',
  },
  deliverButton: {
    backgroundColor: '#4CAF50',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
